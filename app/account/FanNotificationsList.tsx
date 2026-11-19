import Link from "next/link";
import { markFanNotificationRead } from "@/app/account/actions";
import { fanNotificationDetails, formatFanDate, notificationText, type FanNotification } from "@/lib/fan-notifications";
import type { Locale } from "@/lib/i18n";

export default function FanNotificationsList({ rows, locale }: { rows: FanNotification[]; locale: Locale }) {
  const text = notificationText[locale];
  return <div className="fanNotificationList">
    {rows.map((item) => {
      const home = item.match?.home?.short_name || item.match?.home?.name || text.home;
      const away = item.match?.away?.short_name || item.match?.away?.name || text.away;
      const reason = locale === "ro" ? item.reason_ro || item.reason_ru : item.reason_ru || item.reason_ro;
      return <article key={item.id} className={`fanNotificationItem${item.read_at ? "" : " fanNotificationUnread"}`}>
        <div className="fanNotificationHeading">
          <span className="fanNotificationTag">{text[item.event_type]}</span>
          <time dateTime={item.created_at}>{formatFanDate(item.created_at, locale)}</time>
        </div>
        <h3>{home} — {away}</h3>
        <p>{fanNotificationDetails(item, locale)}</p>
        {reason && item.event_type !== "result" && <p className="fanNotificationReason">{text.reason}: {reason}</p>}
        <div className="fanNotificationActions">
          <Link href={`/matches/${item.match_id}`}>{text.open} →</Link>
          {!item.read_at && <form action={markFanNotificationRead.bind(null, String(item.id))}><button type="submit">{text.markRead}</button></form>}
        </div>
      </article>;
    })}
  </div>;
}
