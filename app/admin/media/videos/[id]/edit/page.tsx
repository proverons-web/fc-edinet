import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import { mediaMatchOptions } from "@/lib/media-match-options";
import MediaVideoEditorForm from "@/app/components/MediaVideoEditorForm";
import type { MediaVideo } from "@/lib/types";

export const metadata = { title: "Редактирование видео — FC Edineț" };
export const dynamic = "force-dynamic";
export default async function AdminVideoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const { supabase } = await requireEditor();
  const { data, error } = await supabase.from("media_videos").select("*").eq("id", id).maybeSingle();
  if (error || !data) notFound();
  const matches = await mediaMatchOptions(supabase);
  return <main className="adminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner">
      <div><p className="eyebrow">FC EDINEȚ • MEDIA</p><h1>Редактировать видео</h1><p>{data.title}</p></div>
      <div className="adminHeroActions"><Link className="adminBack" href="/admin/media">← Медиатека</Link>
        <Link className="rowAction muted" href="/media">Публичная медиатека ↗</Link></div>
    </div></section>
    <section className="section adminSurface"><div className="container mediaVideoEditorContainer">
      <MediaVideoEditorForm video={data as MediaVideo} matches={matches}/>
    </div></section>
  </main>;
}
