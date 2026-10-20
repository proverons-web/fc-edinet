import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type { Player } from "@/lib/types";
import { positionLabels } from "@/lib/types";

export const metadata = { title: "Игроки — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string | string[]; sort?: string | string[] }>;
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
  const rawSort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort = rawSort === "first" || rawSort === "last" || rawSort === "position" ? rawSort : "number";

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
  const collator = new Intl.Collator("ru", { sensitivity: "base" });
  const positionRank: Record<string, number> = { goalkeeper: 0, defender: 1, midfielder: 2, forward: 3 };
  const players = ((data ?? []) as Player[]).sort((a, b) => {
    if (sort === "first") return collator.compare(a.first_name || "", b.first_name || "") || collator.compare(a.last_name || "", b.last_name || "");
    if (sort === "last") return collator.compare(a.last_name || "", b.last_name || "") || collator.compare(a.first_name || "", b.first_name || "");
    if (sort === "position") return (positionRank[a.position] ?? 99) - (positionRank[b.position] ?? 99) || (a.shirt_number ?? 999) - (b.shirt_number ?? 999);
    return (a.shirt_number ?? 999) - (b.shirt_number ?? 999) || collator.compare(a.last_name || "", b.last_name || "");
  });

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
            <Filter href={playerListHref("all", sort)} active={status === "all"}>
              Все
            </Filter>
            <Filter
              href={playerListHref("active", sort)}
              active={status === "active"}
            >
              Текущий состав
            </Filter>
            <Filter
              href={playerListHref("inactive", sort)}
              active={status === "inactive"}
            >
              Архив
            </Filter>
          </nav>

          <nav className="adminFilters adminSortFilters" aria-label="Сортировка игроков">
            <span className="adminFilterLabel">Сортировка:</span>
            <Filter href={playerListHref(status, "number")} active={sort === "number"}>По номеру</Filter>
            <Filter href={playerListHref(status, "first")} active={sort === "first"}>По имени</Filter>
            <Filter href={playerListHref(status, "last")} active={sort === "last"}>По фамилии</Filter>
            <Filter href={playerListHref(status, "position")} active={sort === "position"}>По позиции</Filter>
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

function playerListHref(status: string, sort: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  params.set("sort", sort);
  return `/admin/players?${params.toString()}`;
}
