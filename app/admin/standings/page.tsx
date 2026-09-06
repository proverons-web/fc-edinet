import Link from "next/link";
import StandingsAdminForm from "@/app/components/StandingsAdminForm";
import { requireEditor } from "@/lib/editorial";
import type {
  ClubTeam,
  Competition,
  StandingEntry,
} from "@/lib/types";

export const metadata = { title: "Турнирная таблица — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ competition?: string | string[] }>;
};

export default async function AdminStandingsPage({
  searchParams,
}: PageProps) {
  const { supabase } = await requireEditor();
  const params = await searchParams;

  const [{ data: competitionsData }, { data: teamsData }] =
    await Promise.all([
      supabase
        .from("competitions")
        .select("*")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("teams")
        .select("*")
        .eq("is_active", true)
        .order("is_club", { ascending: false })
        .order("name"),
    ]);

  const competitions = (competitionsData ?? []) as Competition[];
  const teams = (teamsData ?? []) as ClubTeam[];

  if (competitions.length === 0) {
    return (
      <main className="statusPage">
        <div className="container statusCard">
          <h1>Нет активных турниров</h1>
          <p>Сначала создай турнир в базе competitions.</p>
          <Link className="primaryButton" href="/admin">
            Вернуться
          </Link>
        </div>
      </main>
    );
  }

  const requested = Array.isArray(params.competition)
    ? params.competition[0]
    : params.competition;

  const competition =
    competitions.find(
      (item) => String(item.id) === String(requested ?? "")
    ) ?? competitions[0];

  const { data: standingsData } = await supabase
    .from("standings")
    .select(`
      id,competition_id,team_id,wins,draws,losses,goals_for,goals_against,
      points_adjustment,played,goal_difference,points,created_at,updated_at,
      team:teams!standings_team_id_fkey(
        id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active
      )
    `)
    .eq("competition_id", competition.id);

  const standings = (standingsData ?? []) as unknown as StandingEntry[];

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • ТУРНИР</p>
            <h1>Турнирная таблица</h1>
            <p>Участники, результаты и положение команд.</p>
          </div>

          <Link href="/admin" className="adminBack">
            ← Админка
          </Link>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          {competitions.length > 1 && (
            <nav className="adminFilters standingsCompetitionTabs">
              {competitions.map((item) => (
                <Link
                  key={item.id}
                  className={
                    String(item.id) === String(competition.id)
                      ? "active"
                      : ""
                  }
                  href={`/admin/standings?competition=${item.id}`}
                >
                  {item.name}
                  {item.season ? ` ${item.season}` : ""}
                </Link>
              ))}
            </nav>
          )}

          <StandingsAdminForm
            competition={competition}
            teams={teams}
            standings={standings}
          />
        </div>
      </section>
    </main>
  );
}
