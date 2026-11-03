/** Non-destructive attention filters for admin lists. Kept separate from data mutations. */
export type AttentionFocus = "all" | "needs_stadium" | "missing_score" | "missing_photo" | "unpublished" | "lineups";
export function parseAttentionFocus(value: string | string[] | undefined, allowed: readonly AttentionFocus[]): AttentionFocus {
  const one = Array.isArray(value) ? value[0] : value;
  return one && allowed.includes(one as AttentionFocus) ? one as AttentionFocus : "all";
}
export function matchNeedsStadium(match: { status: string; stadium: string | null }): boolean {
  return match.status !== "cancelled" && !match.stadium?.trim();
}
export function matchNeedsScore(match: { status: string; home_score: number | null; away_score: number | null }): boolean {
  return match.status === "finished" && (match.home_score === null || match.away_score === null);
}
export function playerNeedsPhoto(player: { is_active: boolean; photo_url: string | null }): boolean {
  return player.is_active && !player.photo_url?.trim();
}
export function matchNeedsReport(match: { status: string }, published: boolean): boolean {
  return match.status === "finished" && !published;
}
export function matchNeedsLineups(match: { status: string }, progress?: { home_starters?: number; away_starters?: number }): boolean {
  return match.status === "finished" && ((progress?.home_starters ?? 0) < 11 || (progress?.away_starters ?? 0) < 11);
}
export function mediaMatchesPublication(status: "all" | "published" | "draft", published: boolean): boolean {
  return status === "all" || published === (status === "published");
}
