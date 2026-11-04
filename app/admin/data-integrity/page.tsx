import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import { auditMatchData, type IntegrityEvent, type IntegrityLineup, type IntegrityMatch, type IntegrityPlayerStats, type IntegrityReport, type IntegrityStatsStatus } from "@/lib/match-data-integrity";

export const metadata = { title: "Целостность данных — Админ" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ filter?: string | string[] }> };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const dateLabel = (value: string) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Europe/Chisinau" }).format(new Date(value));

type MatchWithNames = IntegrityMatch & { home: { name: string } | null; away: { name: string } | null };
type AuditPageResult<T> = { data: T[] | null; error: { message: string } | null };
// PostgREST can cap one result at 1000 records. Read fixed-size pages so a
// larger set of lineups cannot silently produce false integrity warnings.
async function readAllAuditRows<T>(fetchPage: (start: number, end: number) => PromiseLike<AuditPageResult<T>>): Promise<AuditPageResult<T>> {
  const all: T[] = [];
  const pageSize = 500;
  for (let page = 0; page < 40; page++) {
    const result = await fetchPage(page * pageSize, (page + 1) * pageSize - 1);
    if (result.error) return { data: null, error: result.error };
    const rows = result.data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) return { data: all, error: null };
  }
  return { data: null, error: { message: "Проверка превысила лимит 20 000 строк. Уточни период в настройках аудита." } };
}
export default async function AdminDataIntegrityPage({ searchParams }: PageProps) {
  const { supabase } = await requireEditor();
  const filter = first((await searchParams).filter) === "all" ? "all" : "issues";
  const matchQuery = await supabase.from("matches")
    .select("id,status,home_score,away_score,home_team_id,away_team_id,kickoff,home:teams!matches_home_team_id_fkey(name),away:teams!matches_away_team_id_fkey(name)")
    .order("kickoff", { ascending: false }).limit(100);
  if (matchQuery.error) return <main className="adminPage adminIntegrityPage"><h1>Целостность матчевых данных</h1><p role="alert">Ошибка Supabase: {matchQuery.error.message}</p></main>;
  const matches = (matchQuery.data ?? []) as unknown as MatchWithNames[];
  if (!matches.length) return <main className="adminPage adminIntegrityPage"><h1>Целостность матчевых данных</h1><p>Матчей для проверки пока нет.</p></main>;
  const matchIds = matches.map((match) => match.id);
  const [reports, events, lineups, statuses, stats, teams] = await Promise.all([
    supabase.from("match_reports").select("match_id,is_published,status").in("match_id", matchIds),
    readAllAuditRows<IntegrityEvent>((start, end) => supabase.from("match_events")
      .select("match_id,team_id,event_type").in("match_id", matchIds).order("id").range(start, end)),
    readAllAuditRows<IntegrityLineup>((start, end) => supabase.from("match_lineup_entries")
      .select("match_id,side,lineup_role,position,is_captain,player_id").in("match_id", matchIds).order("id").range(start, end)),
    supabase.from("match_statistics_status").select("match_id,status").in("match_id", matchIds),
    readAllAuditRows<IntegrityPlayerStats>((start, end) => supabase.from("player_match_stats")
      .select("match_id,team_id,player_id").in("match_id", matchIds).order("id").range(start, end)),
    supabase.from("teams").select("id").eq("is_club", true),
  ]);
  const errors = [reports, events, lineups, statuses, stats, teams].map((result) => result.error?.message).filter((value): value is string => Boolean(value));
  if (errors.length) return <main className="adminPage adminIntegrityPage"><h1>Целостность матчевых данных</h1><p role="alert">Данные загружены не полностью. Отчёт недоступен до восстановления соединения.</p><ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></main>;
  const results = auditMatchData(matches, (reports.data ?? []) as IntegrityReport[], (events.data ?? []) as IntegrityEvent[],
    (lineups.data ?? []) as IntegrityLineup[], (statuses.data ?? []) as IntegrityStatsStatus[],
    (stats.data ?? []) as IntegrityPlayerStats[], new Set((teams.data ?? []).map((item) => String(item.id))));
  const critical = results.filter((result) => result.issues.some((issue) => issue.severity === "critical")).length;
  const needingAttention = results.filter((result) => result.issues.length > 0).length;
  const visible = results.filter((result) => filter === "all" || result.issues.length > 0);
  const matchMap = new Map(matches.map((match) => [String(match.id), match]));

  return <main className="adminPage adminIntegrityPage">
    <div className="adminIntegrityHeading"><div><p className="eyebrow blue">FC EDINEȚ • DATA QUALITY</p><h1>Целостность матчевых данных</h1><p>Проверка последних 100 матчей. Только чтение: результаты и протоколы не меняются автоматически.</p></div><Link className="adminBack" href="/admin">← Админка</Link></div>
    <div className="adminIntegritySummary"><div><strong>{results.length}</strong><span>Проверено матчей</span></div><div><strong>{needingAttention}</strong><span>Требуют внимания</span></div><div><strong>{critical}</strong><span>Критические расхождения</span></div></div>
    <nav className="adminIntegrityFilters" aria-label="Фильтр результатов"><Link href="/admin/data-integrity" aria-current={filter === "issues" ? "page" : undefined}>Требуют внимания</Link><Link href="/admin/data-integrity?filter=all" aria-current={filter === "all" ? "page" : undefined}>Все матчи</Link></nav>
    {visible.length === 0 ? <p className="adminIntegrityEmpty">В пределах проверки замечаний нет.</p> : <div className="adminIntegrityList">{visible.map((row) => {
      const match = matchMap.get(row.matchId);
      return <article key={row.matchId} className="adminIntegrityCard"><div className="adminIntegrityCardHead"><div><small>Матч №{row.matchId} · {match ? dateLabel(match.kickoff) : ""}</small><h2>{match?.home?.name || "Хозяева"} — {match?.away?.name || "Гости"}</h2><p>Счёт: {match?.home_score ?? "—"}:{match?.away_score ?? "—"} · Голы событий: {row.homeGoals}:{row.awayGoals} · {row.published ? "Опубликован" : "Не опубликован"}</p></div><Link className="adminIntegrityOpen" href={`/admin/match-center/${row.matchId}`}>Открыть протокол →</Link></div>
      {row.issues.length ? <ul className="adminIntegrityIssues">{row.issues.map((issue, index) => <li key={`${issue.code}-${index}`} data-severity={issue.severity}><span>{issue.severity === "critical" ? "Ошибка" : "Проверить"}</span>{issue.message}</li>)}</ul> : <p className="adminIntegrityOk">Замечаний не найдено.</p>}
      </article>;
    })}</div>}
  </main>;
}
