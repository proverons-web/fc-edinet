import Link from "next/link";
import { notFound } from "next/navigation";
import ProPageBuilder from "@/app/components/ProPageBuilder";
import { requireEditor } from "@/lib/editorial";
import { getLocale } from "@/lib/locale";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { getDraftProPageLayout, proPageLabels, proPageRoutes, type ProPageKey } from "@/lib/pro-page-builder";
import type { MediaAlbum, MediaVideo, Partner } from "@/lib/types";
import { saveProPageLayout } from "./actions";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ pageKey: string }> };
const allowed = new Set<ProPageKey>(["media", "partners", "academy"]);

export default async function ProPageBuilderPage({ params }: PageProps) {
  const { pageKey: rawKey } = await params;
  const pageKey = rawKey as ProPageKey;
  if (!allowed.has(pageKey)) notFound();
  const { supabase } = await requireEditor();
  const locale = await getLocale();
  const [layout, heroDesign] = await Promise.all([getDraftProPageLayout(supabase, pageKey), getPublishedSitePageDesign(supabase, pageKey)]);

  let albums: MediaAlbum[] = [];
  let videos: MediaVideo[] = [];
  let partners: Partner[] = [];
  if (pageKey === "media") {
    const [albumResult, videoResult] = await Promise.all([
      supabase.from("media_albums").select("*").eq("is_published", true).order("display_order").order("event_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("media_videos").select("*").eq("is_published", true).order("display_order").order("published_at", { ascending: false }).limit(12),
    ]);
    albums = (albumResult.data ?? []) as MediaAlbum[];
    videos = (videoResult.data ?? []) as MediaVideo[];
  }
  if (pageKey === "partners") {
    const { data } = await supabase.from("partners").select("*").eq("is_active", true).order("display_order").order("name");
    partners = (data ?? []) as Partner[];
  }

  return <main className="adminPage proBuilderAdminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner">
      <div><p className="eyebrow">FC EDINEȚ • PAGE BUILDER PRO</p><h1>{proPageLabels[pageKey]}</h1><p>Профессиональный редактор: простой режим для ежедневной работы и расширенный режим для точной настройки.</p></div>
      <div className="adminHeroActions"><Link href="/admin/page-builder" className="adminBack">← Все страницы</Link><Link href={proPageRoutes[pageKey]} target="_blank" className="rowAction muted">Открыть страницу ↗</Link></div>
    </div></section>
    <section className="section adminSurface proBuilderSurface"><div className="proBuilderAdminContainer"><ProPageBuilder pageKey={pageKey} initial={layout} action={saveProPageLayout} locale={locale} heroDesign={heroDesign} albums={albums} videos={videos} partners={partners}/></div></section>
  </main>;
}
