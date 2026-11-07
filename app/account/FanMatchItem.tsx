import Link from "next/link";
import { toggleFavoriteMatch } from "@/app/account/actions";
import { accountText } from "@/lib/account-i18n";
import { fanDashboardText } from "@/lib/fan-favorites";
import { dateLocale, matchStatusLabelsI18n, type Locale } from "@/lib/i18n";
import { matchScoreText } from "@/lib/public-match-integrity";
import { cupResultDetail } from "@/lib/cup-results";
import {scheduleDateLabel, scheduleReason} from "@/lib/match-schedule";
import type { ClubMatch } from "@/lib/types";

export default function FanMatchItem({match, locale, removable = false}: {match:ClubMatch;locale:Locale;removable?:boolean}) {
  const fan = fanDashboardText[locale];
  const text = accountText[locale];
  const date = new Date(match.kickoff);
  const when = Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(dateLocale(locale), {day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"Europe/Chisinau"}).format(date)
    : "—";
  const calendable = match.status === "scheduled" && date.getTime() > Date.now();
  return (
    <article className="fanV2301Match">
      <div className="fanV2301Teams" aria-hidden="true">
        {match.home?.logo_url ? <img src={match.home.logo_url} alt="" loading="lazy"/> : <span>FC</span>}
        {match.away?.logo_url ? <img src={match.away.logo_url} alt="" loading="lazy"/> : <span>FC</span>}
      </div>
      <div className="fanV2301MatchInfo">
        <span className="fanV2301MatchMeta">{match.competition?.name || text.matches} · {matchStatusLabelsI18n[locale][match.status]}</span>
        <Link href={`/matches/${match.id}`} className="fanV2301MatchTitle">
          {match.home?.name ?? "—"} <b>{match.status === "finished" || match.status === "live" ? matchScoreText(match, ":") : "–"}</b> {match.away?.name ?? "—"}
        </Link>
        {cupResultDetail(match,locale) && <small className="cupResultDetail">{cupResultDetail(match,locale)}</small>}
        {match.status === "postponed" || match.status === "cancelled"
          ? <span className="fanV2301ScheduleChange">{scheduleDateLabel(match,locale)}{scheduleReason(match,locale) ? ` · ${scheduleReason(match,locale)}` : ""}</span>
          : <time dateTime={match.kickoff}>{when}</time>}
      </div>
      <div className="fanV2301MatchActions">
        {calendable ? <a href={`/api/calendar/${match.id}?lang=${locale}`} download={`fc-edinet-match-${match.id}.ics`} className="fanV2301Action">{fan.inCalendar}</a> : null}
        {removable ? <form action={toggleFavoriteMatch.bind(null, String(match.id), "/account/favorites")}><button className="fanV2301Remove" type="submit">{text.removeMatch}</button></form> : <Link href={`/matches/${match.id}`} className="fanV2301Action">{fan.goToMatch}</Link>}
      </div>
    </article>
  );
}
