import { matchWinner, type CupResultSource } from "./cup-results.ts";
/** Pure formatting and result helpers for the historical club-season archive. */
export type ArchiveSide = { is_club?: boolean | null } | null;
export type ArchiveResult = CupResultSource & {
  home: ArchiveSide;
  away: ArchiveSide;
  home_score: number | null;
  away_score: number | null;
  status: string;
};
export type ArchiveOutcome = "win" | "draw" | "loss";

/** Unknown scores never become 0–0 or a fabricated draw. */
export function clubArchiveOutcome(match: ArchiveResult): ArchiveOutcome | null {
  const winner = matchWinner(match);
  if (!winner || (!match.home?.is_club && !match.away?.is_club)) return null;
  if (winner === "draw") return "draw";
  return (winner === "home" && match.home?.is_club) || (winner === "away" && match.away?.is_club) ? "win" : "loss";
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
