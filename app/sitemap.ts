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
    route(base, "/matches", 0.9, "daily"),
    route(base, "/standings", 0.8, "daily"),
    route(base, "/club", 0.8, "monthly"),
    route(base, "/partners", 0.7, "monthly"),
    route(base, "/media", 0.8, "weekly"),
  ];

  const [
    { data: news },
    { data: players },
    { data: albums },
    { data: photos },
  ] = await Promise.all([
    supabase
      .from("news")
      .select("slug,updated_at,published_at")
      .eq("status", "published"),
    supabase
      .from("players")
      .select("slug")
      .eq("is_active", true),
    supabase
      .from("media_albums")
      .select("slug,updated_at")
      .eq("is_published", true),
    supabase
      .from("media_photos")
      .select("id,created_at")
      .eq("is_published", true),
  ]);

  const newsRoutes: MetadataRoute.Sitemap = (news ?? []).map((item) => ({
    url: `${base}/news/${encodeURIComponent(item.slug)}`,
    lastModified:
      item.updated_at || item.published_at || new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const playerRoutes: MetadataRoute.Sitemap = (players ?? []).map(
    (player) => ({
      url: `${base}/team/${encodeURIComponent(player.slug)}`,
      changeFrequency: "monthly",
      priority: 0.6,
    })
  );

  const albumRoutes: MetadataRoute.Sitemap = (albums ?? []).map(
    (album) => ({
      url: `${base}/media/${encodeURIComponent(album.slug)}`,
      lastModified: album.updated_at || new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    })
  );

  const photoRoutes: MetadataRoute.Sitemap = (photos ?? []).map(
    (photo) => ({
      url: `${base}/media/photo/${photo.id}`,
      lastModified: photo.created_at || new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    })
  );

  return [
    ...staticRoutes,
    ...newsRoutes,
    ...playerRoutes,
    ...albumRoutes,
    ...photoRoutes,
  ];
}

function route(
  base: string,
  path: string,
  priority: number,
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never"
): MetadataRoute.Sitemap[number] {
  return {
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}
