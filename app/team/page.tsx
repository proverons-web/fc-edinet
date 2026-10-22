import PlayerCard from "@/app/components/PlayerCard";
import PageHeroShell from "@/app/components/PageHeroShell";
import { PublicMessageState } from "@/app/components/PublicRouteState";
import { createClient } from "@/lib/supabase/server";
import type { Player, PlayerSeasonTotal, Season } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicSectionMetadata } from "@/lib/seo";
import { positionLabelsI18n, positionPluralLabelsI18n, publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign, resolvePageHeroText } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return publicSectionMetadata("team", locale, "/team");
}

const order = ["goalkeeper", "defender", "midfielder", "forward"];

export default async function TeamPage() {
  const locale = await getLocale();
  const text = publicText[locale].team;
  const supabase = await createClient();
  const [{ data, error }, design, seasonResult] = await Promise.all([
    supabase.from("players").select("*").eq("is_active", true).order("display_order", { ascending: true }).order("shirt_number", { ascending: true }),
    getPublishedSitePageDesign(supabase, "team"),
    supabase.from("seasons").select("id,name,slug,starts_on,ends_on,is_current,is_active").eq("is_active", true).eq("is_current", true).maybeSingle(),
  ]);
  const players = (data ?? []) as Player[];
  const currentSeason = (seasonResult.data as Season | null) ?? null;
  let seasonStatsByPlayer = new Map<string, PlayerSeasonTotal>();
  if (currentSeason && players.length > 0) {
    const { data: seasonStats } = await supabase
      .from("player_season_totals")
      .select("*")
      .eq("season_id", currentSeason.id)
      .in("player_id", players.map((player) => String(player.id)));
    seasonStatsByPlayer = new Map(
      ((seasonStats ?? []) as PlayerSeasonTotal[]).map((row) => [String(row.player_id), row])
    );
  }
  const hero = resolvePageHeroText(design, locale, { eyebrow: text.eyebrow, title: text.title, description: text.description });

  return <main>
    <PageHeroShell design={design} className="pageHero teamHero"><>{design.show_eyebrow && heroLayerVisible(design.layer_config,"eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{hero.eyebrow}</p>}{heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{hero.title}</h1>}{design.show_description && heroLayerVisible(design.layer_config,"description") && <p style={heroLayerStyle(design.layer_config,"description")}>{hero.description}</p>}</></PageHeroShell>
    <section className="section darkSection teamPage"><div className="container">
      {!error && players.length > 0 && (
        <>
          <div className="teamSquadOverview" aria-label={text.title}>
            <div className="teamSquadOverviewLead">
              <span className="teamSquadOverviewNumber">{players.length}</span>
              <div><small>FC EDINEȚ{currentSeason?.name ? ` · ${currentSeason.name}` : ""}</small><strong>{text.title}</strong></div>
            </div>
            <div className="teamSquadOverviewPositions">
              {order.map((position) => {
                const count = players.filter((player) => player.position === position).length;
                if (!count) return null;
                return <div key={position}><strong>{count}</strong><span>{positionPluralLabelsI18n[locale][position] ?? position}</span></div>;
              })}
            </div>
          </div>
          <nav className="teamPositionNav" aria-label={locale === "ro" ? "Poziții" : "Позиции"}>
            {order.map((position) => {
              const count = players.filter((player) => player.position === position).length;
              if (!count) return null;
              return <a key={position} href={`#team-${position}`}>{positionPluralLabelsI18n[locale][position] ?? position}<span>{count}</span></a>;
            })}
          </nav>
        </>
      )}
      {error && <PublicMessageState title={text.loadError} text={locale === "ro" ? "Lotul nu este disponibil momentan. Încearcă din nou mai târziu." : "Состав временно недоступен. Попробуй снова позже."} actionLabel={locale === "ro" ? "Reîncarcă" : "Обновить"} actionHref="/team" />}
      {!error && players.length === 0 && <PublicMessageState title={text.empty} text={locale === "ro" ? "Jucătorii vor apărea aici după publicarea lor în administrare." : "Игроки появятся здесь после публикации в админке."} />}
      {order.map((position) => { const group = players.filter((player) => player.position === position); if (!group.length) return null; return <section className="teamGroup" id={`team-${position}`} key={position}><div className="groupHeading teamGroupHeading"><p className="eyebrow">{(positionLabelsI18n[locale][position] ?? position).toUpperCase()}</p><h2>{positionPluralLabelsI18n[locale][position] ?? position}</h2><span className="teamGroupCount">{String(group.length).padStart(2, "0")}</span></div><div className="players">{group.map((player) => <PlayerCard key={player.id} player={player} locale={locale} seasonStats={seasonStatsByPlayer.get(String(player.id)) ?? null} />)}</div></section>; })}
    </div></section>
  </main>;
}
