import Link from "next/link";
import PageHeroShell from "@/app/components/PageHeroShell";
import { createClient } from "@/lib/supabase/server";
import type { Partner, PartnerLevel } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { localized, partnerLevelLabelsI18n, publicText, type Locale } from "@/lib/i18n";
import { getPublishedSitePageDesign, resolvePageHeroText } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";
const levelOrder: PartnerLevel[] = ["main", "official", "technical", "supporter"];

export default async function PartnersPage() {
  const locale = await getLocale();
  const text = publicText[locale].partners;
  const supabase = await createClient();
  const [{ data }, design] = await Promise.all([
    supabase.from("partners").select("*").eq("is_active", true).order("display_order").order("name"),
    getPublishedSitePageDesign(supabase, "partners"),
  ]);
  const partners = (data ?? []) as Partner[];
  const hero = resolvePageHeroText(design, locale, { eyebrow: text.eyebrow, title: text.title, description: text.description });

  return <main className="partnersPage">
    <PageHeroShell design={design} className="pageHero partnersHero"><>{design.show_eyebrow && heroLayerVisible(design.layer_config,"eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{hero.eyebrow}</p>}{heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{hero.title}</h1>}{design.show_description && heroLayerVisible(design.layer_config,"description") && <p style={heroLayerStyle(design.layer_config,"description")}>{hero.description}</p>}</></PageHeroShell>
    <section className="section"><div className="container">{!partners.length ? <div className="adminEmpty">{text.empty}</div> : <div className="partnersPublicGroups">{levelOrder.map((level) => { const items = partners.filter((p) => p.partner_level === level); if (!items.length) return null; return <section className="partnerPublicGroup" key={level}><div className="sectionHeading"><div><p className="eyebrow blue">{text.cooperation}</p><h2>{partnerLevelLabelsI18n[locale][level]}</h2></div></div><div className="partnerPublicGrid">{items.map((p) => <PartnerCard partner={p} locale={locale} key={p.id}/>)}</div></section>; })}</div>}<div className="partnersContactBox"><div><p className="eyebrow blue">{text.cooperation}</p><h2>{text.become}</h2><p>{text.contact}</p></div><Link href="/club" className="primaryButton">{text.clubContacts}</Link></div></div></section>
  </main>;
}

function PartnerCard({ partner, locale }: { partner: Partner; locale: Locale }) {
  const text = publicText[locale].partners;
  const content = <><div className="partnerPublicLogo"><img src={partner.logo_url} alt={partner.name}/></div><div className="partnerPublicText"><strong>{partner.name}</strong>{localized(partner.description, partner.description_ro, locale) && <p>{localized(partner.description, partner.description_ro, locale)}</p>}{partner.website_url && <span>{text.openSite}</span>}</div></>;
  return partner.website_url ? <a className="partnerPublicCard" href={partner.website_url} target="_blank" rel="noopener noreferrer">{content}</a> : <article className="partnerPublicCard">{content}</article>;
}
