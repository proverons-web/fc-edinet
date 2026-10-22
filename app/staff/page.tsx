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
    description: locale === "ro"
      ? "Stafful tehnic, medical și administrativ al FC Edineț."
      : "Тренерский, медицинский и организационный штаб FC Edineț.",
    path: "/staff",
    locale,
  });
}

const categories = ["coaching", "medical", "operations"] as const;

function groupTitle(category: TeamStaffMember["category"], locale: "ru" | "ro") {
  if (locale === "ro") {
    if (category === "coaching") return "Staff tehnic";
    if (category === "medical") return "Staff medical";
    return "Organizare";
  }
  if (category === "coaching") return "Тренерский штаб";
  if (category === "medical") return "Медицинский штаб";
  return "Организация";
}

export default async function StaffPage() {
  const locale = await getLocale();
  const supabase = createPublicClient();
  const [design, staffResult] = await Promise.all([
    getPublishedSitePageDesign(supabase, "team"),
    supabase.from("team_staff").select("*").eq("is_active", true).eq("is_placeholder", false).order("category").order("display_order").order("id"),
  ]);
  const staff = (staffResult.data ?? []) as TeamStaffMember[];
  const hero = {
    eyebrow: locale === "ro" ? "FC EDINEȚ · ECHIPĂ" : "FC EDINEȚ · КОМАНДА",
    title: locale === "ro" ? "Staff tehnic" : "Тренерский штаб",
    description: locale === "ro"
      ? "Staff tehnic, medical și administrativ al primei echipe."
      : "Тренерский, медицинский и организационный штаб первой команды.",
  };

  return <main>
    <PageHeroShell design={design} className="pageHero teamHero">
      <>
        {design.show_eyebrow && heroLayerVisible(design.layer_config, "eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config, "eyebrow")}>{hero.eyebrow}</p>}
        {heroLayerVisible(design.layer_config, "title") && <h1 style={heroLayerStyle(design.layer_config, "title")}>{hero.title}</h1>}
        {design.show_description && heroLayerVisible(design.layer_config, "description") && <p style={heroLayerStyle(design.layer_config, "description")}>{hero.description}</p>}
      </>
    </PageHeroShell>

    <section className="section darkSection teamPage teamStaffStandalone"><div className="container">
      {staffResult.error && <PublicMessageState title={locale === "ro" ? "Nu am putut încărca stafful" : "Не удалось загрузить штаб"} text={locale === "ro" ? "Datele nu sunt disponibile momentan." : "Данные временно недоступны."} actionLabel={locale === "ro" ? "Reîncarcă" : "Обновить"} actionHref="/staff" />}
      {!staffResult.error && staff.length === 0 && <PublicMessageState title={locale === "ro" ? "Stafful nu este încă publicat" : "Штаб пока не опубликован"} text={locale === "ro" ? "Membrii staffului vor apărea aici după publicarea în administrare." : "Сотрудники появятся здесь после публикации в админке."} />}
      {!staffResult.error && staff.length > 0 && <section className="teamStaffSection teamStaffSectionStandalone">
        {categories.map((category) => {
          const rows = staff.filter((member) => member.category === category);
          if (!rows.length) return null;
          return <div className="teamStaffGroup" key={category}>
            <div className="teamStaffGroupTitle"><span>{groupTitle(category, locale)}</span><b>{String(rows.length).padStart(2, "0")}</b></div>
            <div className="teamStaffGrid">{rows.map((member) => <article className="teamStaffCard" key={member.id}>
              <div className="teamStaffPortrait">
                {member.photo_url
                  ? <img src={member.photo_url} alt={`${member.first_name} ${member.last_name}`} loading="lazy" decoding="async" />
                  : <img src="/brand/fc-edinet-crest.png" alt="FC Edineț" className="isCrest" />}
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
      </section>}
    </div></section>
  </main>;
}
