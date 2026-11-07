import { matchWinner } from "./cup-results.ts";

/** The bracket is presentation-only: it MUST NEVER reassign teams or change a match. */
export type BracketTeam = { id: number | string; name: string; short_name?: string | null; logo_url?: string | null };
export type BracketMatch = {
  id: number | string;
  competition_id: number | string;
  status: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  extra_time_played?: boolean | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
  home: BracketTeam | null;
  away: BracketTeam | null;
};
export type BracketTie = {
  id: number | string;
  competition_id: number | string;
  stage_order: number;
  stage_name_ru: string;
  stage_name_ro?: string | null;
  sort_order: number;
  match_id?: number | string | null;
  home_team_id?: number | string | null;
  away_team_id?: number | string | null;
  next_tie_id?: number | string | null;
  next_slot?: "home" | "away" | null;
  match?: BracketMatch | null;
  home_seed?: BracketTeam | null;
  away_seed?: BracketTeam | null;
};
export type ResolvedBracketTie = BracketTie & {
  home_team: BracketTeam | null;
  away_team: BracketTeam | null;
  winner: BracketTeam | null;
  expected_home: BracketTeam | null;
  expected_away: BracketTeam | null;
  mismatch: boolean;
};

const same = (a: number | string | null | undefined, b: number | string | null | undefined) => a != null && b != null && String(a) === String(b);
export function bracketWinner(tie: BracketTie): BracketTeam | null {
  if (!tie.match) return null;
  const decision = matchWinner(tie.match);
  if (decision === "home") return tie.match.home;
  if (decision === "away") return tie.match.away;
  return null; // Draw without a shootout is unresolved.
}
export function validateBracketLink(
  from: Pick<BracketTie, "id" | "competition_id" | "stage_order">,
  to: Pick<BracketTie, "id" | "competition_id" | "stage_order"> | null,
  slot: string | null,
): string | null {
  if (!to && !slot) return null;
  if (!to || (slot !== "home" && slot !== "away")) return "Укажи одновременно следующую пару и сторону.";
  if (same(from.id,to.id)) return "Нельзя направить пару в саму себя.";
  if (!same(from.competition_id,to.competition_id)) return "Следующая пара должна относиться к тому же Кубку.";
  if (to.stage_order <= from.stage_order) return "Следующая пара должна быть в более поздней стадии.";
  return null;
}
/** Resolve predecessor winners dynamically; official linked match teams always win over the projection. */
export function resolveCupBracket(input: BracketTie[]): ResolvedBracketTie[] {
  const sorted = [...input].sort((a,b) => a.stage_order-b.stage_order || a.sort_order-b.sort_order || Number(a.id)-Number(b.id));
  const expected = new Map<string,{home: BracketTeam | null,away: BracketTeam | null}>();
  const result: ResolvedBracketTie[] = [];
  const usedSlots = new Set<string>();
  for (const tie of sorted) {
    const predicted = expected.get(String(tie.id)) || {home:null,away:null};
    // If a fixture exists, it is authoritative; never overwrite its participants.
    const home = tie.match?.home || tie.home_seed || predicted.home;
    const away = tie.match?.away || tie.away_seed || predicted.away;
    const mismatch = Boolean((predicted.home && home && !same(predicted.home.id,home.id)) ||
      (predicted.away && away && !same(predicted.away.id,away.id)));
    const winner=bracketWinner(tie);
    result.push({...tie,home_team:home,away_team:away,winner,expected_home:predicted.home,expected_away:predicted.away,mismatch});
    if (!winner || tie.next_tie_id == null || !tie.next_slot) continue;
    // Defensive in-memory validation complements SQL. Ignore corrupt/unsorted progression.
    const target=sorted.find(x=>same(x.id,tie.next_tie_id));
    if (!target || validateBracketLink(tie,target,tie.next_slot)) continue;
    const k=`${tie.next_tie_id}:${tie.next_slot}`;
    if (usedSlots.has(k)) continue;
    usedSlots.add(k);
    const prev=expected.get(String(tie.next_tie_id)) || {home:null,away:null};
    expected.set(String(tie.next_tie_id),{...prev,[tie.next_slot]:winner});
  }
  return result;
}
export function bracketStages(input: ResolvedBracketTie[],lang: "ru"|"ro") {
  const stages: {order:number,name:string,ties:ResolvedBracketTie[]}[]=[];
  for (const tie of input) {
    let stage=stages.find(s=>s.order===tie.stage_order);
    if (!stage) {stage={order:tie.stage_order,name:lang==="ro"?(tie.stage_name_ro||tie.stage_name_ru):tie.stage_name_ru,ties:[]};stages.push(stage);}
    stage.ties.push(tie);
  }
  return stages;
}
