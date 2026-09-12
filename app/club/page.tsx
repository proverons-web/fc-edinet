import { createClient } from "@/lib/supabase/server";
import type { ClubAchievement, ClubLeader, ClubProfile } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { localized, publicText } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const locale = await getLocale();
  const text = publicText[locale].club;
  const supabase = await createClient();
  const [{ data: profileData }, { data: leadershipData }, { data: achievementsData }] = await Promise.all([
    supabase.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("club_leadership").select("*").eq("is_active", true).order("display_order").order("name"),
    supabase.from("club_achievements").select("*").eq("is_active", true).order("display_order").order("year", { ascending: false }),
  ]);
  const profile = profileData as ClubProfile | null;
  const leaders = (leadershipData ?? []) as ClubLeader[];
  const achievements = (achievementsData ?? []) as ClubAchievement[];
  const clubName = localized(profile?.club_name, profile?.club_name_ro, locale) || "FC Edineț";
  const city = localized(profile?.city, profile?.city_ro, locale) || "Edineț";
  const motto = localized(profile?.motto, profile?.motto_ro, locale) || text.defaultMotto;
  const colors = localized(profile?.club_colors, profile?.club_colors_ro, locale) || text.defaultColors;
  const address = localized(profile?.address, profile?.address_ro, locale);
  const stadiumName = localized(profile?.stadium_name, profile?.stadium_name_ro, locale) || "Stadionul Edineț";
  const stadiumAddress = localized(profile?.stadium_address, profile?.stadium_address_ro, locale);
  const stadiumDescription = localized(profile?.stadium_description, profile?.stadium_description_ro, locale) || text.stadiumDescriptionEmpty;

  return <main>
    <section className={`clubHero ${profile?.hero_image_url ? "withImage" : ""}`} style={profile?.hero_image_url ? { backgroundImage: `linear-gradient(90deg,rgba(2,13,31,.94),rgba(2,13,31,.56)),url("${profile.hero_image_url}")` } : undefined}>
      <div className="container clubHeroInner"><p className="eyebrow">{city.toUpperCase()} • MOLDOVA</p><h1>{clubName}</h1><p className="clubHeroMotto">{motto}</p><div className="clubHeroFacts"><Fact label={text.founded} value={profile?.founded_year ? String(profile.founded_year) : "—"}/><Fact label={text.city} value={city}/><Fact label={text.colors} value={colors}/></div></div>
    </section>
    <section className="section clubAboutSection"><div className="container clubStoryGrid"><div><p className="eyebrow blue">{text.about}</p><h2>{clubName}</h2><RichText value={localized(profile?.about_text, profile?.about_text_ro, locale) || text.aboutEmpty}/></div><aside className="clubContactCard"><p className="eyebrow blue">{text.contacts}</p><h3>{text.contactTitle}</h3><Contact label="Email" value={profile?.email}/><Contact label={text.phone} value={profile?.phone}/><Contact label={text.address} value={address}/></aside></div></section>
    <section className="section clubHistorySection"><div className="container"><div className="clubNarrowText"><p className="eyebrow blue">{text.historyEyebrow}</p><h2>{text.history}</h2><RichText value={localized(profile?.history_text, profile?.history_text_ro, locale) || text.historyEmpty}/></div></div></section>
    <section className="section clubStadiumSection"><div className="container"><div className="sectionHeading"><div><p className="eyebrow">{text.arena}</p><h2>{stadiumName}</h2></div></div><div className="clubStadiumGrid"><div className="clubStadiumImage">{profile?.stadium_image_url ? <img src={profile.stadium_image_url} alt={stadiumName}/> : <span>{text.stadiumPhoto}</span>}</div><div className="clubStadiumInfo"><div className="clubStadiumFacts"><Fact label={text.capacity} value={profile?.stadium_capacity ? profile.stadium_capacity.toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU") : "—"}/><Fact label={text.address} value={stadiumAddress || "—"}/></div><RichText value={stadiumDescription}/></div></div></div></section>
    <section className="section clubLeadershipSection"><div className="container"><div className="sectionHeading"><div><p className="eyebrow blue">{text.people}</p><h2>{text.leadership}</h2></div></div>{leaders.length ? <div className="clubLeadershipGrid">{leaders.map((leader) => <article className="clubLeaderCard" key={leader.id}><div className="clubLeaderPhoto">{leader.photo_url ? <img src={leader.photo_url} alt={leader.name}/> : <span>FCE</span>}</div><div><span>{localized(leader.role, leader.role_ro, locale)}</span><h3>{leader.name}</h3>{localized(leader.bio, leader.bio_ro, locale) && <p>{localized(leader.bio, leader.bio_ro, locale)}</p>}</div></article>)}</div> : <div className="adminEmpty">{text.leadershipEmpty}</div>}</div></section>
    <section className="section clubAchievementsSection"><div className="container"><div className="sectionHeading"><div><p className="eyebrow">{text.resultsHistory}</p><h2>{text.achievements}</h2></div></div>{achievements.length ? <div className="clubTimeline">{achievements.map((item) => <article key={item.id}><div className="clubTimelineYear">{item.year || "—"}</div><div><h3>{localized(item.title, item.title_ro, locale)}</h3>{localized(item.description, item.description_ro, locale) && <p>{localized(item.description, item.description_ro, locale)}</p>}</div></article>)}</div> : <div className="clubDarkEmpty">{text.achievementsEmpty}</div>}</div></section>
  </main>;
}
function Fact({label,value}:{label:string;value:string}){return <div className="clubFact"><span>{label}</span><strong>{value}</strong></div>}
function Contact({label,value}:{label:string;value:string|null|undefined}){return <div className="clubContactRow"><span>{label}</span><strong>{value||"—"}</strong></div>}
function RichText({value}:{value:string}){const paragraphs=value.split(/\n\s*\n/g).map(i=>i.trim()).filter(Boolean);return <div className="clubRichText">{paragraphs.map((p,i)=><p key={`${i}-${p.slice(0,20)}`}>{p}</p>)}</div>}
