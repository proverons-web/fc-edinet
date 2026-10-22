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

const RESERVED_SITE_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "account",
  "login",
  "register",
  "search",
  "news",
  "team",
  "staff",
  "statistics",
  "matches",
  "standings",
  "club",
  "academy",
  "media",
  "partners",
  "sitemap-xml",
  "robots-txt",
  "manifest-webmanifest",
  "opengraph-image",
  "icon-png",
  "apple-icon-png",
  "next",
]);

export function cleanSiteSlug(value: string) {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function isReservedSiteSlug(value: string) {
  const slug = cleanSiteSlug(value);
  return !slug || RESERVED_SITE_SLUGS.has(slug);
}

export function normalizeSiteMenuHref(value: string) {
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return null;
  if (href === "/") return "/";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#") && /^#[A-Za-z0-9_-]+$/.test(href)) return href;
  if (/^(mailto:|tel:)/i.test(href)) return href;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function publicCustomPagePath(slug: string) {
  return `/${cleanSiteSlug(slug)}`;
}
