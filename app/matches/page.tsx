import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import CalendarIcon from "./CalendarIcon";
import PublicImage from "@/app/components/PublicImage";
import "./fan-actions.css";
import PageHeroShell from "@/app/components/PageHeroShell";
import { toggleFavoriteMatch } from "@/app/account/actions";
import { createClient } from "@/lib/supabase/server";
import type { ClubMatch, Competition, CompetitionType } from "@/lib/types";
import {competitionTypes,competitionName,competitionTypeLabel} from "@/lib/competition";
import { scheduleDateLabel, scheduleReason, isRescheduled, hasAnnouncedReplacementDate, appearsInDatedCalendar, orderFixturesByKickoff } from "@/lib/match-schedule";
import "./competition-filters.css";
import { clubMatchResultClass, matchScoreText, matchVenue } from "@/lib/public-match-integrity";
import { getLocale } from "@/lib/locale";
import { publicSectionMetadata } from "@/lib/seo";
import { accountText } from "@/lib/account-i18n";
import { dateLocale, matchStatusLabelsI18n, publicText, type Locale } from "@/lib/i18n";
import { getPublishedSitePageDesign, resolvePageHeroText } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";
export const dynamic="force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return publicSectionMetadata("matches", locale, "/matches");
}

export default async function MatchesPage({searchParams}:{searchParams:Promise<{type?:string,competition?:string}>}){
 const locale=await getLocale();const text=publicText[locale].matches;const account=accountText[locale];const supabase=await createClient();const now=new Date().toISOString();
 const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;
 const params=await searchParams;
 const type:CompetitionType|"all"=competitionTypes.includes(params.type as CompetitionType)? params.type as CompetitionType:"all";
 const [{data:competitionRows},design]=await Promise.all([
  supabase.from("competitions").select("id,name,name_ro,slug,season,competition_type,is_active").eq("is_active",true).order("name"),
  getPublishedSitePageDesign(supabase,"matches")]);
 const competitions=(competitionRows??[]) as Competition[];
 const available=competitions.filter(c=>type==="all"||(c.competition_type||"league")===type);
 const selected=available.find(c=>String(c.id)===params.competition);
 const filterIds=selected?[String(selected.id)]:type==="all"?null:available.map(c=>String(c.id));
 const ids=filterIds?(filterIds.length?filterIds:["-1"]):null;
 let upcomingQuery=supabase.from("matches").select(matchSelect()).or(`status.eq.live,status.eq.postponed,and(status.eq.scheduled,kickoff.gte.${now})`).order("kickoff",{ascending:true}).limit(150);
 let finishedQuery=supabase.from("matches").select(matchSelect()).eq("status","finished").order("kickoff",{ascending:false}).limit(150);
 let cancelledQuery=supabase.from("matches").select(matchSelect()).eq("status","cancelled").order("kickoff",{ascending:false}).limit(50);
 if(ids){upcomingQuery=upcomingQuery.in("competition_id",ids);finishedQuery=finishedQuery.in("competition_id",ids);cancelledQuery=cancelledQuery.in("competition_id",ids)}
 const [upcomingResult,finishedResult,cancelledResult]=await Promise.all([upcomingQuery,finishedQuery,cancelledQuery]);
 const allUpcoming=(upcomingResult.data??[]) as unknown as ClubMatch[];
 // Keep a postponed fixture with a NEW known date between the other dated matches.
 // Undated postponements and cancellations stay in the separate status section.
 const currentDate = new Date(now);
 const upcoming=orderFixturesByKickoff(allUpcoming.filter(m=>appearsInDatedCalendar(m,currentDate)));
 const postponed=allUpcoming.filter(m=>m.status==="postponed" && !appearsInDatedCalendar(m,currentDate));
 const cancelled=(cancelledResult.data??[]) as unknown as ClubMatch[];
 const affected=[...postponed,...cancelled].sort((a,b)=>Date.parse(b.updated_at||b.kickoff)-Date.parse(a.updated_at||a.kickoff));
 const finished=(finishedResult.data??[]) as unknown as ClubMatch[];
 let favoriteRows:{match_id:number|string}[]=[];if(userId){const {data}=await supabase.from("favorite_matches").select("match_id").eq("user_id",userId);favoriteRows=(data??[]) as {match_id:number|string}[]}
 const favoriteIds=new Set(favoriteRows.map(row=>String(row.match_id)));
 const hero=resolvePageHeroText(design,locale,{eyebrow:"FC EDINEȚ",title:text.title,description:text.description});
 const subscriptionUrl = `${getSiteUrl().replace(/^https?:\/\//, "webcal://")}/api/calendar?lang=${locale}`;
 const queryHref=(kind:CompetitionType|"all",id?:string)=>{const q=new URLSearchParams();if(kind!=="all")q.set("type",kind);if(id)q.set("competition",id);return `/matches${q.size?`?${q.toString()}`:""}`};
 return <main><PageHeroShell design={design} className="pageHero"><>{design.show_eyebrow&&heroLayerVisible(design.layer_config,"eyebrow")&&<p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{hero.eyebrow}</p>}{heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{hero.title}</h1>}{design.show_description&&heroLayerVisible(design.layer_config,"description")&&<p style={heroLayerStyle(design.layer_config,"description")}>{hero.description}</p>}</></PageHeroShell><section className="section matchPublicSection"><div className="container">
  <nav className="competitionTypeTabs" aria-label={locale==="ro"?"Tipul competiției":"Тип соревнования"}>
    <Link href={queryHref("all")} className={type==="all"?"active":""}>{locale==="ro"?"Toate meciurile":"Все матчи"}</Link>
    {competitionTypes.map(t=><Link key={t} href={queryHref(t)} className={type===t?"active":""}>{competitionTypeLabel(t,locale)}</Link>)}
  </nav>
  {available.length>1&&<nav className="competitionEditionTabs"><Link href={queryHref(type)} className={!selected?"active":""}>{locale==="ro"?"Toate competițiile":"Все соревнования"}</Link>{available.map(c=><Link key={c.id} href={queryHref(type,String(c.id))} className={String(selected?.id)===String(c.id)?"active":""}>{competitionName(c,locale)} · {c.season}</Link>)}</nav>}
  <div className="sectionHeading fanUpcomingHeading"><div><p className="eyebrow blue">{text.calendar}</p><h2>{text.upcoming}</h2></div><div className="fanFixtureTools"><a className="fanSubscribe" href={subscriptionUrl} title={locale === "ro" ? "Abonament cu actualizări pentru viitoarele meciuri" : "Подписка на обновления расписания матчей"}><CalendarIcon /> {locale === "ro" ? "Abonează-te la calendar" : "Подписаться на матчи"}</a><a className="fanDownloadFeed" href={`/api/calendar?lang=${locale}`} download="fc-edinet-fixtures.ics">↓ {locale === "ro" ? "Descarcă .ics" : "Скачать .ics"}</a></div></div>{upcoming.length?<div className="publicMatchList">{upcoming.map(m=><PublicMatchCard key={m.id} match={m} locale={locale} isAuthenticated={Boolean(userId)} isFavorite={favoriteIds.has(String(m.id))}/>)}</div>:<div className="adminEmpty">{text.upcomingEmpty}</div>}
  {affected.length>0&&<><div className="sectionHeading matchResultsHeading"><div><p className="eyebrow blue">{locale==="ro"?"MODIFICĂRI DE PROGRAM":"ИЗМЕНЕНИЯ РАСПИСАНИЯ"}</p><h2>{locale==="ro"?"Amânate și anulate":"Перенесённые и отменённые"}</h2></div></div><div className="publicMatchList">{affected.map(m=><PublicMatchCard key={m.id} match={m} locale={locale} isAuthenticated={Boolean(userId)} isFavorite={favoriteIds.has(String(m.id))}/>)}</div></>}
  <div className="sectionHeading matchResultsHeading"><div><p className="eyebrow blue">{text.results}</p><h2>{text.latest}</h2></div></div>{finished.length?<div className="publicMatchList">{finished.map(m=><PublicMatchCard key={m.id} match={m} locale={locale} isAuthenticated={Boolean(userId)} isFavorite={favoriteIds.has(String(m.id))}/>)}</div>:<div className="adminEmpty">{text.resultsEmpty}</div>}
 </div></section></main>
}
function PublicMatchCard({match,locale,isAuthenticated,isFavorite}:{match:ClubMatch;locale:Locale;isAuthenticated:boolean;isFavorite:boolean}) {
 const text=publicText[locale].matches;
 const account=accountText[locale];
 const kickoff=new Date(match.kickoff);
 const date=new Intl.DateTimeFormat(dateLocale(locale),{day:"2-digit",month:"long",year:"numeric",timeZone:"Europe/Chisinau"}).format(kickoff);
 const day=new Intl.DateTimeFormat(dateLocale(locale),{day:"2-digit",timeZone:"Europe/Chisinau"}).format(kickoff);
 const month=new Intl.DateTimeFormat(dateLocale(locale),{month:"short",timeZone:"Europe/Chisinau"}).format(kickoff);
 const time=new Intl.DateTimeFormat(dateLocale(locale),{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Chisinau"}).format(kickoff);
 const resultClass=clubMatchResultClass(match);
 const postponed=match.status==="postponed";
 const hasNewDate=hasAnnouncedReplacementDate(match);
 const showDateInBadge=match.status!=="cancelled" && (!postponed || hasNewDate);
 const originalDate=hasNewDate && match.original_kickoff
  ? new Intl.DateTimeFormat(dateLocale(locale),{day:"2-digit",month:"long",year:"numeric",timeZone:"Europe/Chisinau"}).format(new Date(match.original_kickoff))
  : null;
 return <article className={`publicMatchCard${resultClass}${postponed?" matchPostponedCard":""}`}>
  <div className="publicMatchDateBadge">
   <strong>{showDateInBadge?day:"—"}</strong>
   <span>{showDateInBadge?month:""}</span>
  </div>
  <div className="publicMatchMeta">
   <div className="publicMatchCompetitionLine">
    <span>{competitionName(match.competition,locale)||text.match}</span>
    {postponed?<span className="matchPostponedChip">{locale==="ro"?"AMÂNAT":"ПЕРЕНЕСЁН"}</span>:null}
   </div>
   <strong>{postponed||match.status==="cancelled"?scheduleDateLabel(match,locale):`${date} · ${time}`}</strong>
   {originalDate?<small className="matchScheduleOriginalDate">{locale==="ro"?"Data inițială":"Было запланировано"}: {originalDate}</small>:null}
   {(postponed||match.status==="cancelled") && scheduleReason(match,locale) ? <small className="matchScheduleReasonInline">{scheduleReason(match,locale)}</small> : null}
   {match.status==="scheduled" && isRescheduled(match) ? <small className="matchScheduleRescheduledInline">{locale==="ro"?"Dată actualizată":"Дата изменена"}</small> : null}
   <small>{match.round||"—"} · {matchVenue(match) || text.stadiumTbd}</small>
  </div>
  <div className="publicTeams">
   <div className={match.home?.is_club?"clubTeam":""}><TeamBadge team={match.home}/><strong>{match.home?.name??"—"}</strong></div>
   <div className="publicScore">
    {match.status==="finished"||match.status==="live"?<b>{matchScoreText(match)}</b>:<b aria-label={locale==="ro"?"contra":"против"}>—</b>}
    <span>{matchStatusLabelsI18n[locale][match.status]}</span>
   </div>
   <div className={match.away?.is_club?"clubTeam":""}><TeamBadge team={match.away}/><strong>{match.away?.name??"—"}</strong></div>
  </div>
  <div className="matchFavoriteAction">
   <Link className="publicMatchDetailsButton" prefetch={false} href={`/matches/${match.id}`}>{locale==="ro"?"Detalii":"Протокол"} →</Link>
   {match.status==="scheduled" && kickoff.getTime()>Date.now() ? <a className="fanMatchAction fanMatchCalendar" href={`/api/calendar/${match.id}?lang=${locale}`} download={`fc-edinet-match-${match.id}.ics`}><CalendarIcon /> {locale==="ro"?"În calendar":"В календарь"}</a> : null}
   {isAuthenticated?<form action={toggleFavoriteMatch.bind(null,String(match.id),"/matches")}><button className={isFavorite?"favoriteActiveButton":"favoriteButton"} type="submit">{isFavorite?account.removeMatch:account.followMatch}</button></form>:<Link className="favoriteButton" href="/login">{account.loginToFavorite}</Link>}
  </div>
 </article>;
}
function TeamBadge({team}:{team:ClubMatch["home"]}){if(team?.logo_url)return <PublicImage className="publicTeamLogo" src={team.logo_url} width={62} height={62} sizes="(max-width: 767px) 46px, 62px" alt=""/>;return <div className={`publicTeamBadge ${team?.is_club?"club":""}`}>{(team?.short_name||team?.name||"FC").slice(0,3).toUpperCase()}</div>}
function matchSelect(){return `id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,home_score,away_score,notes,original_kickoff,schedule_reason_ru,schedule_reason_ro,created_at,updated_at,home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),competition:competitions!matches_competition_id_fkey(id,name,name_ro,slug,season,competition_type,is_active)`}
