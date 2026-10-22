export type CustomSitePage = {
  id: number;
  slug: string;
  title_ru: string;
  title_ro: string;
  intro_ru: string;
  intro_ro: string;
  body_ru: string;
  body_ro: string;
  hero_image_url: string | null;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type SiteMenuItem = {
  id: number;
  system_key: string | null;
  label_ru: string;
  label_ro: string;
  href: string;
  visible: boolean;
  display_order: number;
  parent_id: number | null;
  custom_page_id: number | null;
};

export function cleanSiteSlug(value: string) {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function publicCustomPagePath(slug: string) {
  return `/${cleanSiteSlug(slug)}`;
}
