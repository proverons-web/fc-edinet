"use client";

import { useActionState } from "react";
import { addAchievement, type ClubFormState } from "@/app/admin/club/actions";
import ClubRichEditor from "@/app/components/ClubRichEditor";

const initialState: ClubFormState = {};

export default function ClubAchievementAdmin(){
 const [state,action,pending]=useActionState(addAchievement,initialState);
 return <form action={action} className="clubAddCard clubAddCardWide">
  <div className="clubAddCardHead"><div><p className="eyebrow blue">ДОСТИЖЕНИЯ</p><h2>Добавить достижение</h2><p>Новое достижение добавляется сверху. Существующие записи редактируются ниже.</p></div></div>
  <div className="twoFields"><div className="fieldGroup"><label htmlFor="achievement_year">Год / сезон</label><input id="achievement_year" name="year" placeholder="2026/27"/></div><div className="fieldGroup"><label htmlFor="achievement_title">Название</label><input id="achievement_title" name="title" placeholder="Победа в..." required/></div></div>
  <ClubRichEditor name="description_rich_content" label="Описание достижения — RU" initial={null} compact/>
  <fieldset className="i18nFieldset"><legend>Română / RO</legend><div className="fieldGroup"><label htmlFor="achievement_title_ro">Titlu</label><input id="achievement_title_ro" name="title_ro"/></div><ClubRichEditor name="description_rich_content_ro" label="Descriere — RO" initial={null} compact/><label className="checkRow compact autoTranslationLock"><input type="checkbox" name="ro_translation_locked"/><span><strong>Зафиксировать ручной RO</strong><small>Иначе достижение переводится автоматически.</small></span></label></fieldset>
  <div className="twoFields"><div className="fieldGroup"><label htmlFor="achievement_order">Порядок</label><input id="achievement_order" name="display_order" type="number" min={0} defaultValue={100}/></div><label className="checkRow"><input type="checkbox" name="is_active" defaultChecked/><span><strong>Показывать на сайте</strong></span></label></div>
  {state.error&&<div className="formError">{state.error}</div>}{state.success&&<div className="formSuccess">{state.success}</div>}
  <button className="playerSaveButton" type="submit" disabled={pending}>{pending?"Добавляем...":"+ Добавить достижение"}</button>
 </form>;
}
