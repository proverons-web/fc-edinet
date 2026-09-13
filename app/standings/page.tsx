import Link from "next/link";
import StandingsTable from "@/app/components/StandingsTable";
import PageHeroShell from "@/app/components/PageHeroShell";
import { createClient } from "@/lib/supabase/server";
import type { Competition, StandingEntry } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign, resolvePageHeroText } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";
type PageProps = { searchParams: Promise<{ competition?: string | string[] }> };

export default async function StandingsPage({ searchParams }: PageProps) {
  const locale = await getLocale();
  const text = publicText[locale].standings;
  const supabase = await createClient();
  const params = await searchParams;
  const [{ data: competitionsData }, design] = await Promise.all([
    supabase.from("competitions").select("*").eq("is_active", true).order("name"),
    getPublishedSitePageDesign(supabase, "standings"),
  ]);
  const competitions = (competitionsData ?? []) as Competition[];
  const requested = Array.isArray(params.competition) ? params.competition[0] : params.competition;
  const competition = competitions.find((item) => String(item.id) === String(requested ?? "")) ?? competitions[0];
  let standings: StandingEntry[] = [];
  if (competition) {
    const { data } = await supabase.from("standings").select(`id,competition_id,team_id,wins,draws,losses,goals_for,goals_against,points_adjustment,played,goal_difference,points,created_at,updated_at,team:teams!standings_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active)`).eq("competition_id", competition.id).order("points", { ascending: false }).order("goal_difference", { ascending: false }).order("goals_for", { ascending: false });
    standings = (data ?? []) as unknown as StandingEntry[];
  }
  const hero = resolvePageHeroText(design, locale, { eyebrow: "FC EDINEȚ", title: text.title, description: text.description });
  return <main>
    <PageHeroShell design={design} className="pageHero"><>{design.show_eyebrow && heroLayerVisible(design.layer_config,"eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{hero.eyebrow}</p>}{heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{hero.title}</h1>}{design.show_description && heroLayerVisible(design.layer_config,"description") && <p style={heroLayerStyle(design.layer_config,"description")}>{hero.description}</p>}</></PageHeroShell>
    <section className="section standingsPublicSection"><div className="container"><div className="sectionHeading"><div><p className="eyebrow blue">{text.championship}</p><h2>{competition?.name ?? text.tournament}{competition?.season ? ` · ${competition.season}` : ""}</h2></div><Link href="/matches">{text.matches}</Link></div>{competitions.length > 1 && <nav className="standingsTabs">{competitions.map((item) => <Link key={item.id} className={String(item.id) === String(competition?.id) ? "active" : ""} href={`/standings?competition=${item.id}`}>{item.name}{item.season ? ` ${item.season}` : ""}</Link>)}</nav>}{standings.length ? <StandingsTable entries={standings} locale={locale}/> : <div className="adminEmpty">{text.empty}</div>}</div></section>
  </main>;
}
