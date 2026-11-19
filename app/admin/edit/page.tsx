import { notFound, redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import { canEditPublicPath, safePublicEditPath } from "@/lib/admin-role-permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Открыть редактор — FC Edineț", robots: { index: false, follow: false } };

/** Resolves a public URL to an existing authorized editor, never to a user URL. */
export default async function PublicEditRedirect({ searchParams }: { searchParams: Promise<{ from?: string | string[]; embedded?: string | string[] }> }) {
  const { profile, supabase } = await requireEditor();
  const params = await searchParams;
  const compact = (Array.isArray(params.embedded) ? params.embedded[0] : params.embedded) === "1";
  const openEditor = (href: string): never => redirect(compact ? `${href}${href.includes("?") ? "&" : "?"}embedded=1` : href);
  const from = safePublicEditPath(Array.isArray(params.from) ? params.from[0] : params.from);
  if (!from || !canEditPublicPath(profile.role, from)) notFound();
  const parts = from.split("/").filter(Boolean);
  const category = parts[0];
  const slug = parts[1];
  if (parts.length === 0 && profile.role === "admin") openEditor("/admin/site-builder");

  if (category === "news") {
    if (!slug) openEditor("/admin/news");
    if (parts.length !== 2) notFound();
    const { data } = await supabase.from("news").select("id").eq("slug", decodeURIComponent(slug)).maybeSingle();
    if (!data) notFound();
    openEditor(`/admin/news/${data.id}/edit`);
  }
  if (category === "team") {
    if (!slug) openEditor("/admin/players");
    if (parts.length !== 2) notFound();
    const { data } = await supabase.from("players").select("id").eq("slug", decodeURIComponent(slug)).maybeSingle();
    if (!data) notFound();
    openEditor(`/admin/players/${data.id}/edit`);
  }
  if (category === "matches") {
    if (!slug) openEditor("/admin/matches");
    if (parts.length !== 2 || !/^\d+$/.test(slug)) notFound();
    openEditor(`/admin/matches/${slug}/edit`);
  }
  if (category === "media" && slug === "photo" && parts.length === 3) {
    const { data } = await supabase.from("media_photos").select("album_id").eq("id", parts[2]).maybeSingle();
    if (!data?.album_id) notFound();
    openEditor(`/admin/media/${data.album_id}/edit`);
  }
  if (category === "media") {
    if (!slug) openEditor("/admin/media");
    if (parts.length !== 2) notFound();
    const { data } = await supabase.from("media_albums").select("id").eq("slug", decodeURIComponent(slug)).maybeSingle();
    if (!data) notFound();
    openEditor(`/admin/media/${data.id}/edit`);
  }
  if (from === "/standings") openEditor("/admin/standings");
  if (category === "staff") openEditor("/admin/staff");

  if (profile.role === "admin") {
    if (category === "club") {
      if (parts.length <= 2 && ["about", "history", "stadium", "leadership", "achievements", "archive", "hall-of-fame"].includes(slug || "")) {
        openEditor(`/admin/club/${slug}`);
      }
      openEditor("/admin/club");
    }
    if (from === "/partners") openEditor("/admin/partners");
    if (from === "/academy") openEditor("/admin/page-builder/academy");
    if (from === "/statistics") openEditor("/admin/statistics");
  }
  notFound();
}
