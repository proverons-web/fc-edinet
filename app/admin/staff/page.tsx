import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import type { TeamStaffMember } from "@/lib/types";
import { createStaffMember, updateStaffMember, deleteStaffMember } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Штаб команды — Админ" };

const categoryLabels: Record<string,string> = { coaching:"Тренерский штаб", medical:"Медицина", operations:"Организация" };

function StaffFields({ member }: { member?: TeamStaffMember }) {
  return <>
    <div className="staffAdminGrid3">
      <label className="fieldGroup"><span>Имя</span><input name="first_name" defaultValue={member?.first_name ?? "ИМЯ"} required /></label>
      <label className="fieldGroup"><span>Фамилия</span><input name="last_name" defaultValue={member?.last_name ?? "ФАМИЛИЯ"} required /></label>
      <label className="fieldGroup"><span>Категория</span><select name="category" defaultValue={member?.category ?? "coaching"}><option value="coaching">Тренерский штаб</option><option value="medical">Медицина</option><option value="operations">Организация</option></select></label>
    </div>
    <div className="staffAdminGrid2">
      <label className="fieldGroup"><span>Должность RU</span><input name="role_title" defaultValue={member?.role_title ?? "Главный тренер"} required /></label>
      <label className="fieldGroup"><span>Должность RO</span><input name="role_title_ro" defaultValue={member?.role_title_ro ?? ""} /></label>
    </div>
    <input type="hidden" name="role_key" value={member?.role_key ?? "staff_member"} />
    <label className="fieldGroup"><span>Краткая биография RU</span><textarea name="bio" rows={4} defaultValue={member?.bio ?? "Демонстрационная запись. Замените текст на реальные данные сотрудника."} /></label>
    <label className="fieldGroup"><span>Biografie RO</span><textarea name="bio_ro" rows={3} defaultValue={member?.bio_ro ?? ""} /></label>
    <div className="staffAdminGrid3">
      <label className="fieldGroup"><span>В клубе с</span><input type="number" name="joined_year" min="1900" max="2100" defaultValue={member?.joined_year ?? ""} /></label>
      <label className="fieldGroup"><span>До</span><input type="number" name="left_year" min="1900" max="2100" defaultValue={member?.left_year ?? ""} /></label>
      <label className="fieldGroup"><span>Порядок</span><input type="number" name="display_order" defaultValue={member?.display_order ?? 100} /></label>
    </div>
    <label className="fieldGroup"><span>Фото</span><input type="file" name="photo_file" accept="image/jpeg,image/png,image/webp" /><small>Если фото не задано, на сайте автоматически используется герб FC Edineț.</small></label>
    {member?.photo_url && <label className="checkRow"><input type="checkbox" name="clear_photo" /> Удалить текущее фото и вернуть герб клуба</label>}
    <div className="staffAdminFlags">
      <label className="checkRow"><input type="checkbox" name="is_active" defaultChecked={member?.is_active ?? true} /> Показывать на сайте</label>
      <label className="checkRow"><input type="checkbox" name="is_placeholder" defaultChecked={member?.is_placeholder ?? true} /> Это временная заглушка</label>
    </div>
  </>;
}

export default async function StaffAdminPage() {
  const { supabase, profile } = await requireEditor();
  const { data, error } = await supabase.from("team_staff").select("*").order("category").order("display_order").order("id");
  const members = (data ?? []) as TeamStaffMember[];
  return <main className="adminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">FC EDINEȚ • TEAM STAFF</p><h1>Штаб команды</h1><p>Готовая структура штаба. Заглушки можно поочерёдно заменить реальными сотрудниками без перестройки страницы.</p></div><div className="adminHeroActions"><Link href="/admin" className="adminBack">← Админка</Link><Link href="/staff" className="rowAction muted">Открыть на сайте ↗</Link></div></div></section>
    <section className="section adminSurface"><div className="container staffAdminPage">
      <section className="staffAdminCreate"><div className="sectionHeading"><div><p className="eyebrow blue">НОВАЯ ЗАПИСЬ</p><h2>Добавить сотрудника</h2><p>После добавления карточка появится ниже и, если включена публикация, на странице команды.</p></div></div><form action={createStaffMember} encType="multipart/form-data" className="staffAdminForm"><StaffFields /><button className="primaryButton" type="submit">+ Добавить сотрудника</button></form></section>
      <section className="staffAdminExisting"><div className="sectionHeading"><div><p className="eyebrow blue">ТЕКУЩИЙ ШТАБ</p><h2>{members.length} записей</h2><p>Заглушки отмечены жёлтой меткой. Открывай только нужную карточку.</p></div></div>
      {error ? <div className="adminEmpty">Ошибка загрузки: {error.message}</div> : <div className="staffAdminStack">{members.map(member => <details className="staffAdminCard" key={member.id}><summary><span className="staffAdminPhoto">{member.photo_url ? <img src={member.photo_url} alt="" /> : <img src="/brand/fc-edinet-crest.png" alt="" className="isCrest" />}</span><span className="staffAdminIdentity"><small>{categoryLabels[member.category]}</small><strong>{member.first_name} {member.last_name}</strong><span>{member.role_title}</span></span>{member.is_placeholder && <b className="staffPlaceholderBadge">ЗАГЛУШКА</b>}<i>{member.is_active ? "На сайте" : "Скрыт"}</i><em>⌄</em></summary><div className="staffAdminCardBody"><form action={updateStaffMember} encType="multipart/form-data" className="staffAdminForm"><input type="hidden" name="staff_id" value={String(member.id)} /><StaffFields member={member} /><button className="primaryButton" type="submit">Сохранить изменения</button></form>{profile.role === "admin" && <form action={deleteStaffMember} className="staffDeleteForm"><input type="hidden" name="staff_id" value={String(member.id)} /><button type="submit" className="dangerButton">Удалить сотрудника</button></form>}</div></details>)}</div>}
      </section>
    </div></section>
  </main>;
}
