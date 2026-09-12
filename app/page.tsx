import Link from "next/link";
import PlayerCard from "@/app/components/PlayerCard";
import NewsCard from "@/app/components/NewsCard";
import StandingsTable from "@/app/components/StandingsTable";
import { createClient } from "@/lib/supabase/server";
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
        id,title,slug,excerpt,content,cover_image_url,author_name,status,
        published_at,views,is_featured,category_id,
        category:news_categories(id,name,slug)
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
            id,title,slug,excerpt,content,cover_image_url,author_name,status,
            published_at,views,is_featured,category_id,
            category:news_categories(id,name,slug)
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

  const heroEyebrow = hero?.eyebrow || "ЕДИНЕЦ • МОЛДОВА";
  const heroTitleMain = hero?.title_main || "ВМЕСТЕ";
  const heroTitleAccent = hero?.title_accent || "ЗА ЕДИНЕЦ";
  const heroDescription =
    hero?.description ||
    "Новости клуба, матчи, состав, история и медиаконтент — в одном официальном пространстве.";
  const heroOverlay = Math.max(
    0,
    Math.min(95, hero?.overlay_opacity ?? 72)
  ) / 100;

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
                <span className="sectionLabel">ПОСЛЕДНИЙ МАТЧ</span>
                {lastMatch ? (
                  <>
                    <HomeStripMatch match={lastMatch} type="finished" />
                    <p>{formatMatchDate(lastMatch.kickoff)}</p>
                    <p className="homeMatchStadium">
                      {lastMatch.stadium || "Стадион не указан"}
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Результатов пока нет</h3>
                    <p>После завершённого матча он появится здесь.</p>
                  </>
                )}
              </article>

              <article>
                <span className="sectionLabel">СЛЕДУЮЩИЙ МАТЧ</span>
                {nextMatch ? (
                  <>
                    <HomeStripMatch match={nextMatch} type="next" />
                    <p>{formatMatchDate(nextMatch.kickoff)}</p>
                    <p className="homeMatchStadium">
                      {nextMatch.stadium || "Стадион не указан"}
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Матч не назначен</h3>
                    <p>Добавь его в /admin/matches.</p>
                  </>
                )}
              </article>

              <article>
                <span className="sectionLabel">ТУРНИР</span>
                <h3>
                  {nextMatch?.competition?.name ||
                    lastMatch?.competition?.name ||
                    "Liga 2"}
                </h3>
                <Link href="/matches">Календарь и результаты →</Link>
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
                  <p className="eyebrow blue">LIGA 2</p>
                  <h2>Турнирная таблица</h2>
                </div>
                <Link href="/standings">Полная таблица →</Link>
              </div>

              {standings.length > 0 ? (
                <StandingsTable entries={standings} compact limit={5} />
              ) : (
                <div className="adminEmpty">
                  Турнирная таблица пока не заполнена.
                </div>
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
                  <p className="eyebrow blue">ГЛАВНОЕ</p>
                  <h2>Последние новости</h2>
                </div>
                <Link href="/news">Все новости →</Link>
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
                    <span className="moduleBadge">ЗАКРЕПЛЕНО</span>
                    <h3>{pinnedNews.title}</h3>
                    {pinnedNews.excerpt && <p>{pinnedNews.excerpt}</p>}
                    <b>Читать новость →</b>
                  </div>
                </Link>
              )}

              {news.length > 0 ? (
                <div className="homeNewsDbGrid">
                  {news.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              ) : pinnedNews ? null : (
                <div className="homeNewsPlaceholder">
                  <div>Опубликуй первую новость — она появится здесь.</div>
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
                  <p className="eyebrow">ПЕРВАЯ КОМАНДА</p>
                  <h2>Игроки FC Edineț</h2>
                </div>
                <Link href="/team">Весь состав →</Link>
              </div>

              {players.length > 0 ? (
                <div className="players">
                  {players.map((player) => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              ) : (
                <div className="emptyBox">Добавь игроков — они появятся здесь.</div>
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
                  <p className="eyebrow blue">МЕДИАЦЕНТР</p>
                  <h2>Фото и видео</h2>
                </div>
                <Link href="/media">Весь медиараздел →</Link>
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
                          <div className="homeMediaFallback">ФОТО</div>
                        )}
                      </div>
                      <div>
                        <span>ФОТОАЛЬБОМ</span>
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
                        <span>ВИДЕО</span>
                        <h3>{video.title}</h3>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="adminEmpty">
                  Опубликуй фотоальбом или видео — они появятся здесь.
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
                  <p className="eyebrow blue">ВМЕСТЕ С КЛУБОМ</p>
                  <h2>Наши партнёры</h2>
                </div>
                <Link href="/partners">Все партнёры →</Link>
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
        className={`hero ${hero?.background_image_url ? "withBackgroundImage" : ""}`}
        style={
          hero?.background_image_url
            ? {
                backgroundImage:
                  `linear-gradient(rgba(4,18,40,${heroOverlay}),rgba(4,18,40,${heroOverlay})),url("${hero.background_image_url}")`,
                backgroundPosition: hero.background_position || "center",
              }
            : undefined
        }
      >
        <div className="container heroContent">
          <div>
            <p className="eyebrow">{heroEyebrow}</p>
            <h1>
              {heroTitleMain}
              <span>{heroTitleAccent}</span>
            </h1>
            <p className="heroText">{heroDescription}</p>

            <div className="heroActions">
              {(hero?.show_primary_button ?? true) && (
                <Link
                  className="primaryButton"
                  href={hero?.primary_button_href || "/matches"}
                >
                  {hero?.primary_button_text || "Смотреть матчи"}
                </Link>
              )}

              {(hero?.show_secondary_button ?? true) && (
                <Link
                  className="secondaryButton"
                  href={hero?.secondary_button_href || "/news"}
                >
                  {hero?.secondary_button_text || "Последние новости"}
                </Link>
              )}
            </div>
          </div>

          <aside className="heroMatchCard">
            <span className="matchTag">СЛЕДУЮЩИЙ МАТЧ</span>
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
                  <span>{formatMatchDate(nextMatch.kickoff)}</span>
                  <span>{nextMatch.stadium || "Стадион уточняется"}</span>
                </div>
              </>
            ) : (
              <div className="noNextMatch">
                Следующий матч пока не добавлен в админке.
              </div>
            )}
            <Link href="/matches">Все матчи →</Link>
          </aside>
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
              <p className="eyebrow">{settings.banner_eyebrow}</p>
              <h2>{settings.banner_title}</h2>
              {settings.banner_text && <p>{settings.banner_text}</p>}
            </div>
            <Link className="primaryButton" href={settings.banner_button_href || "/club"}>
              {settings.banner_button_text || "Подробнее"}
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

function HomeStripMatch({
  match,
  type,
}: {
  match: ClubMatch;
  type: "finished" | "next";
}) {
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

function formatMatchDate(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    timeZone: "Europe/Chisinau",
  }).format(date);
  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Chisinau",
  }).format(date);
  return `${day} • ${time}`;
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
