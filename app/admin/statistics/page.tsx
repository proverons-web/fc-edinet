import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type { ClubMatch, Competition, Season } from "@/lib/types";
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

export default async function AdminStatisticsPage({ searchParams }: PageProps) {
  const { supabase } = await requireEditor();
  const params = await searchParams;
  const saved = one(params.saved);
  const errorMessage = one(params.error);

  // Query seasons first so a not-yet-applied migration produces a friendly setup screen
  // instead of breaking the whole admin route.
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
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  if (competitionsResult.error) {
    return <StatisticsMigrationRequired message={competitionsResult.error.message} />;
  }

  const competitions = (competitionsResult.data ?? []) as Competition[];
  const requestedCompetition = one(params.competition);
  const selectedCompetitionId =
    requestedCompetition &&
    competitions.some((item) => String(item.id) === requestedCompetition)
      ? requestedCompetition
      : "";

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
      // An impossible id keeps the result empty without issuing invalid `.in([])`.
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

  return (
    <main className="adminPage statisticsAdminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • v2.2.1</p>
            <h1>Статистика игроков</h1>
            <p>
              Фундамент сезонной статистики: сезоны, турниры, матчи и единый источник данных по каждому игроку.
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
            <Stat label="Активные игроки" value={playersResult.count ?? 0} />
            <Stat label="Завершённые матчи" value={enrichedMatches.length} />
            <Stat label="Есть строки статистики" value={matchesWithRows} />
            <Stat label="Статистика завершена" value={completedMatches} />
          </div>

          <section className="statisticsPanel statisticsFilterPanel">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">КОНТЕКСТ</p>
                <h2>Сезон и турнир</h2>
                <p>Вся будущая статистика строится в разрезе сезона и конкретного турнира.</p>
              </div>
              {currentSeason && (
                <span className="statisticsCurrentBadge">Текущий: {currentSeason.name}</span>
              )}
            </div>

            <form method="get" className="statisticsFilters">
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
              <button className="primaryButton" type="submit">Показать</button>
            </form>
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
                  Открой завершённый матч, отметь сыгравших футболистов и внеси их показатели. Черновик можно сохранить и продолжить позже.
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
            <p className="eyebrow blue">АРХИТЕКТУРА v2.2.0</p>
            <h2>Итоги больше не вводятся вручную</h2>
            <p>
              Базовой записью становится «игрок + конкретный матч». Сезонные матчи, минуты, голы, передачи и карточки будут автоматически суммироваться из этих записей. Это исключает расхождения между профилем игрока и историей матчей.
            </p>
            <div className="statisticsArchitectureFlow">
              <span>Сезон</span><b>→</b><span>Турнир</span><b>→</b><span>Матч</span><b>→</b><span>Игрок</span><b>→</b><span>Итоги</span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="adminStat">
      <strong>{value}</strong>
      <span>{label}</span>
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
            <p className="eyebrow blue">ОДИН РАЗ</p>
            <h2>Примени миграцию 034</h2>
            <p>
              В Supabase → SQL Editor открой файл <code>database/034_player_statistics_foundation.sql</code>, вставь его целиком и нажми Run. После этого обнови эту страницу.
            </p>
            <small>Ответ базы: {message}</small>
          </div>
        </div>
      </section>
    </main>
  );
}
