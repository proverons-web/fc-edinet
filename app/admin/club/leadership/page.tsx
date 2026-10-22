import Link from "next/link";
import AdminClubNav from "@/app/components/AdminClubNav";
import ClubLeadershipAdmin from "@/app/components/ClubLeadershipAdmin";
import ClubRichEditor from "@/app/components/ClubRichEditor";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { deleteLeader, updateLeader } from "@/app/admin/club/actions";
import { requireEditor } from "@/lib/editorial";
import type { ClubLeader } from "@/lib/types";
export const dynamic="force-dynamic"; export const metadata={title:"Руководство — Админ"};

export default async function Page(){
 const {supabase,profile}=await requireEditor();
 const {data}=await supabase.from("club_leadership").select("*").order("display_order").order("name");
 const list=(data??[]) as ClubLeader[]; const active=list.filter((x)=>x.is_active).length;
 return <main className="adminPage"><section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">КЛУБ • РУКОВОДСТВО</p><h1>Руководство</h1><p>Сначала добавление нового сотрудника, ниже — текущий список для редактирования.</p></div><div className="adminHeroActions"><Link href="/admin/club" className="adminBack">← К разделам клуба</Link><Link href="/club/leadership" className="rowAction muted">Открыть на сайте ↗</Link></div></div></section>
 <section className="section adminSurface"><div className="container"><AdminClubNav active="leadership"/>
  <div className="clubAdminStats"><span><small>ВСЕГО</small><b>{list.length}</b></span><span><small>НА САЙТЕ</small><b>{active}</b></span><span><small>СКРЫТО</small><b>{list.length-active}</b></span></div>
  <ClubLeadershipAdmin/>
  <section className="clubExistingSection"><div className="sectionHeading"><div><p className="eyebrow blue">ТЕКУЩИЙ СПИСОК</p><h2>Добавленные сотрудники</h2><p>Открой карточку нужного человека, внеси изменения и сохрани.</p></div></div>
   <div className="clubExistingStack">{list.map((leader)=><details className="clubExistingCard" key={leader.id}>
    <summary><span className="clubExistingThumb">{leader.photo_url?<img src={leader.photo_url} alt=""/>:<b>FCE</b>}</span><span className="clubExistingIdentity"><strong>{leader.name}</strong><small>{leader.role}</small></span><span className={`clubExistingStatus ${leader.is_active?"on":"off"}`}>{leader.is_active?"На сайте":"Скрыт"}</span><span className="clubExistingChevron">⌄</span></summary>
    <div className="clubExistingBody"><form action={updateLeader} className="clubLeaderEditForm clubLeaderEditFormPro" encType="multipart/form-data"><input type="hidden" name="leader_id" value={String(leader.id)}/>
     <div className="twoFields"><div className="fieldGroup"><label>Имя</label><input name="name" defaultValue={leader.name} required/></div><div className="fieldGroup"><label>Должность</label><input name="role" defaultValue={leader.role} required/></div></div>
     <ClubRichEditor name="bio_rich_content" label={`Биография — ${leader.name}`} initial={leader.bio_rich_content} fallbackText={leader.bio} compact/>
     <fieldset className="i18nFieldset"><legend>Română / RO</legend><div className="fieldGroup"><label>Funcție</label><input name="role_ro" defaultValue={leader.role_ro??""}/></div><ClubRichEditor name="bio_rich_content_ro" label="Biografie — RO" initial={leader.bio_rich_content_ro} fallbackText={leader.bio_ro} compact/><label className="checkRow compact"><input type="checkbox" name="ro_translation_locked" defaultChecked={leader.ro_translation_locked??false}/><span><strong>RO вручную</strong></span></label></fieldset>
     <div className="clubLeaderMediaRow"><div className="clubLeaderAdminPhoto large">{leader.photo_url?<img src={leader.photo_url} alt=""/>:<span>FCE</span>}</div><div className="clubLeaderMediaFields"><div className="fieldGroup"><label>Заменить фотографию</label><input name="photo_file" type="file" accept="image/jpeg,image/png,image/webp"/></div>{leader.photo_url?<label className="checkRow compact"><input type="checkbox" name="clear_photo"/><span>Удалить текущее фото</span></label>:null}<div className="twoFields"><div className="fieldGroup"><label>Порядок</label><input name="display_order" type="number" min={0} defaultValue={leader.display_order}/></div><label className="checkRow"><input type="checkbox" name="is_active" defaultChecked={leader.is_active}/><span><strong>Показывать на сайте</strong></span></label></div></div></div>
     <button className="primaryButton" type="submit">Сохранить изменения</button>
    </form>{profile.role==="admin"?<form action={deleteLeader} className="clubDangerZone"><input type="hidden" name="leader_id" value={String(leader.id)}/><ConfirmSubmitButton className="clubDeleteButton" confirmMessage={`Удалить ${leader.name}?`}>Удалить сотрудника</ConfirmSubmitButton></form>:null}</div>
   </details>)}</div>
  </section>
 </div></section></main>;
}
