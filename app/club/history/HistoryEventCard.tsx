import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { HISTORY_COPY, historyDate, historyEventHref, historyText, safeHistorySource, type ClubHistoryEvent } from "@/lib/club-history";

export type TimelineSeason = { id: string | number; slug: string; name: string };
export type TimelineHall = { id: number; name: string };

export default function HistoryEventCard({ event, locale, season, hall, showYear = true }: {
  event: ClubHistoryEvent; locale: Locale; season?: TimelineSeason; hall?: TimelineHall; showYear?: boolean;
}) {
  const copy = HISTORY_COPY[locale];
  const title = historyText(event.title, event.title_ro, locale);
  const description = historyText(event.description, event.description_ro, locale);
  const source = safeHistorySource(event.source_url);
  return <article className="clubTimelineEntry">
    <div className="clubTimelineDate" aria-label={historyDate(event,locale)}><span className="clubTimelineDot" aria-hidden="true"/>{showYear ? <strong>{event.event_year}</strong> : <span className="clubTimelineRepeat" aria-hidden="true">·</span>}</div>
    <div className="clubTimelineCard">
      <div className="clubTimelineCardBody">
        <p className="clubTimelineCardEyebrow"><span>{historyDate(event, locale)}</span><span>{copy[event.event_kind]}</span></p>
        <h3><Link href={historyEventHref(event.id)}>{title}</Link></h3>
        {description && <p className="clubTimelineExcerpt">{description}</p>}
        <div className="clubTimelineLinks">
          <Link className="clubTimelineRead" href={historyEventHref(event.id)}>{copy.details} <span aria-hidden="true">→</span></Link>
          {season && <Link href={`/club/seasons/${encodeURIComponent(season.slug)}`}>{copy.season}: {season.name}</Link>}
          {hall && <Link href={`/club/hall-of-fame/${hall.id}`}>{hall.name}</Link>}
          {source && <a href={source} target="_blank" rel="noopener noreferrer">{copy.source} ↗</a>}
        </div>
      </div>
      {event.image_url && <Link className="clubTimelineImage" href={historyEventHref(event.id)} aria-label={`${copy.details}: ${title}`}><img src={event.image_url} alt={title} loading="lazy"/></Link>}
    </div>
  </article>;
}
