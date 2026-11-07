import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicImage from "@/app/components/PublicImage";
import { createPublicClient } from "@/lib/supabase/public";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { competitionName } from "@/lib/competition";
import { cupResultDetail } from "@/lib/cup-results";
import { resolveCupBracket, bracketStages, type BracketTie, type BracketTeam } from "@/lib/cup-bracket";
import "./style.css";

export const dynamic = "force-dynamic";
const tieSelect=`id,competition_id,stage_order,stage_name_ru,stage_name_ro,sort_order,match_id,home_team_id,away_team_id,next_tie_id,next_slot,
  match:matches!cup_bracket_ties_match_id_fkey(id,competition_id,status,kickoff,home_score,away_score,extra_time_played,home_penalties,away_penalties,
    home:teams!matches_home_team_id_fkey(id,name,short_name,logo_url),away:teams!matches_away_team_id_fkey(id,name,short_name,logo_url)),
  home_seed:teams!cup_bracket_ties_home_team_id_fkey(id,name,short_name,logo_url),
  away_seed:teams!cup_bracket_ties_away_team_id_fkey(id,name,short_name,logo_url)`;
function Crest({team}:{team:BracketTeam|null}) {return team?.logo_url ? <PublicImage src={team.logo_url} alt="" width={44} height={44} sizes="44px" /> : <span className="cupBracketFallback" aria-hidden="true">•</span>}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const lang=await getLocale();const supabase=createPublicClient();
  const {data}=await supabase.from("competitions").select("name,name_ro,slug").eq("slug",slug).eq("is_active",true).eq("competition_type","cup").maybeSingle();
  return publicMetadata({title:`${data?competitionName(data,lang):lang==="ro"?"Cupa":"Кубок"} — ${lang==="ro"?"Tablou eliminatoriu":"Кубковая сетка"}`,
    description:lang==="ro"?"Meciurile, rezultatele și calificările din cupă.":"Пары, результаты и выход в следующие раунды Кубка.",path:`/matches/cups/${encodeURIComponent(slug)}`,locale:lang});
}

export default async function CupBracketPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;const lang=await getLocale();const supabase=createPublicClient();
  const {data:comp,error:compError}=await supabase.from("competitions")
    .select("id,name,name_ro,slug,season,logo_url,competition_type,is_active").eq("slug",slug).eq("competition_type","cup").eq("is_active",true).maybeSingle();
  if(compError||!comp)notFound();
  const {data,error}=await supabase.from("cup_bracket_ties").select(tieSelect).eq("competition_id",comp.id)
    .order("stage_order").order("sort_order").limit(512);
  const stages=error?[]:bracketStages(resolveCupBracket((data||[]) as unknown as BracketTie[]),lang);
  const t=lang==="ro"?{
    back:"← Toate meciurile",eyebrow:"DRUMUL SPRE TROFEU",title:"Tablou eliminatoriu",noData:"Tabloul competiției nu a fost completat încă.",error:"Tabloul nu poate fi încărcat. Reîncercați mai târziu.",unknown:"De stabilit",planned:"Programat",cancelled:"Anulat",postponed:"Amânat",view:"Raportul meciului",inconsistent:"Participanții partidei necesită verificare editorială"
  }:{
    back:"← Все матчи",eyebrow:"ПУТЬ К ТРОФЕЮ",title:"Кубковая сетка",noData:"Сетка этого турнира пока не заполнена.",error:"Не удалось загрузить сетку. Попробуйте позже.",unknown:"Определится",planned:"Запланирован",cancelled:"Отменён",postponed:"Перенесён",view:"Протокол матча",inconsistent:"Участники матча требуют проверки редактором"
  };
  return <main className="cupBracketPage">
    <section className="cupBracketHero"><div className="container">
      <Link href="/matches" className="cupBracketBack">{t.back}</Link>
      <p className="eyebrow">{t.eyebrow}</p><h1>{competitionName(comp,lang)}</h1>
      <p>{comp.season} · {t.title}</p>
    </div></section>
    <section className="section"><div className="container">
      {error?<p role="alert" className="cupBracketMessage">{t.error}</p>:!stages.length?<p className="cupBracketMessage">{t.noData}</p>:
      <div className="cupBracketScroller" role="region" aria-label={t.title} tabIndex={0}>
        <div className="cupBracketStages">
          {stages.map(stage=><section key={stage.order} className="cupBracketStage" aria-label={stage.name}>
            <h2>{stage.name}</h2>
            <div className="cupBracketStageCards">{stage.ties.map(tie=><article key={tie.id} className="cupBracketTie">
              <div className="cupBracketTieNumber">{lang==="ro"?"Perechea":"Пара"} {tie.sort_order}{tie.match?.status==="finished"?<span>✓</span>:null}</div>
              {(["home","away"] as const).map(side=>{const team=side==="home"?tie.home_team:tie.away_team;
                const hasWinner=tie.winner!=null && team!=null && String(team.id)===String(tie.winner.id);
                const scored=tie.match?.status==="finished";
                const score=side==="home"?tie.match?.home_score:tie.match?.away_score;
                return <div key={side} className={`cupBracketTeamRow${hasWinner?" is-winner":""}`}>
                  <Crest team={team}/><span className="cupBracketTeamName">{team?.name||t.unknown}</span>
                  <span className="cupBracketTeamScore">{scored&&score!=null?score:"–"}</span>
                </div>})}
              {tie.match?<div className="cupBracketTieFoot">
                <span>{tie.match.status==="cancelled"?t.cancelled:tie.match.status==="postponed"?t.postponed:tie.match.status==="scheduled"?t.planned:cupResultDetail(tie.match,lang)||""}</span>
                <Link href={`/matches/${tie.match.id}`}>{t.view} ↗</Link>
              </div>:null}
              {tie.mismatch?<p className="cupBracketMismatch">{t.inconsistent}</p>:null}
            </article>)}</div>
          </section>)}
        </div>
      </div>}
    </div></section>
  </main>;
}
