import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type { Player } from "@/lib/types";
import { positionLabels } from "@/lib/types";

export const metadata = { title: "Игроки — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function AdminPlayersPage({
  searchParams,
}: PageProps) {
  const { supabase, profile } = await requireEditor();
  const params = await searchParams;
  const rawStatus = Array.isArray(params.status)
    ? params.status[0]
    : params.status;

  const status =
    rawStatus === "active" || rawStatus === "inactive"
      ? rawStatus
      : "all";

  let query = supabase
    .from("players")
    .select("*")
    .order("is_active", { ascending: false })
    .order("position", { ascending: true })
    .order("display_order", { ascending: true })
    .order("shirt_number", { ascending: true });

  if (status === "active") {
    query = query.eq("is_active", true);
  }

  if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;
  const players = (data ?? []) as Player[];

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • СОСТАВ</p>
            <h1>Игроки</h1>
            <p>
              Управление текущим составом и архивными футболистами.
            </p>
          </div>

          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">
              ← Админка
            </Link>
            <Link href="/admin/players/new" className="primaryButton">
              + Добавить игрока
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <nav className="adminFilters">
            <Filter href="/admin/players" active={status === "all"}>
              Все
            </Filter>
            <Filter
              href="/admin/players?status=active"
              active={status === "active"}
            >
              Текущий состав
            </Filter>
            <Filter
              href="/admin/players?status=inactive"
              active={status === "inactive"}
            >
              Архив
            </Filter>
          </nav>

          {error ? (
            <div className="adminEmpty">
              Ошибка загрузки: {error.message}
            </div>
          ) : players.length === 0 ? (
            <div className="adminEmpty">
              Здесь пока нет игроков.
            </div>
          ) : (
            <div className="adminPlayerList">
              {players.map((player) => (
                <article className="adminPlayerRow" key={player.id}>
                  <div className="adminPlayerPhoto">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={`${player.first_name} ${player.last_name}`}
                      />
                    ) : (
                      <span>FCE</span>
                    )}
                  </div>

                  <div className="adminPlayerNumber">
                    {player.shirt_number ?? "—"}
                  </div>

                  <div className="adminPlayerMain">
                    <div className="adminNewsMeta">
                      <span
                        className={
                          player.is_active
                            ? "playerState active"
                            : "playerState inactive"
                        }
                      >
                        {player.is_active ? "В составе" : "Архив"}
                      </span>
                      <span>
                        {positionLabels[player.position] ?? player.position}
                      </span>
                    </div>

                    <h2>
                      {player.first_name} {player.last_name}
                    </h2>

                    <p>
                      {player.nationality || "Гражданство не указано"}
                      {" · "}
                      порядок {player.display_order ?? 100}
                    </p>
                  </div>

                  <div className="adminNewsActions">
                    <Link
                      href={`/admin/players/${player.id}/edit`}
                      className="rowAction"
                    >
                      Редактировать
                    </Link>

                    {player.is_active && (
                      <Link
                        href={`/team/${player.slug}`}
                        className="rowAction muted"
                      >
                        На сайте ↗
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {profile.role !== "admin" && (
            <p className="adminPermissionHint">
              Editor может создавать, изменять и переносить игроков в архив.
              Окончательное удаление доступно только Admin.
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
