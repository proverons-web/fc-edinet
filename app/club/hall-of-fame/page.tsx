import Link from "next/link";
import ClubSectionShell from "@/app/components/ClubSectionShell";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";
import type { ClubHallOfFameEntry } from "@/lib/types";
import {
  HALL_COPY, HALL_PAGE_SIZE,
  hallCategory, hallFilterBySearch, hallHref, hallLocalized, hallName, hallPage, hallQuery,
} from "@/lib/hall-of-fame";
import HallSearchLauncher from "./HallSearchLauncher";
import "./hall-of-fame.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; q?: string; page?: string }>;

type HallCardEntry = Pick<ClubHallOfFameEntry,
  "id" | "entry_type" | "category" | "first_name" | "last_name" | "title" | "title_ro" |
  "era_label" | "era_label_ro" | "photo_url">
;

export async function generateMetadata() {
  const locale = await getLocale();
  return publicMetadata({
    title: locale === "ro" ? "Galeria de onoare" : "Зал славы",
    description: locale === "ro"
      ? "Fotbaliști, antrenori și oameni care au scris istoria FC Edineț."
      : "Игроки, тренеры и люди, оставившие след в истории FC Edineț.",
    path: "/club/hall-of-fame", locale,
  });
}

export default async function HallOfFamePage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocale();
  const copy = HALL_COPY[locale];
  const params = await searchParams;
  const category = hallCategory(params.category);
  const q = hallQuery(params.q);
  const page = hallPage(params.page);
  const db = createPublicClient();

  let listing = db.from("club_hall_of_fame")
    .select("id,entry_type,category,first_name,last_name,title,title_ro,era_label,era_label_ro,photo_url", { count: "exact" })
    .eq("is_active", true).eq("is_placeholder", false);
  if (category !== "all") listing = listing.eq("category", category);
  listing = hallFilterBySearch(listing, q);

  const [{ data, count, error }, { count: allCount }] = await Promise.all([
    listing.order("display_order", { ascending: true }).order("id", { ascending: true })
      .range((page - 1) * HALL_PAGE_SIZE, page * HALL_PAGE_SIZE - 1),
    db.from("club_hall_of_fame").select("id", { count: "exact", head: true })
      .eq("is_active", true).eq("is_placeholder", false),
  ]);
  const entries = (data ?? []) as HallCardEntry[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / HALL_PAGE_SIZE));
  const navigation = { category, q, page };
  const hasFilters = Boolean(q || category !== "all");

  return (
    <ClubSectionShell locale={locale} active="hall-of-fame" title={copy.heading}>
      <section className="hallV2" aria-label={copy.heading}>
        <header className="hallV2Hero">
          <div className="container hallV2HeroInner">
            <div className="hallV2HeroText">
              <p className="hallV2Kicker"><span />{copy.eyebrow}</p>
              <h1>{copy.heading}</h1>
              <h2>{copy.tagline}</h2>
              <p>{copy.intro}</p>
            </div>
            <div className="hallV2Count" aria-label={`${copy.participants}: ${allCount ?? 0}`}>
              <strong>{allCount ?? 0}</strong><span>{copy.participants}</span>
            </div>
          </div>
        </header>

        <div className="container hallV2Content">
          <div className="hallV2ListHead" aria-live="polite">
            <div className="hallV2ListSummary">
              <span>{copy.results}: <strong>{error ? "—" : total}</strong></span>
              {totalPages > 1 && <span>{copy.page} {Math.min(page, totalPages)} / {totalPages}</span>}
            </div>
            <HallSearchLauncher locale={locale} category={category} q={q} />
          </div>

          {error ? (
            <div className="hallV2Empty" role="alert">{locale === "ro" ? "Datele nu au putut fi încărcate. Încercați din nou." : "Не удалось загрузить данные. Попробуйте ещё раз."}</div>
          ) : entries.length ? (
            <div className="hallV2Grid">
              {entries.map((entry) => {
                const name = hallName(entry, locale);
                const role = hallLocalized(entry.title, entry.title_ro, locale);
                const era = hallLocalized(entry.era_label, entry.era_label_ro, locale);
                return (
                  <Link key={entry.id} className={`hallV2Card${entry.entry_type === "squad" ? " isSquad" : ""}`}
                    href={`/club/hall-of-fame/${entry.id}?${new URLSearchParams({ from: hallHref(navigation) }).toString()}`}
                    aria-label={`${copy.readMore}: ${name}`}>
                    <div className="hallV2Portrait">
                      {entry.photo_url ? (
                        <img src={entry.photo_url} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <img src="/brand/fc-edinet-crest.png" className="hallV2Crest" alt="" loading="lazy" />
                      )}
                      <span className="hallV2Category">{copy[entry.category]}</span>
                    </div>
                    <div className="hallV2CardBody">
                      {era && <small className="hallV2Era">{era}</small>}
                      <h3>{name}</h3>
                      {role && role !== name && <p>{role}</p>}
                      <span className="hallV2Open">{copy.details} <span aria-hidden="true">↗</span></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="hallV2Empty">
              <p>{q ? copy.noResults : copy.empty}</p>
              {hasFilters && <Link href="/club/hall-of-fame">{copy.reset}</Link>}
            </div>
          )}

          {!error && totalPages > 1 && (
            <nav className="hallV2Pagination" aria-label={locale === "ro" ? "Paginare" : "Страницы"}>
              {page > 1 ? <Link href={hallHref({ category, q, page: page - 1 })}>← {copy.prev}</Link> : <span aria-disabled="true">← {copy.prev}</span>}
              <span>{copy.page} {page} / {totalPages}</span>
              {page < totalPages ? <Link href={hallHref({ category, q, page: page + 1 })}>{copy.next} →</Link> : <span aria-disabled="true">{copy.next} →</span>}
            </nav>
          )}
        </div>
      </section>
    </ClubSectionShell>
  );
}
