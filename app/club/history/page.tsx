import Link from "next/link";
import ClubRichContent from "@/app/components/ClubRichContent";
import ClubSectionShell from "@/app/components/ClubSectionShell";
import HistoryEventCard, { type TimelineHall, type TimelineSeason } from "./HistoryEventCard";
import { mergeTranslatedTextIntoRichContent } from "@/lib/club-rich-content";
import { HISTORY_COPY, HISTORY_KINDS, historyFilter, historyHref, historyPage, type ClubHistoryEvent } from "@/lib/club-history";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";
import type { ClubHallOfFameEntry, ClubProfile, Season } from "@/lib/types";
import { localized } from "@/lib/i18n";
import "./history-timeline.css";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 18;
type Props = { searchParams: Promise<{ kind?: string; page?: string }> };

export async function generateMetadata() {
  const locale = await getLocale();
  return publicMetadata({ title: locale === "ro" ? "Istoria FC Edineț" : "История FC Edineț", description: locale === "ro" ? "Istoria și cronologia documentată a FC Edineț." : "История клуба FC Edineț, исторические события, люди и сезоны.", path: "/club/history", locale });
}

export default async function ClubHistoryPage({ searchParams }: Props) {
  const locale = await getLocale();
  const copy = HISTORY_COPY[locale];
  const params = await searchParams;
  const kind = historyFilter(params.kind);
  const page = historyPage(params.page);
  const db = createPublicClient();
  let eventsQuery = db.from("club_history_events").select("*", { count: "exact" }).eq("is_published", true);
  if (kind !== "all") eventsQuery = eventsQuery.eq("event_kind", kind);
  const [profileResponse, eventsResponse] = await Promise.all([
    db.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    eventsQuery.order("event_year", { ascending: false }).order("event_month", { ascending: false, nullsFirst: false })
      .order("display_order").order("id", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);
  const p = profileResponse.data as ClubProfile | null;
  const rich = locale === "ro" ? (p?.history_rich_content_ro ?? mergeTranslatedTextIntoRichContent(p?.history_rich_content, p?.history_text_ro)) : p?.history_rich_content;
  const fallback = localized(p?.history_text, p?.history_text_ro, locale) || (locale === "ro" ? "Istoria clubului nu este încă completată." : "История клуба пока не заполнена.");
  const events = (eventsResponse.data ?? []) as ClubHistoryEvent[];
  const seasonIds = [...new Set(events.map(event => event.season_id).filter((id): id is number => id !== null))];
  const hallIds = [...new Set(events.map(event => event.hall_entry_id).filter((id): id is number => id !== null))];
  const [seasonsResponse, hallResponse] = await Promise.all([
    seasonIds.length ? db.from("seasons").select("id,name,slug").eq("is_active", true).in("id", seasonIds) : Promise.resolve({data: []}),
    hallIds.length ? db.from("club_hall_of_fame").select("id,entry_type,first_name,last_name,title,title_ro")
      .eq("is_active", true).eq("is_placeholder", false).in("id", hallIds) : Promise.resolve({data: []}),
  ]);
  const seasonMap = new Map<string, TimelineSeason>(((seasonsResponse.data ?? []) as Pick<Season, "id"|"name"|"slug">[]).map(s => [String(s.id),s]));
  const hallMap = new Map<string, TimelineHall>(((hallResponse.data ?? []) as Pick<ClubHallOfFameEntry, "id"|"entry_type"|"first_name"|"last_name"|"title"|"title_ro">[]).map(h => [String(h.id), {id: h.id, name: h.entry_type === "squad" ? (locale === "ro" ? h.title_ro || h.title : h.title) : [h.first_name,h.last_name].filter(Boolean).join(" ") || h.title}]));
  const totalPages = Math.max(1, Math.ceil((eventsResponse.count ?? 0) / PAGE_SIZE));

  return <ClubSectionShell locale={locale} active="history" title={locale === "ro" ? "Istoria FC Edineț" : "История FC Edineț"} eyebrow={locale === "ro" ? "MOȘTENIREA CLUBULUI" : "НАСЛЕДИЕ КЛУБА"} description={locale === "ro" ? "Ani, oameni și momente care au format identitatea clubului." : "Годы, люди и события, из которых складывалась история клуба."} imageUrl={p?.hero_image_url}>
    <section className="section clubNarrativePage"><div className="container clubNarrativeInner"><div className="clubHistoryStamp"><span>{locale === "ro" ? "DIN" : "С"}</span><strong>{p?.founded_year || "—"}</strong></div><article className="clubSectionMain"><ClubRichContent content={rich} fallbackText={fallback}/><div className="clubHistorySeasonJump"><p>{locale === "ro" ? "REZULTATE DIN ARHIVĂ" : "РЕЗУЛЬТАТЫ ПО ГОДАМ"}</p><h2>{locale === "ro" ? "Descoperă sezoanele clubului" : "Архив сезонов клуба"}</h2><Link href="/club/seasons">{locale === "ro" ? "Vezi rezultatele și meciurile" : "Посмотреть результаты и матчи"} →</Link></div></article></div></section>
    <section id="club-chronology" className="section clubChronology" aria-labelledby="club-chronology-heading"><div className="container">
      <div className="clubChronologyIntro"><div><p className="eyebrow blue">{copy.eyebrow}</p><h2 id="club-chronology-heading">{copy.heading}</h2><p>{copy.intro}</p></div><Link href="/club/hall-of-fame">{locale === "ro" ? "Galeria de onoare" : "Зал славы"} <span aria-hidden="true">→</span></Link></div>
      <nav className="clubChronologyFilters" aria-label={copy.heading}>
        <Link href={historyHref()} className={kind === "all" ? "selected" : undefined} aria-current={kind === "all" ? "page" : undefined}>{copy.all}</Link>
        {HISTORY_KINDS.map(item => <Link key={item} href={historyHref(item)} className={kind === item ? "selected" : undefined} aria-current={kind === item ? "page" : undefined}>{copy[item]}</Link>)}
      </nav>
      {eventsResponse.error ? <div className="clubTimelineNotice" role="alert">{copy.error}</div>
        : events.length ? <div className="clubTimelineList">{events.map((event, index) => <HistoryEventCard key={event.id} event={event} locale={locale} showYear={index === 0 || events[index - 1].event_year !== event.event_year}
          season={event.season_id === null ? undefined : seasonMap.get(String(event.season_id))}
          hall={event.hall_entry_id === null ? undefined : hallMap.get(String(event.hall_entry_id))}/>)}</div>
        : <div className="clubTimelineNotice">{copy.empty}</div>}
      {!eventsResponse.error && totalPages > 1 && <nav className="clubTimelinePagination" aria-label={copy.heading}>
        {page > 1 ? <Link href={historyHref(kind, page - 1)}>← {copy.previous}</Link> : <span/>}
        <span>{copy.page} {Math.min(page, totalPages)} / {totalPages}</span>
        {page < totalPages ? <Link href={historyHref(kind, page + 1)}>{copy.next} →</Link> : <span/>}
      </nav>}
    </div></section>
  </ClubSectionShell>;
}
