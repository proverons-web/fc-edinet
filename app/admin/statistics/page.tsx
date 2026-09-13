import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type {
  ClubMatch,
  Competition,
  Player,
  PlayerSeasonStatistics,
  PlayerSeasonTotal,
  Season,
} from "@/lib/types";
import { positionLabels } from "@/lib/types";
import {
  assignCompetitionSeason,
  createSeason,
  setCurrentSeason,
} from "./actions";

export const metadata = { title: "Статистика игроков — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    season?: string | string[];
    competition?: string | string[];
    sort?: string | string[];
    saved?: string | string[];
    error?: string | string[];
  }>;
};

type StatisticsStateRow = {
  match_id: string | number;
  status: "draft" | "complete";
};

type StatMatch = ClubMatch & {
  stats_state?: StatisticsStateRow | null;
  stats_rows?: number;
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

type SortKey = "goals" | "assists" | "appearances" | "minutes" | "clean_sheets" | "shots" | "tackles_won" | "saves";

const sortLabels: Record<SortKey, string> = {
  goals: "Голы",
  assists: "Ассисты",
  appearances: "Матчи",
  minutes: "Минуты",
  clean_sheets: "Сухие матчи",
  shots: "Удары",
  tackles_won: "Отборы",
  saves: "Сейвы",
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Chisinau",
  }).format(new Date(value));
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

function mergeStat(target: SummaryNumbers, row: Partial<PlayerSeasonStatistics & PlayerSeasonTotal>) {
  target.appearances += numberValue(row.appearances);
  target.starts += numberValue(row.starts);
  target.substitute_appearances += numberValue(row.substitute_appearances);
  target.captain_appearances += numberValue(row.captain_appearances);
  target.competitions_played += Math.max(numberValue(row.competitions_played), row.competition_id ? 1 : 0);
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

function sortSummaries(rows: PlayerSummary[], sort: SortKey) {
  const key: keyof SummaryNumbers =
    sort === "minutes" ? "minutes_played" : sort;

  return [...rows].sort((a, b) => {
    const primary = numberValue(b[key]) - numberValue(a[key]);
    if (primary !== 0) return primary;
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    if (b.appearances !== a.appearances) return b.appearances - a.appearances;
    return `${a.player.last_name} ${a.player.first_name}`.localeCompare(
      `${b.player.last_name} ${b.player.first_name}`,
      "ru"
    );
  });
}

function topBy(rows: PlayerSummary[], key: keyof SummaryNumbers) {
  return [...rows].sort((a, b) => {
    const diff = numberValue(b[key]) - numberValue(a[key]);
    if (diff !== 0) return diff;
    return b.appearances - a.appearances;
  })[0] ?? null;
}

function passAccuracy(row: Pick<SummaryNumbers, "passes_attempted" | "passes_completed">) {
  if (row.passes_attempted <= 0) return 0;
  return Math.round((row.passes_completed / row.passes_attempted) * 100);
}

function extendedSummary(row: PlayerSummary) {
  const pass = `Пас ${passAccuracy(row)}%`;
  if (row.player.position === "goalkeeper") {
    return `${row.saves} сейв. · ${row.penalties_saved} пен. · ${pass}`;
  }
  if (row.player.position === "defender") {
    return `${row.tackles_won} отб. · ${row.interceptions} пер. · ${row.clearances} вын. · ${pass}`;
  }
  if (row.player.position === "midfielder") {
    return `${pass} · ${row.key_passes} ключ. · ${row.tackles_won} отб. · ${row.interceptions} пер.`;
  }
  return `${row.shots_on_target}/${row.shots} в створ · ${row.key_passes} ключ. · ${pass}`;
}

export default async function AdminStatisticsPage({ searchParams }: PageProps) {
  const { supabase } = await requireEditor();
  const params = await searchParams;
  const saved = one(params.saved);
  const errorMessage = one(params.error);
  const requestedSort = one(params.sort);
  const sort: SortKey =
    requestedSort && requestedSort in sortLabels ? (requestedSort as SortKey) : "goals";

  const { data: seasonsData, error: seasonsError } = await supabase
    .from("seasons")
    .select("id,name,slug,starts_on,ends_on,is_current,is_active,created_at,updated_at")
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("name", { ascending: false });

  if (seasonsError) {
    return <StatisticsMigrationRequired message={seasonsError.message} />;
  }

  const seasons = (seasonsData ?? []) as Season[];
  const currentSeason = seasons.find((item) => item.is_current) ?? seasons[0] ?? null;
  const requestedSeason = one(params.season);
  const selectedSeasonId =
    requestedSeason === ""
      ? ""
      : requestedSeason && seasons.some((item) => String(item.id) === requestedSeason)
        ? requestedSeason
        : currentSeason
          ? String(currentSeason.id)
          : "";

  const [competitionsResult, playersResult] = await Promise.all([
    supabase
      .from("competitions")
      .select("id,name,slug,season,season_id,is_active")
      .order("is_active", { ascending: false })
      .order("name"),
    supabase
      .from("players")
      .select("id,first_name,last_name,slug,shirt_number,position,photo_url,is_active")
      .order("is_active", { ascending: false })
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("last_name"),
  ]);

  if (competitionsResult.error) {
    return <StatisticsMigrationRequired message={competitionsResult.error.message} />;
  }

  const competitions = (competitionsResult.data ?? []) as Competition[];
  const players = (playersResult.data ?? []) as Player[];
  const activePlayersCount = players.filter((player) => player.is_active).length;
  const playerById = new Map(players.map((player) => [String(player.id), player]));

  const requestedCompetition = one(params.competition);
  const selectedCompetitionId =
    requestedCompetition &&
    competitions.some((item) => String(item.id) === requestedCompetition)
      ? requestedCompetition
      : "";

  const selectedSeason = seasons.find((item) => String(item.id) === selectedSeasonId) ?? null;
  const selectedCompetition =
    competitions.find((item) => String(item.id) === selectedCompetitionId) ?? null;

  const seasonCompetitionIds = competitions
    .filter((item) => !selectedSeasonId || String(item.season_id ?? "") === selectedSeasonId)
    .map((item) => String(item.id));

  let matchQuery = supabase
    .from("matches")
    .select(`
      id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
      home_score,away_score,notes,created_at,updated_at,
      home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
      away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
      competition:competitions!matches_competition_id_fkey(id,name,slug,season,season_id,is_active)
    `)
    .eq("status", "finished")
    .order("kickoff", { ascending: false });

  if (selectedCompetitionId) {
    matchQuery = matchQuery.eq("competition_id", selectedCompetitionId);
  } else if (selectedSeasonId) {
    if (seasonCompetitionIds.length > 0) {
      matchQuery = matchQuery.in("competition_id", seasonCompetitionIds);
    } else {
      matchQuery = matchQuery.eq("competition_id", -1);
    }
  }

  const { data: matchesData, error: matchesError } = await matchQuery;
  const matches = (matchesData ?? []) as unknown as ClubMatch[];
  const matchIds = matches.map((item) => String(item.id));

  let states: StatisticsStateRow[] = [];
  let statRows: { match_id: string | number }[] = [];

  if (matchIds.length > 0) {
    const [statesResult, rowsResult] = await Promise.all([
      supabase
        .from("match_statistics_status")
        .select("match_id,status")
        .in("match_id", matchIds),
      supabase
        .from("player_match_stats")
        .select("match_id")
        .in("match_id", matchIds),
    ]);

    if (statesResult.error || rowsResult.error) {
      return (
        <StatisticsMigrationRequired
          message={statesResult.error?.message || rowsResult.error?.message || "Statistics tables unavailable"}
        />
      );
    }

    states = (statesResult.data ?? []) as StatisticsStateRow[];
    statRows = rowsResult.data ?? [];
  }

  const stateByMatch = new Map(states.map((item) => [String(item.match_id), item]));
  const rowCountByMatch = new Map<string, number>();
  for (const row of statRows) {
    const key = String(row.match_id);
    rowCountByMatch.set(key, (rowCountByMatch.get(key) ?? 0) + 1);
  }

  const enrichedMatches: StatMatch[] = matches.map((match) => ({
    ...match,
    stats_state: stateByMatch.get(String(match.id)) ?? null,
    stats_rows: rowCountByMatch.get(String(match.id)) ?? 0,
  }));

  const completedMatches = enrichedMatches.filter(
    (match) => match.stats_state?.status === "complete"
  ).length;
  const matchesWithRows = enrichedMatches.filter((match) => (match.stats_rows ?? 0) > 0).length;
  const completionPercent = enrichedMatches.length
    ? Math.round((completedMatches / enrichedMatches.length) * 100)
    : 0;

  let summaryQuery = selectedCompetitionId
    ? supabase
        .from("player_season_statistics")
        .select("player_id,season_id,competition_id,appearances,starts,substitute_appearances,captain_appearances,minutes_played,goals,assists,own_goals,penalties_scored,penalties_missed,yellow_cards,red_cards,goals_conceded,saves,clean_sheets,penalties_saved,shots,shots_on_target,passes_attempted,passes_completed,key_passes,tackles_won,interceptions,clearances,blocks,fouls_committed,fouls_won")
        .eq("competition_id", selectedCompetitionId)
    : supabase
        .from("player_season_totals")
        .select("player_id,season_id,appearances,starts,substitute_appearances,captain_appearances,competitions_played,minutes_played,goals,assists,own_goals,penalties_scored,penalties_missed,yellow_cards,red_cards,goals_conceded,saves,clean_sheets,penalties_saved,shots,shots_on_target,passes_attempted,passes_completed,key_passes,tackles_won,interceptions,clearances,blocks,fouls_committed,fouls_won");

  if (selectedSeasonId) {
    summaryQuery = summaryQuery.eq("season_id", selectedSeasonId);
  }

  const { data: summaryData, error: summaryError } = await summaryQuery;
  if (summaryError) {
    return <StatisticsAggregationRequired message={summaryError.message} />;
  }

  const summaryByPlayer = new Map<string, SummaryNumbers>();
  for (const row of summaryData ?? []) {
    const key = String(row.player_id);
    const current = summaryByPlayer.get(key) ?? emptySummary();
    mergeStat(current, row as Partial<PlayerSeasonStatistics & PlayerSeasonTotal>);
    summaryByPlayer.set(key, current);
  }

  const summaries: PlayerSummary[] = [];
  for (const [playerId, totals] of summaryByPlayer) {
    const player = playerById.get(playerId);
    if (!player || totals.appearances <= 0) continue;
    summaries.push({ player, ...totals });
  }

  const sortedSummaries = sortSummaries(summaries, sort);
  const topScorer = topBy(summaries, "goals");
  const topAssistant = topBy(summaries, "assists");
  const mostAppearances = topBy(summaries, "appearances");
  const mostMinutes = topBy(summaries, "minutes_played");
  const bestKeeper = topBy(
    summaries.filter((row) => row.player.position === "goalkeeper"),
    "clean_sheets"
  );

  return (
    <main className="adminPage statisticsAdminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • v2.2.5</p>
            <h1>Статистика игроков</h1>
            <p>
              Матчи — источник данных. Итоги и расширенные показатели по позициям считаются автоматически.
            </p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">← Админка</Link>
            <Link href="/admin/matches" className="rowAction muted">Матчи</Link>
            <Link href="/admin/players" className="rowAction muted">Игроки</Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          {errorMessage && <div className="formError statisticsNotice">{errorMessage}</div>}
          {saved && (
            <div className="statisticsSuccess statisticsNotice">
              {saved === "season" && "Сезон создан."}
              {saved === "current" && "Текущий сезон изменён."}
              {saved === "competition" && "Турнир привязан к сезону."}
            </div>
          )}

          <div className="adminStats statisticsKpis">
            <Stat label="Активные игроки" value={activePlayersCount} />
            <Stat label="Завершённые матчи" value={enrichedMatches.length} />
            <Stat label="Статистика готова" value={completedMatches} />
            <Stat label="Готовность" value={`${completionPercent}%`} />
          </div>

          <section className="statisticsPanel statisticsFilterPanel">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">КОНТЕКСТ</p>
                <h2>Сезонная сводка</h2>
                <p>
                  Выбери сезон и турнир. Таблица игроков ниже пересчитывается автоматически только по матчам, где статистика отмечена «Готово».
                </p>
              </div>
              {currentSeason && (
                <span className="statisticsCurrentBadge">Текущий: {currentSeason.name}</span>
              )}
            </div>

            <form method="get" className="statisticsFilters statisticsFiltersV222">
              <label>
                <span>Сезон</span>
                <select name="season" defaultValue={selectedSeasonId}>
                  <option value="">Все сезоны</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={String(season.id)}>
                      {season.name}{season.is_current ? " · текущий" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Турнир</span>
                <select name="competition" defaultValue={selectedCompetitionId}>
                  <option value="">Все турниры сезона</option>
                  {competitions
                    .filter(
                      (competition) =>
                        !selectedSeasonId || String(competition.season_id ?? "") === selectedSeasonId
                    )
                    .map((competition) => (
                      <option key={competition.id} value={String(competition.id)}>
                        {competition.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Сортировка</span>
                <select name="sort" defaultValue={sort}>
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
              </label>
              <button className="primaryButton" type="submit">Показать</button>
            </form>
          </section>

          <section className="statisticsPanel statisticsSeasonSummaryPanel">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">АВТОМАТИЧЕСКИЙ ПОДСЧЁТ</p>
                <h2>
                  {selectedSeason?.name ?? "Все сезоны"}
                  {selectedCompetition ? ` · ${selectedCompetition.name}` : " · все турниры"}
                </h2>
                <p>
                  Никаких ручных итогов: один завершённый матч меняет эту таблицу автоматически.
                </p>
              </div>
              <div className="statisticsCompletionBadge">
                <strong>{completedMatches}/{enrichedMatches.length}</strong>
                <span>матчей учтено</span>
              </div>
            </div>

            {summaries.length === 0 ? (
              <div className="statisticsSummaryEmpty">
                <strong>Пока нечего суммировать</strong>
                <span>Заверши статистику хотя бы одного матча — игроки сразу появятся здесь.</span>
              </div>
            ) : (
              <>
                <div className="statisticsLeaderGrid">
                  <LeaderCard title="Бомбардир" row={topScorer} metric="goals" suffix="гол." />
                  <LeaderCard title="Ассистент" row={topAssistant} metric="assists" suffix="асс." />
                  <LeaderCard title="Больше матчей" row={mostAppearances} metric="appearances" suffix="матч." />
                  <LeaderCard title="Больше минут" row={mostMinutes} metric="minutes_played" suffix="мин." />
                  {bestKeeper && bestKeeper.clean_sheets > 0 && (
                    <LeaderCard title="Сухие матчи" row={bestKeeper} metric="clean_sheets" suffix="сух." />
                  )}
                </div>

                <div className="statisticsSeasonTableWrap">
                  <table className="statisticsSeasonTable">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Игрок</th>
                        <th title="Матчи">И</th>
                        <th title="В старте">Старт</th>
                        <th title="Выходы на замену">Зам.</th>
                        <th title="Минуты">Мин</th>
                        <th title="Голы">Г</th>
                        <th title="Голевые передачи">А</th>
                        <th title="Голы + ассисты">Г+А</th>
                        <th title="Расширенные показатели по позиции">Расшир.</th>
                        <th title="Жёлтые карточки">ЖК</th>
                        <th title="Красные карточки">КК</th>
                        <th title="Сухие матчи">Сух.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSummaries.map((row, index) => (
                        <tr key={row.player.id}>
                          <td className="statisticsRankCell">{index + 1}</td>
                          <td>
                            <Link href={`/team/${row.player.slug}`} className="statisticsSummaryPlayer">
                              <span className="statisticsSummaryPlayerPhoto">
                                {row.player.photo_url ? (
                                  <img src={row.player.photo_url} alt="" />
                                ) : (
                                  <b>{row.player.shirt_number ?? "FC"}</b>
                                )}
                              </span>
                              <span>
                                <strong>{row.player.first_name} {row.player.last_name}</strong>
                                <small>
                                  {positionLabels[row.player.position] ?? row.player.position}
                                  {!row.player.is_active ? " · архив" : ""}
                                </small>
                              </span>
                            </Link>
                          </td>
                          <td><b>{row.appearances}</b></td>
                          <td>{row.starts}</td>
                          <td>{row.substitute_appearances}</td>
                          <td>{row.minutes_played}</td>
                          <td className="statisticsAccentCell">{row.goals}</td>
                          <td className="statisticsAccentCell">{row.assists}</td>
                          <td><b>{row.goals + row.assists}</b></td>
                          <td className="statisticsExtendedCell">{extendedSummary(row)}</td>
                          <td>{row.yellow_cards}</td>
                          <td>{row.red_cards}</td>
                          <td>{row.player.position === "goalkeeper" ? row.clean_sheets : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="statisticsCalculationNote">
              <strong>Правило расчёта:</strong>
              <span>черновики исключены; учитываются только finished-матчи со статусом статистики complete.</span>
            </div>
          </section>

          <div className="statisticsFoundationGrid">
            <section className="statisticsPanel">
              <div className="statisticsPanelHead">
                <div>
                  <p className="eyebrow blue">СЕЗОНЫ</p>
                  <h2>Управление сезонами</h2>
                </div>
                <span className="statisticsCount">{seasons.length}</span>
              </div>

              <div className="statisticsSeasonList">
                {seasons.map((season) => (
                  <article className="statisticsSeasonRow" key={season.id}>
                    <div>
                      <strong>{season.name}</strong>
                      <span>
                        {season.starts_on || "—"} → {season.ends_on || "—"}
                      </span>
                    </div>
                    {season.is_current ? (
                      <span className="statisticsState complete">Текущий</span>
                    ) : (
                      <form action={setCurrentSeason}>
                        <input type="hidden" name="season_id" value={String(season.id)} />
                        <button className="rowAction muted" type="submit">Сделать текущим</button>
                      </form>
                    )}
                  </article>
                ))}
              </div>

              <form action={createSeason} className="statisticsCreateSeason">
                <h3>Добавить сезон</h3>
                <div className="statisticsCreateSeasonGrid">
                  <label>
                    <span>Название</span>
                    <input name="name" placeholder="2027/28" required />
                  </label>
                  <label>
                    <span>Начало</span>
                    <input type="date" name="starts_on" />
                  </label>
                  <label>
                    <span>Окончание</span>
                    <input type="date" name="ends_on" />
                  </label>
                </div>
                <label className="statisticsCheckbox">
                  <input type="checkbox" name="is_current" />
                  <span>Сразу сделать текущим сезоном</span>
                </label>
                <button className="primaryButton" type="submit">+ Создать сезон</button>
              </form>
            </section>

            <section className="statisticsPanel">
              <div className="statisticsPanelHead">
                <div>
                  <p className="eyebrow blue">ТУРНИРЫ</p>
                  <h2>Привязка к сезону</h2>
                  <p>Существующие турниры сохраняются; мы только добавляем им сезонную связь.</p>
                </div>
              </div>

              <div className="statisticsCompetitionList">
                {competitions.length === 0 ? (
                  <div className="adminEmpty">Турниров пока нет.</div>
                ) : (
                  competitions.map((competition) => (
                    <form action={assignCompetitionSeason} className="statisticsCompetitionRow" key={competition.id}>
                      <input type="hidden" name="competition_id" value={String(competition.id)} />
                      <div>
                        <strong>{competition.name}</strong>
                        <span>{competition.is_active ? "Активный" : "Архив"}</span>
                      </div>
                      <select name="season_id" defaultValue={String(competition.season_id ?? "")}>
                        <option value="">Без сезона</option>
                        {seasons.map((season) => (
                          <option value={String(season.id)} key={season.id}>{season.name}</option>
                        ))}
                      </select>
                      <button className="rowAction" type="submit">Сохранить</button>
                    </form>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="statisticsPanel statisticsMatchesPanel">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">МАТЧИ</p>
                <h2>Готовность статистики</h2>
                <p>
                  В сезонную таблицу выше попадают только матчи со статусом «Готово». Черновики можно менять сколько угодно — итоги сезона от них не меняются.
                </p>
              </div>
              <span className="statisticsCount">{enrichedMatches.length}</span>
            </div>

            {matchesError ? (
              <div className="adminEmpty">Ошибка загрузки матчей: {matchesError.message}</div>
            ) : enrichedMatches.length === 0 ? (
              <div className="adminEmpty">В выбранном сезоне завершённых матчей пока нет.</div>
            ) : (
              <div className="statisticsMatchList">
                {enrichedMatches.map((match) => {
                  const state = match.stats_state?.status ?? "empty";
                  return (
                    <article className="statisticsMatchRow" key={match.id}>
                      <div className="statisticsMatchDate">
                        <strong>{formatDate(match.kickoff)}</strong>
                        <span>{match.competition?.name ?? "Без турнира"}</span>
                      </div>
                      <div className="statisticsMatchTeams">
                        <strong>
                          {match.home?.name ?? "—"} {match.home_score ?? 0} : {match.away_score ?? 0} {match.away?.name ?? "—"}
                        </strong>
                        <span>{match.round || match.stadium || "Завершённый матч"}</span>
                      </div>
                      <div className="statisticsMatchProgress">
                        <span className={`statisticsState ${state}`}>
                          {state === "complete"
                            ? "Готово"
                            : state === "draft"
                              ? "Черновик"
                              : "Не заполнено"}
                        </span>
                        <small>{match.stats_rows ?? 0} игроков</small>
                      </div>
                      <div className="statisticsMatchActions">
                        <Link href={`/admin/matches/${match.id}/edit`} className="rowAction muted">Матч</Link>
                        <Link href={`/admin/statistics/${match.id}`} className="rowAction statisticsEntryLink">
                          {state === "complete" ? "Редактировать" : state === "draft" ? "Продолжить" : "Ввести статистику"}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="statisticsArchitecture">
            <p className="eyebrow blue">АРХИТЕКТУРА v2.2.5</p>
            <h2>Матч изменился — сезон пересчитался</h2>
            <p>
              Сезонная таблица не хранит отдельные ручные цифры. Она строится непосредственно из завершённой матчевой статистики. Поэтому гол, ассист или исправленная минута в матче автоматически меняет итог футболиста.
            </p>
            <div className="statisticsArchitectureFlow">
              <span>Матч</span><b>→</b><span>Статус «Готово»</span><b>→</b><span>Игроки</span><b>→</b><span>Суммирование</span><b>→</b><span>Сезон</span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="adminStat">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function LeaderCard({
  title,
  row,
  metric,
  suffix,
}: {
  title: string;
  row: PlayerSummary | null;
  metric: keyof SummaryNumbers;
  suffix: string;
}) {
  if (!row) return null;
  return (
    <article className="statisticsLeaderCard">
      <span className="statisticsLeaderLabel">{title}</span>
      <div className="statisticsLeaderPlayer">
        <span className="statisticsLeaderPhoto">
          {row.player.photo_url ? <img src={row.player.photo_url} alt="" /> : <b>{row.player.shirt_number ?? "FC"}</b>}
        </span>
        <span>
          <strong>{row.player.first_name} {row.player.last_name}</strong>
          <small>{positionLabels[row.player.position] ?? row.player.position}</small>
        </span>
      </div>
      <div className="statisticsLeaderValue">
        <strong>{numberValue(row[metric])}</strong>
        <span>{suffix}</span>
      </div>
    </article>
  );
}

function StatisticsMigrationRequired({ message }: { message: string }) {
  return (
    <main className="adminPage statisticsAdminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • v2.2</p>
            <h1>Статистика игроков</h1>
            <p>Перед первым запуском нужно создать таблицы статистики в Supabase.</p>
          </div>
          <Link href="/admin" className="adminBack">← Админка</Link>
        </div>
      </section>
      <section className="section adminSurface">
        <div className="container">
          <div className="statisticsSetupCard">
            <span className="statisticsSetupIcon">DB</span>
            <p className="eyebrow blue">БАЗА</p>
            <h2>Проверь миграции 034–035</h2>
            <p>
              Базовые таблицы статистики ещё недоступны. Проверь, что в Supabase уже выполнены <code>034_player_statistics_foundation.sql</code> и <code>035_player_statistics_entry.sql</code>.
            </p>
            <small>Ответ базы: {message}</small>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatisticsAggregationRequired({ message }: { message: string }) {
  return (
    <main className="adminPage statisticsAdminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • v2.2.5</p>
            <h1>Автоматические итоги сезона</h1>
            <p>Код обновлён, но базе нужна последняя миграция агрегирования.</p>
          </div>
          <Link href="/admin" className="adminBack">← Админка</Link>
        </div>
      </section>
      <section className="section adminSurface">
        <div className="container">
          <div className="statisticsSetupCard">
            <span className="statisticsSetupIcon">038</span>
            <p className="eyebrow blue">ОДИН РАЗ</p>
            <h2>Примени миграцию 038</h2>
            <p>
              В Supabase → SQL Editor открой <code>database/038_position_specific_player_statistics.sql</code>, вставь файл целиком и нажми Run. После этого обнови страницу.
            </p>
            <small>Ответ базы: {message}</small>
          </div>
        </div>
      </section>
    </main>
  );
}
