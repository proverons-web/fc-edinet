import Link from "next/link";
import StandingsTable from "@/app/components/StandingsTable";
import { createClient } from "@/lib/supabase/server";
import type {
  Competition,
  StandingEntry,
} from "@/lib/types";

export const metadata = { title: "Турнирная таблица" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ competition?: string | string[] }>;
};

export default async function StandingsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: competitionsData } = await supabase
    .from("competitions")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const competitions = (competitionsData ?? []) as Competition[];

  const requested = Array.isArray(params.competition)
    ? params.competition[0]
    : params.competition;

  const competition =
    competitions.find(
      (item) => String(item.id) === String(requested ?? "")
    ) ?? competitions[0];

  let standings: StandingEntry[] = [];

  if (competition) {
    const { data } = await supabase
      .from("standings")
      .select(`
        id,competition_id,team_id,wins,draws,losses,goals_for,goals_against,
        points_adjustment,played,goal_difference,points,created_at,updated_at,
        team:teams!standings_team_id_fkey(
          id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active
        )
      `)
      .eq("competition_id", competition.id)
      .order("points", { ascending: false })
      .order("goal_difference", { ascending: false })
      .order("goals_for", { ascending: false });

    standings = (data ?? []) as unknown as StandingEntry[];
  }

  return (
    <main>
      <section className="pageHero">
        <div className="container">
          <p className="eyebrow">FC EDINEȚ</p>
          <h1>Турнирная таблица</h1>
          <p>
            Положение команд в чемпионате и текущая позиция FC Edineț.
          </p>
        </div>
      </section>

      <section className="section standingsPublicSection">
        <div className="container">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow blue">ЧЕМПИОНАТ</p>
              <h2>
                {competition?.name ?? "Турнир"}
                {competition?.season
                  ? ` · ${competition.season}`
                  : ""}
              </h2>
            </div>

            <Link href="/matches">Матчи →</Link>
          </div>

          {competitions.length > 1 && (
            <nav className="standingsTabs">
              {competitions.map((item) => (
                <Link
                  key={item.id}
                  className={
                    String(item.id) === String(competition?.id)
                      ? "active"
                      : ""
                  }
                  href={`/standings?competition=${item.id}`}
                >
                  {item.name}
                  {item.season ? ` ${item.season}` : ""}
                </Link>
              ))}
            </nav>
          )}

          {standings.length > 0 ? (
            <StandingsTable entries={standings} />
          ) : (
            <div className="adminEmpty">
              Турнирная таблица пока не заполнена.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
