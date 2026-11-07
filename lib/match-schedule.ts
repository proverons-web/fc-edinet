import type { MatchStatus } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

export type ScheduleFixture = {
  kickoff: string;
  status: MatchStatus;
  original_kickoff?: string | null;
  schedule_reason_ru?: string | null;
  schedule_reason_ro?: string | null;
};
export type ScheduleHistoryItem = {
  id: string | number;
  previous_kickoff: string | null;
  new_kickoff: string;
  previous_status: MatchStatus | null;
  new_status: MatchStatus;
  reason_ru: string | null;
  reason_ro: string | null;
  changed_at: string;
};
export const scheduleHistorySelect = "id,previous_kickoff,new_kickoff,previous_status,new_status,reason_ru,reason_ro,changed_at";
export function scheduleReason(entry: {schedule_reason_ru?: string | null; schedule_reason_ro?: string | null}, locale: Locale): string {
  return (locale === "ro" ? entry.schedule_reason_ro?.trim() : entry.schedule_reason_ru?.trim())
    || entry.schedule_reason_ru?.trim() || entry.schedule_reason_ro?.trim() || "";
}
export function historyReason(entry: ScheduleHistoryItem, locale: Locale): string {
  return scheduleReason({schedule_reason_ru:entry.reason_ru,schedule_reason_ro:entry.reason_ro},locale);
}
export function isRescheduled(fixture: ScheduleFixture): boolean {
  if (!fixture.original_kickoff) return false;
  const original = Date.parse(fixture.original_kickoff);
  const current = Date.parse(fixture.kickoff);
  return Number.isFinite(original) && Number.isFinite(current) && original !== current;
}
/** A postponed game with a known replacement date has its real kickoff in kickoff,
 * while original_kickoff preserves the earlier fixture. Keep the status postponed
 * (not confirmed) while placing the card on the correct calendar day. */
export function hasAnnouncedReplacementDate(fixture: ScheduleFixture): boolean {
  return fixture.status === "postponed" && isRescheduled(fixture)
    && Number.isFinite(Date.parse(fixture.kickoff));
}

/** The dated fixture list includes postponed matches with a future announced date.
 * This is a DISPLAY classification only: the next-match widget and iCalendar
 * subscriptions keep treating postponed fixtures as unconfirmed. */
export function appearsInDatedCalendar(fixture: ScheduleFixture, now: Date = new Date()): boolean {
  if (fixture.status === "live") return true;
  const kickoff = Date.parse(fixture.kickoff);
  if (!Number.isFinite(kickoff) || kickoff < now.getTime()) return false;
  return fixture.status === "scheduled" || hasAnnouncedReplacementDate(fixture);
}

export function orderFixturesByKickoff<T extends ScheduleFixture>(fixtures: readonly T[]): T[] {
  return [...fixtures].sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
}

export function hasConfirmedDate(fixture: ScheduleFixture): boolean {
  return fixture.status !== "postponed" && fixture.status !== "cancelled";
}
/** A postponed fixture may already have an announced replacement date.
 * The original date remains in original_kickoff; kickoff then stores the new one.
 * Until the editor switches to scheduled it is still excluded from confirmed fixtures. */
export function scheduleDateLabel(fixture: ScheduleFixture, locale: Locale): string {
  if (fixture.status === "cancelled") return locale === "ro" ? "Meci anulat" : "Матч отменён";
  if (fixture.status === "postponed" && !isRescheduled(fixture)) {
    return locale === "ro" ? "Data nouă nu a fost anunțată" : "Новая дата не назначена";
  }
  const date = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "ru-RU", {
    day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Chisinau"
  }).format(new Date(fixture.kickoff));
  if (fixture.status === "postponed") {
    return (locale === "ro" ? "Data nouă: " : "Новая дата: ") + date;
  }
  return date;
}

/** Resolve the effective kickoff for an editor form without changing the match ID.
 * For postponement with no new date, restore the original (when previously moved).
 * A new postponed match with a known date saves the old date separately.
 */
export function resolvePostponedKickoff(input: {
  status: MatchStatus;
  enteredKickoff: string;
  replacementKickoff: string | null;
  existingOriginalKickoff: string | null;
  isNew: boolean;
}): { kickoff: string; original_kickoff?: string } {
  if (input.status !== "postponed") return { kickoff: input.enteredKickoff };
  const original = input.existingOriginalKickoff ?? input.enteredKickoff;
  if (!input.replacementKickoff) return { kickoff: original };
  if (input.isNew) return { kickoff: input.replacementKickoff, original_kickoff: original };
  return { kickoff: input.replacementKickoff };
}
export function scheduleChangeLabel(status: MatchStatus, locale: Locale): string {
  const names: Record<MatchStatus, {ru:string;ro:string}> = {
    scheduled:{ru:"Дата назначена",ro:"Dată confirmată"},
    postponed:{ru:"Матч перенесён",ro:"Meci amânat"},
    cancelled:{ru:"Матч отменён",ro:"Meci anulat"},
    live:{ru:"Матч начался",ro:"Meci început"},
    finished:{ru:"Матч завершён",ro:"Meci încheiat"},
  };
  return names[status][locale];
}
