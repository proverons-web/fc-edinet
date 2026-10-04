import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type { ClubMatch, MatchCenterProgress } from "@/lib/types";
import { matchStatusLabels } from "@/lib/types";

export const metadata = { title: "Матч-центр — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string | string[];
    error?: string | string[];
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

  const [matchesResult, progressResult] = await Promise.all([
    matchesQuery,
    supabase.from("match_center_progress").select("*"),
  ]);

  if (progressResult.error) {
    return <MatchCenterMigrationRequired message={progressResult.error.message} />;
  }

  const matches = (matchesResult.data ?? []) as unknown as ClubMatch[];
  const progressRows = (progressResult.data ?? []) as MatchCenterProgress[];
  const progressByMatch = new Map(progressRows.map((row) => [String(row.match_id), row]));

  const total = matches.length;
  const finished = matches.filter((match) => match.status === "finished").length;
  const foundations = matches.filter((match) => progressByMatch.get(String(match.id))?.report_has_metadata).length;
  const playersComplete = matches.filter((match) => progressByMatch.get(String(match.id))?.player_stats_status === "complete").length;

  return (
    <main className="adminPage matchCenterPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • MATCH CENTER v2.3.8</p>
            <h1>Статистика матчей</h1>
            <p>Единая точка для отчёта, событий, составов, командных цифр и связи со статистикой игроков.</p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">← Админка</Link>
            <Link href="/admin/matches" className="rowAction muted">Календарь матчей</Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container matchCenterContainer">
          <section className="matchCenterSummary">
            <SummaryStat label="Матчей в списке" value={total} />
            <SummaryStat label="Завершено" value={finished} />
            <SummaryStat label="Основа отчёта" value={foundations} />
            <SummaryStat label="Игроки готовы" value={playersComplete} />
          </section>

          <section className="statisticsPanel matchCenterIntro">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">v2.3.8 • ПРАКТИЧЕСКИЙ ПРОТОКОЛ</p>
                <h2>Матч-центр собирает матч целиком</h2>
                <p>
                  Внутри матча теперь есть стартовые составы и запасные для HOME/AWAY, схема, капитан и отметки реальных замен из таймлайна.
                  Для FC Edineț состав можно импортировать из уже заполненной статистики игроков одной кнопкой.
                </p>
              </div>
              <span className="matchCenterVersionBadge">MATCH CENTER</span>
            </div>
          </section>

          <nav className="adminFilters matchCenterFilters">
            <Filter href="/admin/match-center" active={status === "all"}>Все</Filter>
            <Filter href="/admin/match-center?status=finished" active={status === "finished"}>Завершённые</Filter>
            <Filter href="/admin/match-center?status=upcoming" active={status === "upcoming"}>Предстоящие</Filter>
          </nav>

          {matchesResult.error ? (
            <div className="adminEmpty">Ошибка загрузки матчей: {matchesResult.error.message}</div>
          ) : matches.length === 0 ? (
            <div className="adminEmpty">Матчей в этом фильтре пока нет.</div>
          ) : (
            <div className="matchCenterList">
              {matches.map((match) => {
                const progress = progressByMatch.get(String(match.id));
                const score = match.status === "finished" || match.status === "live"
                  ? `${match.home_score ?? 0} : ${match.away_score ?? 0}`
                  : "VS";

                return (
                  <article className="matchCenterRow" key={match.id}>
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
                        label="Доп. цифры"
                        value={(progress?.team_stats_filled ?? 0) > 0 ? "есть" : "необяз."}
                        tone={(progress?.team_stats_filled ?? 0) > 0 ? "draft" : "ready"}
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
                    </div>

                    <div className="matchCenterRowActions">
                      <Link href={`/admin/match-center/${match.id}`} className="primaryButton">Открыть матч-центр</Link>
                      {match.status === "finished" && (
                        <Link href={`/admin/statistics/${match.id}`} className="rowAction muted">Игроки</Link>
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
            <p>Код v2.3.8 уже установлен, но таблицы составов из migration 045 ещё не созданы.</p>
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
