import type { MatchEvent } from "@/lib/types";

function participantKey(event: MatchEvent) {
  const team = String(event.team_id ?? "");
  if (event.player_id != null && String(event.player_id)) {
    return `${team}:db:${String(event.player_id)}`;
  }
  const name = String(event.player_name ?? "").trim().toLocaleLowerCase("ru");
  return name ? `${team}:manual:${name}` : null;
}

function eventOrder(a: MatchEvent, b: MatchEvent) {
  const minute = Number(a.minute ?? 0) - Number(b.minute ?? 0);
  if (minute !== 0) return minute;
  const stoppage = Number(a.stoppage_minute ?? 0) - Number(b.stoppage_minute ?? 0);
  if (stoppage !== 0) return stoppage;
  const sort = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  if (sort !== 0) return sort;
  return Number(a.id ?? 0) - Number(b.id ?? 0);
}

/**
 * A second yellow is stored as a normal yellow-card event so the disciplinary
 * history stays truthful. Presentation and statistics derive the automatic red.
 */
export function secondYellowEventIds(events: MatchEvent[]) {
  const result = new Set<string>();
  const yellowCount = new Map<string, number>();
  const ordered = [...events].sort(eventOrder);

  for (const event of ordered) {
    if (event.event_type !== "yellow_card") continue;
    const key = participantKey(event);
    if (!key) continue;
    const next = (yellowCount.get(key) ?? 0) + 1;
    yellowCount.set(key, next);
    if (next === 2) result.add(String(event.id));
  }

  return result;
}
