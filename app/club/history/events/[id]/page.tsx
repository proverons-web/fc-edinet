import Link from "next/link";
import { notFound } from "next/navigation";
import ClubSectionShell from "@/app/components/ClubSectionShell";
import { HISTORY_COPY, historyDate, historyText, safeHistorySource, type ClubHistoryEvent } from "@/lib/club-history";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";
import type { ClubHallOfFameEntry, Season } from "@/lib/types";
import "../../history-timeline.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

async function findEvent(id: string): Promise<ClubHistoryEvent | null> {
  if (!/^[1-9]\d{0,12}$/.test(id)) return null;
  const { data } = await createPublicClient().from("club_history_events")
    .select("*").eq("id", id).eq("is_published", true).maybeSingle();
  return (data as ClubHistoryEvent | null) ?? null;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [locale, event] = await Promise.all([getLocale(), findEvent(id)]);
  if (!event) return { title: locale === "ro" ? "Eveniment negăsit" : "Событие не найдено", robots: { index: false } };
  const title = historyText(event.title, event.title_ro, locale);
  const description = historyText(event.description, event.description_ro, locale).slice(0, 160) || title;
  return publicMetadata({ title: `${title} — FC Edineț`, description, path: `/club/history/events/${id}`, locale, image: event.image_url });
}

export default async function ClubHistoryEventPage({ params }: Props) {
  const { id } = await params;
  const [locale, event] = await Promise.all([getLocale(), findEvent(id)]);
  if (!event) notFound();
  const db = createPublicClient();
  const copy = HISTORY_COPY[locale];
  const [seasonResponse, hallResponse] = await Promise.all([
    event.season_id ? db.from("seasons").select("id,name,slug").eq("id", event.season_id).eq("is_active", true).maybeSingle() : Promise.resolve({data: null}),
    event.hall_entry_id ? db.from("club_hall_of_fame").select("id,entry_type,first_name,last_name,title,title_ro")
      .eq("id", event.hall_entry_id).eq("is_active", true).eq("is_placeholder", false).maybeSingle() : Promise.resolve({data: null}),
  ]);
  const season = seasonResponse.data as Pick<Season,"id"|"name"|"slug"> | null;
  const hall = hallResponse.data as Pick<ClubHallOfFameEntry,"id"|"entry_type"|"first_name"|"last_name"|"title"|"title_ro"> | null;
  const hallName = hall?.entry_type === "squad" ? (locale === "ro" ? hall.title_ro || hall.title : hall.title)
    : [hall?.first_name,hall?.last_name].filter(Boolean).join(" ") || hall?.title;
  const title = historyText(event.title, event.title_ro, locale);
  const description = historyText(event.description, event.description_ro, locale);
  const source = safeHistorySource(event.source_url);

  return <ClubSectionShell locale={locale} active="history" title={title}>
    <div className="clubHistoryEventDetail"><div className="container clubHistoryEventDetailInner">
      <Link className="clubHistoryEventBack" href="/club/history#club-chronology">← {copy.back}</Link>
      <article className="clubHistoryEventArticle">
        <header className="clubHistoryEventArticleHead"><p>{historyDate(event, locale)} · {copy[event.event_kind]}</p><h1>{title}</h1></header>
        {event.image_url && <img className="clubHistoryEventArticleImage" src={event.image_url} alt={title} />}
        {description && <div className="clubHistoryEventArticleBody">{description.split(/\n\s*\n|\r?\n/).filter(Boolean).map((part,index)=><p key={index}>{part.trim()}</p>)}</div>}
        <nav className="clubHistoryEventRelations" aria-label={locale === "ro" ? "Referințe" : "Связанные материалы"}>
          {season && <Link href={`/club/seasons/${encodeURIComponent(season.slug)}`}>{copy.season}: {season.name} →</Link>}
          {hall && <Link href={`/club/hall-of-fame/${hall.id}`}>{copy.person}: {hallName} →</Link>}
          {source && <a href={source} rel="noopener noreferrer" target="_blank">{copy.source} ↗</a>}
        </nav>
      </article>
    </div></div>
  </ClubSectionShell>;
}
