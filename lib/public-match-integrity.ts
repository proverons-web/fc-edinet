/** Public match display contract. Missing scores are never converted into a fictitious 0:0.
 * Shared by the calendar, match report, favorites and social preview.
 */
export type ScoreSource = {
  status?: string | null;
  home_score?: number | null;
  away_score?: number | null;
};

export function hasRecordedScore(match: ScoreSource): boolean {
  return typeof match.home_score === "number" && typeof match.away_score === "number"
    && Number.isInteger(match.home_score) && Number.isInteger(match.away_score)
    && match.home_score >= 0 && match.away_score >= 0;
}

export function matchScoreText(match: ScoreSource, separator = " : "): string {
  if (match.status !== "finished" && match.status !== "live") return "VS";
  if (!hasRecordedScore(match)) return `—${separator}—`;
  return `${match.home_score}${separator}${match.away_score}`;
}

export type CalendarMatch = { status: string; kickoff: string };
/** Live matches remain visible after kickoff; postponed fixtures remain findable. */
export function isCalendarMatchRelevant(match: CalendarMatch, now = new Date()): boolean {
  if (match.status === "live" || match.status === "postponed") return true;
  return match.status === "scheduled" && Number.isFinite(Date.parse(match.kickoff))
    && Date.parse(match.kickoff) >= now.getTime();
}

export type VenueSource = { stadium?: string | null; home?: { home_stadium?: string | null } | null };
/** An explicit match-level venue takes precedence over the home club's default stadium. */
export function matchVenue(match: VenueSource): string | null {
  return match.stadium?.trim() || match.home?.home_stadium?.trim() || null;
}

export type ResultMatch = ScoreSource & { home?: { is_club?: boolean | null } | null; away?: { is_club?: boolean | null } | null };
export function clubMatchResultClass(match: ResultMatch): string {
  if (match.status !== "finished" || !hasRecordedScore(match)) return "";
  const homeClub = Boolean(match.home?.is_club);
  const awayClub = Boolean(match.away?.is_club);
  if (match.home_score === match.away_score) return " result-draw";
  if ((homeClub && Number(match.home_score) > Number(match.away_score)) || (awayClub && Number(match.away_score) > Number(match.home_score))) return " result-win";
  return homeClub || awayClub ? " result-loss" : "";
}
