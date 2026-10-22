import PlayerCard from "@/app/components/PlayerCard";
import PageHeroShell from "@/app/components/PageHeroShell";
import { PublicMessageState } from "@/app/components/PublicRouteState";
import { createPublicClient } from "@/lib/supabase/public";
import type { Player, PlayerSeasonTotal, Season } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { positionPluralLabelsI18n, publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign, resolvePageHeroText } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";

const positionOrder = ["goalkeeper", "defender", "midfielder", "forward"] as const;

export async function generateMetadata() {
  const locale = await getLocale();
  return publicMetadata({
    title: locale === "ro" ? "Lot" : "Состав",
    description: locale === "ro" ? "Lotul primei echipe FC Edineț, grupat pe poziții." : "Состав первой команды FC Edineț по игровым позициям.",
    path: "/team",
    locale,
  });
}

export default async function TeamSquadPage() {
  const locale = await getLocale();
  const text = publicText[locale].team;
  const supabase = createPublicClient();
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
    seasonStatsByPlayer = new Map(((seasonStats ?? []) as PlayerSeasonTotal[]).map((row) => [String(row.player_id), row]));
  }

  const hero = resolvePageHeroText(design, locale, {
    eyebrow: locale === "ro" ? "PRIMA ECHIPĂ" : "ПЕРВАЯ КОМАНДА",
    title: locale === "ro" ? "Lot" : "Состав",
    description: locale === "ro" ? "Jucătorii primei echipe FC Edineț." : "Игроки основной команды FC Edineț.",
  });

  return <main>
    <PageHeroShell design={design} className="pageHero teamHero"><>
      {design.show_eyebrow && heroLayerVisible(design.layer_config,"eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{hero.eyebrow}</p>}
      {heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{hero.title}</h1>}
      {design.show_description && heroLayerVisible(design.layer_config,"description") && <p style={heroLayerStyle(design.layer_config,"description")}>{hero.description}</p>}
    </></PageHeroShell>

    <section className="section darkSection teamPage teamSquadPage"><div className="container">
      {error && <PublicMessageState title={text.loadError} text={locale === "ro" ? "Lotul nu este disponibil momentan. Încearcă din nou mai târziu." : "Состав временно недоступен. Попробуй снова позже."} actionLabel={locale === "ro" ? "Reîncarcă" : "Обновить"} actionHref="/team" />}
      {!error && players.length === 0 && <PublicMessageState title={text.empty} text={locale === "ro" ? "Jucătorii vor apărea aici după publicarea lor în administrare." : "Игроки появятся здесь после публикации в админке."} />}
      {!error && players.length > 0 && <div className="teamPositionGroups">
        {positionOrder.map((position) => {
          const rows = players.filter((player) => player.position === position);
          if (!rows.length) return null;
          return <section className="teamPositionGroup" key={position} aria-labelledby={`team-position-${position}`}>
            <div className="teamPositionHeading">
              <div><span>{locale === "ro" ? "FC EDINEȚ" : "FC EDINEȚ"}{currentSeason?.name ? ` · ${currentSeason.name}` : ""}</span><h2 id={`team-position-${position}`}>{positionPluralLabelsI18n[locale][position] ?? position}</h2></div>
              <b>{String(rows.length).padStart(2, "0")}</b>
            </div>
            <div className="players teamPositionGrid">
              {rows.map((player) => <PlayerCard key={player.id} player={player} locale={locale} seasonStats={seasonStatsByPlayer.get(String(player.id)) ?? null} />)}
            </div>
          </section>;
        })}
      </div>}
    </div></section>
  </main>;
}
