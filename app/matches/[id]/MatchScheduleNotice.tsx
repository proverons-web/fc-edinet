import type { ClubMatch } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { historyReason, isRescheduled, scheduleChangeLabel, scheduleDateLabel, scheduleReason, type ScheduleHistoryItem } from "@/lib/match-schedule";

function dateText(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "ru-RU", {
    day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"Europe/Chisinau"
  }).format(new Date(value));
}

/** Public information only: no editor or account details are included. */
export default function MatchScheduleNotice({match,history,locale}: {
  match:ClubMatch; history:ScheduleHistoryItem[]; locale:Locale;
}) {
  const interrupted = match.status === "postponed" || match.status === "cancelled";
  const changed = isRescheduled(match);
  if (!interrupted && !changed && history.length === 0) return null;
  const reason = scheduleReason(match,locale);
  return (
    <section className="section matchScheduleNoticeSection" aria-label={locale === "ro" ? "Actualizări de program" : "Изменения расписания"}>
      <div className="container">
        <div className={`matchScheduleNotice${interrupted ? " is-interrupted" : ""}`} role={interrupted ? "status" : undefined}>
          <div className="matchScheduleNoticeMain">
            <span className="matchScheduleNoticeEyebrow">{locale === "ro" ? "PROGRAMUL MECIULUI" : "РАСПИСАНИЕ МАТЧА"}</span>
            <h2>{match.status === "postponed" ? (locale === "ro" ? "Meci amânat" : "Матч перенесён") : match.status === "cancelled" ? (locale === "ro" ? "Meci anulat" : "Матч отменён") : changed ? (locale === "ro" ? "Data meciului a fost modificată" : "Дата матча изменена") : (locale === "ro" ? "Program actualizat" : "Расписание обновлено")}</h2>
            {match.original_kickoff ? <p>{locale === "ro" ? "Data inițială" : "Первоначальная дата"}: <time dateTime={match.original_kickoff}>{dateText(match.original_kickoff,locale)}</time></p> : null}
            <p><strong>{interrupted ? scheduleDateLabel(match,locale) : (locale === "ro" ? "Data confirmată" : "Подтверждённая дата")}</strong>{!interrupted ? `: ${dateText(match.kickoff,locale)}` : ""}</p>
            {reason && interrupted ? <p className="matchScheduleReason">{locale === "ro" ? "Motiv" : "Причина"}: {reason}</p> : null}
          </div>
          {history.length > 0 ? (
            <details className="matchScheduleHistory">
              <summary>{locale === "ro" ? "Istoricul modificărilor" : "История изменений"} ({history.length})</summary>
              <ol>
                {history.map(entry => <li key={String(entry.id)}>
                  <strong>{scheduleChangeLabel(entry.new_status,locale)}</strong>
                  <span>{entry.previous_kickoff ? `${dateText(entry.previous_kickoff,locale)} → ` : ""}{entry.new_status === "postponed" || entry.new_status === "cancelled" ? scheduleDateLabel({kickoff:entry.new_kickoff,status:entry.new_status,original_kickoff:match.original_kickoff},locale) : dateText(entry.new_kickoff,locale)}</span>
                  {historyReason(entry,locale) ? <small>{historyReason(entry,locale)}</small> : null}
                </li>)}
              </ol>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
