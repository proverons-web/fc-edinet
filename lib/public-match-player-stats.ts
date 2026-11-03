import type { MatchEvent, MatchLineupEntry } from "./types";

/** The public match page reads only columns allowed by the completed-statistics RLS policy. */
export type PublicPlayerMatchStat = {
  player_id: string | number;
  team_id: string | number | null;
  appearance: "starter" | "substitute";
  minutes_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

export type PublicPlayerMatchFacts = {
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  yellow: number | null;
  red: number | null;
  source: "completed" | "events" | "missing";
};

const normalized = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const sameId = (left: unknown, right: unknown) => left != null && right != null && String(left) === String(right);

/**
 * Link an event to the actual lineup player, not a same-named player on the opposite team.
 * When both records have IDs, IDs take precedence. Manual opponent rows can fall back to
 * matching name, but only within the same team.
 */
export function lineupEventParticipant(event: MatchEvent, row: MatchLineupEntry, participant: "actor" | "related" = "actor") {
  const id = participant === "actor" ? event.player_id : event.related_player_id;
  if (row.team_id != null && event.team_id != null && !sameId(row.team_id, event.team_id)) return false;
  // An event without a team cannot be associated by name across opponents.
  if (row.team_id != null && event.team_id == null && !(row.player_id && id && sameId(row.player_id, id))) return false;
  const name = participant === "actor" ? event.player_name : event.related_player_name;
  if (row.player_id && id) return sameId(row.player_id, id);
  if (id && !row.player_id) return false; // An identified actor cannot be guessed from an unrelated manual row.
  return Boolean(normalized(name) && normalized(name) === normalized(row.player_name));
}

export function lineupEventsForPlayer(events: MatchEvent[], row: MatchLineupEntry) {
  return events.filter((event) => lineupEventParticipant(event, row, "actor") ||
    (event.event_type === "substitution" && lineupEventParticipant(event, row, "related")));
}

function countIfPositive(value: number): number | null { return value > 0 ? value : null; }
function verifiedCount(value: number): number | null { return Number.isFinite(value) && value >= 0 ? value : null; }

export function publicPlayerMatchFacts(
  row: MatchLineupEntry,
  events: MatchEvent[],
  completed: PublicPlayerMatchStat | null | undefined,
  secondYellowIds: Set<string>,
): PublicPlayerMatchFacts {
  // Stats from the completed match are authoritative; never infer an unrecorded minute/assist.
  if (completed && row.player_id && sameId(completed.player_id, row.player_id) &&
    (completed.team_id == null || row.team_id == null || sameId(completed.team_id, row.team_id))) {
    return {
      minutes: verifiedCount(completed.minutes_played),
      goals: verifiedCount(completed.goals),
      assists: verifiedCount(completed.assists),
      yellow: verifiedCount(completed.yellow_cards),
      red: verifiedCount(completed.red_cards),
      source: "completed",
    };
  }

  const actorEvents = events.filter((event) => lineupEventParticipant(event, row, "actor"));
  const goals = actorEvents.filter((event) => event.event_type === "goal" || event.event_type === "penalty_goal").length;
  const yellow = actorEvents.filter((event) => event.event_type === "yellow_card").length;
  const explicitRed = actorEvents.filter((event) => event.event_type === "red_card").length;
  const secondYellow = actorEvents.filter((event) => secondYellowIds.has(String(event.id))).length;
  // Some match feeds record both a second yellow and the resulting red. Do not double-count.
  const reds = explicitRed || secondYellow;
  const any = goals + yellow + reds > 0;
  return {
    minutes: null,
    goals: countIfPositive(goals),
    assists: null,
    yellow: countIfPositive(yellow),
    red: countIfPositive(reds),
    source: any ? "events" : "missing",
  };
}
