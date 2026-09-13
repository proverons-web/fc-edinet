import type { Locale } from "@/lib/i18n";

export type HeaderNavKey = "news" | "team" | "statistics" | "matches" | "standings" | "club" | "media";
export type HeaderBackground = "solid" | "glass" | "transparent";
export type FooterBackground = "dark" | "blue" | "light";

export type HeaderDesignConfig = {
  topbar_enabled: boolean;
  topbar_text_ru: string;
  topbar_text_ro: string;
  sticky: boolean;
  background: HeaderBackground;
  height_desktop: number;
  height_mobile: number;
  logo_mode: "crest" | "image";
  logo_url: string | null;
  logo_width: number;
  brand_name: string;
  brand_subtitle: string;
  show_brand_text: boolean;
  show_language: boolean;
  show_search: boolean;
  show_account: boolean;
  show_admin_link: boolean;
  nav_order: HeaderNavKey[];
  nav_visibility: Record<HeaderNavKey, boolean>;
};

export type FooterLinkConfig = {
  id: string;
  label_ru: string;
  label_ro: string;
  href: string;
};

export type FooterColumnConfig = {
  id: string;
  title_ru: string;
  title_ro: string;
  visible: boolean;
  links: FooterLinkConfig[];
};

export type FooterDesignConfig = {
  background: FooterBackground;
  logo_mode: "crest" | "image";
  logo_url: string | null;
  logo_width: number;
  brand_name: string;
  brand_subtitle: string;
  about_ru: string;
  about_ro: string;
  show_about: boolean;
  columns: FooterColumnConfig[];
  social_enabled: boolean;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  tiktok_url: string;
  show_copyright: boolean;
  copyright_text: string;
  show_version: boolean;
  padding_top: number;
  padding_bottom: number;
};

export const headerNavKeys: HeaderNavKey[] = ["news", "team", "statistics", "matches", "standings", "club", "media"];

export const defaultHeaderDesign: HeaderDesignConfig = {
  topbar_enabled: true,
  topbar_text_ru: "Официальный сайт FC Edineț",
  topbar_text_ro: "Site-ul oficial FC Edineț",
  sticky: true,
  background: "glass",
  height_desktop: 78,
  height_mobile: 68,
  logo_mode: "crest",
  logo_url: null,
  logo_width: 46,
  brand_name: "FC EDINEȚ",
  brand_subtitle: "MOLDOVA",
  show_brand_text: true,
  show_language: true,
  show_search: true,
  show_account: true,
  show_admin_link: true,
  nav_order: [...headerNavKeys],
  nav_visibility: Object.fromEntries(headerNavKeys.map((key) => [key, true])) as Record<HeaderNavKey, boolean>,
};

export const defaultFooterDesign: FooterDesignConfig = {
  background: "dark",
  logo_mode: "crest",
  logo_url: null,
  logo_width: 46,
  brand_name: "FC EDINEȚ",
  brand_subtitle: "MOLDOVA",
  about_ru: "Официальный сайт футбольного клуба FC Edineț.",
  about_ro: "Site-ul oficial al clubului de fotbal FC Edineț.",
  show_about: true,
  columns: [
    {
      id: "club",
      title_ru: "Клуб",
      title_ro: "Club",
      visible: true,
      links: [
        { id: "history", label_ru: "История", label_ro: "Istorie", href: "/club" },
        { id: "stadium", label_ru: "Стадион", label_ro: "Stadion", href: "/club" },
        { id: "partners", label_ru: "Партнёры", label_ro: "Parteneri", href: "/partners" },
      ],
    },
    {
      id: "team",
      title_ru: "Команда",
      title_ro: "Echipa",
      visible: true,
      links: [
        { id: "players", label_ru: "Игроки", label_ro: "Jucători", href: "/team" },
        { id: "statistics", label_ru: "Статистика", label_ro: "Statistici", href: "/statistics" },
        { id: "matches", label_ru: "Матчи", label_ro: "Meciuri", href: "/matches" },
      ],
    },
    {
      id: "media",
      title_ru: "Медиа",
      title_ro: "Media",
      visible: true,
      links: [
        { id: "news", label_ru: "Новости", label_ro: "Știri", href: "/news" },
        { id: "photos", label_ru: "Фото", label_ro: "Foto", href: "/media" },
        { id: "videos", label_ru: "Видео", label_ro: "Video", href: "/media" },
      ],
    },
  ],
  social_enabled: false,
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  tiktok_url: "",
  show_copyright: true,
  copyright_text: "© 2026 FC Edineț",
  show_version: true,
  padding_top: 60,
  padding_bottom: 26,
};

export function localizedValue(ru: string, ro: string, locale: Locale) {
  return locale === "ro" ? (ro.trim() || ru.trim()) : ru.trim();
}

export function normalizeHeaderDesign(value: unknown, fallback: HeaderDesignConfig = defaultHeaderDesign): HeaderDesignConfig {
  const raw = objectValue(value);
  const order = uniqueHeaderKeys(raw.nav_order, fallback.nav_order);
  const visibilityRaw = objectValue(raw.nav_visibility);
  return {
    topbar_enabled: booleanValue(raw.topbar_enabled, fallback.topbar_enabled),
    topbar_text_ru: stringValue(raw.topbar_text_ru, fallback.topbar_text_ru),
    topbar_text_ro: stringValue(raw.topbar_text_ro, fallback.topbar_text_ro),
    sticky: booleanValue(raw.sticky, fallback.sticky),
    background: enumValue(raw.background, ["solid", "glass", "transparent"] as const, fallback.background),
    height_desktop: numberValue(raw.height_desktop, 56, 120, fallback.height_desktop),
    height_mobile: numberValue(raw.height_mobile, 52, 96, fallback.height_mobile),
    logo_mode: enumValue(raw.logo_mode, ["crest", "image"] as const, fallback.logo_mode),
    logo_url: safeImageUrl(raw.logo_url, fallback.logo_url),
    logo_width: numberValue(raw.logo_width, 28, 120, fallback.logo_width),
    brand_name: stringValue(raw.brand_name, fallback.brand_name),
    brand_subtitle: stringValue(raw.brand_subtitle, fallback.brand_subtitle),
    show_brand_text: booleanValue(raw.show_brand_text, fallback.show_brand_text),
    show_language: booleanValue(raw.show_language, fallback.show_language),
    show_search: booleanValue(raw.show_search, fallback.show_search),
    show_account: booleanValue(raw.show_account, fallback.show_account),
    show_admin_link: booleanValue(raw.show_admin_link, fallback.show_admin_link),
    nav_order: order,
    nav_visibility: Object.fromEntries(headerNavKeys.map((key) => [key, typeof visibilityRaw[key] === "boolean" ? visibilityRaw[key] : fallback.nav_visibility[key]])) as Record<HeaderNavKey, boolean>,
  };
}

export function normalizeFooterDesign(value: unknown, fallback: FooterDesignConfig = defaultFooterDesign): FooterDesignConfig {
  const raw = objectValue(value);
  const columnsRaw = Array.isArray(raw.columns) ? raw.columns : fallback.columns;
  const columns = columnsRaw.slice(0, 6).map((item, columnIndex) => normalizeFooterColumn(item, fallback.columns[columnIndex] ?? {
    id: `column-${columnIndex + 1}`,
    title_ru: "Колонка",
    title_ro: "Coloană",
    visible: true,
    links: [],
  }));
  return {
    background: enumValue(raw.background, ["dark", "blue", "light"] as const, fallback.background),
    logo_mode: enumValue(raw.logo_mode, ["crest", "image"] as const, fallback.logo_mode),
    logo_url: safeImageUrl(raw.logo_url, fallback.logo_url),
    logo_width: numberValue(raw.logo_width, 28, 120, fallback.logo_width),
    brand_name: stringValue(raw.brand_name, fallback.brand_name),
    brand_subtitle: stringValue(raw.brand_subtitle, fallback.brand_subtitle),
    about_ru: stringValue(raw.about_ru, fallback.about_ru),
    about_ro: stringValue(raw.about_ro, fallback.about_ro),
    show_about: booleanValue(raw.show_about, fallback.show_about),
    columns,
    social_enabled: booleanValue(raw.social_enabled, fallback.social_enabled),
    facebook_url: safeUrl(raw.facebook_url),
    instagram_url: safeUrl(raw.instagram_url),
    youtube_url: safeUrl(raw.youtube_url),
    tiktok_url: safeUrl(raw.tiktok_url),
    show_copyright: booleanValue(raw.show_copyright, fallback.show_copyright),
    copyright_text: stringValue(raw.copyright_text, fallback.copyright_text),
    show_version: booleanValue(raw.show_version, fallback.show_version),
    padding_top: numberValue(raw.padding_top, 20, 140, fallback.padding_top),
    padding_bottom: numberValue(raw.padding_bottom, 12, 100, fallback.padding_bottom),
  };
}

function normalizeFooterColumn(value: unknown, fallback: FooterColumnConfig): FooterColumnConfig {
  const raw = objectValue(value);
  const linksRaw = Array.isArray(raw.links) ? raw.links : fallback.links;
  return {
    id: slugValue(raw.id, fallback.id),
    title_ru: stringValue(raw.title_ru, fallback.title_ru),
    title_ro: stringValue(raw.title_ro, fallback.title_ro),
    visible: booleanValue(raw.visible, fallback.visible),
    links: linksRaw.slice(0, 10).map((link, index) => normalizeFooterLink(link, fallback.links[index] ?? {
      id: `link-${index + 1}`,
      label_ru: "Ссылка",
      label_ro: "Link",
      href: "/",
    })),
  };
}

function normalizeFooterLink(value: unknown, fallback: FooterLinkConfig): FooterLinkConfig {
  const raw = objectValue(value);
  return {
    id: slugValue(raw.id, fallback.id),
    label_ru: stringValue(raw.label_ru, fallback.label_ru),
    label_ro: stringValue(raw.label_ro, fallback.label_ro),
    href: safeHref(raw.href, fallback.href),
  };
}

function uniqueHeaderKeys(value: unknown, fallback: HeaderNavKey[]) {
  if (!Array.isArray(value)) return [...fallback];
  const valid = value.map(String).filter((item, index, array): item is HeaderNavKey => headerNavKeys.includes(item as HeaderNavKey) && array.indexOf(item) === index);
  // v2.2.5: existing published headers do not know about the new Statistics item.
  // Insert it next to Team instead of silently pushing it to the far right.
  if (!valid.includes("statistics")) {
    const teamIndex = valid.indexOf("team");
    valid.splice(teamIndex >= 0 ? teamIndex + 1 : valid.length, 0, "statistics");
  }
  for (const key of headerNavKeys) if (!valid.includes(key)) valid.push(key);
  return valid;
}
function objectValue(value: unknown): Record<string, any> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {}; }
function booleanValue(value: unknown, fallback: boolean) { return typeof value === "boolean" ? value : fallback; }
function stringValue(value: unknown, fallback: string) { return typeof value === "string" ? value.trim() : fallback; }
function nullableString(value: unknown, fallback: string | null) { return value === null ? null : typeof value === "string" ? (value.trim() || null) : fallback; }
function numberValue(value: unknown, min: number, max: number, fallback: number) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback; }
function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T { return typeof value === "string" && values.includes(value as T) ? value as T : fallback; }
function slugValue(value: unknown, fallback: string) { const candidate = typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") : ""; return candidate || fallback; }
function safeUrl(value: unknown) { if (typeof value !== "string") return ""; const candidate = value.trim(); return /^https?:\/\//i.test(candidate) ? candidate : ""; }
function safeImageUrl(value: unknown, fallback: string | null) { if (value === null) return null; if (typeof value !== "string") return fallback; const candidate = value.trim(); return /^https?:\/\//i.test(candidate) ? candidate : null; }
function safeHref(value: unknown, fallback: string) { if (typeof value !== "string") return fallback; const candidate = value.trim(); if ((candidate.startsWith("/") && !candidate.startsWith("//")) || /^https?:\/\//i.test(candidate) || /^(mailto:|tel:)/i.test(candidate)) return candidate; return fallback; }
