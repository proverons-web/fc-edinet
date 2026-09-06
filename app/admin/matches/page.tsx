import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type { ClubMatch } from "@/lib/types";
import { matchStatusLabels } from "@/lib/types";

export const metadata = { title: "Матчи — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function AdminMatchesPage({
  searchParams,
}: PageProps) {
  const { supabase, profile } = await requireEditor();
  const params = await searchParams;
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
  const matches = (data ?? []) as unknown as ClubMatch[];

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
            <Filter href="/admin/matches" active={status === "all"}>Все</Filter>
            <Filter
              href="/admin/matches?status=upcoming"
              active={status === "upcoming"}
            >
              Предстоящие
            </Filter>
            <Filter
              href="/admin/matches?status=finished"
              active={status === "finished"}
            >
              Завершённые
            </Filter>
          </nav>

          {error ? (
            <div className="adminEmpty">Ошибка загрузки: {error.message}</div>
          ) : matches.length === 0 ? (
            <div className="adminEmpty">
              Матчей пока нет. Сначала добавь соперника в «Команды», затем создай матч.
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
                    </div>
                    <h2>
                      {match.home?.name ?? "—"}{" "}
                      <b>
                        {match.status === "finished" || match.status === "live"
                          ? `${match.home_score ?? 0} : ${match.away_score ?? 0}`
                          : "VS"}
                      </b>{" "}
                      {match.away?.name ?? "—"}
                    </h2>
                    <p>{match.stadium || "Стадион не указан"}</p>
                  </div>

                  <div className="adminNewsActions">
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
