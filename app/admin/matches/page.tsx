import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type { ClubMatch } from "@/lib/types";
import { matchStatusLabels } from "@/lib/types";
import AdminListSearch from "@/app/components/AdminListSearch";
import { adminListHref, adminTextMatches, parseAdminQuery } from "@/lib/admin-list-search";
import { matchNeedsScore, matchNeedsStadium, parseAttentionFocus } from "@/lib/admin-attention";

export const metadata = { title: "Матчи — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string | string[]; focus?: string | string[]; q?: string | string[] }>;
};

export default async function AdminMatchesPage({
  searchParams,
}: PageProps) {
  const { supabase, profile } = await requireEditor();
  const params = await searchParams;
  const search = parseAdminQuery(params.q);
  const focus = parseAttentionFocus(params.focus, ["all", "needs_stadium", "missing_score"]);
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status =
    raw === "upcoming" || raw === "finished" ? raw : "all";

  let query = supabase
    .from("matches")
    .select(`
      id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
      home_score,away_score,notes,created_at,updated_at,
      home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
      away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
      competition:competitions!matches_competition_id_fkey(id,name,slug,season,is_active)
    `)
    .order("kickoff", { ascending: false });

  if (status === "upcoming") {
    query = query.in("status", ["scheduled", "live", "postponed"]);
  }

  if (status === "finished") {
    query = query.eq("status", "finished");
  }

  const { data, error } = await query;
  const candidates = (data ?? []) as unknown as ClubMatch[];
  const missingStadiumCount = candidates.filter(matchNeedsStadium).length;
  const missingScoreCount = candidates.filter(matchNeedsScore).length;
  const matches = candidates.filter((match) =>
    (focus === "all" || (focus === "needs_stadium" && matchNeedsStadium(match)) || (focus === "missing_score" && matchNeedsScore(match))) &&
    adminTextMatches(search, match.home?.name, match.away?.name, match.home?.short_name,
      match.away?.short_name, match.competition?.name, match.round, match.stadium)
  );

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • МАТЧИ</p>
            <h1>Матчи</h1>
            <p>Календарь, результаты и автоматические блоки на главной.</p>
          </div>

          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">← Админка</Link>
            <Link href="/admin/matches/teams" className="rowAction muted">
              Команды
            </Link>
            <Link href="/admin/matches/new" className="primaryButton">
              + Добавить матч
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <nav className="adminFilters">
            <Filter href={adminListHref("/admin/matches", { focus, q: search })} active={status === "all"}>Все</Filter>
            <Filter
              href={adminListHref("/admin/matches", { status: "upcoming", focus, q: search })}
              active={status === "upcoming"}
            >
              Предстоящие
            </Filter>
            <Filter
              href={adminListHref("/admin/matches", { status: "finished", focus, q: search })}
              active={status === "finished"}
            >
              Завершённые
            </Filter>
          </nav>

          <nav className="adminAttentionFilters" aria-label="Проверка данных матчей">
            <Link href={adminListHref("/admin/matches", { status, q: search })} aria-current={focus === "all" ? "page" : undefined} className={focus === "all" ? "active" : ""}>Все матчи</Link>
            <Link href={adminListHref("/admin/matches", { status, focus: "needs_stadium", q: search })} aria-current={focus === "needs_stadium" ? "page" : undefined} className={focus === "needs_stadium" ? "active" : ""}>Без стадиона <span>{missingStadiumCount}</span></Link>
            <Link href={adminListHref("/admin/matches", { status, focus: "missing_score", q: search })} aria-current={focus === "missing_score" ? "page" : undefined} className={focus === "missing_score" ? "active" : ""}>Без счёта <span>{missingScoreCount}</span></Link>
          </nav>

          <AdminListSearch path="/admin/matches" query={search} status={status} focus={focus} label="Поиск матчей" placeholder="Соперник, турнир, тур, стадион…" count={matches.length} />

          {error ? (
            <div className="adminEmpty">Ошибка загрузки: {error.message}</div>
          ) : matches.length === 0 ? (
            <div className="adminEmpty">
              {search || focus !== "all" ? "Матчей по выбранным условиям не найдено." : "Матчей пока нет. Сначала добавь соперника в «Команды», затем создай матч."}
            </div>
          ) : (
            <div className="adminMatchList">
              {matches.map((match) => (
                <article className="adminMatchRow" key={match.id}>
                  <div className="adminMatchDate">
                    <strong>
                      {new Intl.DateTimeFormat("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "Europe/Chisinau",
                      }).format(new Date(match.kickoff))}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Chisinau",
                      }).format(new Date(match.kickoff))}
                    </span>
                  </div>

                  <div className="adminMatchMain">
                    <div className="adminNewsMeta">
                      <span className={`matchStatus status-${match.status}`}>
                        {matchStatusLabels[match.status]}
                      </span>
                      <span>{match.competition?.name ?? "Матч"}</span>
                      {match.round && <span>{match.round}</span>}
                      {matchNeedsStadium(match) && <span className="adminAttentionTag">Без стадиона</span>}
                      {matchNeedsScore(match) && <span className="adminAttentionTag">Счёт не заполнен</span>}
                    </div>
                    <h2>
                      {match.home?.name ?? "—"}{" "}
                      <b>
                        {match.status === "finished" || match.status === "live"
                          ? `${match.home_score ?? "—"} : ${match.away_score ?? "—"}`
                          : "VS"}
                      </b>{" "}
                      {match.away?.name ?? "—"}
                    </h2>
                    <p>{match.stadium || "Стадион не указан"}</p>
                  </div>

                  <div className="adminNewsActions">
                    <Link
                      href={`/admin/match-center/${match.id}`}
                      className="rowAction muted"
                    >
                      Матч-центр
                    </Link>
                    <Link
                      href={`/admin/matches/${match.id}/edit`}
                      className="rowAction"
                    >
                      Редактировать
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {profile.role !== "admin" && (
            <p className="adminPermissionHint">
              Editor может создавать и редактировать матчи. Окончательное
              удаление доступно только Admin.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function Filter({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={active ? "active" : ""}>
      {children}
    </Link>
  );
}
