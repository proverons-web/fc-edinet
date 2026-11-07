import { createPublicClient } from "@/lib/supabase/public";
import { createSocialImage } from "@/lib/social-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "FC Edineț — Новости клуба";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = createPublicClient();
  const { data } = await client.from("news")
    .select("title,excerpt,cover_image_url,published_at")
    .eq("slug", slug).eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  return createSocialImage({
    category: "НОВОСТИ КЛУБА",
    title: data?.title ?? "FC Edineț",
    photoUrl: data?.cover_image_url,
    date: data?.published_at,
    subtitle: data?.excerpt,
  });
}
