import ManagedPageCanvas from "@/app/components/ManagedPageCanvas";
import { createClient } from "@/lib/supabase/server";
import type { Partner } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { getPublishedProPageLayout } from "@/lib/pro-page-builder";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const [{ data }, design, layout] = await Promise.all([
    supabase.from("partners").select("*").eq("is_active", true).order("display_order").order("name"),
    getPublishedSitePageDesign(supabase, "partners"),
    getPublishedProPageLayout(supabase, "partners"),
  ]);
  return <main><ManagedPageCanvas pageKey="partners" layout={layout} locale={locale} heroDesign={design} partners={(data ?? []) as Partner[]}/></main>;
}
