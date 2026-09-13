import type { CSSProperties } from "react";
import Link from "next/link";
import PlayerCard from "@/app/components/PlayerCard";
import NewsCard from "@/app/components/NewsCard";
import StandingsTable from "@/app/components/StandingsTable";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { dateLocale, localized, publicText, type Locale } from "@/lib/i18n";
import { defaultHomepageCanvas, normalizeHomepageCanvas } from "@/lib/homepage-canvas";
import { defaultHeroLayerConfig, heroLayerState, heroLayerVisible, homeHeroLayerDefinitions, normalizeHeroLayerConfig } from "@/lib/hero-builder";
import type {
  ClubMatch,
  Competition,
  HomepageHero,
  HomepageSection,
  HomepageSectionKey,
  HomepageSettings,
  MediaAlbum,
  MediaVideo,
  NewsArticle,
  Partner,
  Player,
  StandingEntry,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const defaultSectionOrder: HomepageSection[] = [
  { section_key: "matches", is_enabled: true, display_order: 10, updated_at: "" },
  { section_key: "standings", is_enabled: true, display_order: 20, updated_at: "" },
  { section_key: "news", is_enabled: true, display_order: 30, updated_at: "" },
  { section_key: "players", is_enabled: true, display_order: 40, updated_at: "" },
  { section_key: "media", is_enabled: true, display_order: 50, updated_at: "" },
  { section_key: "partners", is_enabled: true, display_order: 60, updated_at: "" },
];

export default async function Home() {
  const locale = await getLocale();
  const text = publicText[locale].home;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [heroResult, settingsResult, sectionsResult] = await Promise.all([
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
  ]);

  const settings = settingsResult.data as HomepageSettings | null;
  const storedSections = (sectionsResult.data ?? []) as HomepageSection[];
  const sectionMap = new Map(
    storedSections.map((section) => [section.section_key, section])
  );
  const sections = defaultSectionOrder
    .map((fallback) => sectionMap.get(fallback.section_key) ?? fallback)
    .sort((a, b) => a.display_order - b.display_order);

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
      .limit(4),
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
      .limit(6),
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
      .limit(12),
    supabase
      .from("media_albums")
      .select("*")
      .eq("is_published", true)
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("display_order", { ascending: true })
      .limit(3),
    supabase
      .from("media_videos")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("display_order", { ascending: true })
      .limit(2),
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

  const players = (playersResult.data ?? []) as Player[];
  const allNews = (newsResult.data ?? []) as unknown as NewsArticle[];
  const pinnedNews = pinnedNewsResult.data as unknown as NewsArticle | null;
  const news = allNews
    .filter((article) => String(article.id) !== String(pinnedNews?.id ?? ""))
    .slice(0, 4);
  const nextMatch = nextMatchResult.data as unknown as ClubMatch | null;
  const lastMatch = lastMatchResult.data as unknown as ClubMatch | null;
  const competition =
    (nextMatch?.competition ||
      lastMatch?.competition ||
      competitionResult.data) as Competition | null;

  const hero = heroResult.data as HomepageHero | null;
  const partners = (partnersResult.data ?? []) as Partner[];
  const albums = (albumsResult.data ?? []) as MediaAlbum[];
  const videos = (videosResult.data ?? []) as MediaVideo[];

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
  const heroCanvas = normalizeHomepageCanvas(hero?.canvas_config, canvasFallback);
  const heroLayers = normalizeHeroLayerConfig(hero?.hero_layer_config, homeHeroLayerDefinitions, defaultHeroLayerConfig(homeHeroLayerDefinitions));
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

  const renderSection = (key: HomepageSectionKey) => {
    switch (key) {
      case "matches":
        return (
          <section className="matchStrip" key={key}>
            <div className="container matchGrid">
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
          <section className="section homeStandingsSection" key={key}>
            <div className="container">
              <div className="sectionHeading">
                <div>
                  <p className="eyebrow blue">{text.standingsEyebrow}</p>
                  <h2>{text.standingsTitle}</h2>
                </div>
                <Link href="/standings">{text.fullStandings}</Link>
              </div>

              {standings.length > 0 ? (
                <StandingsTable entries={standings} compact limit={5} locale={locale} />
              ) : (
                <div className="adminEmpty">{text.standingsEmpty}</div>
              )}
            </div>
          </section>
        );

      case "news":
        return (
          <section className="section homeNewsSection" key={key}>
            <div className="container">
              <div className="sectionHeading">
                <div>
                  <p className="eyebrow blue">{text.newsEyebrow}</p>
                  <h2>{text.newsTitle}</h2>
                </div>
                <Link href="/news">{text.allNews}</Link>
              </div>

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
                <div className="homeNewsDbGrid">
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
          <section className="section darkSection" key={key}>
            <div className="container">
              <div className="sectionHeading light">
                <div>
                  <p className="eyebrow">{text.teamEyebrow}</p>
                  <h2>{text.teamTitle}</h2>
                </div>
                <Link href="/team">{text.allPlayers}</Link>
              </div>

              {players.length > 0 ? (
                <div className="players">
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
          <section className="section homeMediaSection" key={key}>
            <div className="container">
              <div className="sectionHeading">
                <div>
                  <p className="eyebrow blue">{text.mediaEyebrow}</p>
                  <h2>{text.mediaTitle}</h2>
                </div>
                <Link href="/media">{text.allMedia}</Link>
              </div>

              {albums.length > 0 || videos.length > 0 ? (
                <div className="homeMediaGrid">
                  {albums.map((album) => (
                    <Link
                      href={`/media/${album.slug}`}
                      className="homeMediaCard"
                      key={`album-${album.id}`}
                    >
                      <div className="homeMediaImage">
                        {album.cover_image_url ? (
                          <img src={album.cover_image_url} alt="" />
                        ) : (
                          <div className="homeMediaFallback">{text.album}</div>
                        )}
                      </div>
                      <div>
                        <span>{text.album.toUpperCase()}</span>
                        <h3>{album.title}</h3>
                      </div>
                    </Link>
                  ))}

                  {videos.map((video) => (
                    <a
                      href={video.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="homeMediaCard"
                      key={`video-${video.id}`}
                    >
                      <div className="homeMediaImage">
                        <img
                          src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                          alt=""
                        />
                        <span className="homeMediaPlay">▶</span>
                      </div>
                      <div>
                        <span>{text.video.toUpperCase()}</span>
                        <h3>{video.title}</h3>
                      </div>
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
          <section className="section homePartnersSection" key={key}>
            <div className="container">
              <div className="sectionHeading">
                <div>
                  <p className="eyebrow blue">{text.partnersEyebrow}</p>
                  <h2>{text.partnersTitle}</h2>
                </div>
                <Link href="/partners">{text.allPartners}</Link>
              </div>

              <div className="homePartnersGrid">
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

      {sections
        .filter((section) => section.is_enabled)
        .map((section) => renderSection(section.section_key))}
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
