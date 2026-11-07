import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import { saveCompetition } from "./actions";
import { competitionTypes, competitionTypeLabel } from "@/lib/competition";
import type { Competition, Season } from "@/lib/types";
import "./style.css";
export const dynamic="force-dynamic";
export const metadata={title:"Соревнования — Админ"};
function Form({seasons,competition}:{seasons:Pick<Season,"id"|"name"|"is_current">[],competition?:Competition}) {
  return <form action={saveCompetition} className="competitionEditorForm">
    {competition && <input type="hidden" name="competition_id" value={String(competition.id)}/>}
    <div className="competitionFields">
      <label>Название (RU)<input name="name" required maxLength={120} defaultValue={competition?.name || ""} placeholder="Cupa Moldovei"/></label>
      <label>Название (RO)<input name="name_ro" maxLength={120} defaultValue={competition?.name_ro || ""} placeholder="Cupa Moldovei"/></label>
      <label>Тип<select name="competition_type" defaultValue={competition?.competition_type || "league"}>{competitionTypes.map(t=><option key={t} value={t}>{competitionTypeLabel(t,"ru")}</option>)}</select></label>
      <label>Сезон<select name="season_id" required defaultValue={String(competition?.season_id || seasons.find(s=>s.is_current)?.id || seasons[0]?.id || "")}>{seasons.map(s=><option key={s.id} value={String(s.id)}>{s.name}{s.is_current?" · текущий":""}</option>)}</select></label>
      <label>Уникальный slug<input name="slug" maxLength={90} defaultValue={competition?.slug || ""} placeholder="cupa-moldovei-2026-27"/></label>
      <label>Файл герба (необязательно)<input name="logo_file" type="file" accept="image/jpeg,image/png,image/webp"/></label>
      <label className="competitionWide">Или адрес герба в Supabase Storage<input name="logo_url" type="url" defaultValue={competition?.logo_url || ""}/></label>
    </div>
    <div className="competitionActions"><label><input type="checkbox" name="is_active" defaultChecked={competition?.is_active !== false}/> Активен</label><button className="primaryButton" type="submit">{competition?"Сохранить":"Добавить турнир"}</button></div>
  </form>;
}
export default async function CompetitionsPage({searchParams}:{searchParams:Promise<{error?:string,saved?:string}>}) {
  const {supabase}=await requireEditor();const params=await searchParams;
  const [compResult,seasonsResult] = await Promise.all([
    supabase.from("competitions").select("*").order("is_active",{ascending:false}).order("name"),
    supabase.from("seasons").select("id,name,is_current").order("is_current",{ascending:false}).order("name"),
  ]);
  const competitions=(compResult.data||[]) as Competition[];
  const seasons=(seasonsResult.data||[]) as Pick<Season,"id"|"name"|"is_current">[];
  return <main className="adminPage"><section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">FC EDINEȚ · МАТЧИ</p><h1>Соревнования</h1><p>Чемпионат, Кубок, товарищеские и другие турниры</p></div><Link className="adminBack" href="/admin/matches">← Матчи</Link></div></section>
  <section className="section adminSurface"><div className="container competitionAdmin">
    {params.error&&<p role="alert" className="formError">{params.error}</p>}{params.saved&&<p role="status" className="saveNotice">Соревнование сохранено.</p>}
    {(compResult.error || seasonsResult.error)&&<p className="formError">Ошибка загрузки соревнований или сезонов: {compResult.error?.message || seasonsResult.error?.message}</p>}
    {seasons.length? <section className="competitionPanel"><h2>Новое соревнование</h2><Form seasons={seasons}/></section> : <div className="adminEmpty">Сначала добавь сезон через раздел «Статистика».</div>}
    <section><h2>Существующие соревнования</h2><p>Если у турнира есть матчи или таблица, его тип и сезон менять нельзя.</p><div className="competitionList">{competitions.map(c=><details className="competitionPanel" key={c.id}><summary><strong>{c.name}</strong><span>{competitionTypeLabel(c.competition_type,"ru")} · {c.season || "Без сезона"}{!c.is_active?" · неактивен":""}</span></summary><Form seasons={seasons} competition={c}/>{c.competition_type==="cup"?<p><Link href={`/admin/matches/cups?competition=${c.id}`}>Управление кубковой сеткой ↗</Link></p>:null}</details>)}</div></section>
  </div></section></main>;
}
