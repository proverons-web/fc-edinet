import type { CSSProperties } from "react";
import Link from "next/link";
import StandingsTable from "@/app/components/StandingsTable";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { dateLocale, localized, publicText, type Locale } from "@/lib/i18n";
import { newsCoverStyle } from "@/lib/news-cover";
import { defaultHomepageCanvas, normalizeHomepageCanvas } from "@/lib/homepage-canvas";
import { repairHomepageCanvas } from "@/lib/homepage-safe-zone";
import { defaultHeroLayerConfig, heroLayerState, heroLayerStyle, heroLayerVisible, homeHeroLayerDefinitions, normalizeHeroLayerConfig } from "@/lib/hero-builder";
import type {
  ClubMatch,
  Competition,
  HomepageHero,
  HomepageSection,
  HomepageSettings,
  NewsArticle,
  Partner,
  Player,
  StandingEntry,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const CLUB_LOGO = "/brand/fc-edinet-crest.png";

export default async function Home() {
  const locale = await getLocale();
  const text = publicText[locale].home;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [heroResult, settingsResult, sectionsResult] = await Promise.all([
    supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_sections").select("*").order("display_order", { ascending: true }),
  ]);

  const hero = heroResult.data as HomepageHero | null;
  const settings = settingsResult.data as HomepageSettings | null;
  const sectionRows = (sectionsResult.data ?? []) as HomepageSection[];
  const sectionEnabled = (key: string) => sectionRows.find((row) => row.section_key === key)?.is_enabled !== false;

  const [playersResult, newsResult, nextMatchResult, lastMatchResult, competitionResult, partnersResult, pinnedNewsResult] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(8),
    supabase
      .from("news")
      .select(`
        id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,cover_position_x,cover_position_y,cover_zoom,author_name,status,
        published_at,views,is_featured,category_id,
        category:news_categories(id,name,name_ro,slug)
      `)
      .eq("status", "published")
      .lte("published_at", now)
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(8),
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
      .limit(20),
    settings?.show_pinned_news && settings.pinned_news_id
      ? supabase
          .from("news")
          .select(`
            id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,cover_position_x,cover_position_y,cover_zoom,author_name,status,
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
  const nextMatch = nextMatchResult.data as unknown as ClubMatch | null;
  const lastMatch = lastMatchResult.data as unknown as ClubMatch | null;
  const competition = (nextMatch?.competition || lastMatch?.competition || competitionResult.data) as Competition | null;
  const partners = (partnersResult.data ?? []) as Partner[];

  const leadNews = pinnedNews || allNews[0] || null;
  const latestNews = allNews.filter((article) => String(article.id) !== String(leadNews?.id ?? "")).slice(0, 3);

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

  const heroTitleMain = localized(hero?.title_main, hero?.title_main_ro, locale) || (locale === "ro" ? "UN ORAȘ. O ECHIPĂ." : "ОДИН ГОРОД. ОДНА КОМАНДА.");
  const heroTitleAccent = localized(hero?.title_accent, hero?.title_accent_ro, locale) || (locale === "ro" ? "ȚINTE MAI MARI" : "БОЛЬШИЕ ЦЕЛИ");
  const heroDescription = localized(hero?.description, hero?.description_ro, locale) || (locale === "ro" ? "FC Edineț — forța Nordului. Împreună spre noi victorii!" : "FC Edineț — сила Севера. Вместе к новым победам!");
  const heroOverlay = Math.max(0, Math.min(95, hero?.overlay_opacity ?? 42)) / 100;
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
  const showHeroIntro = heroLayerVisible(heroLayers, "intro");
  const showHeroBackground = heroLayerVisible(heroLayers, "background");
  const showHeroMatchCard = sectionEnabled("matches") && heroLayerVisible(heroLayers, "match_card") && (heroCanvas.desktop.match_visible || heroCanvas.tablet.match_visible || heroCanvas.mobile.match_visible);
  const heroBaseImage = hero?.background_image_url || hero?.tablet_background_image_url || hero?.mobile_background_image_url || null;
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
    "--hero-overlay": heroOverlay,
  } as CSSProperties;

  return (
    <main className="fcRefHome">
      <section className="fcRefHero" style={heroStyle}>
        <div className="fcRefHeroMedia" aria-hidden="true" style={{ display: showHeroBackground ? undefined : "none" }}>
          {heroBaseImage ? (
            <picture>
              {hero?.mobile_background_image_url && <source media="(max-width: 680px)" srcSet={hero.mobile_background_image_url} />}
              {hero?.tablet_background_image_url && <source media="(max-width: 980px)" srcSet={hero.tablet_background_image_url} />}
              <img src={heroBaseImage} alt="" />
            </picture>
          ) : (
            <div className="fcRefHeroFallback"><img src={CLUB_LOGO} alt="" /></div>
          )}
          <span className="fcRefHeroOverlay" />
        </div>

        <div className="container fcRefHeroGrid">
          <div className="fcRefHeroCopy" data-hero-layer="intro" style={{ zIndex: heroLayerState(heroLayers, "intro").order, display: showHeroIntro ? undefined : "none" }}>
            <div className="fcRefHeroKicker" style={heroLayerStyle(heroLayers, "intro")}>FC EDINEȚ • MOLDOVA</div>
            <h1 style={heroLayerStyle(heroLayers, "intro")}>{heroTitleMain}<span>{heroTitleAccent}</span></h1>
            <p style={heroLayerStyle(heroLayers, "intro")}>{heroDescription}</p>
            <div className="fcRefHeroActions">
              <Link className="fcYellowButton" href={hero?.primary_button_href || "/club"}>
                {localized(hero?.primary_button_text, hero?.primary_button_text_ro, locale) || (locale === "ro" ? "DRUMUL NOSTRU" : "НАШ ПУТЬ")} <span>→</span>
              </Link>
              {(hero?.show_secondary_button ?? false) && <Link className="fcGhostButton" href={hero?.secondary_button_href || "/news"}>{localized(hero?.secondary_button_text, hero?.secondary_button_text_ro, locale) || text.allNews}</Link>}
            </div>
          </div>

          <aside className="fcRefNextMatch" data-hero-layer="match_card" style={{ zIndex: heroLayerState(heroLayers, "match_card").order, display: showHeroMatchCard ? undefined : "none" }}>
            <div className="fcRefMatchHead"><strong>{locale === "ro" ? "URMĂTORUL MECI" : "СЛЕДУЮЩИЙ МАТЧ"}</strong><Link href="/matches">{locale === "ro" ? "TOATE MECIURILE" : "ВСЕ МАТЧИ"} →</Link></div>
            {nextMatch ? <>
              <div className="fcRefCompetition">{nextMatch.competition?.name || competition?.name || "Liga 2"}{nextMatch.round ? <span>{nextMatch.round}</span> : null}</div>
              <div className="fcRefMatchTeams">
                <ReferenceTeam team={nextMatch.home} />
                <div className="fcRefVs">VS</div>
                <ReferenceTeam team={nextMatch.away} />
              </div>
              <div className="fcRefMatchFacts">
                <span><b>▣</b>{formatMatchDay(nextMatch.kickoff, locale)}</span>
                <span><b>◷</b>{formatMatchTime(nextMatch.kickoff, locale)}</span>
                <span><b>⌖</b>{nextMatch.stadium || text.stadiumUnknown}</span>
              </div>
              <Link href="/matches" className="fcYellowButton fcRefMatchButton">{locale === "ro" ? "DETALII MECI" : "ПОДРОБНЕЕ О МАТЧЕ"} <span>→</span></Link>
            </> : <div className="fcRefNoMatch">{locale === "ro" ? "Următorul meci nu a fost încă programat." : "Следующий матч пока не назначен."}</div>}
          </aside>
        </div>

        <div className="container fcRefHeroBottom">
          <span>TRADIȚIE</span><i>•</i><span>UNITATE</span><i>•</i><span>VICTORIE</span>
          <strong>EDINEȚ<br/>ALWAYS FORWARD</strong>
        </div>
      </section>

      {settings?.banner_enabled && <section className="fcRefAnnouncement"><div className="container fcRefAnnouncementInner"><div><small>{localized(settings.banner_eyebrow, settings.banner_eyebrow_ro, locale)}</small><strong>{localized(settings.banner_title, settings.banner_title_ro, locale)}</strong></div><Link href={settings.banner_button_href || "/club"}>{localized(settings.banner_button_text, settings.banner_button_text_ro, locale) || text.more} →</Link></div></section>}

      {(sectionEnabled("news") || sectionEnabled("standings")) && <section className="fcRefDashboardSection">
        <div className="container fcRefDashboard">
          {sectionEnabled("news") && <>
            <div className="fcRefLeadColumn">
              {leadNews ? <Link href={`/news/${leadNews.slug}`} className="fcRefLeadNews">
                <div className="fcRefLeadNewsMedia">{leadNews.cover_image_url ? <img className="newsCoverManaged" src={leadNews.cover_image_url} alt="" style={newsCoverStyle(leadNews)} /> : <div className="fcRefNewsFallback">FC EDINEȚ</div>}<span>{locale === "ro" ? "ȘTIREA PRINCIPALĂ" : "ГЛАВНАЯ НОВОСТЬ"}</span></div>
                <div className="fcRefLeadNewsBody"><time>{formatNewsDate(leadNews.published_at, locale)}</time><h2>{localized(leadNews.title, leadNews.title_ro, locale)}</h2>{localized(leadNews.excerpt, leadNews.excerpt_ro, locale) && <p>{localized(leadNews.excerpt, leadNews.excerpt_ro, locale)}</p>}<b>{locale === "ro" ? "CITEȘTE" : "ЧИТАТЬ ДАЛЬШЕ"} →</b></div>
              </Link> : <div className="fcRefEmptyCard">{locale === "ro" ? "Publică prima știre." : "Опубликуй первую новость."}</div>}
            </div>

            <div className="fcRefLatestColumn">
              <div className="fcRefPanelTitle"><h2>{locale === "ro" ? "ULTIMELE ȘTIRI" : "ПОСЛЕДНИЕ НОВОСТИ"}</h2><Link href="/news">{locale === "ro" ? "TOATE ȘTIRILE" : "ВСЕ НОВОСТИ"} →</Link></div>
              <div className="fcRefNewsList">{latestNews.length ? latestNews.map((article) => <Link key={article.id} href={`/news/${article.slug}`} className="fcRefNewsRow"><div>{article.cover_image_url ? <img className="newsCoverManaged" src={article.cover_image_url} alt="" style={newsCoverStyle(article)} /> : <span>FCE</span>}</div><section><time>{formatNewsDate(article.published_at, locale)}</time><h3>{localized(article.title, article.title_ro, locale)}</h3></section></Link>) : <div className="fcRefEmptyCard compact">{locale === "ro" ? "Nu sunt alte știri." : "Других новостей пока нет."}</div>}</div>
            </div>
          </>}

          {sectionEnabled("standings") && <div className="fcRefTableColumn">
            <div className="fcRefPanelTitle"><h2>{locale === "ro" ? "CLASAMENT" : "ТУРНИРНАЯ ТАБЛИЦА"}</h2><Link href="/standings">{locale === "ro" ? "TOT CLASAMENTUL" : "ВСЯ ТАБЛИЦА"} →</Link></div>
            {standings.length ? <StandingsTable entries={standings} compact limit={8} locale={locale} /> : <div className="fcRefEmptyCard compact">{text.standingsEmpty}</div>}
          </div>}
        </div>
      </section>}

      {sectionEnabled("players") && <section className="fcRefTeamSection">
        <div className="container">
          <div className="fcRefTeamHead"><div><h2>{locale === "ro" ? "ECHIPA NOASTRĂ" : "НАША КОМАНДА"}</h2><p>{locale === "ro" ? "TALENT. CARACTER. UNITATE." : "ТАЛАНТ. ХАРАКТЕР. ЕДИНСТВО."}</p></div><Link href="/team" className="fcOutlineButton">{locale === "ro" ? "TOT LOTUL" : "ВЕСЬ СОСТАВ"} →</Link></div>
          <div className="fcRefPlayers">{players.slice(0,4).map((player) => <ReferencePlayer key={player.id} player={player} locale={locale} />)}</div>
          <div className="fcRefSignature">Edineț<br/><span>{locale === "ro" ? "în inima noastră!" : "в нашем сердце!"}</span></div>
        </div>
      </section>}

      {sectionEnabled("partners") && <section className="fcRefPartnersStrip"><div className="container fcRefPartnersInner"><strong>{locale === "ro" ? "PARTENERII NOȘTRI" : "НАШИ ПАРТНЁРЫ"}</strong><div className="fcRefPartnerLogos">{partners.map((partner) => partner.website_url ? <a key={partner.id} href={partner.website_url} target="_blank" rel="noreferrer"><img src={partner.logo_url} alt={partner.name}/></a> : <span key={partner.id}><img src={partner.logo_url} alt={partner.name}/></span>)}</div><Link href="/partners">{locale === "ro" ? "ÎMPREUNĂ CONSTRUIM MAI MULT" : "ВМЕСТЕ СТРОИМ БОЛЬШЕ"}</Link></div></section>}
    </main>
  );
}

function ReferenceTeam({ team }: { team: ClubMatch["home"] }) {
  const logo = team?.logo_url || (team?.is_club ? CLUB_LOGO : null);
  return <div className="fcRefTeamBadge">{logo ? <img src={logo} alt="" /> : <span>{(team?.short_name || team?.name || "FC").slice(0,3).toUpperCase()}</span>}<strong>{team?.short_name || team?.name || "Команда"}</strong></div>;
}

function ReferencePlayer({ player, locale }: { player: Player; locale: Locale }) {
  const fullName = `${player.first_name} ${player.last_name}`.trim();
  const positionMap = locale === "ro"
    ? { goalkeeper: "PORTAR", defender: "FUNDAȘ", midfielder: "MIJLOCAȘ", forward: "ATACANT" }
    : { goalkeeper: "ВРАТАРЬ", defender: "ЗАЩИТНИК", midfielder: "ПОЛУЗАЩИТНИК", forward: "НАПАДАЮЩИЙ" };
  return <Link href={`/team/${player.slug}`} className="fcRefPlayerCard">
    <div className="fcRefPlayerPhoto">{player.photo_url ? <img src={player.photo_url} alt={fullName}/> : <span>FC EDINEȚ</span>}</div>
    <div className="fcRefPlayerShade"/>
    <div className="fcRefPlayerNumber">{player.shirt_number ?? "—"}</div>
    <div className="fcRefPlayerMeta"><strong>{fullName}</strong><span>{positionMap[player.position as keyof typeof positionMap] ?? player.position}</span></div>
  </Link>;
}

function formatNewsDate(value: string | null, locale: Locale) {
  if (!value) return "";
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

function formatMatchDay(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocale(locale), { weekday: "short", day: "2-digit", month: "long", timeZone: "Europe/Chisinau" }).format(new Date(value));
}

function formatMatchTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocale(locale), { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau" }).format(new Date(value));
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
