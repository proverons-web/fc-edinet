import type { Locale } from "./i18n";

export type FanNotificationType = "postponed" | "cancelled" | "rescheduled" | "confirmed" | "result";
export type FanNotification = {
  id: number; match_id: number; event_type: FanNotificationType;
  previous_kickoff: string | null; new_kickoff: string | null;
  home_score: number | null; away_score: number | null;
  home_penalties: number | null; away_penalties: number | null;
  reason_ru: string | null; reason_ro: string | null;
  created_at: string; read_at: string | null;
  match: { id: number; home: { name: string; short_name: string | null } | null; away: { name: string; short_name: string | null } | null } | null;
};

export const FAN_NOTIFICATION_SELECT = "id,match_id,event_type,previous_kickoff,new_kickoff,home_score,away_score,home_penalties,away_penalties,reason_ru,reason_ro,created_at,read_at,match:matches!fan_notifications_match_id_fkey(id,home:teams!matches_home_team_id_fkey(name,short_name),away:teams!matches_away_team_id_fkey(name,short_name))";

export const notificationText = {
  ru: {
    nav: "Уведомления", title: "Уведомления о матчах", eyebrow: "МОЙ ФУТБОЛ", description: "Изменения только в сохранённых матчах.",
    subtitle: "Последние события", all: "Все уведомления", unread: "Непрочитанные", markRead: "Прочитано", markAll: "Отметить все прочитанными",
    none: "Уведомлений пока нет. Добавь матч в избранное, чтобы следить за изменениями.", unreadNone: "Непрочитанных уведомлений нет.",
    disabled: "Уведомления отключены в настройках аккаунта. Новые события не сохраняются.", settings: "Настройки",
    error: "Не удалось загрузить уведомления. Повтори попытку позднее.", home: "Хозяева", away: "Гости", open: "Открыть протокол",
    postponed: "Матч перенесён", cancelled: "Матч отменён", rescheduled: "Изменено время матча", confirmed: "Новая дата подтверждена", result: "Опубликован результат",
    originally: "Было", now: "Стало", datePending: "Новая дата уточняется", penalties: "пен.", reason: "Причина", earlier: "Раньше", later: "Позже",
  },
  ro: {
    nav: "Notificări", title: "Notificări despre meciuri", eyebrow: "FOTBALUL MEU", description: "Modificări doar pentru meciurile salvate.",
    subtitle: "Evenimente recente", all: "Toate notificările", unread: "Necitite", markRead: "Marchează citit", markAll: "Marchează toate ca citite",
    none: "Nu ai notificări. Salvează un meci în favorite pentru a urmări modificările.", unreadNone: "Nu ai notificări necitite.",
    disabled: "Notificările sunt dezactivate în setările contului. Evenimentele noi nu sunt salvate.", settings: "Setări",
    error: "Notificările nu au putut fi încărcate. Încearcă din nou mai târziu.", home: "Gazde", away: "Oaspeți", open: "Vezi meciul",
    postponed: "Meci amânat", cancelled: "Meci anulat", rescheduled: "Ora meciului modificată", confirmed: "Noua dată confirmată", result: "Rezultatul a fost publicat",
    originally: "Inițial", now: "Acum", datePending: "Noua dată va fi anunțată", penalties: "pen.", reason: "Motiv", earlier: "Înapoi", later: "Mai departe",
  },
} as const;

export function formatFanDate(input: string | null | undefined, locale: Locale): string | null {
  if (!input) return null;
  const timestamp = Date.parse(input);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "ro-RO", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau",
  }).format(new Date(timestamp));
}

export function fanNotificationDetails(note: FanNotification, locale: Locale): string {
  const t = notificationText[locale];
  if (note.event_type === "result") {
    if (note.home_score === null || note.away_score === null) return "—";
    const score = `${note.home_score}:${note.away_score}`;
    return note.home_penalties !== null && note.away_penalties !== null
      ? `${score} (${t.penalties} ${note.home_penalties}:${note.away_penalties})` : score;
  }
  const before = formatFanDate(note.previous_kickoff, locale);
  const after = formatFanDate(note.new_kickoff, locale);
  if (note.event_type === "cancelled") return before ? `${t.originally}: ${before}` : "";
  if (note.event_type === "postponed" && !after) return t.datePending;
  if (before && after && before !== after) return `${t.originally}: ${before} · ${t.now}: ${after}`;
  return after ? `${t.now}: ${after}` : t.datePending;
}
