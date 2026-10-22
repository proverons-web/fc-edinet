import PageHeroShell from "@/app/components/PageHeroShell";
import { PublicMessageState } from "@/app/components/PublicRouteState";
import { createPublicClient } from "@/lib/supabase/public";
import type { TeamStaffMember } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return publicMetadata({
    title: locale === "ro" ? "Staff tehnic" : "Тренерский штаб",
    description: locale === "ro" ? "Stafful tehnic, medical și administrativ al FC Edineț." : "Тренерский, медицинский и организационный штаб FC Edineț.",
    path: "/team/staff",
    locale,
  });
}

export default async function TeamStaffPage() {
  const locale = await getLocale();
  const supabase = createPublicClient();
  const [{ data, error }, design] = await Promise.all([
    supabase.from("team_staff").select("*").eq("is_active", true).order("category").order("display_order").order("id"),
    getPublishedSitePageDesign(supabase, "team"),
  ]);
  const staff = (data ?? []) as TeamStaffMember[];
  const eyebrow = locale === "ro" ? "FC EDINEȚ · ECHIPĂ" : "FC EDINEȚ · КОМАНДА";
  const title = locale === "ro" ? "Staff tehnic" : "Тренерский штаб";
  const description = locale === "ro" ? "Staff tehnic, medical și administrativ al primei echipe." : "Тренерский, медицинский и организационный штаб первой команды.";

  return <main>
    <PageHeroShell design={design} className="pageHero teamHero"><>
      {design.show_eyebrow && heroLayerVisible(design.layer_config,"eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{eyebrow}</p>}
      {heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{title}</h1>}
      {design.show_description && heroLayerVisible(design.layer_config,"description") && <p style={heroLayerStyle(design.layer_config,"description")}>{description}</p>}
    </></PageHeroShell>

    <section className="section darkSection teamPage teamStaffStandalone"><div className="container">
      {error && <PublicMessageState title={locale === "ro" ? "Nu am putut încărca stafful" : "Не удалось загрузить штаб"} text={locale === "ro" ? "Datele nu sunt disponibile momentan." : "Данные временно недоступны."} actionLabel={locale === "ro" ? "Reîncarcă" : "Обновить"} actionHref="/team/staff" />}
      {!error && staff.length === 0 && <PublicMessageState title={locale === "ro" ? "Stafful nu este încă publicat" : "Штаб пока не опубликован"} text={locale === "ro" ? "Membrii staffului vor apărea aici după publicarea în administrare." : "Сотрудники появятся здесь после публикации в админке."} />}
      {!error && staff.length > 0 && <section className="teamStaffSection teamStaffSectionStandalone">
        {(["coaching","medical","operations"] as const).map((category) => {
          const rows = staff.filter((member) => member.category === category);
          if (!rows.length) return null;
          const groupTitle = locale === "ro" ? (category === "coaching" ? "Staff tehnic" : category === "medical" ? "Staff medical" : "Organizare") : (category === "coaching" ? "Тренерский штаб" : category === "medical" ? "Медицинский штаб" : "Организация");
          return <div className="teamStaffGroup" key={category}>
            <div className="teamStaffGroupTitle"><span>{groupTitle}</span><b>{String(rows.length).padStart(2,"0")}</b></div>
            <div className="teamStaffGrid">{rows.map((member) => <article className={`teamStaffCard${member.is_placeholder ? " isPlaceholder" : ""}`} key={member.id}>
              <div className="teamStaffPortrait">{member.photo_url ? <img src={member.photo_url} alt={`${member.first_name} ${member.last_name}`} loading="lazy" decoding="async" /> : <img src="/brand/fc-edinet-crest.png" alt="FC Edineț" className="isCrest" />}{member.is_placeholder && <span>{locale === "ro" ? "MODEL" : "ЗАГЛУШКА"}</span>}</div>
              <div className="teamStaffCopy"><small>{locale === "ro" ? (member.role_title_ro || member.role_title) : member.role_title}</small><h3>{member.first_name} {member.last_name}</h3>{(member.joined_year || member.left_year) && <b>{member.joined_year || "—"}{member.left_year ? ` — ${member.left_year}` : (locale === "ro" ? " — prezent" : " — н.в.")}</b>}{(locale === "ro" ? member.bio_ro : member.bio) && <p>{locale === "ro" ? (member.bio_ro || member.bio) : member.bio}</p>}</div>
            </article>)}</div>
          </div>;
        })}
      </section>}
    </div></section>
  </main>;
}
