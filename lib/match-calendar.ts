/** RFC 5545 iCalendar export for FC Edineț fixtures.
 * This module is deliberately pure: source records are read by the route handlers.
 * Event identifiers remain stable across kickoff updates.
 */
export type CalendarFixture = {
  id: number | string;
  kickoff: string;
  updated_at?: string | null;
  status: string;
  stadium?: string | null;
  round?: string | null;
  original_kickoff?: string | null;
  schedule_reason_ru?: string | null;
  schedule_reason_ro?: string | null;
  home?: { name?: string | null; home_stadium?: string | null } | null;
  away?: { name?: string | null } | null;
  competition?: { name?: string | null } | null;
};

export function isCalendarEligible(fixture: CalendarFixture, now = new Date()): boolean {
  const start = Date.parse(fixture.kickoff);
  return fixture.status === "scheduled" && Number.isFinite(start) && start >= now.getTime();
}

/** Escape untrusted data so team names cannot inject calendar properties. */
export function escapeIcsText(value: string): string {
  return value.replace(/\r\n|\r|\n/g, "\n")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** RFC 5545 specifies a maximum of 75 octets per physical line.
 * Count UTF-8 bytes, not JS string length, and preserve Unicode code points.
 */
export function foldIcsLine(line: string): string {
  let out = "";
  let count = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char, "utf8");
    if (count + bytes > 75) {
      out += "\r\n ";
      count = 1;
    }
    out += char;
    count += bytes;
  }
  return out;
}

function utcStamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid calendar timestamp");
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function fixtureLines(fixture: CalendarFixture, origin: string, now: Date, locale: "ru" | "ro"): string[] {
  const start = new Date(fixture.kickoff);
  const end = new Date(start.getTime() + 120 * 60_000);
  const teamA = fixture.home?.name?.trim() || "FC Edineț";
  const teamB = fixture.away?.name?.trim() || "—";
  const withdrawn = fixture.status === "postponed" || fixture.status === "cancelled";
  const reason = locale === "ro" ? (fixture.schedule_reason_ro || fixture.schedule_reason_ru) : (fixture.schedule_reason_ru || fixture.schedule_reason_ro);
  const description = [
    fixture.competition?.name,
    withdrawn ? (locale === "ro" ? "Data nu este confirmată; consultați site-ul clubului." : "Дата не подтверждена; уточняйте на сайте клуба.") : null,
    withdrawn ? reason : null,
    fixture.round,
    locale === "ro" ? "Durata din calendar este aproximativă (2 ore)." : "Продолжительность в календаре приблизительная (2 часа).",
    `${locale === "ro" ? "Detalii" : "Подробнее"}: ${origin}/matches/${fixture.id}`,
  ].filter(Boolean).join("\n");
  const safeOrigin = new URL(origin);
  const venue = fixture.stadium?.trim() || fixture.home?.home_stadium?.trim();
  const lines = [
    "BEGIN:VEVENT",
    `UID:fc-edinet-match-${fixture.id}@${safeOrigin.hostname}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `LAST-MODIFIED:${utcStamp(fixture.updated_at && !Number.isNaN(Date.parse(fixture.updated_at)) ? fixture.updated_at : fixture.kickoff)}`,
    `SUMMARY:${escapeIcsText(`${withdrawn ? (locale === "ro" ? "ANULAT/AMÂNAT: " : "ОТМЕНЁН/ПЕРЕНЕСЁН: ") : ""}${teamA} — ${teamB}`)}`,
    `SEQUENCE:${Number.isFinite(Date.parse(fixture.updated_at || "")) ? Math.floor(Date.parse(fixture.updated_at as string)/1000) : 0}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${origin}/matches/${encodeURIComponent(String(fixture.id))}`,
    withdrawn ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    withdrawn ? "TRANSP:TRANSPARENT" : "TRANSP:OPAQUE",
  ];
  if (venue) lines.push(`LOCATION:${escapeIcsText(venue)}`);
  if (!withdrawn) lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT60M",
    `DESCRIPTION:${escapeIcsText(`${locale === "ro" ? "Începe în curând" : "Скоро матч"}: ${teamA} — ${teamB}`)}`,
    "END:VALARM",
  );
  lines.push("END:VEVENT");
  return lines;
}

export function createMatchCalendar(fixtures: CalendarFixture[], origin: string, opts: { now?: Date; title?: string; locale?: "ru" | "ro"; includeStatusChanges?: boolean } = {}): string {
  const now = opts.now ?? new Date();
  const locale = opts.locale === "ro" ? "ro" : "ru";
  const safeOrigin = new URL(origin).origin;
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FC Edinet//Match Calendar//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(opts.title || (locale === "ro" ? "FC Edineț — Calendarul meciurilor" : "FC Edineț — Календарь матчей"))}`,
    "X-PUBLISHED-TTL:PT6H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];
  const events = fixtures
    .filter((fixture) => isCalendarEligible(fixture, now) || (opts.includeStatusChanges && (fixture.status === "postponed" || fixture.status === "cancelled")))
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
    .flatMap((fixture) => fixtureLines(fixture, safeOrigin, now, locale));
  return [...header, ...events, "END:VCALENDAR"].map(foldIcsLine).join("\r\n") + "\r\n";
}
