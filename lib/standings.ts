import type { StandingEntry } from "@/lib/types";

export function sortStandings(entries: StandingEntry[]) {
  return [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) {
      return b.goal_difference - a.goal_difference;
    }
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;

    return (a.team?.name ?? "").localeCompare(
      b.team?.name ?? "",
      "ru"
    );
  });
}

export function compactStandings(
  entries: StandingEntry[],
  limit = 5
) {
  const sorted = sortStandings(entries);

  if (sorted.length <= limit) return sorted;

  const top = sorted.slice(0, limit);
  const club = sorted.find((entry) => entry.team?.is_club);

  if (!club || top.some((entry) => entry.id === club.id)) {
    return top;
  }

  return [...sorted.slice(0, Math.max(1, limit - 1)), club];
}
