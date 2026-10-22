import TeamRosterBrowser from "@/app/components/TeamRosterBrowser";
import PageHeroShell from "@/app/components/PageHeroShell";
import { PublicMessageState } from "@/app/components/PublicRouteState";
import { createClient } from "@/lib/supabase/server";
import type { Player, PlayerSeasonTotal, Season, TeamStaffMember } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicSectionMetadata } from "@/lib/seo";
import { positionPluralLabelsI18n, publicText, type Locale } from "@/lib/i18n";
import { getPublishedSitePageDesign, resolvePageHeroText } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return publicSectionMetadata("team", locale, "/team");
}

const order = ["goalkeeper", "defender", "midfielder", "forward"];

type LeaderRow = { player: Player; stats: PlayerSeasonTotal | null };

function playerLeaderDefinitions(rows: LeaderRow[], locale: Locale) {
  const eligible = rows.filter((row) => row.stats && Number(row.stats.appearances ?? 0) > 0);
  const maxBy = (getter: (row: LeaderRow) => number, filter?: (row: LeaderRow) => boolean) => {
    const pool = filter ? eligible.filter(filter) : eligible;
    if (!pool.length) return null;
    return [...pool].sort((a,b) => getter(b) - getter(a) || Number(a.player.display_order ?? 999) - Number(b.player.display_order ?? 999))[0];
  };
  const appearance = maxBy((row) => Number(row.stats?.appearances ?? 0));
  const goals = maxBy((row) => Number(row.stats?.goals ?? 0), (row) => row.player.position !== "goalkeeper");
  const assists = maxBy((row) => Number(row.stats?.assists ?? 0), (row) => row.player.position !== "goalkeeper");
  const goalkeeper = maxBy((row) => Number(row.stats?.clean_sheets ?? 0), (row) => row.player.position === "goalkeeper");
  const labels = locale === "ro" ? { appearances:"Cele mai multe meciuri", goals:"Golgeter", assists:"Lider la pase", clean:"Meciuri fără gol" } : { appearances:"Больше всего матчей", goals:"Бомбардир", assists:"Лидер по ассистам", clean:"Сухие матчи" };
  return [
    appearance && { label: labels.appearances, player: appearance.player, value: String(appearance.stats?.appearances ?? 0) },
    goals && { label: labels.goals, player: goals.player, value: String(goals.stats?.goals ?? 0) },
    assists && { label: labels.assists, player: assists.player, value: String(assists.stats?.assists ?? 0) },
    goalkeeper && { label: labels.clean, player: goalkeeper.player, value: String(goalkeeper.stats?.clean_sheets ?? 0) },
  ].filter(Boolean) as Array<{ label:string; player:Player; value:string }>;
}

export default async function TeamPage() {
  const locale = await getLocale();
  const text = publicText[locale].team;
  const supabase = await createClient();
  const [{ data, error }, design, seasonResult, staffResult] = await Promise.all([
    supabase.from("players").select("*").eq("is_active", true).order("display_order", { ascending: true }).order("shirt_number", { ascending: true }),
    getPublishedSitePageDesign(supabase, "team"),
    supabase.from("seasons").select("id,name,slug,starts_on,ends_on,is_current,is_active").eq("is_active", true).eq("is_current", true).maybeSingle(),
    supabase.from("team_staff").select("*").eq("is_active", true).order("category").order("display_order").order("id"),
  ]);
  const players = (data ?? []) as Player[];
  const currentSeason = (seasonResult.data as Season | null) ?? null;
  const staff = (staffResult.data ?? []) as TeamStaffMember[];
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
          <div className="teamSeasonLeaders">
            {(() => {
              const rows = players.map((player) => ({ player, stats: seasonStatsByPlayer.get(String(player.id)) ?? null }));
              const leaderDefs = playerLeaderDefinitions(rows, locale);
              return leaderDefs.map((leader) => leader ? <a className="teamSeasonLeader" key={leader.label} href={`/team/${leader.player.slug}`}>
                <div>{leader.player.photo_url ? <img src={leader.player.photo_url} alt="" loading="lazy" /> : <img src="/brand/fc-edinet-crest.png" alt="" className="isCrest" />}</div>
                <span><small>{leader.label}</small><strong>{leader.player.first_name} {leader.player.last_name}</strong><b>{leader.value}</b></span>
              </a> : null);
            })()}
          </div>
        </>
      )}
      {error && <PublicMessageState title={text.loadError} text={locale === "ro" ? "Lotul nu este disponibil momentan. Încearcă din nou mai târziu." : "Состав временно недоступен. Попробуй снова позже."} actionLabel={locale === "ro" ? "Reîncarcă" : "Обновить"} actionHref="/team" />}
      {!error && players.length === 0 && <PublicMessageState title={text.empty} text={locale === "ro" ? "Jucătorii vor apărea aici după publicarea lor în administrare." : "Игроки появятся здесь после публикации в админке."} />}
      {!error && players.length > 0 && <TeamRosterBrowser players={players} seasonStats={Array.from(seasonStatsByPlayer.values())} locale={locale} />}

      {staff.length > 0 && <section id="staff" className="teamStaffSection">
        <div className="teamStaffHeading"><p className="eyebrow">{locale === "ro" ? "ECHIPA TEHNICĂ" : "ШТАБ КОМАНДЫ"}</p><h2>{locale === "ro" ? "Oamenii din spatele echipei" : "Люди, которые готовят команду"}</h2><p>{locale === "ro" ? "Staff tehnic, medical și administrativ FC Edineț." : "Тренерский, медицинский и организационный штаб FC Edineț."}</p></div>
        {(["coaching","medical","operations"] as const).map((category) => {
          const rows = staff.filter((member) => member.category === category);
          if (!rows.length) return null;
          const title = locale === "ro" ? (category === "coaching" ? "Staff tehnic" : category === "medical" ? "Staff medical" : "Organizare") : (category === "coaching" ? "Тренерский штаб" : category === "medical" ? "Медицинский штаб" : "Организация");
          return <div className="teamStaffGroup" key={category}><div className="teamStaffGroupTitle"><span>{title}</span><b>{String(rows.length).padStart(2,"0")}</b></div><div className="teamStaffGrid">{rows.map((member) => <article className={`teamStaffCard${member.is_placeholder ? " isPlaceholder" : ""}`} key={member.id}><div className="teamStaffPortrait">{member.photo_url ? <img src={member.photo_url} alt={`${member.first_name} ${member.last_name}`} loading="lazy" /> : <img src="/brand/fc-edinet-crest.png" alt="FC Edineț" className="isCrest" />}{member.is_placeholder && <span>{locale === "ro" ? "MODEL" : "ЗАГЛУШКА"}</span>}</div><div className="teamStaffCopy"><small>{locale === "ro" ? (member.role_title_ro || member.role_title) : member.role_title}</small><h3>{member.first_name} {member.last_name}</h3>{(member.joined_year || member.left_year) && <b>{member.joined_year || "—"}{member.left_year ? ` — ${member.left_year}` : " — н.в."}</b>}{(locale === "ro" ? member.bio_ro : member.bio) && <p>{locale === "ro" ? (member.bio_ro || member.bio) : member.bio}</p>}</div></article>)}</div></div>;
        })}
      </section>}
    </div></section>
  </main>;
}
