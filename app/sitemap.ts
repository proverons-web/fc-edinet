import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const supabase = await createClient();

  const staticRoutes: MetadataRoute.Sitemap = [
    route(base, "", 1, "daily"),
    route(base, "/news", 0.9, "daily"),
    route(base, "/team", 0.9, "weekly"),
    route(base, "/staff", 0.82, "weekly"),
    route(base, "/statistics", 0.85, "daily"),
    route(base, "/matches", 0.9, "daily"),
    route(base, "/standings", 0.8, "daily"),
    route(base, "/club/about", 0.82, "monthly"),
    route(base, "/club/history", 0.78, "monthly"),
    route(base, "/club/stadium", 0.76, "monthly"),
    route(base, "/club/leadership", 0.72, "monthly"),
    route(base, "/club/achievements", 0.72, "monthly"),
    route(base, "/club/archive", 0.7, "monthly"),
    route(base, "/club/hall-of-fame", 0.7, "monthly"),
    route(base, "/partners", 0.7, "monthly"),
    route(base, "/academy", 0.75, "monthly"),
    route(base, "/media", 0.8, "weekly"),
  ];

  const [
    { data: news },
    { data: players },
    { data: matches },
    { data: albums },
    { data: photos },
    { data: customPages },
  ] = await Promise.all([
    supabase.from("news").select("slug,updated_at,published_at").eq("status", "published"),
    supabase.from("players").select("slug,updated_at").eq("is_active", true),
    supabase.from("matches").select("id,kickoff,updated_at,status").order("kickoff", { ascending: false }),
    supabase.from("media_albums").select("slug,updated_at").eq("is_published", true),
    supabase.from("media_photos").select("id,created_at").eq("is_published", true),
    supabase.from("site_custom_pages").select("slug,updated_at,published_at").eq("status", "published"),
  ]);

  return [
    ...staticRoutes,
    ...(news ?? []).map((item) => ({
      url: `${base}/news/${encodeURIComponent(item.slug)}`,
      lastModified: item.updated_at || item.published_at || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...(players ?? []).map((player) => ({
      url: `${base}/team/${encodeURIComponent(player.slug)}`,
      lastModified: player.updated_at || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...(matches ?? []).map((match) => ({
      url: `${base}/matches/${match.id}`,
      lastModified: match.updated_at || match.kickoff || undefined,
      changeFrequency: match.status === "live" || match.status === "scheduled" ? "daily" as const : "monthly" as const,
      priority: match.status === "live" || match.status === "scheduled" ? 0.75 : 0.6,
    })),
    ...(albums ?? []).map((album) => ({
      url: `${base}/media/${encodeURIComponent(album.slug)}`,
      lastModified: album.updated_at || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...(photos ?? []).map((photo) => ({
      url: `${base}/media/photo/${photo.id}`,
      lastModified: photo.created_at || undefined,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
    ...(customPages ?? []).map((page) => ({
      url: `${base}/${encodeURIComponent(page.slug)}`,
      lastModified: page.updated_at || page.published_at || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.55,
    })),
  ];
}

function route(base: string, path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]): MetadataRoute.Sitemap[number] {
  return { url: `${base}${path}`, changeFrequency, priority };
}
