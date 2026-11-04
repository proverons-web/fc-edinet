import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type { ClubMatch, MatchCenterProgress } from "@/lib/types";
import { matchStatusLabels } from "@/lib/types";
import AdminListSearch from "@/app/components/AdminListSearch";
import { adminListHref, adminTextMatches, parseAdminQuery } from "@/lib/admin-list-search";
import { matchNeedsLineups, matchNeedsReport, parseAttentionFocus } from "@/lib/admin-attention";

export const metadata = { title: "Матч-центр — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string | string[];
    error?: string | string[];
    q?: string | string[];
    focus?: string | string[];
  }>;
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Chisinau",
  }).format(new Date(value));
}

function workflowLabel(value: string) {
  if (value === "complete") return "Готово";
  if (value === "draft") return "Черновик";
  return "Пусто";
}

export default async function MatchCenterPage({ searchParams }: PageProps) {
  const { supabase } = await requireEditor();
  const params = await searchParams;
  const search = parseAdminQuery(params.q);
  const focus = parseAttentionFocus(params.focus, ["all", "unpublished", "lineups"]);
  const rawStatus = one(params.status);
  const status = rawStatus === "finished" || rawStatus === "upcoming" ? rawStatus : "all";

  let matchesQuery = supabase
    .from("matches")
    .select(`
      id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
      home_score,away_score,notes,created_at,updated_at,
      home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
      away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
      competition:competitions!matches_competition_id_fkey(id,name,slug,season,season_id,is_active)
    `)
    .order("kickoff", { ascending: false });

  if (status === "finished") {
    matchesQuery = matchesQuery.eq("status", "finished");
  } else if (status === "upcoming") {
    matchesQuery = matchesQuery.in("status", ["scheduled", "live", "postponed"]);
  }

  const [matchesResult, progressResult, reportsResult] = await Promise.all([
    matchesQuery,
    supabase.from("match_center_progress").select("*"),
    supabase.from("match_reports").select("match_id,is_published"),
  ]);

  if (progressResult.error) {
    return <MatchCenterMigrationRequired message={progressResult.error.message} />;
  }

  const progressRows = (progressResult.data ?? []) as MatchCenterProgress[];
  const progressByMatch = new Map(progressRows.map((row) => [String(row.match_id), row]));
  const publishedByMatch = new Map((reportsResult.data ?? []).map((row) => [String(row.match_id), Boolean(row.is_published)]));
  const candidates = (matchesResult.data ?? []) as unknown as ClubMatch[];
  const unpublishedCount = reportsResult.error ? null : candidates.filter((match) => matchNeedsReport(match, Boolean(publishedByMatch.get(String(match.id))))).length;
  const incompleteLineupsCount = candidates.filter((match) => matchNeedsLineups(match, progressByMatch.get(String(match.id)))).length;
  const matches = candidates.filter((match) => {
    const isPublished = Boolean(publishedByMatch.get(String(match.id)));
    const progress = progressByMatch.get(String(match.id));
    const focusMatches = focus === "all" ||
      (focus === "unpublished" && !reportsResult.error && matchNeedsReport(match, isPublished)) ||
      (focus === "lineups" && matchNeedsLineups(match, progress));
    return focusMatches && adminTextMatches(search, match.home?.name, match.away?.name, match.home?.short_name,
      match.away?.short_name, match.competition?.name, match.round, match.stadium);
  });

  const total = matches.length;
  const finished = matches.filter((match) => match.status === "finished").length;
  const published = matches.filter((match) => publishedByMatch.get(String(match.id))).length;
  const playersComplete = matches.filter((match) => progressByMatch.get(String(match.id))?.player_stats_status === "complete").length;

  return (
    <main className="adminPage matchCenterPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • MATCH CENTER 2.0</p>
            <h1>Матч-центр</h1>
            <p>Выбери матч и веди его по одному рабочему потоку: составы → события → статистика → отчёт → публикация.</p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">← Админка</Link>
            <Link href="/admin/matches" className="rowAction muted">Открыть календарь</Link>
            <Link href="/admin/data-integrity" className="rowAction muted">Контроль данных</Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container matchCenterContainer">
          <section className="matchCenterSummary">
            <SummaryStat label="Матчей в списке" value={total} />
            <SummaryStat label="Завершено" value={finished} />
            <SummaryStat label="Опубликовано" value={published} />
            <SummaryStat label="Игроки готовы" value={playersComplete} />
          </section>

          <section className="statisticsPanel matchCenterIntro">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">МАТЧ-ЦЕНТР</p>
                <h2>Матч-центр собирает матч целиком</h2>
                <p>
                  Сначала выбери состав FC Edineț и соперника, затем внеси минуты, голы, ассисты и карточки, добавь события и опубликуй протокол.
                  Матчевая статистика FC Edineț автоматически участвует в итогах сезона и конкретного соревнования.
                </p>
              </div>
              <span className="matchCenterVersionBadge">MATCH CENTER</span>
            </div>
          </section>

          <nav className="adminFilters matchCenterFilters">
            <Filter href={adminListHref("/admin/match-center", { focus, q: search })} active={status === "all"}>Все</Filter>
            <Filter href={adminListHref("/admin/match-center", { status: "finished", focus, q: search })} active={status === "finished"}>Завершённые</Filter>
            <Filter href={adminListHref("/admin/match-center", { status: "upcoming", focus, q: search })} active={status === "upcoming"}>Предстоящие</Filter>
          </nav>

          <nav className="adminAttentionFilters" aria-label="Подготовка протоколов">
            <Link href={adminListHref("/admin/match-center", { status, q: search })} aria-current={focus === "all" ? "page" : undefined} className={focus === "all" ? "active" : ""}>Все протоколы</Link>
            <Link href={adminListHref("/admin/match-center", { status, focus: "unpublished", q: search })} aria-current={focus === "unpublished" ? "page" : undefined} className={focus === "unpublished" ? "active" : ""}>Не опубликованы <span>{unpublishedCount ?? "—"}</span></Link>
            <Link href={adminListHref("/admin/match-center", { status, focus: "lineups", q: search })} aria-current={focus === "lineups" ? "page" : undefined} className={focus === "lineups" ? "active" : ""}>Неполные составы <span>{incompleteLineupsCount}</span></Link>
          </nav>
          {reportsResult.error && <p className="adminAttentionError" role="alert">Не удалось загрузить публикации протоколов: {reportsResult.error.message}. Фильтр неопубликованных недоступен.</p>}

          <AdminListSearch path="/admin/match-center" query={search} status={status} focus={focus} label="Поиск протоколов" placeholder="Соперник, турнир, стадия…" count={matches.length} />

          {matchesResult.error ? (
            <div className="adminEmpty">Ошибка загрузки матчей: {matchesResult.error.message}</div>
          ) : matches.length === 0 ? (
            <div className="adminEmpty">{search || focus !== "all" ? "Протоколов по выбранным условиям не найдено." : "Матчей в этом фильтре пока нет."}</div>
          ) : (
            <div className="matchCenterList">
              {matches.map((match) => {
                const progress = progressByMatch.get(String(match.id));
                const score = match.status === "finished" || match.status === "live"
                  ? `${match.home_score ?? 0} : ${match.away_score ?? 0}`
                  : "VS";

                const isPublished = Boolean(publishedByMatch.get(String(match.id)));
                const hasCompleteProtocol = isPublished || Boolean(
                  match.status === "finished" &&
                  (progress?.events_count ?? 0) > 0 &&
                  (progress?.home_starters ?? 0) === 11 &&
                  (progress?.away_starters ?? 0) === 11
                );

                return (
                  <article className={`matchCenterRow${hasCompleteProtocol ? " is-complete" : ""}`} key={match.id}>
                    <div className="matchCenterDate">
                      <strong>{formatDate(match.kickoff)}</strong>
                      <span>{formatTime(match.kickoff)}</span>
                    </div>

                    <div className="matchCenterMatchMain">
                      <div className="adminNewsMeta">
                        <span className={`matchStatus status-${match.status}`}>{matchStatusLabels[match.status]}</span>
                        <span>{match.competition?.name ?? "Без турнира"}</span>
                        {match.round && <span>{match.round}</span>}
                      </div>
                      <h2>
                        {match.home?.name ?? "—"} <b>{score}</b> {match.away?.name ?? "—"}
                      </h2>
                      <p>{match.stadium || "Стадион не указан"}</p>
                    </div>

                    <div className="matchCenterWorkflow">
                      <WorkflowChip
                        label="Отчёт"
                        value={progress?.report_has_metadata ? "Основа" : "Пусто"}
                        tone={progress?.report_has_metadata ? "draft" : "empty"}
                      />
                      <WorkflowChip
                        label="Игроки"
                        value={workflowLabel(progress?.player_stats_status ?? "empty")}
                        tone={progress?.player_stats_status === "complete" ? "ready" : progress?.player_stats_status === "draft" ? "draft" : "empty"}
                      />
                      <WorkflowChip
                        label="События"
                        value={String(progress?.events_count ?? 0)}
                        tone={(progress?.events_count ?? 0) > 0 ? "draft" : "empty"}
                      />
                      <WorkflowChip
                        label="Составы"
                        value={`${progress?.home_starters ?? 0}/11 • ${progress?.away_starters ?? 0}/11`}
                        tone={(progress?.home_starters ?? 0) === 11 && (progress?.away_starters ?? 0) === 11 ? "ready" : ((progress?.home_starters ?? 0) + (progress?.away_starters ?? 0)) > 0 ? "draft" : "empty"}
                      />
                      <WorkflowChip
                        label="Статистика"
                        value={(progress?.team_stats_filled ?? 0) > 0 ? "Есть" : "Пусто"}
                        tone={(progress?.team_stats_filled ?? 0) > 0 ? "ready" : "empty"}
                      />
                      <WorkflowChip
                        label="Протокол"
                        value={isPublished ? "Опубликован" : "Черновик"}
                        tone={isPublished ? "ready" : "draft"}
                      />
                    </div>

                    <div className="matchCenterRowActions">
                      <Link href={`/admin/match-center/${match.id}`} className="primaryButton">Открыть матч-центр</Link>
                      {match.status === "finished" && (
                        <Link href={`/admin/match-center/${match.id}#lineups`} className="rowAction muted">Составы</Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="matchCenterSummaryCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WorkflowChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ready" | "draft" | "empty";
}) {
  return (
    <div className={`matchCenterWorkflowChip ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Filter({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={active ? "active" : ""}>{children}</Link>;
}

function MatchCenterMigrationRequired({ message }: { message: string }) {
  return (
    <main className="adminPage matchCenterPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • MATCH CENTER</p>
            <h1>Нужна миграция 045</h1>
            <p>Интерфейс матч-центра установлен, но таблицы составов в базе ещё не созданы.</p>
          </div>
          <Link href="/admin" className="adminBack">← Админка</Link>
        </div>
      </section>
      <section className="section adminSurface">
        <div className="container">
          <div className="statisticsMigrationCard">
            <p className="eyebrow blue">DB • ОДИН РАЗ</p>
            <h2>Примени migration 045</h2>
            <p>В Supabase → SQL Editor выполни целиком файл <code>database/045_match_lineups.sql</code>, затем обнови страницу.</p>
            <p className="formError">Ответ базы: {message}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
