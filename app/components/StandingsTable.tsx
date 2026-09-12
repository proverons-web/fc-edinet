import type { StandingEntry } from "@/lib/types";
import { compactStandings, sortStandings } from "@/lib/standings";
import { publicText, type Locale } from "@/lib/i18n";

export default function StandingsTable({
  entries,
  compact = false,
  limit = 5,
  locale = "ru",
}: {
  entries: StandingEntry[];
  compact?: boolean;
  limit?: number;
  locale?: Locale;
}) {
  const labels = publicText[locale].standings;
  const sorted = sortStandings(entries);
  const visible = compact ? compactStandings(sorted, limit) : sorted;
  const rank = new Map(sorted.map((entry, index) => [String(entry.id), index + 1]));

  return (
    <div className={`standingsTableWrap ${compact ? "compact" : ""}`}>
      <table className="standingsTable">
        <thead>
          <tr>
            <th>#</th><th>{labels.team}</th><th>{labels.played}</th><th>{labels.wins}</th><th>{labels.draws}</th><th>{labels.losses}</th>
            {!compact && <th>{labels.goals}</th>}
            <th>{labels.goalDifference}</th><th>{labels.points}</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((entry, index) => {
            const actualRank = rank.get(String(entry.id)) ?? index + 1;
            const previous = index > 0 ? visible[index - 1] : null;
            const separatedClub = compact && entry.team?.is_club && actualRank > limit && previous && !previous.team?.is_club;
            return (
              <tr key={entry.id} className={`${entry.team?.is_club ? "club" : ""} ${separatedClub ? "separatedClub" : ""}`}>
                <td className="rank">{actualRank}</td>
                <td><div className="standingTeam"><TeamLogo entry={entry} /><strong>{entry.team?.short_name || entry.team?.name || labels.team}</strong></div></td>
                <td>{entry.played}</td><td>{entry.wins}</td><td>{entry.draws}</td><td>{entry.losses}</td>
                {!compact && <td>{entry.goals_for}:{entry.goals_against}</td>}
                <td>{entry.goal_difference > 0 ? `+${entry.goal_difference}` : entry.goal_difference}</td>
                <td className="standingPoints">{entry.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamLogo({ entry }: { entry: StandingEntry }) {
  const team = entry.team;
  if (team?.logo_url) return <img className="standingLogo" src={team.logo_url} alt="" />;
  return <span className={`standingLogoFallback ${team?.is_club ? "club" : ""}`}>{(team?.short_name || team?.name || "FC").slice(0, 3).toUpperCase()}</span>;
}
