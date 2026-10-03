import ClubPageCanvas from "@/app/components/ClubPageCanvas";
import { requireEditor } from "@/lib/editorial";
import type { ClubAchievement, ClubLeader, ClubProfile } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { getDraftClubPageLayout } from "@/lib/content-page-builder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Club Page Builder Preview" };

export default async function ClubPageBuilderPreview() {
  const locale = await getLocale();
  const text = publicText[locale].club;
  const { supabase } = await requireEditor();
  const [{ data: profileData }, { data: leadershipData }, { data: achievementsData }, design, pageLayout] = await Promise.all([
    supabase.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("club_leadership").select("*").eq("is_active", true).order("display_order").order("name"),
    supabase.from("club_achievements").select("*").eq("is_active", true).order("display_order").order("year", { ascending: false }),
    getPublishedSitePageDesign(supabase, "club"),
    getDraftClubPageLayout(supabase),
  ]);

  return <ClubPageCanvas
    locale={locale}
    text={text}
    profile={profileData as ClubProfile | null}
    leaders={(leadershipData ?? []) as ClubLeader[]}
    achievements={(achievementsData ?? []) as ClubAchievement[]}
    design={design}
    initialLayout={pageLayout}
    builderMode
  />;
}
