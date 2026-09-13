import type { Metadata } from "next";
import Link from "next/link";
import PageHeroShell from "@/app/components/PageHeroShell";
import { notFound } from "next/navigation";
import { toggleFavoritePlayer } from "@/app/account/actions";
import { createClient } from "@/lib/supabase/server";
import type {
  ClubMatch,
  Competition,
  Player,
  PlayerMatchStat,
  PlayerSeasonStatistics,
  PlayerSeasonTotal,
  Season,
} from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { accountText } from "@/lib/account-i18n";
import { dateLocale, footLabelsI18n, localized, positionLabelsI18n, publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string | string[] }>;
};

type CompetitionSummary = PlayerSeasonStatistics & {
  competition: Competition | null;
};

type RecentPlayerMatch = {
  stat: PlayerMatchStat;
  match: ClubMatch;
};

async function getPlayer(slug: string): Promise<Player | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data as Player | null;
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const player = await getPlayer(slug);
  if (!player) return { title: publicText[locale].team.notFound };
  const fullName = `${player.first_name} ${player.last_name}`.trim();
  return {
    title: fullName,
    description: `${fullName} — ${positionLabelsI18n[locale][player.position] ?? player.position}, FC Edineț.`,
  };
}

export default async function PlayerPage({ params, searchParams }: PageProps) {
  const locale = await getLocale();
  const text = publicText[locale].team;
  const account = accountText[locale];
  const { slug } = await params;
  const query = await searchParams;
  const player = await getPlayer(slug);
  if (!player) notFound();

  const supabase = await createClient();
  const [claimsResult, design, seasonsResult] = await Promise.all([
    supabase.auth.getClaims(),
    getPublishedSitePageDesign(supabase, "template_player"),
    supabase
      .from("seasons")
      .select("id,name,slug,starts_on,ends_on,is_current,is_active")
      .eq("is_active", true)
      .order("starts_on", { ascending: false, nullsFirst: false })
      .order("name", { ascending: false }),
  ]);

  const { data: claimsData } = claimsResult;
  const userId = claimsData?.claims?.sub;
  let isFavorite = false;
  if (userId) {
    const { data } = await supabase
      .from("favorite_players")
      .select("player_id")
      .eq("user_id", userId)
      .eq("player_id", player.id)
      .maybeSingle();
    isFavorite = Boolean(data);
  }

  const seasons = (seasonsResult.data ?? []) as Season[];
  const requestedSeason = one(query.season);
  const selectedSeason =
    (requestedSeason
      ? seasons.find((season) => String(season.id) === requestedSeason)
      : null) ??
    seasons.find((season) => season.is_current) ??
    seasons[0] ??
    null;

  let seasonTotal: PlayerSeasonTotal | null = null;
  let competitionSummaries: CompetitionSummary[] = [];
  let recentMatches: RecentPlayerMatch[] = [];
  let statisticsError = seasonsResult.error?.message ?? null;

  if (selectedSeason && !statisticsError) {
    const [totalResult, competitionStatsResult, playerRowsResult] = await Promise.all([
      supabase
        .from("player_season_totals")
        .select("*")
        .eq("player_id", player.id)
        .eq("season_id", selectedSeason.id)
        .maybeSingle(),
      supabase
        .from("player_season_statistics")
        .select("*")
        .eq("player_id", player.id)
        .eq("season_id", selectedSeason.id),
      supabase
        .from("player_match_stats")
        .select("*")
        .eq("player_id", player.id)
        .eq("season_id", selectedSeason.id)
        .order("match_id", { ascending: false })
        .limit(30),
    ]);

    statisticsError =
      totalResult.error?.message ||
      competitionStatsResult.error?.message ||
      playerRowsResult.error?.message ||
      null;

    if (!statisticsError) {
      seasonTotal = (totalResult.data as PlayerSeasonTotal | null) ?? null;
      const competitionRows = (competitionStatsResult.data ?? []) as PlayerSeasonStatistics[];
      const competitionIds = competitionRows
        .map((row) => row.competition_id)
        .filter((id): id is string | number => id !== null && id !== undefined);

      let competitionById = new Map<string, Competition>();
      if (competitionIds.length > 0) {
        const { data: competitionsData } = await supabase
          .from("competitions")
          .select("id,name,slug,season,season_id,is_active")
          .in("id", competitionIds.map(String));
        competitionById = new Map(
          ((competitionsData ?? []) as Competition[]).map((competition) => [
            String(competition.id),
            competition,
          ])
        );
      }

      competitionSummaries = competitionRows
        .map((row) => ({
          ...row,
          competition: row.competition_id
            ? competitionById.get(String(row.competition_id)) ?? null
            : null,
        }))
        .sort((a, b) => {
          if (numberValue(b.appearances) !== numberValue(a.appearances)) {
            return numberValue(b.appearances) - numberValue(a.appearances);
          }
          return numberValue(b.minutes_played) - numberValue(a.minutes_played);
        });

      const playerRows = (playerRowsResult.data ?? []) as PlayerMatchStat[];
      const matchIds = [...new Set(playerRows.map((row) => String(row.match_id)))];

      if (matchIds.length > 0) {
        const statusResult = await supabase
          .from("match_statistics_status")
          .select("match_id,status")
          .eq("status", "complete")
          .in("match_id", matchIds);

        if (!statusResult.error) {
          const completedIds = new Set(
            (statusResult.data ?? []).map((row) => String(row.match_id))
          );
          const visibleRows = playerRows.filter((row) => completedIds.has(String(row.match_id)));
          const visibleMatchIds = visibleRows.map((row) => String(row.match_id));

          if (visibleMatchIds.length > 0) {
            const { data: matchesData } = await supabase
              .from("matches")
              .select(`
                id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
                home_score,away_score,notes,created_at,updated_at,
                home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
                away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
                competition:competitions!matches_competition_id_fkey(id,name,slug,season,season_id,is_active)
              `)
              .eq("status", "finished")
              .in("id", visibleMatchIds);

            const matchById = new Map(
              ((matchesData ?? []) as unknown as ClubMatch[]).map((match) => [
                String(match.id),
                match,
              ])
            );

            recentMatches = visibleRows
              .map((stat) => ({ stat, match: matchById.get(String(stat.match_id)) }))
              .filter((item): item is RecentPlayerMatch => Boolean(item.match))
              .sort(
                (a, b) =>
                  new Date(b.match.kickoff).getTime() - new Date(a.match.kickoff).getTime()
              )
              .slice(0, 5);
          }
        }
      }
    }
  }

  const fullName = `${player.first_name} ${player.last_name}`.trim();
  const pos = positionLabelsI18n[locale][player.position] ?? player.position;
  const foot = player.preferred_foot
    ? footLabelsI18n[locale][player.preferred_foot]
    : null;
  const currentPath = selectedSeason
    ? `/team/${slug}?season=${selectedSeason.id}`
    : `/team/${slug}`;

  return (
    <main>
      <PageHeroShell
        design={design}
        className="playerProfileHero"
        contentClassName="container playerProfileGrid"
        contentImageUrl={player.photo_url}
      >
        <>
          {heroLayerVisible(design.layer_config, "photo") && (
            <div
              className="profilePhotoWrap"
              style={heroLayerStyle(design.layer_config, "photo")}
            >
              {player.photo_url ? (
                <img className="profilePhoto" src={player.photo_url} alt={fullName} />
              ) : (
                <div className="profilePhoto profilePhotoPlaceholder">{text.photo}</div>
              )}
              <span className="profileNumber">{player.shirt_number ?? "—"}</span>
            </div>
          )}
          {heroLayerVisible(design.layer_config, "intro") && (
            <div
              className="profileIntro"
              style={heroLayerStyle(design.layer_config, "intro")}
            >
              <Link className="backLink" href="/team">
                {text.back}
              </Link>
              {design.show_eyebrow && <p className="eyebrow">{pos}</p>}
              <h1>
                {player.first_name}
                <span>{player.last_name}</span>
              </h1>
              {design.show_description && (
                <div className="profileFacts">
                  <Fact label={text.number} value={player.shirt_number?.toString()} />
                  <Fact label={text.nationality} value={player.nationality} />
                  <Fact
                    label={text.height}
                    value={player.height_cm ? `${player.height_cm} cm` : null}
                  />
                  <Fact label={text.foot} value={foot} />
                </div>
              )}
              <div className="playerFavoriteAction">
                {userId ? (
                  <form action={toggleFavoritePlayer.bind(null, String(player.id), currentPath)}>
                    <button
                      className={isFavorite ? "favoriteActiveButton" : "favoriteButton"}
                      type="submit"
                    >
                      {isFavorite ? account.removePlayer : account.addPlayer}
                    </button>
                  </form>
                ) : (
                  <Link className="favoriteButton" href="/login">
                    {account.loginToFavorite}
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      </PageHeroShell>

      <PlayerStatisticsSection
        player={player}
        seasons={seasons}
        selectedSeason={selectedSeason}
        total={seasonTotal}
        competitions={competitionSummaries}
        recentMatches={recentMatches}
        error={statisticsError}
        locale={locale}
        slug={slug}
      />

      <section className="section profileSection">
        <div className="container profileContentGrid">
          <article className="bioCard">
            <p className="eyebrow blue">{text.aboutEyebrow}</p>
            <h2>{text.profile}</h2>
            <p className="bioText">
              {localized(player.bio, player.bio_ro, locale) || text.bioEmpty}
            </p>
          </article>
          <aside className="detailsCard">
            <Detail label={text.fullName} value={fullName} />
            <Detail label={text.position} value={pos} />
            <Detail label={text.birthDate} value={formatDate(player.birth_date, locale)} />
            <Detail label={text.nationality} value={player.nationality} />
            <Detail label={text.hometown} value={player.hometown} />
            <Detail
              label={text.height}
              value={player.height_cm ? `${player.height_cm} cm` : null}
            />
            <Detail label={text.foot} value={foot} />
            <Detail label={text.previousClub} value={player.previous_club} />
            <Detail label={text.joinedAt} value={formatDate(player.joined_at, locale)} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function PlayerStatisticsSection({
  player,
  seasons,
  selectedSeason,
  total,
  competitions,
  recentMatches,
  error,
  locale,
  slug,
}: {
  player: Player;
  seasons: Season[];
  selectedSeason: Season | null;
  total: PlayerSeasonTotal | null;
  competitions: CompetitionSummary[];
  recentMatches: RecentPlayerMatch[];
  error: string | null;
  locale: "ru" | "ro";
  slug: string;
}) {
  const text = publicText[locale].team;
  const isGoalkeeper = player.position === "goalkeeper";
  const hasStats = Boolean(total && numberValue(total.appearances) > 0);

  const mainStats = total
    ? [
        { label: text.statsMatches, value: total.appearances },
        { label: text.statsStarts, value: total.starts },
        { label: text.statsMinutes, value: total.minutes_played },
        { label: text.statsGoals, value: total.goals, accent: true },
        { label: text.statsAssists, value: total.assists, accent: true },
        {
          label: text.statsGoalContributions,
          value: numberValue(total.goals) + numberValue(total.assists),
          accent: true,
        },
      ]
    : [];

  const passAccuracy = total && numberValue(total.passes_attempted) > 0
    ? `${Math.round((numberValue(total.passes_completed) / numberValue(total.passes_attempted)) * 100)}%`
    : "—";

  const advancedStats: { label: string; value: string | number }[] = !total
    ? []
    : player.position === "goalkeeper"
      ? [
          { label: text.statsSaves, value: total.saves },
          { label: text.statsGoalsConceded, value: total.goals_conceded },
          { label: text.statsCleanSheets, value: total.clean_sheets },
          { label: text.statsPenaltiesSaved, value: total.penalties_saved },
          { label: text.statsPassAccuracy, value: passAccuracy },
          { label: text.statsPasses, value: `${total.passes_completed}/${total.passes_attempted}` },
        ]
      : player.position === "defender"
        ? [
            { label: text.statsPassAccuracy, value: passAccuracy },
            { label: text.statsTackles, value: total.tackles_won },
            { label: text.statsInterceptions, value: total.interceptions },
            { label: text.statsClearances, value: total.clearances },
            { label: text.statsBlocks, value: total.blocks },
            { label: text.statsShots, value: total.shots },
          ]
        : player.position === "midfielder"
          ? [
              { label: text.statsPassAccuracy, value: passAccuracy },
              { label: text.statsKeyPasses, value: total.key_passes },
              { label: text.statsTackles, value: total.tackles_won },
              { label: text.statsInterceptions, value: total.interceptions },
              { label: text.statsShots, value: total.shots },
              { label: text.statsShotsOnTarget, value: total.shots_on_target },
            ]
          : [
              { label: text.statsShots, value: total.shots },
              { label: text.statsShotsOnTarget, value: total.shots_on_target },
              { label: text.statsKeyPasses, value: total.key_passes },
              { label: text.statsPassAccuracy, value: passAccuracy },
              { label: text.statsFoulsWon, value: total.fouls_won },
              { label: text.statsPasses, value: `${total.passes_completed}/${total.passes_attempted}` },
            ];

  return (
    <section className="section playerStatsSection">
      <div className="container playerStatsContainer">
        <header className="playerStatsHeader">
          <div>
            <p className="eyebrow blue">{text.statsEyebrow}</p>
            <h2>
              {text.statsTitle}
              {selectedSeason ? <span>{selectedSeason.name}</span> : null}
            </h2>
          </div>
          {seasons.length > 0 && (
            <nav className="playerSeasonNav" aria-label={text.statsSeason}>
              {seasons.map((season) => (
                <Link
                  key={String(season.id)}
                  href={`/team/${slug}?season=${season.id}`}
                  className={String(selectedSeason?.id ?? "") === String(season.id) ? "active" : ""}
                >
                  {season.name}
                </Link>
              ))}
            </nav>
          )}
        </header>

        {error ? (
          <div className="playerStatsEmpty playerStatsError">
            <strong>{text.statsAvailabilityError}</strong>
            <span>{error}</span>
          </div>
        ) : !selectedSeason || !hasStats || !total ? (
          <div className="playerStatsEmpty">
            <strong>{text.statsNoData}</strong>
            <span>{text.statsNoDataHint}</span>
          </div>
        ) : (
          <>
            <div className="playerStatsKpiGrid">
              {mainStats.map((item) => (
                <article
                  className={`playerStatsKpi${item.accent ? " accent" : ""}`}
                  key={item.label}
                >
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>

            <div className="playerStatsSecondaryGrid">
              <StatMini label={text.statsSubstitutes} value={total.substitute_appearances} />
              <StatMini label={text.statsYellowCards} value={total.yellow_cards} />
              <StatMini label={text.statsRedCards} value={total.red_cards} />
              <StatMini label={text.statsCaptain} value={total.captain_appearances} />
            </div>

            <section className="playerStatsBlock playerStatsAdvancedBlock">
              <div className="playerStatsBlockHead">
                <h3>{text.statsExtended}</h3>
                <span>{advancedStats.length}</span>
              </div>
              <div className="playerStatsAdvancedGrid">
                {advancedStats.map((item) => (
                  <StatMini label={item.label} value={item.value} key={item.label} />
                ))}
              </div>
            </section>

            {competitions.length > 0 && (
              <section className="playerStatsBlock">
                <div className="playerStatsBlockHead">
                  <h3>{text.statsCompetitions}</h3>
                  <span>{competitions.length}</span>
                </div>
                <div className="playerCompetitionStatsWrap">
                  <table className="playerCompetitionStats">
                    <thead>
                      <tr>
                        <th>{text.statsCompetition}</th>
                        <th>{text.statsMatches}</th>
                        <th>{text.statsStarts}</th>
                        <th>{text.statsMinutes}</th>
                        <th>{text.statsGoals}</th>
                        <th>{text.statsAssists}</th>
                        {player.position === "goalkeeper" ? (
                          <>
                            <th>{text.statsSaves}</th>
                            <th>{text.statsCleanSheets}</th>
                            <th>{text.statsPenaltiesSaved}</th>
                          </>
                        ) : player.position === "defender" ? (
                          <>
                            <th>{text.statsTackles}</th>
                            <th>{text.statsInterceptions}</th>
                            <th>{text.statsClearances}</th>
                          </>
                        ) : player.position === "midfielder" ? (
                          <>
                            <th>{text.statsPassAccuracy}</th>
                            <th>{text.statsKeyPasses}</th>
                            <th>{text.statsTackles}</th>
                          </>
                        ) : (
                          <>
                            <th>{text.statsShots}</th>
                            <th>{text.statsShotsOnTarget}</th>
                            <th>{text.statsKeyPasses}</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {competitions.map((row, index) => (
                        <tr key={`${row.competition_id ?? "none"}-${index}`}>
                          <td>
                            <strong>{row.competition?.name ?? text.statsTournamentEmpty}</strong>
                          </td>
                          <td>{row.appearances}</td>
                          <td>{row.starts}</td>
                          <td>{row.minutes_played}</td>
                          <td className="accent">{row.goals}</td>
                          <td className="accent">{row.assists}</td>
                          {player.position === "goalkeeper" ? (
                            <>
                              <td>{row.saves}</td>
                              <td>{row.clean_sheets}</td>
                              <td>{row.penalties_saved}</td>
                            </>
                          ) : player.position === "defender" ? (
                            <>
                              <td>{row.tackles_won}</td>
                              <td>{row.interceptions}</td>
                              <td>{row.clearances}</td>
                            </>
                          ) : player.position === "midfielder" ? (
                            <>
                              <td>{row.passes_attempted > 0 ? `${Math.round((row.passes_completed / row.passes_attempted) * 100)}%` : "—"}</td>
                              <td>{row.key_passes}</td>
                              <td>{row.tackles_won}</td>
                            </>
                          ) : (
                            <>
                              <td>{row.shots}</td>
                              <td>{row.shots_on_target}</td>
                              <td>{row.key_passes}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {recentMatches.length > 0 && (
              <section className="playerStatsBlock">
                <div className="playerStatsBlockHead">
                  <h3>{text.statsRecent}</h3>
                  <span>{recentMatches.length}</span>
                </div>
                <div className="playerRecentMatches">
                  {recentMatches.map(({ stat, match }) => {
                    const opponent = getOpponent(match);
                    const result = getClubResult(match);
                    return (
                      <article className="playerRecentMatch" key={String(match.id)}>
                        <div className="playerRecentDate">
                          <strong>{formatShortDate(match.kickoff, locale)}</strong>
                          <span>{match.competition?.name ?? text.statsTournamentEmpty}</span>
                        </div>
                        <div className="playerRecentOpponent">
                          <span className={`playerMatchResult ${result.code.toLowerCase()}`}>
                            {result.code}
                          </span>
                          {opponent?.logo_url ? (
                            <img src={opponent.logo_url} alt="" />
                          ) : (
                            <span className="playerRecentOpponentLogo">FC</span>
                          )}
                          <div>
                            <strong>{opponent?.name ?? "—"}</strong>
                            <span>{formatScore(match)}</span>
                          </div>
                        </div>
                        <div className="playerRecentRole">
                          <strong>
                            {stat.appearance === "starter"
                              ? text.statsStarter
                              : text.statsSubstitute}
                          </strong>
                          <span>
                            {stat.minutes_played} {text.statsMinutesShort}
                            {stat.is_captain ? ` • ${text.statsCaptain}` : ""}
                          </span>
                        </div>
                        <div className="playerRecentNumbers">
                          <span>
                            <b>{stat.goals}</b>
                            {text.statsGoals}
                          </span>
                          <span>
                            <b>{stat.assists}</b>
                            {text.statsAssists}
                          </span>
                          {isGoalkeeper ? (
                            <>
                              <span>
                                <b>{stat.saves}</b>
                                {text.statsSaves}
                              </span>
                              <span>
                                <b>{stat.penalties_saved}</b>
                                {text.statsPenaltiesSaved}
                              </span>
                            </>
                          ) : (
                            <span>
                              <b>{stat.shots_on_target}/{stat.shots}</b>
                              {text.statsShotsOnTarget}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function StatMini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="playerStatsMini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getOpponent(match: ClubMatch) {
  if (match.home?.is_club) return match.away;
  if (match.away?.is_club) return match.home;
  return match.away ?? match.home;
}

function getClubResult(match: ClubMatch) {
  const homeScore = numberValue(match.home_score);
  const awayScore = numberValue(match.away_score);
  const clubHome = Boolean(match.home?.is_club);
  const clubScore = clubHome ? homeScore : awayScore;
  const opponentScore = clubHome ? awayScore : homeScore;
  if (clubScore > opponentScore) return { code: "W" };
  if (clubScore < opponentScore) return { code: "L" };
  return { code: "D" };
}

function formatScore(match: ClubMatch) {
  const home = match.home_score ?? "—";
  const away = match.away_score ?? "—";
  return `${home} : ${away}`;
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="detailRow">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function formatDate(value: string | null, locale: "ru" | "ro") {
  if (!value) return null;
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatShortDate(value: string, locale: "ru" | "ro") {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Chisinau",
  }).format(new Date(value));
}
