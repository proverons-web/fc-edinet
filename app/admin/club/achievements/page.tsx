import Link from "next/link";
import AdminClubNav from "@/app/components/AdminClubNav";
import ClubAchievementAdmin from "@/app/components/ClubAchievementAdmin";
import ClubRichEditor from "@/app/components/ClubRichEditor";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import {deleteAchievement,updateAchievement} from "@/app/admin/club/actions";
import {requireEditor} from "@/lib/editorial";
import type {ClubAchievement} from "@/lib/types";
export const dynamic="force-dynamic"; export const metadata={title:"Достижения — Админ"};

export default async function Page(){
 const {supabase,profile}=await requireEditor(); const {data}=await supabase.from("club_achievements").select("*").order("display_order").order("year",{ascending:false}); const list=(data??[]) as ClubAchievement[]; const active=list.filter(x=>x.is_active).length;
 return <main className="adminPage"><section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">КЛУБ • ДОСТИЖЕНИЯ</p><h1>Достижения</h1><p>Добавляй новые достижения сверху, существующие редактируй ниже.</p></div><div className="adminHeroActions"><Link href="/admin/club" className="adminBack">← К разделам клуба</Link><Link href="/club/achievements" className="rowAction muted">Открыть на сайте ↗</Link></div></div></section>
 <section className="section adminSurface"><div className="container"><AdminClubNav active="achievements"/>
  <div className="clubAdminStats"><span><small>ВСЕГО</small><b>{list.length}</b></span><span><small>НА САЙТЕ</small><b>{active}</b></span><span><small>СКРЫТО</small><b>{list.length-active}</b></span></div>
  <ClubAchievementAdmin/>
  <section className="clubExistingSection"><div className="sectionHeading"><div><p className="eyebrow blue">АРХИВ ДОСТИЖЕНИЙ</p><h2>Добавленные записи</h2><p>Каждая запись открывается отдельно — длинные формы больше не занимают весь экран.</p></div></div>
   <div className="clubExistingStack">{list.map((item)=><details className="clubExistingCard achievementCard" key={item.id}>
    <summary><span className="clubExistingYear">{item.year||"—"}</span><span className="clubExistingIdentity"><strong>{item.title}</strong><small>{item.description?.slice(0,100)||"Без описания"}</small></span><span className={`clubExistingStatus ${item.is_active?"on":"off"}`}>{item.is_active?"На сайте":"Скрыто"}</span><span className="clubExistingChevron">⌄</span></summary>
    <div className="clubExistingBody"><form action={updateAchievement} className="clubAchievementEditFormPro"><input type="hidden" name="achievement_id" value={String(item.id)}/>
     <div className="twoFields"><div className="fieldGroup"><label>Год / сезон</label><input name="year" defaultValue={item.year??""}/></div><div className="fieldGroup"><label>Название</label><input name="title" defaultValue={item.title} required/></div></div>
     <ClubRichEditor name="description_rich_content" label={`Описание — ${item.title}`} initial={item.description_rich_content} fallbackText={item.description} compact/>
     <fieldset className="i18nFieldset"><legend>Română / RO</legend><div className="fieldGroup"><label>Titlu</label><input name="title_ro" defaultValue={item.title_ro??""}/></div><ClubRichEditor name="description_rich_content_ro" label="Descriere — RO" initial={item.description_rich_content_ro} fallbackText={item.description_ro} compact/><label className="checkRow compact"><input type="checkbox" name="ro_translation_locked" defaultChecked={item.ro_translation_locked??false}/><span><strong>RO вручную</strong></span></label></fieldset>
     <div className="twoFields"><div className="fieldGroup"><label>Порядок</label><input name="display_order" type="number" min={0} defaultValue={item.display_order}/></div><label className="checkRow"><input type="checkbox" name="is_active" defaultChecked={item.is_active}/><span><strong>Показывать на сайте</strong></span></label></div>
     <button className="primaryButton" type="submit">Сохранить изменения</button>
    </form>{profile.role==="admin"?<form action={deleteAchievement} className="clubDangerZone"><input type="hidden" name="achievement_id" value={String(item.id)}/><ConfirmSubmitButton className="clubDeleteButton" confirmMessage="Удалить достижение?">Удалить достижение</ConfirmSubmitButton></form>:null}</div>
   </details>)}</div>
  </section>
 </div></section></main>;
}
