import PlayerCard from "@/app/components/PlayerCard";
import PageHeroShell from "@/app/components/PageHeroShell";
import { PublicMessageState } from "@/app/components/PublicRouteState";
import { createPublicClient } from "@/lib/supabase/public";
import type { Player, PlayerSeasonTotal, Season, TeamStaffMember } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { positionPluralLabelsI18n, publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign, resolvePageHeroText } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";

const positionOrder = ["goalkeeper", "defender", "midfielder", "forward"] as const;
type TeamSearchParams = Promise<{ view?: string | string[] }>;

export async function generateMetadata({ searchParams }: { searchParams: TeamSearchParams }) {
  const locale = await getLocale();
  const params = await searchParams;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  const staffView = view === "staff";
  return publicMetadata({
    title: staffView ? (locale === "ro" ? "Staff tehnic" : "Тренерский штаб") : (locale === "ro" ? "Lot" : "Состав"),
    description: staffView
      ? (locale === "ro" ? "Stafful tehnic, medical și administrativ al FC Edineț." : "Тренерский, медицинский и организационный штаб FC Edineț.")
      : (locale === "ro" ? "Lotul primei echipe FC Edineț, grupat pe poziții." : "Состав первой команды FC Edineț по игровым позициям."),
    path: staffView ? "/team?view=staff" : "/team",
    locale,
  });
}

function StaffGroups({ staff, locale }: { staff: TeamStaffMember[]; locale: "ru" | "ro" }) {
  return <section className="teamStaffSection teamStaffSectionStandalone">
    {(["coaching", "medical", "operations"] as const).map((category) => {
      const rows = staff.filter((member) => member.category === category);
      if (!rows.length) return null;
      const groupTitle = locale === "ro"
        ? (category === "coaching" ? "Staff tehnic" : category === "medical" ? "Staff medical" : "Organizare")
        : (category === "coaching" ? "Тренерский штаб" : category === "medical" ? "Медицинский штаб" : "Организация");
      return <div className="teamStaffGroup" key={category}>
        <div className="teamStaffGroupTitle"><span>{groupTitle}</span><b>{String(rows.length).padStart(2, "0")}</b></div>
        <div className="teamStaffGrid">{rows.map((member) => <article className={`teamStaffCard${member.is_placeholder ? " isPlaceholder" : ""}`} key={member.id}>
          <div className="teamStaffPortrait">
            {member.photo_url
              ? <img src={member.photo_url} alt={`${member.first_name} ${member.last_name}`} loading="lazy" decoding="async" />
              : <img src="/brand/fc-edinet-crest.png" alt="FC Edineț" className="isCrest" />}
            {member.is_placeholder && <span>{locale === "ro" ? "MODEL" : "ЗАГЛУШКА"}</span>}
          </div>
          <div className="teamStaffCopy">
            <small>{locale === "ro" ? (member.role_title_ro || member.role_title) : member.role_title}</small>
            <h3>{member.first_name} {member.last_name}</h3>
            {(member.joined_year || member.left_year) && <b>{member.joined_year || "—"}{member.left_year ? ` — ${member.left_year}` : (locale === "ro" ? " — prezent" : " — н.в.")}</b>}
            {(locale === "ro" ? member.bio_ro : member.bio) && <p>{locale === "ro" ? (member.bio_ro || member.bio) : member.bio}</p>}
          </div>
        </article>)}</div>
      </div>;
    })}
  </section>;
}

export default async function TeamPage({ searchParams }: { searchParams: TeamSearchParams }) {
  const locale = await getLocale();
  const params = await searchParams;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  const staffView = view === "staff";
  const supabase = createPublicClient();
  const design = await getPublishedSitePageDesign(supabase, "team");

  if (staffView) {
    const { data, error } = await supabase.from("team_staff").select("*").eq("is_active", true).order("category").order("display_order").order("id");
    const staff = (data ?? []) as TeamStaffMember[];
    const hero = {
      eyebrow: locale === "ro" ? "FC EDINEȚ · ECHIPĂ" : "FC EDINEȚ · КОМАНДА",
      title: locale === "ro" ? "Staff tehnic" : "Тренерский штаб",
      description: locale === "ro" ? "Staff tehnic, medical și administrativ al primei echipe." : "Тренерский, медицинский и организационный штаб первой команды.",
    };
    return <main>
      <PageHeroShell design={design} className="pageHero teamHero"><>
        {design.show_eyebrow && heroLayerVisible(design.layer_config,"eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{hero.eyebrow}</p>}
        {heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{hero.title}</h1>}
        {design.show_description && heroLayerVisible(design.layer_config,"description") && <p style={heroLayerStyle(design.layer_config,"description")}>{hero.description}</p>}
      </></PageHeroShell>
      <section className="section darkSection teamPage teamStaffStandalone"><div className="container">
        {error && <PublicMessageState title={locale === "ro" ? "Nu am putut încărca stafful" : "Не удалось загрузить штаб"} text={locale === "ro" ? "Datele nu sunt disponibile momentan." : "Данные временно недоступны."} actionLabel={locale === "ro" ? "Reîncarcă" : "Обновить"} actionHref="/team?view=staff" />}
        {!error && staff.length === 0 && <PublicMessageState title={locale === "ro" ? "Stafful nu este încă publicat" : "Штаб пока не опубликован"} text={locale === "ro" ? "Membrii staffului vor apărea aici după publicarea în administrare." : "Сотрудники появятся здесь после публикации в админке."} />}
        {!error && staff.length > 0 && <StaffGroups staff={staff} locale={locale} />}
      </div></section>
    </main>;
  }

  const text = publicText[locale].team;
  const [{ data, error }, seasonResult] = await Promise.all([
    supabase.from("players").select("*").eq("is_active", true).order("display_order", { ascending: true }).order("shirt_number", { ascending: true }),
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
              <div><span>FC EDINEȚ{currentSeason?.name ? ` · ${currentSeason.name}` : ""}</span><h2 id={`team-position-${position}`}>{positionPluralLabelsI18n[locale][position] ?? position}</h2></div>
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
