import PageHeroShell from "@/app/components/PageHeroShell";
import TeamStaffPublic from "@/app/components/TeamStaffPublic";
import { PublicMessageState } from "@/app/components/PublicRouteState";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { createPublicClient } from "@/lib/supabase/public";
import type { TeamStaffMember } from "@/lib/types";

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

export default async function StaffPage() {
  const locale = await getLocale();
  const supabase = createPublicClient();
  const [design, staffResult] = await Promise.all([
    getPublishedSitePageDesign(supabase, "team"),
    supabase.from("team_staff").select("*").eq("is_active", true).order("category").order("display_order").order("id"),
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
        <p className="eyebrow">{hero.eyebrow}</p>
        <h1>{hero.title}</h1>
        <p>{hero.description}</p>
      </>
    </PageHeroShell>
    <section className="section darkSection teamPage teamStaffStandalone"><div className="container">
      {staffResult.error && <PublicMessageState title={locale === "ro" ? "Nu am putut încărca stafful" : "Не удалось загрузить штаб"} text={locale === "ro" ? "Datele nu sunt disponibile momentan." : "Данные временно недоступны."} actionLabel={locale === "ro" ? "Reîncarcă" : "Обновить"} actionHref="/staff" />}
      {!staffResult.error && staff.length === 0 && <PublicMessageState title={locale === "ro" ? "Stafful nu este încă publicat" : "Штаб пока не опубликован"} text={locale === "ro" ? "Membrii staffului vor apărea aici după publicarea în administrare." : "Сотрудники появятся здесь после публикации в админке."} />}
      {!staffResult.error && staff.length > 0 && <TeamStaffPublic staff={staff} locale={locale} />}
    </div></section>
  </main>;
}
