import Link from "next/link";
import AdminClubNav from "@/app/components/AdminClubNav";
import { ClubHistoryAdminForm } from "@/app/components/ClubAdminSectionForms";
import { historyPage, type ClubHistoryEvent } from "@/lib/club-history";
import { requireEditor } from "@/lib/editorial";
import type { ClubHallOfFameEntry, ClubProfile, Season } from "@/lib/types";
import HistoryEventForm from "./HistoryEventForm";
import "./history-admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "История FC Edineț — Админ" };
const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ page?: string }> };
export default async function Page({ searchParams }: Props) {
  const { supabase, profile } = await requireEditor();
  const page = historyPage((await searchParams).page);
  const [profileResponse, eventsResponse, seasonResponse, hallResponse] = await Promise.all([
    supabase.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("club_history_events").select("*", {count: "exact"})
      .order("event_year", {ascending: false}).order("event_month", {ascending: false, nullsFirst: false})
      .order("display_order").order("id", {ascending: false})
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("seasons").select("id,name,slug,starts_on,ends_on,is_current,is_active").eq("is_active", true).order("starts_on", {ascending: false}),
    supabase.from("club_hall_of_fame").select("id,entry_type,first_name,last_name,title,is_active,is_placeholder")
      .eq("is_active", true).eq("is_placeholder", false).order("display_order"),
  ]);
  const entries = (eventsResponse.data ?? []) as ClubHistoryEvent[];
  const seasons = ((seasonResponse.data ?? []) as Season[]).map((item) => ({id: item.id, label: item.name}));
  const hallEntries = ((hallResponse.data ?? []) as (Pick<ClubHallOfFameEntry, "id" | "entry_type" | "first_name" | "last_name" | "title">)[])
    .map((item) => ({id: item.id, label: item.entry_type === "squad" ? item.title : `${[item.first_name, item.last_name].filter(Boolean).join(" ")} · ${item.title}`}));
  const pages = Math.max(1, Math.ceil((eventsResponse.count ?? 0) / PAGE_SIZE));

  return <main className="adminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div>
      <p className="eyebrow">КЛУБ • ИСТОРИЯ FC EDINEȚ</p><h1>История FC Edineț</h1>
    </div><div className="adminHeroActions"><Link href="/admin/club" className="adminBack">← К разделам клуба</Link><Link href="/club/history" className="rowAction muted">Открыть на сайте ↗</Link></div></div></section>
    <section className="section adminSurface"><div className="container"><AdminClubNav active="history"/>
      <div className="historyAdminIntro"><p className="eyebrow blue">ИСТОРИЧЕСКАЯ ХРОНОЛОГИЯ · v2.30.7</p><h2>События клуба</h2><p>Каждое событие публикуется отдельно, с подтверждённым годом. При необходимости прикрепи сезон или опубликованную запись Зала славы. Черновики не видны посетителям.</p></div>
      {eventsResponse.error ? <p className="historyAdminNotice" role="alert">Не удалось загрузить события. Проверь выполнение <code>database/077_club_history_timeline.sql</code> в Supabase. {eventsResponse.error.message}</p> : null}
      {seasonResponse.error || hallResponse.error ? <p className="historyAdminNotice" role="alert">Связанные сезоны или Зал славы временно недоступны. Проверь подключение к базе.</p> : null}
      <details className="clubAddCard historyAdminCreate"><summary><span><strong>+ Добавить историческое событие</strong><small>Год, заголовок, описание, источник, фото и связи</small></span><span aria-hidden="true">⌄</span></summary>
        <HistoryEventForm seasons={seasons} hallEntries={hallEntries} canDelete={false} />
      </details>
      <div className="historyAdminListing"><div className="historyAdminListTitle"><h3>Записи хронологии</h3><span>{eventsResponse.error ? "—" : (eventsResponse.count ?? 0)} всего</span></div>
        {!eventsResponse.error && (entries.length ? <div className="historyAdminEntries">{entries.map((event) => <details className="historyAdminEntry" key={event.id}><summary>
          <span className="historyAdminEntryYear">{event.event_year}</span><span className="historyAdminEntryTitle"><strong>{event.title}</strong><small>{event.event_month ? `Месяц: ${event.event_month} · ` : ""}{event.event_kind}</small></span>
          <span className={event.is_published ? "historyAdminPublished" : "historyAdminDraft"}>{event.is_published ? "ОПУБЛИКОВАНО" : "ЧЕРНОВИК"}</span><span className="historyAdminChevron" aria-hidden="true">⌄</span>
        </summary><HistoryEventForm event={event} seasons={seasons} hallEntries={hallEntries} canDelete={profile.role === "admin"}/></details>)}</div>
        : <div className="historyAdminNotice">Событий пока нет. Добавь первую подтверждённую запись выше.</div>)}
        {pages > 1 && <nav className="historyAdminPagination" aria-label="Страницы хронологии">
          {page > 1 ? <Link href={`/admin/club/history?page=${page - 1}`}>← Назад</Link> : <span/>}
          <span>Страница {Math.min(page, pages)} / {pages}</span>
          {page < pages ? <Link href={`/admin/club/history?page=${page + 1}`}>Далее →</Link> : <span/>}
        </nav>}
      </div>
      <div className="historyAdminIntro historyAdminDocument"><p className="eyebrow blue">ПОДРОБНАЯ ИСТОРИЯ</p><h2>Основной текст истории клуба</h2><p>Этот документ остаётся независимым от событий хронологии и не перезаписывается при их редактировании.</p></div>
      <ClubHistoryAdminForm profile={profileResponse.data as ClubProfile | null}/>
    </div></section>
  </main>;
}
