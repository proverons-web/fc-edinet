"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import { validateBracketLink } from "@/lib/cup-bracket";

const field = (fd:FormData,k:string)=>String(fd.get(k)||"").trim();
const cleanId=(s:string)=>/^\d+$/.test(s)&&Number(s)>0?Number(s):null;
function jump(competitionId:string,error?:string):never{
 const q=new URLSearchParams();if(competitionId)q.set("competition",competitionId);
 if(error)q.set("error",error);else q.set("saved","1");
 redirect(`/admin/matches/cups?${q.toString()}`);
}
export async function saveCupBracketTie(fd:FormData){
 const {supabase}=await requireEditor();
 const competitionId=field(fd,"competition_id"),rawId=field(fd,"tie_id");
 const compId=cleanId(competitionId),id=rawId?cleanId(rawId):null;
 if(!compId || (rawId&&!id))jump(competitionId,"Некорректные идентификаторы.");
 const {data:competition,error:compError}=await supabase.from("competitions").select("id,competition_type").eq("id",compId).maybeSingle();
 if(compError || competition?.competition_type!=="cup")jump(competitionId,"Управление сеткой доступно только для Кубка.");
 const stageOrder=Number(field(fd,"stage_order")),sortOrder=Number(field(fd,"sort_order"));
 const stageNameRu=field(fd,"stage_name_ru"),stageNameRo=field(fd,"stage_name_ro")||null;
 const matchId=field(fd,"match_id")?cleanId(field(fd,"match_id")):null;
 const homeId=field(fd,"home_team_id")?cleanId(field(fd,"home_team_id")):null;
 const awayId=field(fd,"away_team_id")?cleanId(field(fd,"away_team_id")):null;
 const nextId=field(fd,"next_tie_id")?cleanId(field(fd,"next_tie_id")):null;
 const nextSlot=field(fd,"next_slot")||null;
 if(!Number.isInteger(stageOrder)||stageOrder<1||stageOrder>32||!Number.isInteger(sortOrder)||sortOrder<1||sortOrder>128)
  jump(competitionId,"Укажи порядок стадии (1–32) и номер пары (1–128).");
 if(stageNameRu.length<2||stageNameRu.length>100||stageNameRo && (stageNameRo.length<2||stageNameRo.length>100))
  jump(competitionId,"Название стадии: 2–100 символов.");
 if((field(fd,"match_id")&&!matchId)||(field(fd,"home_team_id")&&!homeId)||(field(fd,"away_team_id")&&!awayId)||(field(fd,"next_tie_id")&&!nextId))
  jump(competitionId,"Один из идентификаторов указан неверно.");
 if(homeId&&awayId&&homeId===awayId)jump(competitionId,"В паре должны играть разные команды.");
 if(matchId){
  const {data:match,error}=await supabase.from("matches").select("id,competition_id,home_team_id,away_team_id").eq("id",matchId).maybeSingle();
  if(error||!match||String(match.competition_id)!==competitionId)jump(competitionId,"Матч не относится к выбранному Кубку.");
  if(homeId && String(homeId)!==String(match.home_team_id) || awayId&& String(awayId)!==String(match.away_team_id))
   jump(competitionId,"Если указан матч, команды пары должны соответствовать протоколу.");
 }
 if(homeId||awayId){
  const teamIds=[homeId,awayId].filter((v):v is number=>v!=null);
  const {data,error}=await supabase.from("teams").select("id").in("id",teamIds);
  if(error||data?.length!==teamIds.length)jump(competitionId,"Выбрана несуществующая команда.");
 }
 let nextTie:null|{id:number|string,competition_id:number|string,stage_order:number}=null;
 if(nextId){const {data,error}=await supabase.from("cup_bracket_ties").select("id,competition_id,stage_order").eq("id",nextId).maybeSingle();if(error||!data)jump(competitionId,"Следующая пара не найдена.");nextTie=data;}
 const problem=validateBracketLink({id:id||0,competition_id:compId!,stage_order:stageOrder},nextTie,nextSlot);
 if(problem)jump(competitionId,problem);
 const payload={competition_id:compId,stage_order:stageOrder,stage_name_ru:stageNameRu,stage_name_ro:stageNameRo,
  sort_order:sortOrder,match_id:matchId,home_team_id:homeId,away_team_id:awayId,next_tie_id:nextId,next_slot:nextSlot};
 const {error}=id?await supabase.from("cup_bracket_ties").update(payload).eq("id",id).eq("competition_id",compId):
  await supabase.from("cup_bracket_ties").insert(payload);
 if(error)jump(competitionId,error.code==="23505"?"Уже существует пара с таким номером, матч привязан к другой паре или место в следующем раунде занято.":`Ошибка сохранения: ${error.message}`);
 const {data:c}=await supabase.from("competitions").select("slug").eq("id",compId).maybeSingle();
 if(c?.slug)revalidatePath(`/matches/cups/${c.slug}`);
 revalidatePath("/matches");revalidatePath("/admin/matches/cups");jump(competitionId);
}
export async function deleteCupBracketTie(fd:FormData){
 const {supabase}=await requireEditor();const competitionId=field(fd,"competition_id");
 const compId=cleanId(competitionId),tieId=cleanId(field(fd,"tie_id"));
 if(!compId||!tieId)jump(competitionId,"Неверная пара.");
 const {count,error:countError}=await supabase.from("cup_bracket_ties").select("id",{count:"exact",head:true}).eq("next_tie_id",tieId);
 if(countError || (count||0)>0)jump(competitionId,"На эту пару ссылаются предыдущие раунды. Сначала удали эти связи.");
 const {error}=await supabase.from("cup_bracket_ties").delete().eq("id",tieId).eq("competition_id",compId);
 if(error)jump(competitionId,`Не удалось удалить пару: ${error.message}`);
 const {data:c}=await supabase.from("competitions").select("slug").eq("id",compId).maybeSingle();
 if(c?.slug)revalidatePath(`/matches/cups/${c.slug}`);
 revalidatePath("/admin/matches/cups");jump(competitionId);
}
