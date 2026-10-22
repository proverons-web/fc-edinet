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
type PageProps = { params: Promise<{ pageKey: string }>; searchParams?: Promise<Record<string,string|string[]|undefined>> };
const allowed = new Set<ProPageKey>(["media", "partners", "academy"]);

export default async function ProPageBuilderPage({ params, searchParams }: PageProps) {
  const { pageKey: rawKey } = await params;
  const query = searchParams ? await searchParams : {};
  const embedded = (Array.isArray(query.embedded) ? query.embedded[0] : query.embedded) === "1";
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

  return <main className={`adminPage proBuilderAdminPage${embedded ? " isEmbedded" : ""}`}>
    {!embedded && <section className="adminHero compactAdminHero"><div className="container adminHeroInner">
      <div><p className="eyebrow">FC EDINEȚ • PAGE BUILDER PRO 2.0</p><h1>{proPageLabels[pageKey]}</h1><p>Простой редактор структуры страницы: секции слева, результат по центру, настройки справа.</p></div>
      <div className="adminHeroActions"><Link href="/admin/page-builder" className="adminBack">← Редактор страниц</Link><Link href={proPageRoutes[pageKey]} target="_blank" className="rowAction muted">Открыть страницу ↗</Link></div>
    </div></section>}
    <section className={`section adminSurface proBuilderSurface${embedded ? " embeddedSurface" : ""}`}><div className="proBuilderAdminContainer"><ProPageBuilder pageKey={pageKey} initial={layout} action={saveProPageLayout} locale={locale} heroDesign={heroDesign} albums={albums} videos={videos} partners={partners} embedded={embedded}/></div></section>
  </main>;
}
