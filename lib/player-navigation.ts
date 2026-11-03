/** Internal links between published match lineups and player profiles.
 * No external destinations or untrusted fragment names are accepted.
 */
export const PLAYER_ANCHORS = {
  season: "player-season-stats",
  matches: "player-season-matches",
  career: "player-career",
  about: "player-about",
} as const;

export type PlayerAnchor = keyof typeof PLAYER_ANCHORS;

/** Match IDs are bigint/serial in this project. */
export function validMatchId(id: unknown): string | null {
  const value = String(id ?? "");
  return /^\d{1,18}$/.test(value) ? value : null;
}

/** Lineup IDs are internal numeric/UUID identifiers. */
export function validLineupId(id: unknown): string | null {
  const value = String(id ?? "");
  return /^(?:\d{1,18}|[a-fA-F0-9-]{36})$/.test(value) ? value : null;
}

export function validSeasonId(id: unknown): string | null {
  const value = String(id ?? "");
  return /^[\w-]{1,64}$/.test(value) ? value : null;
}

export function lineupAnchor(id: string | number): string {
  const safe = validLineupId(id);
  return safe ? `lineup-player-${safe}` : "lineups";
}

export function matchReturnHref(matchId: unknown, lineupId?: unknown): string | null {
  const match = validMatchId(matchId);
  if (!match) return null;
  const player = validLineupId(lineupId);
  return `/matches/${match}#${player ? lineupAnchor(player) : "lineups"}`;
}

export function playerProfileHref(
  slug: string,
  options: { seasonId?: unknown; fromMatchId?: unknown; fromLineupId?: unknown; section?: PlayerAnchor } = {}
): string {
  const params = new URLSearchParams();
  const season = validSeasonId(options.seasonId);
  const match = validMatchId(options.fromMatchId);
  if (season) params.set("season", season);
  if (match) {
    params.set("fromMatch", match);
    const lineup = validLineupId(options.fromLineupId);
    if (lineup) params.set("fromLineup", lineup);
  }
  const suffix = params.size ? `?${params.toString()}` : "";
  const anchor = options.section ? `#${PLAYER_ANCHORS[options.section]}` : "";
  return `/team/${encodeURIComponent(slug)}${suffix}${anchor}`;
}
