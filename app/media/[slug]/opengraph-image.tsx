import { createPublicClient } from "@/lib/supabase/public";
import { createSocialImage } from "@/lib/social-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "FC Edineț — Фотоальбом клуба";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = createPublicClient();
  const { data } = await client.from("media_albums")
    .select("title,description,cover_image_url,event_date")
    .eq("slug", slug).eq("is_published", true).maybeSingle();
  return createSocialImage({
    category: "ФОТОГАЛЕРЕЯ",
    title: data?.title ?? "FC Edineț",
    photoUrl: data?.cover_image_url,
    date: data?.event_date,
    subtitle: data?.description,
  });
}
