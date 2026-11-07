import Link from "next/link";
import { notFound } from "next/navigation";
import ClubSectionShell from "@/app/components/ClubSectionShell";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";
import type { ClubHallOfFameEntry } from "@/lib/types";
import { HALL_COPY, hallHref, hallLocalized, hallName } from "@/lib/hall-of-fame";
import { HISTORY_COPY, historyEventHref, type ClubHistoryEvent } from "@/lib/club-history";
import "../hall-of-fame.css";
import "../../history/history-timeline.css";

export const dynamic = "force-dynamic";
type DetailProps = { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> };

async function getEntry(id: string): Promise<ClubHallOfFameEntry | null> {
  if (!/^[1-9]\d{0,12}$/.test(id)) return null;
  const db = createPublicClient();
  const { data } = await db.from("club_hall_of_fame").select("*")
    .eq("id", id).eq("is_active", true).eq("is_placeholder", false).maybeSingle();
  return (data as ClubHallOfFameEntry | null) ?? null;
}

export async function generateMetadata({ params }: DetailProps) {
  const { id } = await params;
  const locale = await getLocale();
  const entry = await getEntry(id);
  if (!entry) return { title: locale === "ro" ? "Profil indisponibil" : "Запись не найдена", robots: { index: false } };
  const title = hallName(entry, locale);
  const description = hallLocalized(entry.description, entry.description_ro, locale).slice(0, 160)
    || hallLocalized(entry.title, entry.title_ro, locale);
  return publicMetadata({ title, description, path: `/club/hall-of-fame/${id}`, locale, image: entry.photo_url });
}

export default async function HallEntryPage({ params, searchParams }: DetailProps) {
  const [{ id }, search, locale] = await Promise.all([params, searchParams, getLocale()]);
  const entry = await getEntry(id);
  if (!entry) notFound();
  const copy = HALL_COPY[locale];
  const name = hallName(entry, locale);
  const role = hallLocalized(entry.title, entry.title_ro, locale);
  const era = hallLocalized(entry.era_label, entry.era_label_ro, locale);
  const description = hallLocalized(entry.description, entry.description_ro, locale);
  const roster = hallLocalized(entry.roster_text, entry.roster_text_ro, locale);
  const { data: relatedData } = await createPublicClient().from("club_history_events")
    .select("id,event_year,title,title_ro").eq("hall_entry_id", entry.id).eq("is_published", true)
    .order("event_year", { ascending: false }).limit(6);
  const relatedEvents = (relatedData ?? []) as Pick<ClubHistoryEvent,"id"|"event_year"|"title"|"title_ro">[];
  // The return target must remain within the hall-of-fame listing.
  const from = typeof search.from === "string" &&
    (search.from === "/club/hall-of-fame" || search.from.startsWith("/club/hall-of-fame?"))
    ? search.from : hallHref();

  return (
    <ClubSectionShell locale={locale} active="hall-of-fame" title={copy.heading}>
      <section className="hallV2Detail">
        <div className="container hallV2DetailContainer">
          <Link className="hallV2Back" href={from}>← {copy.back}</Link>
          <article>
            <header className="hallV2DetailHero">
              <div className={`hallV2DetailPortrait${entry.entry_type === "squad" ? " isSquad" : ""}`}>
                <img src={entry.photo_url || "/brand/fc-edinet-crest.png"}
                  className={entry.photo_url ? undefined : "hallV2Crest"} alt={name} />
              </div>
              <div className="hallV2DetailIntro">
                <p className="hallV2Kicker"><span />FC EDINEȚ / {copy[entry.category]}</p>
                <h1>{name}</h1>
                {role && role !== name && <p className="hallV2DetailRole">{role}</p>}
                {era && <div className="hallV2DetailPeriod"><small>{copy.period}</small><strong>{era}</strong></div>}
              </div>
            </header>
            <div className="hallV2DetailBody">
              {description && <section className="hallV2Story">
                <h2>{copy.biography}</h2>
                {description.split(/\n\s*\n|\r?\n/).filter((part) => part.trim()).map((part, i) => <p key={i}>{part.trim()}</p>)}
              </section>}
              {entry.entry_type === "squad" && roster && <section className="hallV2Roster">
                <h2>{copy.roster}</h2>
                <ul>{roster.split(/\r?\n/).filter((line) => line.trim()).map((line, i) => <li key={i}>{line.trim()}</li>)}</ul>
              </section>}
              {relatedEvents.length > 0 && <section className="clubRelatedHistory" aria-labelledby="hall-related-history-title">
                <h2 id="hall-related-history-title">{HISTORY_COPY[locale].related}</h2>
                <ul>{relatedEvents.map(event => <li key={event.id}><Link href={historyEventHref(event.id)}><span>{event.event_year}</span>{hallLocalized(event.title,event.title_ro,locale)}</Link></li>)}</ul>
              </section>}
              <Link className="hallV2Back hallV2BottomBack" href={from}>← {copy.back}</Link>
            </div>
          </article>
        </div>
      </section>
    </ClubSectionShell>
  );
}
