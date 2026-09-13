import type { Metadata } from "next";
import Link from "next/link";
import PageHeroShell from "@/app/components/PageHeroShell";
import { createClient } from "@/lib/supabase/server";
import type {
  ClubMatch,
  Competition,
  Player,
  PlayerSeasonStatistics,
  PlayerSeasonTotal,
  Season,
} from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { positionLabelsI18n } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Статистика команды — FC Edineț",
  description: "Статистика FC Edineț по сезонам и турнирам: лидеры, матчи, голы, ассисты и игровое время.",
};

type PageProps = {
  searchParams: Promise<{
    season?: string | string[];
    competition?: string | string[];
    sort?: string | string[];
  }>;
};

type SummaryNumbers = {
  appearances: number;
  starts: number;
  substitute_appearances: number;
  captain_appearances: number;
  competitions_played: number;
  minutes_played: number;
  goals: number;
  assists: number;
  own_goals: number;
  penalties_scored: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  goals_conceded: number;
  saves: number;
  clean_sheets: number;
  penalties_saved: number;
  shots: number;
  shots_on_target: number;
  passes_attempted: number;
  passes_completed: number;
  key_passes: number;
  tackles_won: number;
  interceptions: number;
  clearances: number;
  blocks: number;
  fouls_committed: number;
  fouls_won: number;
};

type PlayerSummary = SummaryNumbers & {
  player: Pick<
    Player,
    "id" | "first_name" | "last_name" | "slug" | "shirt_number" | "position" | "photo_url" | "is_active"
  >;
};

type SortKey = "goals" | "assists" | "appearances" | "minutes" | "contributions" | "clean_sheets";

type ResultSummary = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  winRate: number;
  statisticsComplete: number;
};

const textByLocale = {
  ru: {
    eyebrow: "FC EDINEȚ • ЦИФРЫ СЕЗОНА",
    title: "Статистика команды",
    description: "Лидеры, результаты и показатели игроков FC Edineț по сезонам и турнирам.",
    season: "Сезон",
    tournament: "Турнир",
    allTournaments: "Все турниры",
    matches: "Матчи",
    wins: "Победы",
    draws: "Ничьи",
    losses: "Поражения",
    goals: "Голы",
    goalDifference: "Разница мячей",
    winRate: "% побед",
    dataCoverage: "Статистика заполнена",
    leadersEyebrow: "ЛИДЕРЫ КОМАНДЫ",
    leadersTitle: "TOP-5 сезона",
    scorers: "Бомбардиры",
    assistants: "Ассистенты",
    appearances: "Матчи",
    minutes: "Минуты",
    cleanSheets: "Сухие матчи",
    noLeaderboardData: "Пока нет данных",
    tableEyebrow: "ВСЕ ИГРОКИ",
    tableTitle: "Сезонная статистика",
    sort: "Сортировка",
    contribution: "Г+А",
    starts: "Старт",
    yellow: "ЖК",
    red: "КК",
    extended: "Дополнительно",
    player: "Игрок",
    position: "Позиция",
    noData: "В выбранном сезоне пока нет завершённой статистики игроков.",
    noDataHint: "Данные появятся после того, как статистика хотя бы одного матча будет отмечена в админке как готовая.",
    passAccuracy: "пас",
    saves: "сейвы",
    tackles: "отборы",
    interceptions: "перехваты",
    shots: "удары",
    shotsTarget: "в створ",
    keyPasses: "ключ. пас",
    playerProfile: "Профиль →",
  },
  ro: {
    eyebrow: "FC EDINEȚ • CIFRELE SEZONULUI",
    title: "Statistica echipei",
    description: "Liderii, rezultatele și indicatorii jucătorilor FC Edineț pe sezoane și competiții.",
    season: "Sezon",
    tournament: "Competiție",
    allTournaments: "Toate competițiile",
    matches: "Meciuri",
    wins: "Victorii",
    draws: "Egaluri",
    losses: "Înfrângeri",
    goals: "Goluri",
    goalDifference: "Golaveraj",
    winRate: "% victorii",
    dataCoverage: "Statistici completate",
    leadersEyebrow: "LIDERII ECHIPEI",
    leadersTitle: "TOP-5 al sezonului",
    scorers: "Marcatori",
    assistants: "Assisturi",
    appearances: "Meciuri",
    minutes: "Minute",
    cleanSheets: "Meciuri fără gol primit",
    noLeaderboardData: "Încă nu sunt date",
    tableEyebrow: "TOȚI JUCĂTORII",
    tableTitle: "Statistica sezonului",
    sort: "Sortare",
    contribution: "G+A",
    starts: "Titular",
    yellow: "GC",
    red: "CR",
    extended: "Suplimentar",
    player: "Jucător",
    position: "Poziție",
    noData: "În sezonul selectat nu există încă statistici finalizate ale jucătorilor.",
    noDataHint: "Datele vor apărea după ce statistica unui meci va fi marcată ca finalizată în panoul de administrare.",
    passAccuracy: "pase",
    saves: "intervenții",
    tackles: "deposedări",
    interceptions: "intercepții",
    shots: "șuturi",
    shotsTarget: "pe poartă",
    keyPasses: "pase-cheie",
    playerProfile: "Profil →",
  },
} as const;

const sortLabels = {
  goals: { ru: "Голы", ro: "Goluri" },
  assists: { ru: "Ассисты", ro: "Assisturi" },
  contributions: { ru: "Гол + пас", ro: "Gol + assist" },
  appearances: { ru: "Матчи", ro: "Meciuri" },
  minutes: { ru: "Минуты", ro: "Minute" },
  clean_sheets: { ru: "Сухие матчи", ro: "Meciuri fără gol" },
} satisfies Record<SortKey, Record<"ru" | "ro", string>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberValue(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function emptySummary(): SummaryNumbers {
  return {
    appearances: 0,
    starts: 0,
    substitute_appearances: 0,
    captain_appearances: 0,
    competitions_played: 0,
    minutes_played: 0,
    goals: 0,
    assists: 0,
    own_goals: 0,
    penalties_scored: 0,
    penalties_missed: 0,
    yellow_cards: 0,
    red_cards: 0,
    goals_conceded: 0,
    saves: 0,
    clean_sheets: 0,
    penalties_saved: 0,
    shots: 0,
    shots_on_target: 0,
    passes_attempted: 0,
    passes_completed: 0,
    key_passes: 0,
    tackles_won: 0,
    interceptions: 0,
    clearances: 0,
    blocks: 0,
    fouls_committed: 0,
    fouls_won: 0,
  };
}

function mergeSummary(target: SummaryNumbers, row: Partial<PlayerSeasonStatistics & PlayerSeasonTotal>) {
  target.appearances += numberValue(row.appearances);
  target.starts += numberValue(row.starts);
  target.substitute_appearances += numberValue(row.substitute_appearances);
  target.captain_appearances += numberValue(row.captain_appearances);
  target.competitions_played += numberValue(row.competitions_played);
  target.minutes_played += numberValue(row.minutes_played);
  target.goals += numberValue(row.goals);
  target.assists += numberValue(row.assists);
  target.own_goals += numberValue(row.own_goals);
  target.penalties_scored += numberValue(row.penalties_scored);
  target.penalties_missed += numberValue(row.penalties_missed);
  target.yellow_cards += numberValue(row.yellow_cards);
  target.red_cards += numberValue(row.red_cards);
  target.goals_conceded += numberValue(row.goals_conceded);
  target.saves += numberValue(row.saves);
  target.clean_sheets += numberValue(row.clean_sheets);
  target.penalties_saved += numberValue(row.penalties_saved);
  target.shots += numberValue(row.shots);
  target.shots_on_target += numberValue(row.shots_on_target);
  target.passes_attempted += numberValue(row.passes_attempted);
  target.passes_completed += numberValue(row.passes_completed);
  target.key_passes += numberValue(row.key_passes);
  target.tackles_won += numberValue(row.tackles_won);
  target.interceptions += numberValue(row.interceptions);
  target.clearances += numberValue(row.clearances);
  target.blocks += numberValue(row.blocks);
  target.fouls_committed += numberValue(row.fouls_committed);
  target.fouls_won += numberValue(row.fouls_won);
}

function contribution(row: Pick<SummaryNumbers, "goals" | "assists">) {
  return row.goals + row.assists;
}

function passAccuracy(row: Pick<SummaryNumbers, "passes_attempted" | "passes_completed">) {
  if (row.passes_attempted <= 0) return 0;
  return Math.round((row.passes_completed / row.passes_attempted) * 100);
}

function sortRows(rows: PlayerSummary[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    let diff = 0;
    if (sort === "contributions") diff = contribution(b) - contribution(a);
    else if (sort === "minutes") diff = b.minutes_played - a.minutes_played;
    else diff = numberValue(b[sort]) - numberValue(a[sort]);
    if (diff !== 0) return diff;
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    if (b.appearances !== a.appearances) return b.appearances - a.appearances;
    return `${a.player.last_name} ${a.player.first_name}`.localeCompare(`${b.player.last_name} ${b.player.first_name}`, "ru");
  });
}

function topRows(rows: PlayerSummary[], key: "goals" | "assists" | "appearances" | "minutes_played" | "clean_sheets") {
  const filtered = rows.filter((row) => {
    if (key === "clean_sheets") return row.player.position === "goalkeeper" && row.clean_sheets > 0;
    return numberValue(row[key]) > 0;
  });
  return [...filtered]
    .sort((a, b) => {
      const diff = numberValue(b[key]) - numberValue(a[key]);
      if (diff !== 0) return diff;
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return b.appearances - a.appearances;
    })
    .slice(0, 5);
}

function resultSummary(matches: ClubMatch[], clubId: string | number, completedIds: Set<string>): ResultSummary {
  let played = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let statisticsComplete = 0;

  for (const match of matches) {
    const home = String(match.home_team_id) === String(clubId);
    const own = numberValue(home ? match.home_score : match.away_score);
    const opponent = numberValue(home ? match.away_score : match.home_score);
    if (match.home_score === null || match.away_score === null) continue;
    played += 1;
    goalsFor += own;
    goalsAgainst += opponent;
    if (own > opponent) wins += 1;
    else if (own === opponent) draws += 1;
    else losses += 1;
    if (completedIds.has(String(match.id))) statisticsComplete += 1;
  }

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    winRate: played ? Math.round((wins / played) * 100) : 0,
    statisticsComplete,
  };
}

function statHref(seasonId: string, competitionId: string, sort: SortKey) {
  const params = new URLSearchParams();
  if (seasonId) params.set("season", seasonId);
  if (competitionId) params.set("competition", competitionId);
  if (sort !== "goals") params.set("sort", sort);
  return `/statistics${params.size ? `?${params.toString()}` : ""}`;
}

function extendedLabel(row: PlayerSummary, locale: "ru" | "ro") {
  const text = textByLocale[locale];
  if (row.player.position === "goalkeeper") {
    return `${row.saves} ${text.saves} · ${row.clean_sheets} CS`;
  }
  if (row.player.position === "defender") {
    return `${row.tackles_won} ${text.tackles} · ${row.interceptions} ${text.interceptions}`;
  }
  if (row.player.position === "midfielder") {
    return `${passAccuracy(row)}% ${text.passAccuracy} · ${row.key_passes} ${text.keyPasses}`;
  }
  return `${row.shots_on_target}/${row.shots} ${text.shotsTarget} · ${row.key_passes} ${text.keyPasses}`;
}

export default async function StatisticsPage({ searchParams }: PageProps) {
  const locale = await getLocale();
  const text = textByLocale[locale];
  const params = await searchParams;
  const supabase = await createClient();
  const design = await getPublishedSitePageDesign(supabase, "team");

  const requestedSort = one(params.sort);
  const sort: SortKey = requestedSort && requestedSort in sortLabels ? (requestedSort as SortKey) : "goals";

  const [seasonsResult, competitionsResult, playersResult, clubResult] = await Promise.all([
    supabase
      .from("seasons")
      .select("id,name,slug,starts_on,ends_on,is_current,is_active")
      .eq("is_active", true)
      .order("starts_on", { ascending: false, nullsFirst: false })
      .order("name", { ascending: false }),
    supabase
      .from("competitions")
      .select("id,name,slug,season,season_id,is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("players")
      .select("id,first_name,last_name,slug,shirt_number,position,photo_url,is_active")
      .order("is_active", { ascending: false })
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("last_name"),
    supabase
      .from("teams")
      .select("id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active")
      .eq("is_club", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const seasons = (seasonsResult.data ?? []) as Season[];
  const competitions = (competitionsResult.data ?? []) as Competition[];
  const players = (playersResult.data ?? []) as Player[];
  const club = clubResult.data;

  const currentSeason = seasons.find((item) => item.is_current) ?? seasons[0] ?? null;
  const requestedSeason = one(params.season);
  const selectedSeason =
    (requestedSeason ? seasons.find((item) => String(item.id) === requestedSeason) : null) ?? currentSeason;
  const selectedSeasonId = selectedSeason ? String(selectedSeason.id) : "";

  const seasonCompetitions = competitions.filter((competition) => {
    if (!selectedSeason) return true;
    if (competition.season_id !== null && competition.season_id !== undefined) {
      return String(competition.season_id) === String(selectedSeason.id);
    }
    return competition.season === selectedSeason.name;
  });

  const requestedCompetition = one(params.competition) ?? "";
  const selectedCompetition =
    requestedCompetition && seasonCompetitions.some((item) => String(item.id) === requestedCompetition)
      ? seasonCompetitions.find((item) => String(item.id) === requestedCompetition) ?? null
      : null;
  const selectedCompetitionId = selectedCompetition ? String(selectedCompetition.id) : "";

  let statisticsRows: Array<PlayerSeasonStatistics | PlayerSeasonTotal> = [];
  let statisticsError: string | null = null;

  if (selectedSeason) {
    if (selectedCompetition) {
      const result = await supabase
        .from("player_season_statistics")
        .select("*")
        .eq("season_id", selectedSeason.id)
        .eq("competition_id", selectedCompetition.id);
      statisticsRows = (result.data ?? []) as PlayerSeasonStatistics[];
      statisticsError = result.error?.message ?? null;
    } else {
      const result = await supabase
        .from("player_season_totals")
        .select("*")
        .eq("season_id", selectedSeason.id);
      statisticsRows = (result.data ?? []) as PlayerSeasonTotal[];
      statisticsError = result.error?.message ?? null;
    }
  }

  const playerById = new Map(players.map((player) => [String(player.id), player]));
  const summaryByPlayer = new Map<string, PlayerSummary>();

  for (const stat of statisticsRows) {
    const player = playerById.get(String(stat.player_id));
    if (!player) continue;
    const id = String(player.id);
    let summary = summaryByPlayer.get(id);
    if (!summary) {
      summary = { ...emptySummary(), player };
      summaryByPlayer.set(id, summary);
    }
    mergeSummary(summary, stat);
  }

  const summaries = [...summaryByPlayer.values()].filter((row) => row.appearances > 0);
  const sortedSummaries = sortRows(summaries, sort);

  const competitionIds = selectedCompetition
    ? [selectedCompetition.id]
    : seasonCompetitions.map((competition) => competition.id);

  let finishedMatches: ClubMatch[] = [];
  let completedMatchIds = new Set<string>();

  if (club && competitionIds.length > 0) {
    const matchesQuery = await supabase
      .from("matches")
      .select("id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,home_score,away_score,notes,created_at,updated_at")
      .eq("status", "finished")
      .in("competition_id", competitionIds.map(String))
      .or(`home_team_id.eq.${club.id},away_team_id.eq.${club.id}`);

    finishedMatches = (matchesQuery.data ?? []) as unknown as ClubMatch[];
    const matchIds = finishedMatches.map((match) => String(match.id));
    if (matchIds.length > 0) {
      const completedResult = await supabase
        .from("match_statistics_status")
        .select("match_id,status")
        .eq("status", "complete")
        .in("match_id", matchIds);
      completedMatchIds = new Set((completedResult.data ?? []).map((row) => String(row.match_id)));
    }
  }

  const results = club ? resultSummary(finishedMatches, club.id, completedMatchIds) : resultSummary([], "", completedMatchIds);

  const leaderboards = [
    { title: text.scorers, key: "goals" as const, rows: topRows(summaries, "goals"), value: (row: PlayerSummary) => row.goals },
    { title: text.assistants, key: "assists" as const, rows: topRows(summaries, "assists"), value: (row: PlayerSummary) => row.assists },
    { title: text.appearances, key: "appearances" as const, rows: topRows(summaries, "appearances"), value: (row: PlayerSummary) => row.appearances },
    { title: text.minutes, key: "minutes_played" as const, rows: topRows(summaries, "minutes_played"), value: (row: PlayerSummary) => row.minutes_played },
    { title: text.cleanSheets, key: "clean_sheets" as const, rows: topRows(summaries, "clean_sheets"), value: (row: PlayerSummary) => row.clean_sheets },
  ];

  return (
    <main>
      <PageHeroShell design={design} className="pageHero teamStatisticsHero">
        <>
          {design.show_eyebrow && heroLayerVisible(design.layer_config, "eyebrow") && (
            <p className="eyebrow" style={heroLayerStyle(design.layer_config, "eyebrow")}>{text.eyebrow}</p>
          )}
          {heroLayerVisible(design.layer_config, "title") && (
            <h1 style={heroLayerStyle(design.layer_config, "title")}>{text.title}</h1>
          )}
          {design.show_description && heroLayerVisible(design.layer_config, "description") && (
            <p style={heroLayerStyle(design.layer_config, "description")}>{text.description}</p>
          )}
        </>
      </PageHeroShell>

      <section className="teamStatisticsSection">
        <div className="container teamStatisticsContainer">
          <div className="teamStatisticsFilters">
            <div className="teamStatisticsFilterBlock">
              <span>{text.season}</span>
              <div className="teamStatisticsPills">
                {seasons.map((season) => (
                  <Link
                    key={season.id}
                    className={String(season.id) === selectedSeasonId ? "active" : ""}
                    href={statHref(String(season.id), "", sort)}
                  >
                    {season.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="teamStatisticsFilterBlock">
              <span>{text.tournament}</span>
              <div className="teamStatisticsPills">
                <Link className={!selectedCompetition ? "active" : ""} href={statHref(selectedSeasonId, "", sort)}>
                  {text.allTournaments}
                </Link>
                {seasonCompetitions.map((competition) => (
                  <Link
                    key={competition.id}
                    className={String(competition.id) === selectedCompetitionId ? "active" : ""}
                    href={statHref(selectedSeasonId, String(competition.id), sort)}
                  >
                    {competition.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="teamStatisticsScoreboard">
            <TeamMetric label={text.matches} value={results.played} />
            <TeamMetric label={text.wins} value={results.wins} accent="good" />
            <TeamMetric label={text.draws} value={results.draws} />
            <TeamMetric label={text.losses} value={results.losses} accent="bad" />
            <TeamMetric label={text.goals} value={`${results.goalsFor}:${results.goalsAgainst}`} />
            <TeamMetric label={text.goalDifference} value={results.goalDifference > 0 ? `+${results.goalDifference}` : results.goalDifference} />
            <TeamMetric label={text.winRate} value={`${results.winRate}%`} accent="blue" />
            <TeamMetric label={text.dataCoverage} value={`${results.statisticsComplete}/${results.played}`} accent="blue" />
          </div>

          {statisticsError ? (
            <div className="teamStatisticsEmpty errorBox">{statisticsError}</div>
          ) : summaries.length === 0 ? (
            <div className="teamStatisticsEmpty">
              <strong>{text.noData}</strong>
              <span>{text.noDataHint}</span>
            </div>
          ) : (
            <>
              <section className="teamStatisticsLeadersSection">
                <div className="teamStatisticsHeading">
                  <div>
                    <p className="eyebrow blue">{text.leadersEyebrow}</p>
                    <h2>{text.leadersTitle}</h2>
                  </div>
                  {selectedSeason && <span>{selectedSeason.name}{selectedCompetition ? ` · ${selectedCompetition.name}` : ""}</span>}
                </div>
                <div className="teamStatisticsLeaderboards">
                  {leaderboards.map((board) => (
                    <Leaderboard key={board.key} title={board.title} rows={board.rows} value={board.value} empty={text.noLeaderboardData} />
                  ))}
                </div>
              </section>

              <section className="teamStatisticsTableSection">
                <div className="teamStatisticsHeading teamStatisticsTableHeading">
                  <div>
                    <p className="eyebrow blue">{text.tableEyebrow}</p>
                    <h2>{text.tableTitle}</h2>
                  </div>
                  <div className="teamStatisticsSort">
                    <span>{text.sort}</span>
                    <div>
                      {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                        <Link
                          key={key}
                          className={sort === key ? "active" : ""}
                          href={statHref(selectedSeasonId, selectedCompetitionId, key)}
                        >
                          {sortLabels[key][locale]}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="teamStatisticsTableWrap">
                  <table className="teamStatisticsTable">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{text.player}</th>
                        <th>{text.position}</th>
                        <th>{text.matches}</th>
                        <th>{text.starts}</th>
                        <th>{text.minutes}</th>
                        <th>{text.goals}</th>
                        <th>{text.assistants}</th>
                        <th>{text.contribution}</th>
                        <th>{text.yellow}</th>
                        <th>{text.red}</th>
                        <th>{text.extended}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSummaries.map((row, index) => (
                        <tr key={row.player.id}>
                          <td className="teamStatisticsRank">{index + 1}</td>
                          <td>
                            <Link className="teamStatisticsPlayer" href={`/team/${row.player.slug}`}>
                              {row.player.photo_url ? (
                                <img src={row.player.photo_url} alt="" />
                              ) : (
                                <span>{row.player.shirt_number ?? "FCE"}</span>
                              )}
                              <span>
                                <strong>{row.player.first_name} {row.player.last_name}</strong>
                                <small>#{row.player.shirt_number ?? "—"} · {text.playerProfile}</small>
                              </span>
                            </Link>
                          </td>
                          <td>{positionLabelsI18n[locale][row.player.position] ?? row.player.position}</td>
                          <td><strong>{row.appearances}</strong></td>
                          <td>{row.starts}</td>
                          <td>{row.minutes_played}</td>
                          <td className="accent"><strong>{row.goals}</strong></td>
                          <td className="accent"><strong>{row.assists}</strong></td>
                          <td className="accentBlue"><strong>{contribution(row)}</strong></td>
                          <td>{row.yellow_cards}</td>
                          <td>{row.red_cards}</td>
                          <td className="teamStatisticsExtended">{extendedLabel(row, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function TeamMetric({ label, value, accent }: { label: string; value: string | number; accent?: "good" | "bad" | "blue" }) {
  return (
    <article className={`teamStatisticsMetric ${accent ? `is-${accent}` : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Leaderboard({
  title,
  rows,
  value,
  empty,
}: {
  title: string;
  rows: PlayerSummary[];
  value: (row: PlayerSummary) => number;
  empty: string;
}) {
  return (
    <article className="teamStatisticsLeaderboard">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <div className="teamStatisticsLeaderboardEmpty">{empty}</div>
      ) : (
        <div className="teamStatisticsLeaderboardRows">
          {rows.map((row, index) => (
            <Link key={row.player.id} href={`/team/${row.player.slug}`} className="teamStatisticsLeaderboardRow">
              <b>{index + 1}</b>
              {row.player.photo_url ? <img src={row.player.photo_url} alt="" /> : <span className="teamStatisticsLeaderboardAvatar">{row.player.shirt_number ?? "FCE"}</span>}
              <span className="teamStatisticsLeaderboardName">
                <strong>{row.player.first_name} {row.player.last_name}</strong>
                <small>#{row.player.shirt_number ?? "—"}</small>
              </span>
              <strong className="teamStatisticsLeaderboardValue">{value(row)}</strong>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
