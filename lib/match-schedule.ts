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
export function hasConfirmedDate(fixture: ScheduleFixture): boolean {
  return fixture.status !== "postponed" && fixture.status !== "cancelled";
}
export function scheduleDateLabel(fixture: ScheduleFixture, locale: Locale): string {
  if (fixture.status === "postponed") return locale === "ro" ? "Data nouă nu a fost anunțată" : "Новая дата не назначена";
  if (fixture.status === "cancelled") return locale === "ro" ? "Meci anulat" : "Матч отменён";
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "ru-RU", {
    day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Chisinau"
  }).format(new Date(fixture.kickoff));
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
