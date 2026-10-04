import { notFound } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import { getLocale } from "@/lib/locale";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { getDraftProPageLayout, type ProPageKey } from "@/lib/pro-page-builder";
import type { MediaAlbum, MediaVideo, Partner } from "@/lib/types";
import ProPageLivePreview from "@/app/components/ProPageLivePreview";

export const dynamic = "force-dynamic";
const allowed = new Set<ProPageKey>(["media","partners","academy"]);
export default async function ProPagePreview({ params }: { params: Promise<{ pageKey: string }> }) {
  const { pageKey: raw } = await params; const pageKey = raw as ProPageKey; if (!allowed.has(pageKey)) notFound();
  const { supabase } = await requireEditor(); const locale = await getLocale();
  const [layout, heroDesign] = await Promise.all([getDraftProPageLayout(supabase,pageKey), getPublishedSitePageDesign(supabase,pageKey)]);
  let albums: MediaAlbum[]=[]; let videos: MediaVideo[]=[]; let partners: Partner[]=[];
  if(pageKey==="media"){
    const [a,v]=await Promise.all([supabase.from("media_albums").select("*").eq("is_published",true).order("display_order"),supabase.from("media_videos").select("*").eq("is_published",true).order("display_order")]);
    albums=(a.data??[]) as MediaAlbum[]; videos=(v.data??[]) as MediaVideo[];
  }
  if(pageKey==="partners"){const p=await supabase.from("partners").select("*").eq("is_active",true).order("display_order");partners=(p.data??[]) as Partner[];}
  return <ProPageLivePreview pageKey={pageKey} initialLayout={layout} locale={locale} heroDesign={heroDesign} albums={albums} videos={videos} partners={partners}/>;
}
