import type { CSSProperties } from "react";
import Link from "next/link";
import StandingsTable from "@/app/components/StandingsTable";
import RecentMatchesCarousel from "@/app/components/RecentMatchesCarousel";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { publicSectionMetadata } from "@/lib/seo";
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
  MediaAlbum,
  MediaVideo,
  NewsArticle,
  Partner,
  Player,
  StandingEntry,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return publicSectionMetadata("home", locale, "/");
}


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

  const [playersResult, newsResult, nextMatchResult, lastMatchResult, recentMatchesResult, competitionResult, partnersResult, pinnedNewsResult, albumsResult, videosResult] = await Promise.all([
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
      .from("matches")
      .select(matchSelect())
      .eq("status", "finished")
      .order("kickoff", { ascending: false })
      .limit(80),
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
    supabase
      .from("media_albums")
      .select("*")
      .eq("is_published", true)
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("media_videos")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const players = (playersResult.data ?? []) as Player[];
  const allNews = (newsResult.data ?? []) as unknown as NewsArticle[];
  const pinnedNews = pinnedNewsResult.data as unknown as NewsArticle | null;
  const nextMatch = nextMatchResult.data as unknown as ClubMatch | null;
  const lastMatch = lastMatchResult.data as unknown as ClubMatch | null;
  const competition = (nextMatch?.competition || lastMatch?.competition || competitionResult.data) as Competition | null;
  const allFinishedMatches = (recentMatchesResult.data ?? []) as unknown as ClubMatch[];
  const activeSeasonName = String(competition?.season ?? "").trim();
  const recentMatches = activeSeasonName
    ? allFinishedMatches.filter((match) => String(match.competition?.season ?? "").trim() === activeSeasonName)
    : allFinishedMatches;
  const partners = (partnersResult.data ?? []) as Partner[];
  const mediaAlbums = (albumsResult.data ?? []) as MediaAlbum[];
  const mediaVideos = (videosResult.data ?? []) as MediaVideo[];

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

  const formMatches = recentMatches.slice(0, 5);
  const seasonPulse = recentMatches.reduce((acc, match) => {
    const clubIsHome = Boolean(match.home?.is_club);
    const gf = Number((clubIsHome ? match.home_score : match.away_score) ?? 0);
    const ga = Number((clubIsHome ? match.away_score : match.home_score) ?? 0);
    acc.played += 1;
    acc.goalsFor += gf;
    acc.goalsAgainst += ga;
    if (gf > ga) acc.wins += 1;
    else if (gf === ga) acc.draws += 1;
    else acc.losses += 1;
    return acc;
  }, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });
  const clubStandingIndex = standings.findIndex((row) => Boolean(row.team?.is_club));
  const clubStandingPosition = clubStandingIndex >= 0 ? clubStandingIndex + 1 : null;
  const featuredAlbum = mediaAlbums[0] ?? null;
  const featuredVideo = mediaVideos[0] ?? null;

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
              <img src={heroBaseImage} alt="" loading="eager" decoding="async" fetchPriority="high" />
            </picture>
          ) : (
            <div className="fcRefHeroFallback"><img src={CLUB_LOGO} alt="" decoding="async" fetchPriority="high" /></div>
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
              <div className="fcRefCompetition">
                <span className="fcRefMatchChip">{nextMatch.competition?.name || competition?.name || "Liga 2"}</span>
                {nextMatch.round ? <span className="fcRefMatchChip">{nextMatch.round}</span> : null}
                <span className="fcRefMatchChip fcRefMatchChipAccent">{locale === "ro" ? "MECI VIITOR" : "БЛИЖАЙШИЙ МАТЧ"}</span>
              </div>
              <div className="fcRefMatchBody">
                <div className="fcRefMatchTeams">
                  <ReferenceTeam team={nextMatch.home} locale={locale} label={locale === "ro" ? "GAZDE" : "ХОЗЯЕВА"} />
                  <div className="fcRefVs">VS</div>
                  <ReferenceTeam team={nextMatch.away} locale={locale} label={locale === "ro" ? "OASPEȚI" : "ГОСТИ"} />
                </div>
                <div className="fcRefMatchFacts">
                  <span><small>{locale === "ro" ? "DATA" : "ДАТА"}</small><strong>{formatMatchDay(nextMatch.kickoff, locale)}</strong></span>
                  <span><small>{locale === "ro" ? "ORA" : "ЧАС"}</small><strong>{formatMatchTime(nextMatch.kickoff, locale)}</strong></span>
                  <span><small>{locale === "ro" ? "STADION" : "СТАДИОН"}</small><strong>{nextMatch.home?.home_stadium || nextMatch.stadium || text.stadiumUnknown}</strong></span>
                </div>
              </div>
              <Link href="/matches" className="fcYellowButton fcRefMatchButton">{locale === "ro" ? "DETALII MECI" : "ПОДРОБНЕЕ О МАТЧЕ"} <span>→</span></Link>
            </> : <div className="fcRefNoMatch">{locale === "ro" ? "Următorul meci nu a fost încă programat." : "Следующий матч пока не назначен."}</div>}
          </aside>
        </div>

        <div className="container fcRefHeroBottom">
          <span>{locale === "ro" ? "TRADIȚIE" : "ТРАДИЦИЯ"}</span><i>•</i><span>{locale === "ro" ? "UNITATE" : "ЕДИНСТВО"}</span><i>•</i><span>{locale === "ro" ? "VICTORIE" : "ПОБЕДА"}</span>
          <strong>EDINEȚ<br/>{locale === "ro" ? "DOAR ÎNAINTE" : "ТОЛЬКО ВПЕРЁД"}</strong>
        </div>
      </section>

      {settings?.banner_enabled && <section className="fcRefAnnouncement"><div className="container fcRefAnnouncementInner"><div><small>{localized(settings.banner_eyebrow, settings.banner_eyebrow_ro, locale)}</small><strong>{localized(settings.banner_title, settings.banner_title_ro, locale)}</strong></div><Link href={settings.banner_button_href || "/club"}>{localized(settings.banner_button_text, settings.banner_button_text_ro, locale) || text.more} →</Link></div></section>}

      {sectionEnabled("matches") && (lastMatch || recentMatches.length > 0 || formMatches.length > 0) && <section className="fcV215PulseSection">
        <div className="container fcV215PulseGrid">
          {lastMatch && <Link href={`/matches/${lastMatch.id}`} className="fcV215LastMatch">
            <span className="fcV215CardLabel">{locale === "ro" ? "ULTIMUL MECI" : "ПОСЛЕДНИЙ МАТЧ"}</span>
            <div className="fcV215LastMatchTeams">
              <ReferenceTeam team={lastMatch.home} locale={locale} />
              <div className="fcV215LastScore"><small>{formatMatchShortDate(lastMatch.kickoff, locale)}</small><strong>{lastMatch.home_score}:{lastMatch.away_score}</strong><em>{lastMatch.competition?.name || competition?.name || "Liga 2"}</em></div>
              <ReferenceTeam team={lastMatch.away} locale={locale} />
            </div>
            <b>{locale === "ro" ? "PROTOCOLUL MECIULUI" : "ПРОТОКОЛ МАТЧА"} →</b>
          </Link>}

          {recentMatches.length > 0 && <div className="fcV215MatchRail">
            <div className="fcV215MatchRailHead">
              <span className="fcV215CardLabel">{locale === "ro" ? "MECIURILE SEZONULUI" : "МАТЧИ СЕЗОНА"}</span>
              <Link href="/matches">{locale === "ro" ? "TOATE MECIURILE" : "ВСЕ МАТЧИ"} →</Link>
            </div>
            <RecentMatchesCarousel
              previousLabel={locale === "ro" ? "Meciul precedent" : "Предыдущий матч"}
              nextLabel={locale === "ro" ? "Meciul următor" : "Следующий матч"}
            >
              {recentMatches.map((match) => {
                const clubIsHome = Boolean(match.home?.is_club);
                const clubGoals = clubIsHome ? match.home_score : match.away_score;
                const rivalGoals = clubIsHome ? match.away_score : match.home_score;
                const clubWin = Number(clubGoals ?? -1) > Number(rivalGoals ?? -1);
                const draw = Number(clubGoals ?? -1) === Number(rivalGoals ?? -1);
                return (
                  <Link key={match.id} href={`/matches/${match.id}`} className={`fcRefRecentMatchCard${clubWin ? " is-win" : draw ? " is-draw" : " is-loss"}`}>
                    <div className="fcRefRecentMatchMeta">
                      <span>{match.competition?.name || competition?.name || "Liga 2"}</span>
                      {match.round ? <b>{match.round}</b> : null}
                    </div>
                    <div className="fcRefRecentMatchBody">
                      <RecentMatchTeam team={match.home} locale={locale} side={locale === "ro" ? "GAZDE" : "ДОМА"} />
                      <div className="fcRefRecentMatchScore">
                        <em>{formatMatchShortDate(match.kickoff, locale)}</em>
                        <strong>{match.home_score}:{match.away_score}</strong>
                        <span>{draw ? (locale === "ro" ? "Egal" : "Ничья") : clubWin ? (locale === "ro" ? "Victorie" : "Победа") : (locale === "ro" ? "Înfrângere" : "Поражение")}</span>
                      </div>
                      <RecentMatchTeam team={match.away} locale={locale} side={locale === "ro" ? "OASPEȚI" : "ГОСТИ"} />
                    </div>
                    <div className="fcRefRecentMatchFooter"><b>{locale === "ro" ? "PROTOCOL" : "ПРОТОКОЛ"} →</b></div>
                  </Link>
                );
              })}
            </RecentMatchesCarousel>
          </div>}

          <div className="fcV215FormStats">
            <span className="fcV215CardLabel">{locale === "ro" ? "ULTIMELE 5" : "ПОСЛЕДНИЕ 5"}</span>
            <div className="fcV215FormDots">
              {formMatches.length ? formMatches.map((match) => {
                const clubIsHome = Boolean(match.home?.is_club);
                const gf = Number((clubIsHome ? match.home_score : match.away_score) ?? 0);
                const ga = Number((clubIsHome ? match.away_score : match.home_score) ?? 0);
                const result = gf > ga ? "W" : gf === ga ? "D" : "L";
                const label = result === "W" ? (locale === "ro" ? "V" : "В") : result === "D" ? (locale === "ro" ? "E" : "Н") : (locale === "ro" ? "Î" : "П");
                return <Link key={match.id} href={`/matches/${match.id}`} className={`fcV215FormDot is-${result.toLowerCase()}`} title={`${match.home?.short_name || match.home?.name} ${match.home_score}:${match.away_score} ${match.away?.short_name || match.away?.name}`}>{label}</Link>;
              }) : <span className="fcV215NoData">—</span>}
            </div>
            <p>{locale === "ro" ? `${seasonPulse.wins} victorii · ${seasonPulse.draws} egaluri · ${seasonPulse.losses} înfrângeri` : `${seasonPulse.wins} побед · ${seasonPulse.draws} ничьих · ${seasonPulse.losses} поражений`}</p>
            <div className="fcV215StatsRow">
              <span><small>{locale === "ro" ? "MECIURI" : "МАТЧИ"}</small><strong>{seasonPulse.played}</strong></span>
              <span><small>{locale === "ro" ? "GOLURI" : "ГОЛЫ"}</small><strong>{seasonPulse.goalsFor}</strong></span>
              <span><small>{locale === "ro" ? "POZIȚIE" : "МЕСТО"}</small><strong>{clubStandingPosition ? `${clubStandingPosition}` : "—"}</strong></span>
            </div>
            <Link className="fcV215StatsLink" href="/statistics">{locale === "ro" ? "STATISTICI" : "СТАТИСТИКА"} →</Link>
          </div>
        </div>
      </section>}

      {(sectionEnabled("news") || sectionEnabled("standings")) && <section className="fcRefDashboardSection">
        <div className="container fcRefDashboard">
          {sectionEnabled("news") && <>
            <div className="fcRefLeadColumn">
              {leadNews ? <Link href={`/news/${leadNews.slug}`} className="fcRefLeadNews">
                <div className="fcRefLeadNewsMedia">{leadNews.cover_image_url ? <img className="newsCoverManaged" src={leadNews.cover_image_url} alt="" style={newsCoverStyle(leadNews)} loading="lazy" decoding="async" /> : <div className="fcRefNewsFallback">FC EDINEȚ</div>}<span>{locale === "ro" ? "ȘTIREA PRINCIPALĂ" : "ГЛАВНАЯ НОВОСТЬ"}</span></div>
                <div className="fcRefLeadNewsBody"><time>{formatNewsDate(leadNews.published_at, locale)}</time><h2>{localized(leadNews.title, leadNews.title_ro, locale)}</h2>{localized(leadNews.excerpt, leadNews.excerpt_ro, locale) && <p>{localized(leadNews.excerpt, leadNews.excerpt_ro, locale)}</p>}<b>{locale === "ro" ? "CITEȘTE" : "ЧИТАТЬ ДАЛЬШЕ"} →</b></div>
              </Link> : <div className="fcRefEmptyCard">{locale === "ro" ? "Publică prima știre." : "Опубликуй первую новость."}</div>}
            </div>

            <div className="fcRefLatestColumn">
              <div className="fcRefPanelTitle"><h2>{locale === "ro" ? "ULTIMELE ȘTIRI" : "ПОСЛЕДНИЕ НОВОСТИ"}</h2><Link href="/news">{locale === "ro" ? "TOATE ȘTIRILE" : "ВСЕ НОВОСТИ"} →</Link></div>
              <div className="fcRefNewsList">{latestNews.length ? latestNews.map((article) => <Link key={article.id} href={`/news/${article.slug}`} className="fcRefNewsRow"><div>{article.cover_image_url ? <img className="newsCoverManaged" src={article.cover_image_url} alt="" style={newsCoverStyle(article)} loading="lazy" decoding="async" /> : <span>FCE</span>}</div><section><time>{formatNewsDate(article.published_at, locale)}</time><h3>{localized(article.title, article.title_ro, locale)}</h3></section></Link>) : <div className="fcRefEmptyCard compact">{locale === "ro" ? "Nu sunt alte știri." : "Других новостей пока нет."}</div>}</div>
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

      {sectionEnabled("media") && (featuredAlbum || featuredVideo) && <section className="fcV215MediaSection">
        <div className="container">
          <div className="fcV215SectionHead">
            <div><small>FC EDINEȚ • MEDIA</small><h2>{locale === "ro" ? "Mai aproape de echipă" : "Ближе к команде"}</h2></div>
            <Link href="/media">{locale === "ro" ? "TOT MEDIA" : "ВСЕ МЕДИА"} →</Link>
          </div>
          <div className="fcV215MediaGrid">
            {featuredAlbum && <Link href={`/media/${featuredAlbum.slug}`} className="fcV215AlbumCard">
              <div className="fcV215MediaImage">{featuredAlbum.cover_image_url ? <img src={featuredAlbum.cover_image_url} alt={featuredAlbum.title} loading="lazy" decoding="async" /> : <span>FC EDINEȚ</span>}<i>{locale === "ro" ? "FOTO" : "ФОТО"}</i></div>
              <div><small>{featuredAlbum.event_date ? formatMediaDate(featuredAlbum.event_date, locale) : (locale === "ro" ? "GALERIE" : "ГАЛЕРЕЯ")}</small><h3>{featuredAlbum.title}</h3>{featuredAlbum.location && <p>{featuredAlbum.location}</p>}<b>{locale === "ro" ? "DESCHIDE GALERIA" : "ОТКРЫТЬ АЛЬБОМ"} →</b></div>
            </Link>}
            {featuredVideo && <a href={featuredVideo.youtube_url} target="_blank" rel="noreferrer" className="fcV215VideoCard">
              <div className="fcV215MediaImage">{featuredVideo.youtube_id ? <img src={`https://i.ytimg.com/vi/${featuredVideo.youtube_id}/hqdefault.jpg`} alt={featuredVideo.title} loading="lazy" decoding="async" /> : <span>FC EDINEȚ</span>}<i>VIDEO</i><em className="fcV215Play">▶</em></div>
              <div><small>{featuredVideo.published_at ? formatMediaDate(featuredVideo.published_at, locale) : "YOUTUBE"}</small><h3>{featuredVideo.title}</h3>{featuredVideo.description && <p>{featuredVideo.description}</p>}<b>{locale === "ro" ? "VEZI VIDEO" : "СМОТРЕТЬ ВИДЕО"} →</b></div>
            </a>}
          </div>
        </div>
      </section>}

      {sectionEnabled("partners") && <section className="fcRefPartnersStrip"><div className="container fcRefPartnersInner"><strong>{locale === "ro" ? "PARTENERII NOȘTRI" : "НАШИ ПАРТНЁРЫ"}</strong><div className="fcRefPartnerLogos">{partners.map((partner) => partner.website_url ? <a key={partner.id} href={partner.website_url} target="_blank" rel="noreferrer"><img src={partner.logo_url} alt={partner.name} loading="lazy" decoding="async"/></a> : <span key={partner.id}><img src={partner.logo_url} alt={partner.name} loading="lazy" decoding="async"/></span>)}</div><Link href="/partners">{locale === "ro" ? "ÎMPREUNĂ CONSTRUIM MAI MULT" : "ВМЕСТЕ СТРОИМ БОЛЬШЕ"}</Link></div></section>}
    </main>
  );
}

function RecentMatchTeam({ team, locale, side }: { team: ClubMatch["home"]; locale: Locale; side: string }) {
  const logo = team?.logo_url || (team?.is_club ? CLUB_LOGO : null);
  return (
    <div className={`fcRefRecentMatchTeam${team?.is_club ? " is-club" : " is-rival"}`}>
      <small>{side}</small>
      {logo ? <img src={logo} alt="" /> : <span>{(team?.short_name || team?.name || "FC").slice(0,3).toUpperCase()}</span>}
      <strong>{team?.short_name || team?.name || (locale === "ro" ? "Echipă" : "Команда")}</strong>
    </div>
  );
}

function ReferenceTeam({ team, locale, label }: { team: ClubMatch["home"]; locale: Locale; label?: string }) {
  const logo = team?.logo_url || (team?.is_club ? CLUB_LOGO : null);
  return <div className="fcRefTeamBadge">{label ? <small>{label}</small> : null}{logo ? <img src={logo} alt="" /> : <span>{(team?.short_name || team?.name || "FC").slice(0,3).toUpperCase()}</span>}<strong>{team?.short_name || team?.name || (locale === "ro" ? "Echipă" : "Команда")}</strong></div>;
}

function ReferencePlayer({ player, locale }: { player: Player; locale: Locale }) {
  const fullName = `${player.first_name} ${player.last_name}`.trim();
  const positionMap = locale === "ro"
    ? { goalkeeper: "PORTAR", defender: "FUNDAȘ", midfielder: "MIJLOCAȘ", forward: "ATACANT" }
    : { goalkeeper: "ВРАТАРЬ", defender: "ЗАЩИТНИК", midfielder: "ПОЛУЗАЩИТНИК", forward: "НАПАДАЮЩИЙ" };
  return <Link href={`/team/${player.slug}`} className="fcRefPlayerCard">
    <div className="fcRefPlayerPhoto">{player.photo_url ? <img src={player.photo_url} alt={fullName} loading="lazy" decoding="async"/> : <span>FC EDINEȚ</span>}</div>
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
  return new Intl.DateTimeFormat(dateLocale(locale), { weekday: "long", day: "2-digit", month: "long", timeZone: "Europe/Chisinau" }).format(new Date(value));
}

function formatMatchTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocale(locale), { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau" }).format(new Date(value));
}

function formatMatchShortDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "short", timeZone: "Europe/Chisinau" }).format(new Date(value));
}

function formatMediaDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Chisinau" }).format(new Date(value));
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
