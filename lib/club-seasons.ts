/** Pure formatting and result helpers for the historical club-season archive. */
export type ArchiveSide = { is_club?: boolean | null } | null;
export type ArchiveResult = {
  home: ArchiveSide;
  away: ArchiveSide;
  home_score: number | null;
  away_score: number | null;
  status: string;
};
export type ArchiveOutcome = "win" | "draw" | "loss";

/** Unknown scores never become 0–0 or a fabricated draw. */
export function clubArchiveOutcome(match: ArchiveResult): ArchiveOutcome | null {
  if (match.status !== "finished") return null;
  if (!Number.isInteger(match.home_score) || !Number.isInteger(match.away_score)) return null;
  if (!match.home?.is_club && !match.away?.is_club) return null;
  const clubGoals = match.home?.is_club ? Number(match.home_score) : Number(match.away_score);
  const opponentGoals = match.home?.is_club ? Number(match.away_score) : Number(match.home_score);
  if (clubGoals > opponentGoals) return "win";
  if (clubGoals < opponentGoals) return "loss";
  return "draw";
}

export function archivePage(value: string | undefined): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= 10000 ? number : 1;
}

export function archiveLink(slug: string, competition?: string, page = 1): string {
  const url = `/club/seasons/${encodeURIComponent(slug)}`;
  const params = new URLSearchParams();
  if (competition && /^\d+$/.test(competition)) params.set("competition", competition);
  if (page > 1) params.set("page", String(page));
  return `${url}${params.size ? `?${params}` : ""}`;
}

export function archiveDate(date: string, locale: "ru" | "ro"): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-MD" : "ru-RU", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Chisinau",
  }).format(parsed);
}
