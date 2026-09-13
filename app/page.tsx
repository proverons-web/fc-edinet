import type { CSSProperties } from "react";
import Link from "next/link";
import PlayerCard from "@/app/components/PlayerCard";
import NewsCard from "@/app/components/NewsCard";
import StandingsTable from "@/app/components/StandingsTable";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { dateLocale, localized, publicText, type Locale } from "@/lib/i18n";
import { defaultHomepageCanvas, normalizeHomepageCanvas } from "@/lib/homepage-canvas";
import { repairHomepageCanvas } from "@/lib/homepage-safe-zone";
import { defaultHeroLayerConfig, heroLayerState, heroLayerVisible, homeHeroLayerDefinitions, normalizeHeroLayerConfig } from "@/lib/hero-builder";
import { defaultHomepageSectionDesignMap, normalizeHomepageSectionDesignMap } from "@/lib/section-builder";
import { normalizeHomepageBlock } from "@/lib/block-library";
import type {
  ClubMatch,
  Competition,
  HomepageHero,
  HomepageSection,
  HomepageSectionKey,
  HomepageSettings,
  HomepagePublishedBlock,
  MediaAlbum,
  MediaVideo,
  NewsArticle,
  Partner,
  Player,
  StandingEntry,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const defaultSectionOrder: HomepageSection[] = [
  { section_key: "matches", is_enabled: true, display_order: 10, design_config: null, updated_at: "" },
  { section_key: "standings", is_enabled: true, display_order: 20, design_config: null, updated_at: "" },
  { section_key: "news", is_enabled: true, display_order: 30, design_config: null, updated_at: "" },
  { section_key: "players", is_enabled: true, display_order: 40, design_config: null, updated_at: "" },
  { section_key: "media", is_enabled: true, display_order: 50, design_config: null, updated_at: "" },
  { section_key: "partners", is_enabled: true, display_order: 60, design_config: null, updated_at: "" },
];

export default async function Home() {
  const locale = await getLocale();
  const text = publicText[locale].home;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [heroResult, settingsResult, sectionsResult, blocksResult] = await Promise.all([
    supabase
      .from("homepage_hero")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("homepage_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("homepage_sections")
      .select("*")
      .order("display_order", { ascending: true }),
    supabase
      .from("homepage_blocks")
      .select("*")
      .eq("is_enabled", true)
      .order("display_order", { ascending: true }),
  ]);

  const settings = settingsResult.data as HomepageSettings | null;
  const storedSections = (sectionsResult.data ?? []) as HomepageSection[];
  const sectionMap = new Map(
    storedSections.map((section) => [section.section_key, section])
  );
  const sections = defaultSectionOrder
    .map((fallback) => sectionMap.get(fallback.section_key) ?? fallback)
    .sort((a, b) => a.display_order - b.display_order);
  const sectionConfig = normalizeHomepageSectionDesignMap(
    Object.fromEntries(sections.map((section) => [section.section_key, section.design_config ?? {}])),
    defaultHomepageSectionDesignMap()
  );
  const customBlocks = (blocksResult.data ?? []).map((row: Record<string, unknown>) => {
    const block = normalizeHomepageBlock({ id: row.id, type: row.block_type, enabled: row.is_enabled, content: row.content, design: row.design_config });
    return block ? { ...block, display_order: Number(row.display_order ?? 100) } as HomepagePublishedBlock : null;
  }).filter((block): block is HomepagePublishedBlock => Boolean(block));

  const [
    playersResult,
    newsResult,
    nextMatchResult,
    lastMatchResult,
    competitionResult,
    partnersResult,
    albumsResult,
    videosResult,
    pinnedNewsResult,
  ] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(12),
    supabase
      .from("news")
      .select(`
        id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,author_name,status,
        published_at,views,is_featured,category_id,
        category:news_categories(id,name,name_ro,slug)
      `)
      .eq("status", "published")
      .lte("published_at", now)
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(12),
    supabase
      .from("matches")
      .select(matchSelect())
      .in("status", ["scheduled", "live", "postponed"])
      .gte("kickoff", now)
      .order("kickoff", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("matches")
      .select(matchSelect())
      .eq("status", "finished")
      .order("kickoff", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("competitions")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("partners")
      .select("*")
      .eq("is_active", true)
      .eq("show_on_homepage", true)
      .order("display_order")
      .order("name")
      .limit(24),
    supabase
      .from("media_albums")
      .select("*")
      .eq("is_published", true)
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("display_order", { ascending: true })
      .limit(12),
    supabase
      .from("media_videos")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("display_order", { ascending: true })
      .limit(12),
    settings?.show_pinned_news && settings.pinned_news_id
      ? supabase
          .from("news")
          .select(`
            id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,author_name,status,
            published_at,views,is_featured,category_id,
            category:news_categories(id,name,name_ro,slug)
          `)
          .eq("id", settings.pinned_news_id)
          .eq("status", "published")
          .lte("published_at", now)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const allPlayers = (playersResult.data ?? []) as Player[];
  const players = allPlayers.slice(0, sectionConfig.players.item_limit);
  const allNews = (newsResult.data ?? []) as unknown as NewsArticle[];
  const pinnedNews = pinnedNewsResult.data as unknown as NewsArticle | null;
  const news = allNews
    .filter((article) => String(article.id) !== String(pinnedNews?.id ?? ""))
    .slice(0, sectionConfig.news.item_limit);
  const nextMatch = nextMatchResult.data as unknown as ClubMatch | null;
  const lastMatch = lastMatchResult.data as unknown as ClubMatch | null;
  const competition =
    (nextMatch?.competition ||
      lastMatch?.competition ||
      competitionResult.data) as Competition | null;

  const hero = heroResult.data as HomepageHero | null;
  const allPartners = (partnersResult.data ?? []) as Partner[];
  const partners = allPartners.slice(0, sectionConfig.partners.item_limit);
  const albums = (albumsResult.data ?? []) as MediaAlbum[];
  const videos = (videosResult.data ?? []) as MediaVideo[];
  const mediaCards: Array<{ kind: "album"; item: MediaAlbum } | { kind: "video"; item: MediaVideo }> = [];
  for (let index = 0; mediaCards.length < sectionConfig.media.item_limit && (index < albums.length || index < videos.length); index += 1) {
    if (albums[index] && mediaCards.length < sectionConfig.media.item_limit) mediaCards.push({ kind: "album", item: albums[index] });
    if (videos[index] && mediaCards.length < sectionConfig.media.item_limit) mediaCards.push({ kind: "video", item: videos[index] });
  }

  const heroEyebrow = localized(hero?.eyebrow, hero?.eyebrow_ro, locale) || text.heroEyebrow;
  const heroTitleMain = localized(hero?.title_main, hero?.title_main_ro, locale) || text.heroMain;
  const heroTitleAccent = localized(hero?.title_accent, hero?.title_accent_ro, locale) || text.heroAccent;
  const heroDescription = localized(hero?.description, hero?.description_ro, locale) || text.heroDescription;
  const heroOverlay = Math.max(0, Math.min(95, hero?.overlay_opacity ?? 72)) / 100;
  const legacyHeroPosition = legacyHeroCoordinates(hero?.background_position);
  const canvasFallback = defaultHomepageCanvas({
    desktop_position_x: hero?.desktop_position_x ?? legacyHeroPosition.x,
    desktop_position_y: hero?.desktop_position_y ?? legacyHeroPosition.y,
    desktop_zoom_percent: hero?.desktop_zoom_percent,
    mobile_position_x: hero?.mobile_position_x ?? legacyHeroPosition.x,
    mobile_position_y: hero?.mobile_position_y ?? legacyHeroPosition.y,
    mobile_zoom_percent: hero?.mobile_zoom_percent,
    hero_height_desktop: hero?.hero_height_desktop,
    hero_height_mobile: hero?.hero_height_mobile,
    text_alignment: hero?.text_alignment,
    show_match_card: hero?.show_match_card,
  });
  const heroLayers = normalizeHeroLayerConfig(hero?.hero_layer_config, homeHeroLayerDefinitions, defaultHeroLayerConfig(homeHeroLayerDefinitions));
  const heroCanvas = repairHomepageCanvas(normalizeHomepageCanvas(hero?.canvas_config, canvasFallback), canvasFallback, heroLayers);
  const heroTextAlignment = hero?.text_alignment ?? "left";
  const showHeroIntro = heroLayerVisible(heroLayers, "intro");
  const showHeroBackground = heroLayerVisible(heroLayers, "background");
  const showHeroMatchCard = heroLayerVisible(heroLayers, "match_card") && (heroCanvas.desktop.match_visible || heroCanvas.tablet.match_visible || heroCanvas.mobile.match_visible);
  const heroBaseImage = showHeroBackground ? (hero?.background_image_url || hero?.tablet_background_image_url || hero?.mobile_background_image_url || null) : null;
  const heroStyle = {
    "--hero-desktop-x": `${heroCanvas.desktop.background_x}%`,
    "--hero-desktop-y": `${heroCanvas.desktop.background_y}%`,
    "--hero-desktop-zoom": heroCanvas.desktop.background_zoom / 100,
    "--hero-tablet-x": `${heroCanvas.tablet.background_x}%`,
    "--hero-tablet-y": `${heroCanvas.tablet.background_y}%`,
    "--hero-tablet-zoom": heroCanvas.tablet.background_zoom / 100,
    "--hero-mobile-x": `${heroCanvas.mobile.background_x}%`,
    "--hero-mobile-y": `${heroCanvas.mobile.background_y}%`,
    "--hero-mobile-zoom": heroCanvas.mobile.background_zoom / 100,
    "--hero-height-desktop": `${heroCanvas.desktop.hero_height}px`,
    "--hero-height-tablet": `${heroCanvas.tablet.hero_height}px`,
    "--hero-height-mobile": `${heroCanvas.mobile.hero_height}px`,
    "--hero-overlay": heroOverlay,
    "--hero-text-desktop-x": `${heroCanvas.desktop.text_x}%`,
    "--hero-text-desktop-y": `${heroCanvas.desktop.text_y}%`,
    "--hero-text-tablet-x": `${heroCanvas.tablet.text_x}%`,
    "--hero-text-tablet-y": `${heroCanvas.tablet.text_y}%`,
    "--hero-text-mobile-x": `${heroCanvas.mobile.text_x}%`,
    "--hero-text-mobile-y": `${heroCanvas.mobile.text_y}%`,
    "--hero-match-desktop-x": `${heroCanvas.desktop.match_x}%`,
    "--hero-match-desktop-y": `${heroCanvas.desktop.match_y}%`,
    "--hero-match-desktop-width": `${heroCanvas.desktop.match_width}px`,
    "--hero-match-tablet-x": `${heroCanvas.tablet.match_x}%`,
    "--hero-match-tablet-y": `${heroCanvas.tablet.match_y}%`,
    "--hero-match-tablet-width": `${heroCanvas.tablet.match_width}px`,
    "--hero-match-mobile-x": `${heroCanvas.mobile.match_x}%`,
    "--hero-match-mobile-y": `${heroCanvas.mobile.match_y}%`,
    "--hero-match-mobile-width": `${heroCanvas.mobile.match_width}px`,
  } as CSSProperties;
  const matchVisibilityClasses = [
    heroCanvas.desktop.match_visible ? "" : "heroMatchDesktopOff",
    heroCanvas.tablet.match_visible ? "" : "heroMatchTabletOff",
    heroCanvas.mobile.match_visible ? "" : "heroMatchMobileOff",
  ].filter(Boolean).join(" ");

  let standings: StandingEntry[] = [];

  if (competition) {
    const { data } = await supabase
      .from("standings")
      .select(`
        id,competition_id,team_id,wins,draws,losses,goals_for,goals_against,
        points_adjustment,played,goal_difference,points,
        team:teams!standings_team_id_fkey(
          id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active
        )
      `)
      .eq("competition_id", competition.id)
      .order("points", { ascending: false })
      .order("goal_difference", { ascending: false })
      .order("goals_for", { ascending: false });

    standings = (data ?? []) as unknown as StandingEntry[];
  }

  const sectionOuterStyle = (key: HomepageSectionKey) => ({
    "--section-pad-top": `${sectionConfig[key].padding_top}px`,
    "--section-pad-bottom": `${sectionConfig[key].padding_bottom}px`,
    "--section-cols-desktop": sectionConfig[key].columns_desktop,
    "--section-cols-tablet": sectionConfig[key].columns_tablet,
    "--section-cols-mobile": sectionConfig[key].columns_mobile,
  } as CSSProperties);
  const sectionOuterClass = (key: HomepageSectionKey, base: string) => `${base} sectionBuilderPublic sectionBg-${sectionConfig[key].background}`;
  const sectionInnerClass = (key: HomepageSectionKey, extra = "") => `${sectionConfig[key].width === "container" ? "container" : sectionConfig[key].width === "wide" ? "sectionBuilderWide" : "sectionBuilderFull"} ${extra}`.trim();
  const sectionHeadingClass = (key: HomepageSectionKey, defaultDark = false) => {
    const background = sectionConfig[key].background;
    const dark = background === "dark" || background === "brand" || (background === "inherit" && defaultDark);
    return `sectionHeading${dark ? " light" : ""}`;
  };

  const renderSection = (key: HomepageSectionKey) => {
    switch (key) {
      case "matches":
        return (
          <section className={sectionOuterClass(key, "matchStrip")} style={sectionOuterStyle(key)} key={key}>
            <div className={sectionInnerClass(key, "matchGrid sectionBuilderGrid")}>
              <article>
                <span className="sectionLabel">{text.lastMatch}</span>
                {lastMatch ? (
                  <>
                    <HomeStripMatch match={lastMatch} type="finished" />
                    <p>{formatMatchDate(lastMatch.kickoff, locale)}</p>
                    <p className="homeMatchStadium">
                      {lastMatch.stadium || text.stadiumUnknown}
                    </p>
                  </>
                ) : (
                  <>
                    <h3>{text.noResults}</h3>
                    <p>{text.noResultsHint}</p>
                  </>
                )}
              </article>

              <article>
                <span className="sectionLabel">{text.nextMatch}</span>
                {nextMatch ? (
                  <>
                    <HomeStripMatch match={nextMatch} type="next" />
                    <p>{formatMatchDate(nextMatch.kickoff, locale)}</p>
                    <p className="homeMatchStadium">
                      {nextMatch.stadium || text.stadiumUnknown}
                    </p>
                  </>
                ) : (
                  <>
                    <h3>{text.noNextMatch}</h3>
                    <p>{text.noNextMatchHint}</p>
                  </>
                )}
              </article>

              <article>
                <span className="sectionLabel">{text.tournament}</span>
                <h3>
                  {nextMatch?.competition?.name ||
                    lastMatch?.competition?.name ||
                    "Liga 2"}
                </h3>
                <Link href="/matches">{text.calendarResults}</Link>
              </article>
            </div>
          </section>
        );

      case "standings":
        return (
          <section className={sectionOuterClass(key, "section homeStandingsSection")} style={sectionOuterStyle(key)} key={key}>
            <div className={sectionInnerClass(key)}>
              {(sectionConfig[key].show_heading || sectionConfig[key].show_action) && <div className={sectionHeadingClass(key)}>
                {sectionConfig[key].show_heading && <div>
                  <p className="eyebrow blue">{text.standingsEyebrow}</p>
                  <h2>{text.standingsTitle}</h2>
                </div>}
                {sectionConfig[key].show_action && <Link href="/standings">{text.fullStandings}</Link>}
              </div>}

              {standings.length > 0 ? (
                <StandingsTable entries={standings} compact limit={sectionConfig[key].item_limit} locale={locale} />
              ) : (
                <div className="adminEmpty">{text.standingsEmpty}</div>
              )}
            </div>
          </section>
        );

      case "news":
        return (
          <section className={sectionOuterClass(key, "section homeNewsSection")} style={sectionOuterStyle(key)} key={key}>
            <div className={sectionInnerClass(key)}>
              {(sectionConfig[key].show_heading || sectionConfig[key].show_action) && <div className={sectionHeadingClass(key)}>
                {sectionConfig[key].show_heading && <div>
                  <p className="eyebrow blue">{text.newsEyebrow}</p>
                  <h2>{text.newsTitle}</h2>
                </div>}
                {sectionConfig[key].show_action && <Link href="/news">{text.allNews}</Link>}
              </div>}

              {pinnedNews && (
                <Link
                  href={`/news/${pinnedNews.slug}`}
                  className="homePinnedNews"
                >
                  <div className="homePinnedNewsImage">
                    {pinnedNews.cover_image_url ? (
                      <img src={pinnedNews.cover_image_url} alt="" />
                    ) : (
                      <div className="homePinnedNewsFallback">FC EDINEȚ</div>
                    )}
                  </div>
                  <div className="homePinnedNewsBody">
                    <span className="moduleBadge">{text.pinned}</span>
                    <h3>{localized(pinnedNews.title, pinnedNews.title_ro, locale)}</h3>
                    {localized(pinnedNews.excerpt, pinnedNews.excerpt_ro, locale) && (
                      <p>{localized(pinnedNews.excerpt, pinnedNews.excerpt_ro, locale)}</p>
                    )}
                    <b>{text.read}</b>
                  </div>
                </Link>
              )}

              {news.length > 0 ? (
                <div className="homeNewsDbGrid sectionBuilderGrid">
                  {news.map((article) => (
                    <NewsCard key={article.id} article={article} locale={locale} />
                  ))}
                </div>
              ) : pinnedNews ? null : (
                <div className="homeNewsPlaceholder">
                  <div>{locale === "ro" ? "Publică prima știre și va apărea aici." : "Опубликуй первую новость — она появится здесь."}</div>
                </div>
              )}
            </div>
          </section>
        );

      case "players":
        return (
          <section className={sectionOuterClass(key, "section darkSection")} style={sectionOuterStyle(key)} key={key}>
            <div className={sectionInnerClass(key)}>
              {(sectionConfig[key].show_heading || sectionConfig[key].show_action) && <div className={sectionHeadingClass(key, true)}>
                {sectionConfig[key].show_heading && <div>
                  <p className="eyebrow">{text.teamEyebrow}</p>
                  <h2>{text.teamTitle}</h2>
                </div>}
                {sectionConfig[key].show_action && <Link href="/team">{text.allPlayers}</Link>}
              </div>}

              {players.length > 0 ? (
                <div className="players sectionBuilderGrid">
                  {players.map((player) => (
                    <PlayerCard key={player.id} player={player} locale={locale} />
                  ))}
                </div>
              ) : (
                <div className="emptyBox">{locale === "ro" ? "Adaugă jucători și vor apărea aici." : "Добавь игроков — они появятся здесь."}</div>
              )}
            </div>
          </section>
        );

      case "media":
        return (
          <section className={sectionOuterClass(key, "section homeMediaSection")} style={sectionOuterStyle(key)} key={key}>
            <div className={sectionInnerClass(key)}>
              {(sectionConfig[key].show_heading || sectionConfig[key].show_action) && <div className={sectionHeadingClass(key)}>
                {sectionConfig[key].show_heading && <div>
                  <p className="eyebrow blue">{text.mediaEyebrow}</p>
                  <h2>{text.mediaTitle}</h2>
                </div>}
                {sectionConfig[key].show_action && <Link href="/media">{text.allMedia}</Link>}
              </div>}

              {mediaCards.length > 0 ? (
                <div className="homeMediaGrid sectionBuilderGrid">
                  {mediaCards.map((entry) => entry.kind === "album" ? (
                    <Link href={`/media/${entry.item.slug}`} className="homeMediaCard" key={`album-${entry.item.id}`}>
                      <div className="homeMediaImage">
                        {entry.item.cover_image_url ? <img src={entry.item.cover_image_url} alt="" /> : <div className="homeMediaFallback">{text.album}</div>}
                      </div>
                      <div><span>{text.album.toUpperCase()}</span><h3>{entry.item.title}</h3></div>
                    </Link>
                  ) : (
                    <a href={entry.item.youtube_url} target="_blank" rel="noopener noreferrer" className="homeMediaCard" key={`video-${entry.item.id}`}>
                      <div className="homeMediaImage"><img src={`https://img.youtube.com/vi/${entry.item.youtube_id}/hqdefault.jpg`} alt="" /><span className="homeMediaPlay">▶</span></div>
                      <div><span>{text.video.toUpperCase()}</span><h3>{entry.item.title}</h3></div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="adminEmpty">
                  {locale === "ro" ? "Publică un album foto sau un video și va apărea aici." : "Опубликуй фотоальбом или видео — они появятся здесь."}
                </div>
              )}
            </div>
          </section>
        );

      case "partners":
        if (partners.length === 0) return null;

        return (
          <section className={sectionOuterClass(key, "section homePartnersSection")} style={sectionOuterStyle(key)} key={key}>
            <div className={sectionInnerClass(key)}>
              {(sectionConfig[key].show_heading || sectionConfig[key].show_action) && <div className={sectionHeadingClass(key)}>
                {sectionConfig[key].show_heading && <div>
                  <p className="eyebrow blue">{text.partnersEyebrow}</p>
                  <h2>{text.partnersTitle}</h2>
                </div>}
                {sectionConfig[key].show_action && <Link href="/partners">{text.allPartners}</Link>}
              </div>}

              <div className="homePartnersGrid sectionBuilderGrid">
                {partners.map((partner) => {
                  const logo = (
                    <div className="homePartnerLogo">
                      <img src={partner.logo_url} alt={partner.name} />
                    </div>
                  );

                  return partner.website_url ? (
                    <a
                      className="homePartnerCard"
                      href={partner.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={partner.id}
                      title={partner.name}
                    >
                      {logo}
                    </a>
                  ) : (
                    <div
                      className="homePartnerCard"
                      key={partner.id}
                      title={partner.name}
                    >
                      {logo}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
    }
  };

  const renderCustomBlock = (block: HomepagePublishedBlock) => {
    const design = block.design;
    const content = block.content;
    const outerStyle = {
      "--section-pad-top": `${design.padding_top}px`,
      "--section-pad-bottom": `${design.padding_bottom}px`,
      "--section-cols-desktop": design.columns_desktop,
      "--section-cols-tablet": design.columns_tablet,
      "--section-cols-mobile": design.columns_mobile,
    } as CSSProperties;
    const innerClass = design.width === "container" ? "container" : design.width === "wide" ? "sectionBuilderWide" : "sectionBuilderFull";
    const dark = design.background === "dark" || design.background === "brand";
    const title = localized(content.title_ru, content.title_ro, locale);
    const eyebrowText = localized(content.eyebrow_ru, content.eyebrow_ro, locale);
    const body = localized(content.text_ru, content.text_ro, locale);
    const buttonText = localized(content.button_text_ru, content.button_text_ro, locale);
    const blockClass = `section customHomeBlock customBlock-${block.type} sectionBuilderPublic sectionBg-${design.background} textAlign-${design.text_align}`;
    const heading = (title || eyebrowText) ? <div className={`sectionHeading ${dark ? "light" : ""}`}><div>{eyebrowText && <p className="eyebrow blue">{eyebrowText}</p>}{title && <h2>{title}</h2>}</div></div> : null;

    if (block.type === "text") return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={innerClass}>{heading}{body && <div className="customBlockRichText"><p>{body}</p></div>}</div></section>;
    if (block.type === "image") return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={innerClass}>{heading}{content.image_url ? <img className="customBlockImage" src={content.image_url} alt={localized(content.image_alt_ru, content.image_alt_ro, locale)} /> : <div className="adminEmpty">{locale === "ro" ? "Selectează o imagine în Visual Editor." : "Выбери изображение в Visual Editor."}</div>}</div></section>;
    if (block.type === "text_image") return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={`${innerClass} customTextImage ${design.image_position === "left" ? "imageLeft" : "imageRight"}`}><div className="customTextImageCopy">{heading}{body && <p>{body}</p>}{buttonText && content.button_href && <Link className="primaryButton" href={content.button_href}>{buttonText}</Link>}</div><div className="customTextImageMedia">{content.image_url ? <img src={content.image_url} alt={localized(content.image_alt_ru, content.image_alt_ro, locale)} /> : <span>FC EDINEȚ</span>}</div></div></section>;
    if (block.type === "cta") return <section className={blockClass} style={{...outerStyle, ...(content.image_url ? { backgroundImage:`linear-gradient(rgba(4,18,40,.72),rgba(4,18,40,.72)),url("${content.image_url}")` } : {})}} key={`block-${block.id}`}><div className={`${innerClass} customCtaInner`}><div>{eyebrowText && <p className="eyebrow">{eyebrowText}</p>}{title && <h2>{title}</h2>}{body && <p>{body}</p>}</div>{buttonText && content.button_href && <Link className="primaryButton" href={content.button_href}>{buttonText}</Link>}</div></section>;
    if (block.type === "news") return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={innerClass}>{heading}<div className="homeNewsDbGrid sectionBuilderGrid">{allNews.slice(0, design.item_limit).map((article)=><NewsCard key={article.id} article={article} locale={locale}/>)}</div></div></section>;
    if (block.type === "players") return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={innerClass}>{heading}<div className="players sectionBuilderGrid">{allPlayers.slice(0, design.item_limit).map((player)=><PlayerCard key={player.id} player={player} locale={locale}/>)}</div></div></section>;
    if (block.type === "media") {
      const cards: Array<{ kind:"album"; item:MediaAlbum }|{ kind:"video"; item:MediaVideo }> = [];
      for (let i=0; cards.length < design.item_limit && (i<albums.length || i<videos.length); i+=1) { if (albums[i] && cards.length<design.item_limit) cards.push({kind:"album",item:albums[i]}); if (videos[i] && cards.length<design.item_limit) cards.push({kind:"video",item:videos[i]}); }
      return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={innerClass}>{heading}<div className="homeMediaGrid sectionBuilderGrid">{cards.map((entry)=>entry.kind === "album" ? <Link href={`/media/${entry.item.slug}`} className="homeMediaCard" key={`cb-a-${entry.item.id}`}><div className="homeMediaImage">{entry.item.cover_image_url ? <img src={entry.item.cover_image_url} alt=""/> : <div className="homeMediaFallback">{text.album}</div>}</div><div><span>{text.album.toUpperCase()}</span><h3>{entry.item.title}</h3></div></Link> : <a href={entry.item.youtube_url} target="_blank" rel="noopener noreferrer" className="homeMediaCard" key={`cb-v-${entry.item.id}`}><div className="homeMediaImage"><img src={`https://img.youtube.com/vi/${entry.item.youtube_id}/hqdefault.jpg`} alt=""/><span className="homeMediaPlay">▶</span></div><div><span>{text.video.toUpperCase()}</span><h3>{entry.item.title}</h3></div></a>)}</div></div></section>;
    }
    if (block.type === "partners") return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={innerClass}>{heading}<div className="homePartnersGrid sectionBuilderGrid">{allPartners.slice(0, design.item_limit).map((partner)=>partner.website_url ? <a className="homePartnerCard" href={partner.website_url} target="_blank" rel="noopener noreferrer" key={`cb-p-${partner.id}`}><div className="homePartnerLogo"><img src={partner.logo_url} alt={partner.name}/></div></a> : <div className="homePartnerCard" key={`cb-p-${partner.id}`}><div className="homePartnerLogo"><img src={partner.logo_url} alt={partner.name}/></div></div>)}</div></div></section>;
    if (block.type === "next_match") return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={innerClass}>{heading}<div className="customNextMatch">{nextMatch ? <><p>{nextMatch.competition?.name ?? "Матч"}</p><HomeStripMatch match={nextMatch} type="next"/><strong>{formatMatchDate(nextMatch.kickoff, locale)}</strong><span>{nextMatch.stadium || text.stadiumUnknown}</span><Link href="/matches">{publicText[locale].matches.title} →</Link></> : <div className="adminEmpty">{locale === "ro" ? "Următorul meci nu a fost încă adăugat." : "Следующий матч пока не добавлен."}</div>}</div></div></section>;
    if (block.type === "standings") return <section className={blockClass} style={outerStyle} key={`block-${block.id}`}><div className={innerClass}>{heading}{standings.length ? <StandingsTable entries={standings} compact limit={design.item_limit} locale={locale}/> : <div className="adminEmpty">{text.standingsEmpty}</div>}</div></section>;
    return null;
  };

  const homepageLayout = [
    ...sections.filter((section) => section.is_enabled).map((section) => ({ kind: "section" as const, order: section.display_order, section })),
    ...customBlocks.filter((block) => block.enabled).map((block) => ({ kind: "block" as const, order: block.display_order, block })),
  ].sort((a, b) => a.order - b.order);

  return (
    <main>
      <section
        className={`hero visualHero canvasPublicHero heroTextAlign-${heroTextAlignment} ${showHeroMatchCard ? "" : "heroWithoutMatch"} ${matchVisibilityClasses}`}
        style={heroStyle}
      >
        {heroBaseImage && (
          <div className="heroVisualMedia" aria-hidden="true">
            <picture>
              {hero?.mobile_background_image_url && (
                <source media="(max-width: 680px)" srcSet={hero.mobile_background_image_url} />
              )}
              {hero?.tablet_background_image_url && (
                <source media="(max-width: 980px)" srcSet={hero.tablet_background_image_url} />
              )}
              <img src={heroBaseImage} alt="" />
            </picture>
            <span className="heroVisualOverlay" />
          </div>
        )}

        <div className={`container heroContent canvasPublicHeroContent ${showHeroMatchCard ? "" : "heroContentSingle"}`}>
          {showHeroIntro && <div className="heroIntro" style={{ zIndex: heroLayerState(heroLayers, "intro").order }}>
            <p className="eyebrow">{heroEyebrow}</p>
            <h1>
              {heroTitleMain}
              <span>{heroTitleAccent}</span>
            </h1>
            <p className="heroText">{heroDescription}</p>

            <div className="heroActions">
              {(hero?.show_primary_button ?? true) && (
                <Link className="primaryButton" href={hero?.primary_button_href || "/matches"}>
                  {localized(hero?.primary_button_text, hero?.primary_button_text_ro, locale) || (locale === "ro" ? "Vezi meciurile" : "Смотреть матчи")}
                </Link>
              )}

              {(hero?.show_secondary_button ?? true) && (
                <Link className="secondaryButton" href={hero?.secondary_button_href || "/news"}>
                  {localized(hero?.secondary_button_text, hero?.secondary_button_text_ro, locale) || (locale === "ro" ? "Ultimele știri" : "Последние новости")}
                </Link>
              )}
            </div>
          </div>}

          {showHeroMatchCard && (
            <aside className="heroMatchCard" style={{ zIndex: heroLayerState(heroLayers, "match_card").order }}>
              <span className="matchTag">{text.nextMatch}</span>
              {nextMatch ? (
                <>
                  <p className="competition">
                    {nextMatch.competition?.name ?? "Матч"}
                    {nextMatch.round ? ` • ${nextMatch.round}` : ""}
                  </p>

                  <div className="heroTeams">
                    <HeroTeam team={nextMatch.home} />
                    <b>VS</b>
                    <HeroTeam team={nextMatch.away} />
                  </div>

                  <div className="matchMeta">
                    <span>{formatMatchDate(nextMatch.kickoff, locale)}</span>
                    <span>{nextMatch.stadium || text.stadiumUnknown}</span>
                  </div>
                </>
              ) : (
                <div className="noNextMatch">
                  {locale === "ro" ? "Următorul meci nu a fost încă adăugat." : "Следующий матч пока не добавлен в админке."}
                </div>
              )}
              <Link href="/matches">{publicText[locale].matches.title} →</Link>
            </aside>
          )}
        </div>
      </section>

      {settings?.banner_enabled && (
        <section
          className={`homeSpecialBanner ${settings.banner_image_url ? "withImage" : ""}`}
          style={
            settings.banner_image_url
              ? {
                  backgroundImage: `linear-gradient(rgba(4,18,40,${Math.max(0, Math.min(95, settings.banner_overlay_opacity)) / 100}),rgba(4,18,40,${Math.max(0, Math.min(95, settings.banner_overlay_opacity)) / 100})),url("${settings.banner_image_url}")`,
                  backgroundPosition: settings.banner_background_position,
                }
              : undefined
          }
        >
          <div className="container homeSpecialBannerInner">
            <div>
              <p className="eyebrow">{localized(settings.banner_eyebrow, settings.banner_eyebrow_ro, locale)}</p>
              <h2>{localized(settings.banner_title, settings.banner_title_ro, locale)}</h2>
              {localized(settings.banner_text, settings.banner_text_ro, locale) && <p>{localized(settings.banner_text, settings.banner_text_ro, locale)}</p>}
            </div>
            <Link className="primaryButton" href={settings.banner_button_href || "/club"}>
              {localized(settings.banner_button_text, settings.banner_button_text_ro, locale) || text.more}
            </Link>
          </div>
        </section>
      )}

      {homepageLayout.map((item) => item.kind === "section" ? renderSection(item.section.section_key) : renderCustomBlock(item.block))}
    </main>
  );
}

function HomeStripMatch({ match, type }: { match: ClubMatch; type: "finished" | "next" }) {
  return (
    <div className="homeStripMatch">
      <StripTeam team={match.home} />
      <div className="homeStripCenter">
        <b>
          {type === "finished"
            ? `${match.home_score ?? 0} : ${match.away_score ?? 0}`
            : "VS"}
        </b>
      </div>
      <StripTeam team={match.away} />
    </div>
  );
}

function StripTeam({ team }: { team: ClubMatch["home"] }) {
  return (
    <div className="homeStripTeam">
      {team?.logo_url ? (
        <img className="homeStripLogo" src={team.logo_url} alt="" />
      ) : (
        <div className={`homeStripFallback ${team?.is_club ? "club" : ""}`}>
          {(team?.short_name || team?.name || "FC").slice(0, 3).toUpperCase()}
        </div>
      )}
      <span>{team?.short_name || team?.name || "Команда"}</span>
    </div>
  );
}

function HeroTeam({ team }: { team: ClubMatch["home"] }) {
  return (
    <div>
      {team?.logo_url ? (
        <img className="miniCrestImage" src={team.logo_url} alt="" />
      ) : (
        <div className={`miniCrest ${team?.is_club ? "" : "muted"}`}>
          {(team?.short_name || team?.name || "FC").slice(0, 3).toUpperCase()}
        </div>
      )}
      <strong>{team?.short_name || team?.name || "Команда"}</strong>
    </div>
  );
}

function formatMatchDate(value: string, locale: Locale) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "long",
    timeZone: "Europe/Chisinau",
  }).format(date);
  const time = new Intl.DateTimeFormat(dateLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Chisinau",
  }).format(date);
  return `${day} • ${time}`;
}

function legacyHeroCoordinates(position?: HomepageHero["background_position"] | null) {
  if (position === "top") return { x: 50, y: 0 };
  if (position === "bottom") return { x: 50, y: 100 };
  if (position === "left") return { x: 0, y: 50 };
  if (position === "right") return { x: 100, y: 50 };
  return { x: 50, y: 50 };
}

function matchSelect() {
  return `
    id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
    home_score,away_score,notes,
    home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
    away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
    competition:competitions!matches_competition_id_fkey(id,name,slug,season,is_active)
  `;
}
