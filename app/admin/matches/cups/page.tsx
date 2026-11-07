import Link from "next/link";
import {requireEditor} from "@/lib/editorial";
import {saveCupBracketTie,deleteCupBracketTie,autoLinkCupBracketRound} from "./actions";
import {suggestedBracketLinks,type BracketTie} from "@/lib/cup-bracket";
import "./style.css";
export const dynamic="force-dynamic";
export const metadata={title:"Кубковая сетка — Админ"};
type Comp={id:string|number,name:string,slug:string,season:string|null,is_active:boolean};
type MatchOption={id:number|string,home_team_id:number|string,away_team_id:number|string,kickoff:string,round:string|null,home:{name:string}|null,away:{name:string}|null};
type Team={id:number|string,name:string};
function Editor({competition,existing,matches,teams,ties}:{competition:Comp,existing?:BracketTie,matches:MatchOption[],teams:Team[],ties:BracketTie[]}){
 const targets=ties.filter(t=>t.stage_order>(existing?.stage_order||0)&&String(t.id)!==String(existing?.id));
 const chosenMatch=existing?.match_id==null?"":String(existing.match_id);
 return <form action={saveCupBracketTie} className="cupAdminForm">
   <input type="hidden" name="competition_id" value={String(competition.id)}/>
   {existing?<input type="hidden" name="tie_id" value={String(existing.id)}/>:null}
   <div className="cupAdminGrid">
     <label>Номер стадии (1 — ранняя)<input name="stage_order" type="number" min={1} max={32} required defaultValue={existing?.stage_order||1}/></label>
     <label>Номер пары в стадии<input name="sort_order" type="number" min={1} max={128} required defaultValue={existing?.sort_order||1}/></label>
     <label>Стадия (RU)<input name="stage_name_ru" required maxLength={100} defaultValue={existing?.stage_name_ru||""} placeholder="1/8 финала"/></label>
     <label>Стадия (RO)<input name="stage_name_ro" maxLength={100} defaultValue={existing?.stage_name_ro||""} placeholder="Optimi de finală"/></label>
     <label>Формат пары<select name="leg_mode" defaultValue={existing?.leg_mode||"single"}>
       <option value="single">Один матч</option><option value="two_leg">Два матча (дома/в гостях)</option>
     </select></label>
     <div className="cupAdminHint">Для двух матчей выбираются первая и ответная встреча. Команды во второй должны поменяться местами.</div>
     <label className="cupAdminFull">Первый матч
       <select name="match_id" defaultValue={chosenMatch}><option value="">Матч ещё не назначен</option>
         {matches.map(m=><option key={m.id} value={String(m.id)}>{m.home?.name||"—"} — {m.away?.name||"—"} · {new Date(m.kickoff).toLocaleDateString("ru-RU")} · #{m.id}</option>)}
       </select></label>
     <label className="cupAdminFull">Ответный матч (только при формате «Два матча»)
       <select name="return_match_id" defaultValue={existing?.return_match_id==null?"":String(existing.return_match_id)}>
       <option value="">Ответный матч ещё не назначен</option>
       {matches.map(m=><option key={m.id} value={String(m.id)}>{m.home?.name||"—"} — {m.away?.name||"—"} · {new Date(m.kickoff).toLocaleDateString("ru-RU")} · #{m.id}</option>)}
       </select></label>
     <label>Серия пенальти: первая команда<input name="shootout_home" type="number" min={0} max={99} defaultValue={existing?.shootout_home??""} placeholder="Только при равном общем счёте"/></label>
     <label>Серия пенальти: вторая команда<input name="shootout_away" type="number" min={0} max={99} defaultValue={existing?.shootout_away??""} placeholder="Только при равном общем счёте"/></label>
     <label>Хозяева (если матч ещё не назначен)<select name="home_team_id" defaultValue={existing?.home_team_id==null?"":String(existing.home_team_id)}><option value="">Определится</option>{teams.map(t=><option key={t.id} value={String(t.id)}>{t.name}</option>)}</select></label>
     <label>Гости (если матч ещё не назначен)<select name="away_team_id" defaultValue={existing?.away_team_id==null?"":String(existing.away_team_id)}><option value="">Определится</option>{teams.map(t=><option key={t.id} value={String(t.id)}>{t.name}</option>)}</select></label>
     <label>Победитель идёт в пару<select name="next_tie_id" defaultValue={existing?.next_tie_id==null?"":String(existing.next_tie_id)}><option value="">Пока без связи / финал</option>{targets.map(t=><option key={t.id} value={String(t.id)}>{t.stage_name_ru} · пара {t.sort_order} (#{t.id})</option>)}</select></label>
     <label>Место в следующей паре<select name="next_slot" defaultValue={existing?.next_slot||""}><option value="">Не выбрано</option><option value="home">Хозяева</option><option value="away">Гости</option></select></label>
   </div>
   <button type="submit" className="primaryButton">{existing?"Сохранить пару":"Добавить пару"}</button>
 </form>;
}
export default async function AdminCupsPage({searchParams}:{searchParams:Promise<{competition?:string,error?:string,saved?:string}>}){
 const {supabase}=await requireEditor();const p=await searchParams;
 const {data:compRows,error:compError}=await supabase.from("competitions").select("id,name,slug,season,is_active").eq("competition_type","cup").order("name");
 const comps=(compRows||[]) as Comp[];const selected=comps.find(c=>String(c.id)===p.competition)||comps[0];
 const [{data:rows,error:tieError},{data:matchRows,error:matchError},{data:teamRows,error:teamError}]=selected?await Promise.all([
  supabase.from("cup_bracket_ties").select("*").eq("competition_id",selected.id).order("stage_order").order("sort_order").limit(512),
  supabase.from("matches").select("id,home_team_id,away_team_id,kickoff,round,home:teams!matches_home_team_id_fkey(name),away:teams!matches_away_team_id_fkey(name)").eq("competition_id",selected.id).order("kickoff",{ascending:false}).limit(500),
  supabase.from("teams").select("id,name").order("name").limit(500),
 ]) : [{data:[],error:null},{data:[],error:null},{data:[],error:null}];
 const ties=(rows||[]) as BracketTie[];const matches=(matchRows||[]) as unknown as MatchOption[];const teams=(teamRows||[]) as Team[];
 return <main className="adminPage"><section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">FC EDINEȚ · КУБОК</p><h1>Кубковая сетка</h1><p>Стадии, пары и выход победителей в следующий раунд</p></div><Link href="/admin/matches" className="adminBack">← Матчи</Link></div></section>
 <section className="section adminSurface"><div className="container cupAdminPage">
  {compError?<p role="alert" className="formError">Ошибка загрузки соревнований.</p>:null}
  {p.error?<p role="alert" className="formError">{p.error}</p>:null}{p.saved?<p role="status" className="saveNotice">Изменения сохранены.</p>:null}
  {comps.length>1?<nav className="cupAdminTabs">{comps.map(c=><Link key={c.id} className={selected&&String(c.id)===String(selected.id)?"active":""} href={`/admin/matches/cups?competition=${c.id}`}>{c.name} · {c.season}</Link>)}</nav>:null}
  {!selected?<div className="adminEmpty">Сначала создай соревнование типа «Кубок» в <Link href="/admin/matches/competitions">редакторе соревнований</Link>.</div>:
  <>
  <div className="cupAdminIntroduction"><div><h2>{selected.name}</h2><p>Для каждой стадии создай пары. Финальную пару удобнее создать первой, чтобы в неё можно было направлять победителей предыдущих раундов.</p></div><Link href={`/matches/cups/${encodeURIComponent(selected.slug)}`} target="_blank" rel="noopener noreferrer">Публичная сетка ↗</Link></div>
  {(tieError||matchError||teamError)?<p role="alert" className="formError">Не удалось загрузить данные: {tieError?.message||matchError?.message||teamError?.message}</p>:null}
  {ties.length>0?<section className="cupAdminPanel cupAdminAutoLinks"><h3>Автоматические связи раундов</h3>
    <p>Распределяем победителей каждых двух пар в следующую созданную стадию. Никакие матчи и участники протоколов не изменяются.</p>
    {Array.from(new Set(ties.map(t=>t.stage_order))).sort((a,b)=>a-b).map(stage=>{
      const preview=suggestedBracketLinks(ties,stage);
      return <form key={stage} action={autoLinkCupBracketRound} className="cupAdminAutoLinkRow">
        <input type="hidden" name="competition_id" value={String(selected.id)}/>
        <input type="hidden" name="stage_order" value={stage}/>
        <span>Раунд {stage}: {preview.error||`${preview.links.length} связей → раунд ${preview.nextStage}`}</span>
        <button type="submit" className="secondaryButton" disabled={Boolean(preview.error)}>{preview.error?"Недоступно":"Автосвязать пары"}</button>
      </form>;
    })}
  </section>:null}
  <section className="cupAdminPanel"><h3>Добавить пару</h3><Editor competition={selected} matches={matches} teams={teams} ties={ties}/></section>
  <section className="cupAdminPanel"><h3>Созданные пары · {ties.length}</h3>
   {!ties.length?<p>Пока нет пар. Добавь первую — реальные матчи не будут изменены.</p>:<div className="cupAdminTieList">{ties.map(t=><details key={t.id}><summary><strong>{t.stage_name_ru} · пара {t.sort_order}</strong><span>{t.match_id?`Матч #${t.match_id}`:"Матч не назначен"}{t.return_match_id?` + ответный #${t.return_match_id}`:""}{t.next_tie_id?` · → #${t.next_tie_id} (${t.next_slot})`:""}</span></summary>
    <Editor competition={selected} existing={t} matches={matches} teams={teams} ties={ties}/>
    <form action={deleteCupBracketTie} className="cupAdminDelete"><input type="hidden" name="competition_id" value={String(selected.id)}/><input type="hidden" name="tie_id" value={String(t.id)}/><button type="submit" className="secondaryButton">Удалить пару из сетки (матч сохранится)</button></form>
   </details>)}</div>}
  </section>
  </>}
 </div></section></main>;
}
