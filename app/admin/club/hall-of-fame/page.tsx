import Link from "next/link";
import AdminClubNav from "@/app/components/AdminClubNav";
import { requireEditor } from "@/lib/editorial";
import type { ClubHallOfFameEntry } from "@/lib/types";
import { HALL_PAGE_SIZE, hallCategory, hallFilterBySearch, hallPage, hallQuery } from "@/lib/hall-of-fame";
import { createHallEntry, updateHallEntry, deleteHallEntry } from "./actions";
import "./hall-admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Зал славы — Админ" };

type AdminParams = Promise<{ category?: string; q?: string; status?: string; page?: string }>;

function Fields({ e }: { e?: ClubHallOfFameEntry }) {
  const squad = e?.entry_type === "squad";
  return <>
    <div className="clubArchiveAdminGrid3">
      <label className="fieldGroup"><span>Тип</span><select name="entry_type" defaultValue={e?.entry_type ?? "person"}><option value="person">Человек</option><option value="squad">Исторический состав</option></select></label>
      <label className="fieldGroup"><span>Категория</span><select name="category" defaultValue={e?.category ?? "player"}><option value="player">Игрок</option><option value="coach">Тренер</option><option value="leader">Человек клуба</option><option value="squad">Состав</option></select></label>
      <label className="fieldGroup"><span>Порядок</span><input type="number" name="display_order" defaultValue={e?.display_order ?? 100} /></label>
    </div>
    <div className="clubArchiveAdminGrid2">
      <label className="fieldGroup"><span>Имя</span><input name="first_name" placeholder="Имя человека" defaultValue={e?.first_name ?? ""} /></label>
      <label className="fieldGroup"><span>Фамилия</span><input name="last_name" placeholder="Фамилия человека" defaultValue={e?.last_name ?? ""} /></label>
    </div>
    <div className="clubArchiveAdminGrid2">
      <label className="fieldGroup"><span>Статус / заголовок RU</span><input name="title" placeholder="Например: Легендарный тренер" defaultValue={e?.title ?? ""} required /></label>
      <label className="fieldGroup"><span>Titlu RO</span><input name="title_ro" defaultValue={e?.title_ro ?? ""} /></label>
    </div>
    <div className="clubArchiveAdminGrid2">
      <label className="fieldGroup"><span>Период / сезон</span><input name="era_label" placeholder="Например: 1999–2005" defaultValue={e?.era_label ?? ""} /></label>
      <label className="fieldGroup"><span>Perioadă RO</span><input name="era_label_ro" defaultValue={e?.era_label_ro ?? ""} /></label>
    </div>
    <label className="fieldGroup"><span>Биография RU</span><textarea name="description" rows={7} defaultValue={e?.description ?? ""} /></label>
    <label className="fieldGroup"><span>Biografie RO</span><textarea name="description_ro" rows={5} defaultValue={e?.description_ro ?? ""} /></label>
    <details className="adminDetails" open={squad}><summary>Исторический состав / список людей</summary>
      <label className="fieldGroup"><span>Состав RU — один человек на строку</span><textarea name="roster_text" rows={8} defaultValue={e?.roster_text ?? ""} /></label>
      <label className="fieldGroup"><span>Lot RO</span><textarea name="roster_text_ro" rows={6} defaultValue={e?.roster_text_ro ?? ""} /></label>
    </details>
    <label className="fieldGroup"><span>Фото / фото состава</span><input type="file" name="photo_file" accept="image/jpeg,image/png,image/webp" /><small>Если фото нет, используется герб FC Edineț.</small></label>
    {e?.photo_url && <label className="checkRow"><input type="checkbox" name="clear_photo" />Удалить фото и использовать герб</label>}
    <div className="staffAdminFlags">
      <label className="checkRow"><input type="checkbox" name="is_active" defaultChecked={e?.is_active ?? true} />Показывать на сайте</label>
      <label className="checkRow"><input type="checkbox" name="is_placeholder" defaultChecked={e?.is_placeholder ?? false} />Временная заглушка (скрыта на публичном сайте)</label>
    </div>
  </>;
}

function adminHref(params: { category?: string; q?: string; status?: string; page?: number }) {
  const p = new URLSearchParams();
  if (params.category && params.category !== "all") p.set("category", params.category);
  if (params.q) p.set("q", params.q);
  if (params.status && params.status !== "all") p.set("status", params.status);
  if (params.page && params.page > 1) p.set("page", String(params.page));
  return `/admin/club/hall-of-fame${p.size ? `?${p.toString()}` : ""}`;
}

export default async function HallAdminPage({ searchParams }: { searchParams: AdminParams }) {
  const { supabase, profile } = await requireEditor();
  const params = await searchParams;
  const category = hallCategory(params.category);
  const status = ["all", "active", "hidden", "placeholder"].includes(params.status ?? "") ? params.status! : "all";
  const q = hallQuery(params.q);
  const page = hallPage(params.page);
  const size = 20;
  let query = supabase.from("club_hall_of_fame").select("*", { count: "exact" });
  if (category !== "all") query = query.eq("category", category);
  if (status === "active") query = query.eq("is_active", true).eq("is_placeholder", false);
  if (status === "hidden") query = query.eq("is_active", false);
  if (status === "placeholder") query = query.eq("is_placeholder", true);
  query = hallFilterBySearch(query, q);
  const { data, count, error } = await query.order("display_order").order("id")
    .range((page - 1) * size, page * size - 1);
  const entries = (data ?? []) as ClubHallOfFameEntry[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));

  return <main className="adminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div>
      <p className="eyebrow">КЛУБ • ЗАЛ СЛАВЫ</p><h1>Зал славы</h1>
      <p>Управление биографиями, категориями и историческими составами.</p>
    </div><div className="adminHeroActions"><Link href="/admin/club" className="adminBack">← К разделам клуба</Link><Link href="/club/hall-of-fame" className="rowAction muted">Открыть на сайте ↗</Link></div></div></section>
    <section className="section adminSurface"><div className="container">
      <AdminClubNav active="hall-of-fame" />
      <div className="hallAdminV2">
        <details className="clubAddCard hallAdminCreate"><summary><span><b>+ Добавить в Зал славы</b><small>Открыть форму нового участника</small></span><span aria-hidden="true">⌄</span></summary>
          <form action={createHallEntry} encType="multipart/form-data" className="staffAdminForm"><Fields /><button className="primaryButton">+ Добавить запись</button></form>
        </details>
        <section className="hallAdminListing" aria-label="Список участников">
          <div className="hallAdminTitle"><div><p className="eyebrow blue">АРХИВ КЛУБА</p><h2>Записи Зала славы</h2></div><strong>{error ? "—" : count ?? 0}</strong></div>
          <form action="/admin/club/hall-of-fame" method="get" className="hallAdminFilters">
            <input type="search" name="q" placeholder="Поиск по имени, периоду или заголовку" defaultValue={q} maxLength={80} />
            <select name="category" defaultValue={category} aria-label="Категория"><option value="all">Все категории</option><option value="player">Игроки</option><option value="coach">Тренеры</option><option value="leader">Люди клуба</option><option value="squad">Исторические составы</option></select>
            <select name="status" defaultValue={status} aria-label="Публикация"><option value="all">Все статусы</option><option value="active">Опубликовано</option><option value="hidden">Скрыто</option><option value="placeholder">Заглушки</option></select>
            <button type="submit">Найти</button><Link href="/admin/club/hall-of-fame">Сбросить</Link>
          </form>
          {error ? <p role="alert">Не удалось загрузить записи. Попробуйте ещё раз.</p> : entries.length ? <div className="staffAdminStack">
            {entries.map((e) => <details className="staffAdminCard hallAdminRecord" key={e.id}><summary>
              <span className="staffAdminPhoto">{e.photo_url ? <img src={e.photo_url} alt="" /> : <img src="/brand/fc-edinet-crest.png" alt="" className="isCrest" />}</span>
              <span className="staffAdminIdentity"><small>{e.entry_type === "squad" ? "ИСТОРИЧЕСКИЙ СОСТАВ" : e.category.toUpperCase()}</small><strong>{e.entry_type === "person" ? `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() : e.title}</strong><span>{e.era_label || e.title}</span></span>
              {!e.is_active && <b className="hallAdminBadge">СКРЫТО</b>}
              {e.is_placeholder && <b className="hallAdminBadge">ЗАГЛУШКА</b>}
              <em>⌄</em>
            </summary><div className="staffAdminCardBody"><form action={updateHallEntry} encType="multipart/form-data" className="staffAdminForm"><input type="hidden" name="entry_id" value={e.id} /><Fields e={e} /><button className="primaryButton">Сохранить изменения</button></form>
              {profile.role === "admin" && <form action={deleteHallEntry}><input type="hidden" name="entry_id" value={e.id} /><button className="dangerButton">Удалить запись</button></form>}
            </div></details>)}
          </div> : <p className="hallAdminEmpty">Записей по выбранным условиям нет.</p>}
          {pages > 1 && <nav className="hallAdminPager" aria-label="Страницы списка">
            {page > 1 ? <Link href={adminHref({ category, q, status, page: page - 1 })}>← Назад</Link> : <span />}
            <b>Страница {page} из {pages}</b>
            {page < pages ? <Link href={adminHref({ category, q, status, page: page + 1 })}>Далее →</Link> : <span />}
          </nav>}
        </section>
      </div>
    </div></section>
  </main>;
}
