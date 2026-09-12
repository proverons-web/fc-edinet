import Link from "next/link";
import StandingsTable from "@/app/components/StandingsTable";
import { createClient } from "@/lib/supabase/server";
import type { ClubMatch, Competition, StandingEntry } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { dateLocale, matchStatusLabelsI18n, publicText, type Locale } from "@/lib/i18n";
export const dynamic="force-dynamic";
export default async function MatchesPage(){
 const locale=await getLocale();const text=publicText[locale].matches;const supabase=await createClient();const now=new Date().toISOString();
 const [upcomingResult,finishedResult,competitionResult]=await Promise.all([
  supabase.from("matches").select(matchSelect()).in("status",["scheduled","live","postponed"]).gte("kickoff",now).order("kickoff",{ascending:true}),
  supabase.from("matches").select(matchSelect()).eq("status","finished").order("kickoff",{ascending:false}).limit(20),
  supabase.from("competitions").select("*").eq("is_active",true).order("name").limit(1).maybeSingle(),]);
 const upcoming=(upcomingResult.data??[]) as unknown as ClubMatch[];const finished=(finishedResult.data??[]) as unknown as ClubMatch[];const competition=competitionResult.data as Competition|null;let standings:StandingEntry[]=[];
 if(competition){const {data}=await supabase.from("standings").select(standingsSelect()).eq("competition_id",competition.id).order("points",{ascending:false}).order("goal_difference",{ascending:false}).order("goals_for",{ascending:false});standings=(data??[]) as unknown as StandingEntry[]}
 return <main><section className="pageHero"><div className="container"><p className="eyebrow">FC EDINEȚ</p><h1>{text.title}</h1><p>{text.description}</p></div></section><section className="section matchPublicSection"><div className="container">
  <div className="sectionHeading"><div><p className="eyebrow blue">{text.calendar}</p><h2>{text.upcoming}</h2></div></div>{upcoming.length?<div className="publicMatchList">{upcoming.map(m=><PublicMatchCard key={m.id} match={m} locale={locale}/>)}</div>:<div className="adminEmpty">{text.upcomingEmpty}</div>}
  <div className="sectionHeading matchResultsHeading"><div><p className="eyebrow blue">{text.results}</p><h2>{text.latest}</h2></div></div>{finished.length?<div className="publicMatchList">{finished.map(m=><PublicMatchCard key={m.id} match={m} locale={locale}/>)}</div>:<div className="adminEmpty">{text.resultsEmpty}</div>}
  <div className="sectionHeading matchResultsHeading"><div><p className="eyebrow blue">{text.table}</p><h2>{competition?.name??text.championship}{competition?.season?` · ${competition.season}`:""}</h2></div><Link href="/standings">{text.fullTable}</Link></div>{standings.length?<StandingsTable entries={standings} locale={locale}/>:<div className="adminEmpty">{text.tableEmpty}</div>}
 </div></section></main>
}
function PublicMatchCard({match,locale}:{match:ClubMatch;locale:Locale}){const text=publicText[locale].matches;const date=new Intl.DateTimeFormat(dateLocale(locale),{day:"2-digit",month:"long",year:"numeric",timeZone:"Europe/Chisinau"}).format(new Date(match.kickoff));const time=new Intl.DateTimeFormat(dateLocale(locale),{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Chisinau"}).format(new Date(match.kickoff));return <article className="publicMatchCard"><div className="publicMatchMeta"><span>{match.competition?.name??text.match}</span><strong>{date} · {time}</strong><small>{match.round||"—"} · {match.stadium||text.stadiumTbd}</small></div><div className="publicTeams"><div><TeamBadge team={match.home}/><strong>{match.home?.name??"—"}</strong></div><div className="publicScore">{match.status==="finished"||match.status==="live"?<b>{match.home_score??0} : {match.away_score??0}</b>:<b>VS</b>}<span>{matchStatusLabelsI18n[locale][match.status]}</span></div><div><TeamBadge team={match.away}/><strong>{match.away?.name??"—"}</strong></div></div></article>}
function TeamBadge({team}:{team:ClubMatch["home"]}){if(team?.logo_url)return <img className="publicTeamLogo" src={team.logo_url} alt=""/>;return <div className={`publicTeamBadge ${team?.is_club?"club":""}`}>{(team?.short_name||team?.name||"FC").slice(0,3).toUpperCase()}</div>}
function matchSelect(){return `id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,home_score,away_score,notes,created_at,updated_at,home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),competition:competitions!matches_competition_id_fkey(id,name,slug,season,is_active)`}
function standingsSelect(){return `id,competition_id,team_id,wins,draws,losses,goals_for,goals_against,points_adjustment,played,goal_difference,points,created_at,updated_at,team:teams!standings_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active)`}
