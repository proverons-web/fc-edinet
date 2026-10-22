import ManagedPageCanvas from "@/app/components/ManagedPageCanvas";
import { createPublicClient } from "@/lib/supabase/public";
import type { MediaAlbum, MediaVideo } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicSectionMetadata } from "@/lib/seo";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { getPublishedProPageLayout } from "@/lib/pro-page-builder";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return publicSectionMetadata("media", locale, "/media");
}


export default async function MediaPage() {
  const locale = await getLocale();
  const supabase = createPublicClient();
  const [{ data: albumsData }, { data: videosData }, design, layout] = await Promise.all([
    supabase.from("media_albums").select("*").eq("is_published", true).order("display_order").order("event_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("media_videos").select("*").eq("is_published", true).order("display_order").order("published_at", { ascending: false }).limit(12),
    getPublishedSitePageDesign(supabase, "media"),
    getPublishedProPageLayout(supabase, "media"),
  ]);
  return <main><ManagedPageCanvas pageKey="media" layout={layout} locale={locale} heroDesign={design} albums={(albumsData ?? []) as MediaAlbum[]} videos={(videosData ?? []) as MediaVideo[]}/></main>;
}
