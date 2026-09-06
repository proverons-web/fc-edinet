import Link from "next/link";
import StandingsTable from "@/app/components/StandingsTable";
import { createClient } from "@/lib/supabase/server";
import type {
  ClubMatch,
  Competition,
  StandingEntry,
} from "@/lib/types";
import { matchStatusLabels } from "@/lib/types";

export const metadata = { title: "Матчи" };
export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [
    upcomingResult,
    finishedResult,
    competitionResult,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(matchSelect())
      .in("status", ["scheduled", "live", "postponed"])
      .gte("kickoff", now)
      .order("kickoff", { ascending: true }),
    supabase
      .from("matches")
      .select(matchSelect())
      .eq("status", "finished")
      .order("kickoff", { ascending: false })
      .limit(20),
    supabase
      .from("competitions")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .maybeSingle(),
  ]);

  const upcoming = (upcomingResult.data ?? []) as unknown as ClubMatch[];
  const finished = (finishedResult.data ?? []) as unknown as ClubMatch[];
  const competition =
    competitionResult.data as Competition | null;

  let standings: StandingEntry[] = [];

  if (competition) {
    const { data } = await supabase
      .from("standings")
      .select(standingsSelect())
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
          <h1>Матчи</h1>
          <p>
            Предстоящие встречи, последние результаты и положение
            в чемпионате.
          </p>
        </div>
      </section>

      <section className="section matchPublicSection">
        <div className="container">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow blue">КАЛЕНДАРЬ</p>
              <h2>Предстоящие матчи</h2>
            </div>
          </div>

          {upcoming.length > 0 ? (
            <div className="publicMatchList">
              {upcoming.map((match) => (
                <PublicMatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="adminEmpty">
              Предстоящие матчи пока не добавлены.
            </div>
          )}

          <div className="sectionHeading matchResultsHeading">
            <div>
              <p className="eyebrow blue">РЕЗУЛЬТАТЫ</p>
              <h2>Последние матчи</h2>
            </div>
          </div>

          {finished.length > 0 ? (
            <div className="publicMatchList">
              {finished.map((match) => (
                <PublicMatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="adminEmpty">Результатов пока нет.</div>
          )}

          <div className="sectionHeading matchResultsHeading">
            <div>
              <p className="eyebrow blue">ТАБЛИЦА</p>
              <h2>
                {competition?.name ?? "Чемпионат"}
                {competition?.season ? ` · ${competition.season}` : ""}
              </h2>
            </div>
            <Link href="/standings">Полная таблица →</Link>
          </div>

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

function PublicMatchCard({ match }: { match: ClubMatch }) {
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Chisinau",
  }).format(new Date(match.kickoff));

  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Chisinau",
  }).format(new Date(match.kickoff));

  return (
    <article className="publicMatchCard">
      <div className="publicMatchMeta">
        <span>{match.competition?.name ?? "Матч"}</span>
        <strong>
          {date} · {time}
        </strong>
        <small>
          {match.round || "—"} ·{" "}
          {match.stadium || "Стадион уточняется"}
        </small>
      </div>

      <div className="publicTeams">
        <div>
          <TeamBadge team={match.home} />
          <strong>{match.home?.name ?? "—"}</strong>
        </div>

        <div className="publicScore">
          {match.status === "finished" || match.status === "live" ? (
            <b>
              {match.home_score ?? 0} : {match.away_score ?? 0}
            </b>
          ) : (
            <b>VS</b>
          )}
          <span>{matchStatusLabels[match.status]}</span>
        </div>

        <div>
          <TeamBadge team={match.away} />
          <strong>{match.away?.name ?? "—"}</strong>
        </div>
      </div>
    </article>
  );
}

function TeamBadge({ team }: { team: ClubMatch["home"] }) {
  if (team?.logo_url) {
    return (
      <img className="publicTeamLogo" src={team.logo_url} alt="" />
    );
  }

  return (
    <div className={`publicTeamBadge ${team?.is_club ? "club" : ""}`}>
      {(team?.short_name || team?.name || "FC")
        .slice(0, 3)
        .toUpperCase()}
    </div>
  );
}

function matchSelect() {
  return `
    id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
    home_score,away_score,notes,created_at,updated_at,
    home:teams!matches_home_team_id_fkey(
      id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active
    ),
    away:teams!matches_away_team_id_fkey(
      id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active
    ),
    competition:competitions!matches_competition_id_fkey(
      id,name,slug,season,is_active
    )
  `;
}

function standingsSelect() {
  return `
    id,competition_id,team_id,wins,draws,losses,goals_for,goals_against,
    points_adjustment,played,goal_difference,points,created_at,updated_at,
    team:teams!standings_team_id_fkey(
      id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active
    )
  `;
}
