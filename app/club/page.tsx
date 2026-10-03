import type { CSSProperties, ReactNode } from "react";
import PageHeroShell from "@/app/components/PageHeroShell";
import { createClient } from "@/lib/supabase/server";
import type { ClubAchievement, ClubLeader, ClubProfile } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { localized, publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";
import { getPublishedClubPageLayout, sectionClass, sectionStyle, type ClubSectionConfig } from "@/lib/content-page-builder";

export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const locale = await getLocale();
  const text = publicText[locale].club;
  const supabase = await createClient();
  const [{ data: profileData }, { data: leadershipData }, { data: achievementsData }, design, pageLayout] = await Promise.all([
    supabase.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("club_leadership").select("*").eq("is_active", true).order("display_order").order("name"),
    supabase.from("club_achievements").select("*").eq("is_active", true).order("display_order").order("year", { ascending: false }),
    getPublishedSitePageDesign(supabase, "club"),
    getPublishedClubPageLayout(supabase),
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

  const renderSection = (section: ClubSectionConfig) => {
    if (!section.visible) return null;
    const common = { className: sectionClass(section), style: sectionStyle(section), key: section.key };
    switch (section.key) {
      case "about":
        return <section {...common} className={`${common.className} clubAboutSection`}><BuilderInner>
          <div className={`clubStoryGrid clubAboutVariant-${section.variant}`}>
            <div className="clubAboutCopy"><p className="eyebrow blue">{text.about}</p><h2>{clubName}</h2><RichText value={localized(profile?.about_text, profile?.about_text_ro, locale) || text.aboutEmpty}/></div>
            <aside className="clubContactCard"><p className="eyebrow blue">{text.contacts}</p><h3>{text.contactTitle}</h3><Contact label="Email" value={profile?.email}/><Contact label={text.phone} value={profile?.phone}/><Contact label={text.address} value={address}/></aside>
          </div>
        </BuilderInner></section>;
      case "history":
        return <section {...common} className={`${common.className} clubHistorySection`}><BuilderInner>
          <div className={`clubHistoryContent clubHistoryVariant-${section.variant}`}><p className="eyebrow blue">{text.historyEyebrow}</p><h2>{text.history}</h2><RichText value={localized(profile?.history_text, profile?.history_text_ro, locale) || text.historyEmpty}/></div>
        </BuilderInner></section>;
      case "stadium": {
        const photoStyle = { "--stadium-focus-x": `${section.image_position_x ?? 50}%`, "--stadium-focus-y": `${section.image_position_y ?? 52}%`, "--stadium-image-height": `${section.image_height ?? 520}px` } as CSSProperties;
        return <section {...common} className={`${common.className} clubStadiumSection`}><BuilderInner>
          <div className="sectionHeading"><div><p className="eyebrow">{text.arena}</p><h2>{stadiumName}</h2></div></div>
          <div className={`clubStadiumBuilder clubStadiumVariant-${section.variant}`} style={photoStyle}>
            <div className="clubStadiumImage">{profile?.stadium_image_url ? <img src={profile.stadium_image_url} alt={stadiumName}/> : <span>{text.stadiumPhoto}</span>}</div>
            <div className="clubStadiumInfo"><div className="clubStadiumFacts"><Fact label={text.capacity} value={profile?.stadium_capacity ? profile.stadium_capacity.toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU") : "—"}/><Fact label={text.address} value={stadiumAddress || "—"}/></div><RichText value={stadiumDescription}/></div>
          </div>
        </BuilderInner></section>;
      }
      case "leadership":
        return <section {...common} className={`${common.className} clubLeadershipSection`}><BuilderInner>
          <div className="sectionHeading"><div><p className="eyebrow blue">{text.people}</p><h2>{text.leadership}</h2></div></div>
          {leaders.length ? <div className={`clubLeadershipGrid clubLeadershipVariant-${section.variant}`} style={{ "--leadership-cols": section.columns ?? 3 } as CSSProperties}>{leaders.map((leader) => <article className="clubLeaderCard" key={leader.id}><div className="clubLeaderPhoto">{leader.photo_url ? <img src={leader.photo_url} alt={leader.name}/> : <span>FCE</span>}</div><div><span>{localized(leader.role, leader.role_ro, locale)}</span><h3>{leader.name}</h3>{localized(leader.bio, leader.bio_ro, locale) && <p>{localized(leader.bio, leader.bio_ro, locale)}</p>}</div></article>)}</div> : <div className="adminEmpty">{text.leadershipEmpty}</div>}
        </BuilderInner></section>;
      case "achievements":
        return <section {...common} className={`${common.className} clubAchievementsSection`}><BuilderInner>
          <div className="sectionHeading"><div><p className="eyebrow">{text.resultsHistory}</p><h2>{text.achievements}</h2></div></div>
          {achievements.length ? <div className={`clubTimeline clubAchievementsVariant-${section.variant}`}>{achievements.map((item) => <article key={item.id}><div className="clubTimelineYear">{item.year || "—"}</div><div><h3>{localized(item.title, item.title_ro, locale)}</h3>{localized(item.description, item.description_ro, locale) && <p>{localized(item.description, item.description_ro, locale)}</p>}</div></article>)}</div> : <div className="clubDarkEmpty">{text.achievementsEmpty}</div>}
        </BuilderInner></section>;
    }
  };

  return <main>
    <PageHeroShell design={design} className="clubHero" contentClassName="container clubHeroInner" contentImageUrl={profile?.hero_image_url}>
      <>{heroLayerVisible(design.layer_config,"intro") && <div className="clubHeroIntro" style={heroLayerStyle(design.layer_config,"intro")}>{design.show_eyebrow && <p className="eyebrow">{city.toUpperCase()} • MOLDOVA</p>}<h1>{clubName}</h1>{design.show_description && <p className="clubHeroMotto">{motto}</p>}</div>}{heroLayerVisible(design.layer_config,"facts") && <div className="clubHeroFacts" style={heroLayerStyle(design.layer_config,"facts")}><Fact label={text.founded} value={profile?.founded_year ? String(profile.founded_year) : "—"}/><Fact label={text.city} value={city}/><Fact label={text.colors} value={colors}/></div>}</>
    </PageHeroShell>
    {pageLayout.sections.map(renderSection)}
  </main>;
}

function BuilderInner({children}:{children:ReactNode}) { return <div className="contentBuilderInner">{children}</div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="clubFact"><span>{label}</span><strong>{value}</strong></div>; }
function Contact({ label, value }: { label: string; value: string | null | undefined }) { return <div className="clubContactRow"><span>{label}</span><strong>{value || "—"}</strong></div>; }
function RichText({ value }: { value: string }) { const paragraphs = value.split(/\n\s*\n/g).map((item) => item.trim()).filter(Boolean); return <div className="clubRichText">{paragraphs.map((p, i) => <p key={`${i}-${p.slice(0, 20)}`}>{p}</p>)}</div>; }
