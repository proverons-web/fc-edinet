import ClubPageCanvas from "@/app/components/ClubPageCanvas";
import { createClient } from "@/lib/supabase/server";
import type { ClubAchievement, ClubLeader, ClubProfile } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicSectionMetadata } from "@/lib/seo";
import { publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { getPublishedClubPageLayout } from "@/lib/content-page-builder";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return publicSectionMetadata("club", locale, "/club");
}


export default async function ClubPage() {
  const locale = await getLocale();
  const text = publicText[locale].club;
  const supabase = await createClient();
  const [{ data: profileData }, { data: leadershipData }, { data: achievementsData }, design, pageLayout] = await Promise.all([
    supabase.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("club_leadership").select("*").eq("is_active", true).order("display_order").order("name"),
    supabase.from("club_achievements").select("*").eq("is_active", true).order("display_order").order("year", { ascending: false }),
    getPublishedSitePageDesign(supabase, "club"),
    getPublishedClubPageLayout(supabase),
  ]);

  return <ClubPageCanvas
    locale={locale}
    text={text}
    profile={profileData as ClubProfile | null}
    leaders={(leadershipData ?? []) as ClubLeader[]}
    achievements={(achievementsData ?? []) as ClubAchievement[]}
    design={design}
    initialLayout={pageLayout}
  />;
}
