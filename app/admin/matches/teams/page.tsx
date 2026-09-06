import Link from "next/link";
import TeamQuickAddForm from "@/app/components/TeamQuickAddForm";
import { requireEditor } from "@/lib/editorial";
import type { ClubTeam } from "@/lib/types";

export const metadata = { title: "Команды — Админ" };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const { supabase } = await requireEditor();

  const { data } = await supabase
    .from("teams")
    .select("*")
    .order("is_club", { ascending: false })
    .order("name");

  const teams = (data ?? []) as ClubTeam[];

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/matches" className="adminBack">← Матчи</Link>
            <p className="eyebrow blue">СПРАВОЧНИК</p>
            <h1>Команды</h1>
          </div>
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container teamsAdminGrid">
          <article className="accountPanel">
            <p className="eyebrow blue">НОВАЯ КОМАНДА</p>
            <h2>Добавить соперника</h2>
            <TeamQuickAddForm />
          </article>

          <aside className="accountPanel">
            <p className="eyebrow blue">В БАЗЕ</p>
            <h2>{teams.length} команд</h2>
            <div className="teamAdminList advanced">
              {teams.map((team) => (
                <div key={team.id}>
                  <div className="teamAdminMeta">
                    <div className="teamAdminLogo">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="" />
                      ) : (
                        <span>
                          {(team.short_name || team.name).slice(0, 3).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div>
                      <strong>{team.name}</strong>
                      <span>
                        {team.city || "—"} {team.is_club ? "• Наш клуб" : ""}
                      </span>
                      <span>
                        Стадион: {team.home_stadium || "не указан"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/admin/matches/teams/${team.id}/edit`}
                    className="rowAction"
                  >
                    Редактировать
                  </Link>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
