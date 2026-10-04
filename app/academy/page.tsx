import ManagedPageCanvas from "@/app/components/ManagedPageCanvas";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { getPublishedProPageLayout } from "@/lib/pro-page-builder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Академия FC Edineț" };

export default async function AcademyPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const [design, layout] = await Promise.all([
    getPublishedSitePageDesign(supabase, "academy"),
    getPublishedProPageLayout(supabase, "academy"),
  ]);
  return <main><ManagedPageCanvas pageKey="academy" layout={layout} locale={locale} heroDesign={design}/></main>;
}
