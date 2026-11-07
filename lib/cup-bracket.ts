import { matchWinner } from "./cup-results.ts";

/** Knockout projections never mutate the team's official fixture or match report. */
export type BracketTeam = { id: number | string; name: string; short_name?: string | null; logo_url?: string | null };
export type BracketMatch = {
  id: number | string; competition_id: number | string; status: string; kickoff: string;
  home_score: number | null; away_score: number | null;
  extra_time_played?: boolean | null; home_penalties?: number | null; away_penalties?: number | null;
  home: BracketTeam | null; away: BracketTeam | null;
};
export type BracketTie = {
  id: number | string; competition_id: number | string;
  stage_order: number; stage_name_ru: string; stage_name_ro?: string | null; sort_order: number;
  match_id?: number | string | null; return_match_id?: number | string | null;
  leg_mode?: "single" | "two_leg" | null;
  shootout_home?: number | null; shootout_away?: number | null;
  home_team_id?: number | string | null; away_team_id?: number | string | null;
  next_tie_id?: number | string | null; next_slot?: "home" | "away" | null;
  match?: BracketMatch | null; return_match?: BracketMatch | null;
  home_seed?: BracketTeam | null; away_seed?: BracketTeam | null;
};
export type TieDecision = {
  home_team: BracketTeam | null; away_team: BracketTeam | null;
  aggregate_home: number | null; aggregate_away: number | null;
  winner: BracketTeam | null; decided: boolean; leg_mismatch: boolean;
  shootout: boolean;
};
export type ResolvedBracketTie = BracketTie & TieDecision & {
  expected_home: BracketTeam | null; expected_away: BracketTeam | null; mismatch: boolean;
};
const same = (a: number | string | null | undefined, b: number | string | null | undefined) =>
  a != null && b != null && String(a) === String(b);
const validScore = (v: number | null | undefined) => typeof v === "number" && Number.isInteger(v) && v >= 0;
const finished = (m: BracketMatch | null | undefined) => m?.status === "finished" && validScore(m.home_score) && validScore(m.away_score);

/** Return-leg home/away are reversed relative to first-leg home/away. No away-goals rule. */
export function evaluateCupTie(tie: BracketTie): TieDecision {
  const home = tie.match?.home || tie.home_seed || null;
  const away = tie.match?.away || tie.away_seed || null;
  const double = tie.leg_mode === "two_leg";
  const back = tie.return_match;
  const legMismatch = Boolean(double && back && (
    !home || !away || !back.home || !back.away ||
    !same(back.home.id, away.id) || !same(back.away.id, home.id)
  ));
  if (!home || !away || !tie.match || !finished(tie.match) || (double && (!back || !finished(back) || legMismatch))) {
    return {home_team:home,away_team:away,aggregate_home:null,aggregate_away:null,winner:null,decided:false,leg_mismatch:legMismatch,shootout:false};
  }
  const h = tie.match.home_score! + (double ? back!.away_score! : 0);
  const a = tie.match.away_score! + (double ? back!.home_score! : 0);
  let winner:BracketTeam|null = null;
  let shootout=false;
  if (h>a) winner=home;
  else if (a>h) winner=away;
  else if (double) {
    const p= tie.shootout_home, q=tie.shootout_away;
    if(validScore(p)&&validScore(q)&&p!==q){winner=p!>q!?home:away;shootout=true;}
  } else {
    const side=matchWinner(tie.match);
    winner=side==="home"?home:side==="away"?away:null;
    shootout=winner!=null && tie.match.home_score===tie.match.away_score;
  }
  return {home_team:home,away_team:away,aggregate_home:h,aggregate_away:a,winner,decided:winner!=null,leg_mismatch:false,shootout};
}
export function bracketWinner(tie:BracketTie):BracketTeam|null {return evaluateCupTie(tie).winner;}
export function validateTwoLegTie(tie:BracketTie):string|null {
  const double=tie.leg_mode==="two_leg";
  if(!double && (tie.return_match_id!=null || tie.return_match || tie.shootout_home!=null || tie.shootout_away!=null))
    return "Для ответного матча и общей серии пенальти выбери формат «Два матча».";
  if(!double)return null;
  if(!tie.match_id && !tie.match)return "Сначала привяжи первый матч противостояния.";
  if(tie.return_match_id!=null && same(tie.match_id,tie.return_match_id))return "Первый и ответный матч не могут совпадать.";
  if((tie.shootout_home==null)!==(tie.shootout_away==null))return "Укажи обе стороны серии пенальти.";
  if(tie.shootout_home!=null) {
    if(!validScore(tie.shootout_home)||!validScore(tie.shootout_away)||tie.shootout_home===tie.shootout_away || tie.shootout_home!>99 || tie.shootout_away!>99)
      return "Серия пенальти должна иметь разные неотрицательные результаты (до 99).";
    if(!tie.return_match || !tie.match || !finished(tie.match) || !finished(tie.return_match))
      return "Серию пенальти можно записать после завершения обеих встреч.";
    const decision=evaluateCupTie(tie);
    if(decision.leg_mismatch)return "Команды во втором матче должны поменяться полями.";
    if(decision.aggregate_home!==decision.aggregate_away)return "Серия пенальти возможна только при равенстве общего счёта.";
  }
  if(tie.return_match && evaluateCupTie(tie).leg_mismatch)return "Команды ответного матча должны быть теми же, но в обратном порядке.";
  return null;
}
export function validateBracketLink(
  from: Pick<BracketTie,"id"|"competition_id"|"stage_order">,
  to: Pick<BracketTie,"id"|"competition_id"|"stage_order">|null,slot:string|null,
):string|null {
  if(!to&&!slot)return null;
  if(!to||(slot!=="home"&&slot!=="away"))return "Укажи одновременно следующую пару и сторону.";
  if(same(from.id,to.id))return "Нельзя направить пару в саму себя.";
  if(!same(from.competition_id,to.competition_id))return "Следующая пара должна относиться к тому же Кубку.";
  if(to.stage_order<=from.stage_order)return "Следующая пара должна быть в более поздней стадии.";
  return null;
}
/** Suggest only fully specified 2-to-1 stage transitions. Existing/manual connections must match. */
export function suggestedBracketLinks(input:BracketTie[],stageOrder:number) {
  const earlier=input.filter(t=>t.stage_order===stageOrder).sort((a,b)=>a.sort_order-b.sort_order||Number(a.id)-Number(b.id));
  const nextStage=Math.min(...input.filter(t=>t.stage_order>stageOrder).map(t=>t.stage_order));
  if(!Number.isFinite(nextStage))return {stageOrder,nextStage:null,links:[],error:"Нет следующей стадии."};
  const targets=input.filter(t=>t.stage_order===nextStage).sort((a,b)=>a.sort_order-b.sort_order||Number(a.id)-Number(b.id));
  if(!earlier.length||earlier.length!==targets.length*2)return {stageOrder,nextStage,links:[],error:"Для автоматической связи нужно ровно две пары предыдущей стадии на каждую пару следующей."};
  const links=earlier.map((from,i)=>({from_id:from.id,to_id:targets[Math.floor(i/2)].id,slot:(i%2===0?"home":"away") as "home"|"away"}));
  if(links.some(link=>{const prev=earlier.find(t=>same(t.id,link.from_id));return prev?.next_tie_id!=null&&(!same(prev.next_tie_id,link.to_id)||prev.next_slot!==link.slot);}))
    return {stageOrder,nextStage,links:[],error:"Найдены ручные связи, которые противоречат автоматическому порядку."};
  return {stageOrder,nextStage,links,error:null};
}
/** Resolve winners dynamically without overwriting a pre-created fixture. */
export function resolveCupBracket(input:BracketTie[]):ResolvedBracketTie[] {
  const sorted=[...input].sort((a,b)=>a.stage_order-b.stage_order||a.sort_order-b.sort_order||Number(a.id)-Number(b.id));
  const expected=new Map<string,{home:BracketTeam|null,away:BracketTeam|null}>();
  const result:ResolvedBracketTie[]=[];
  const usedSlots=new Set<string>();
  const byId=new Map(sorted.map(t=>[String(t.id),t]));
  for(const tie of sorted){
    const projected=expected.get(String(tie.id))||{home:null,away:null};
    const evaled=evaluateCupTie(tie);
    const home=evaled.home_team||projected.home;
    const away=evaled.away_team||projected.away;
    const mismatch=Boolean(evaled.leg_mismatch||
      (projected.home&&home&&!same(projected.home.id,home.id))||
      (projected.away&&away&&!same(projected.away.id,away.id)));
    const winner=mismatch?null:evaled.winner;
    result.push({...tie,...evaled,home_team:home,away_team:away,winner,expected_home:projected.home,expected_away:projected.away,mismatch});
    if(!winner||tie.next_tie_id==null||!tie.next_slot)continue;
    const target=byId.get(String(tie.next_tie_id));
    if(!target||validateBracketLink(tie,target,tie.next_slot))continue;
    const k=`${tie.next_tie_id}:${tie.next_slot}`;
    if(usedSlots.has(k))continue;
    usedSlots.add(k);
    const prev=expected.get(String(tie.next_tie_id))||{home:null,away:null};
    expected.set(String(tie.next_tie_id),{...prev,[tie.next_slot]:winner});
  }
  return result;
}
export function bracketStages(input:ResolvedBracketTie[],lang:"ru"|"ro"){
  const stages:{order:number,name:string,ties:ResolvedBracketTie[]}[]=[];
  for(const tie of input){
    let stage=stages.find(s=>s.order===tie.stage_order);
    if(!stage){stage={order:tie.stage_order,name:lang==="ro"?(tie.stage_name_ro||tie.stage_name_ru):tie.stage_name_ru,ties:[]};stages.push(stage);}
    stage.ties.push(tie);
  }
  return stages;
}
