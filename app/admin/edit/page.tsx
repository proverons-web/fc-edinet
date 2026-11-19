import { notFound, redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import { canEditPublicPath, safePublicEditPath } from "@/lib/admin-role-permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Открыть редактор — FC Edineț", robots: { index: false, follow: false } };

/** Resolves a public URL to an existing authorized editor, never to a user URL. */
export default async function PublicEditRedirect({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const { profile, supabase } = await requireEditor();
  const params = await searchParams;
  const from = safePublicEditPath(Array.isArray(params.from) ? params.from[0] : params.from);
  if (!from || !canEditPublicPath(profile.role, from)) notFound();
  const parts = from.split("/").filter(Boolean);
  const category = parts[0];
  const slug = parts[1];
  if (parts.length === 0 && profile.role === "admin") redirect("/admin/site-builder");

  if (category === "news") {
    if (!slug) redirect("/admin/news");
    if (parts.length !== 2) notFound();
    const { data } = await supabase.from("news").select("id").eq("slug", decodeURIComponent(slug)).maybeSingle();
    if (!data) notFound();
    redirect(`/admin/news/${data.id}/edit`);
  }
  if (category === "team") {
    if (!slug) redirect("/admin/players");
    if (parts.length !== 2) notFound();
    const { data } = await supabase.from("players").select("id").eq("slug", decodeURIComponent(slug)).maybeSingle();
    if (!data) notFound();
    redirect(`/admin/players/${data.id}/edit`);
  }
  if (category === "matches") {
    if (!slug) redirect("/admin/matches");
    if (parts.length !== 2 || !/^\d+$/.test(slug)) notFound();
    redirect(`/admin/matches/${slug}/edit`);
  }
  if (category === "media") {
    if (!slug) redirect("/admin/media");
    if (parts.length !== 2) notFound();
    const { data } = await supabase.from("media_albums").select("id").eq("slug", decodeURIComponent(slug)).maybeSingle();
    if (!data) notFound();
    redirect(`/admin/media/${data.id}/edit`);
  }
  if (from === "/standings") redirect("/admin/standings");
  if (category === "staff") redirect("/admin/staff");

  if (profile.role === "admin") {
    if (category === "club") {
      if (parts.length <= 2 && ["about", "history", "stadium", "leadership", "achievements", "archive", "hall-of-fame"].includes(slug || "")) {
        redirect(`/admin/club/${slug}`);
      }
      redirect("/admin/club");
    }
    if (from === "/partners") redirect("/admin/partners");
    if (from === "/academy") redirect("/admin/page-builder/academy");
    if (from === "/statistics") redirect("/admin/statistics");
  }
  notFound();
}
