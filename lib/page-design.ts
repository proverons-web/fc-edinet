import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PageHeroBackgroundMode,
  PageHeroOverlayStyle,
  SitePageDesignKey,
  SitePageDesignSnapshot,
} from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { defaultHeroLayerConfig, normalizeHeroLayerConfig, siteHeroLayerDefinitions } from "@/lib/hero-builder";

export type SitePageDesignCatalogItem = {
  key: SitePageDesignKey;
  label: string;
  group: "sections" | "templates";
  route: string;
  editableText: boolean;
  supportsContentImage: boolean;
  preview: { eyebrow: string; title: string; description: string };
};

export const sitePageDesignCatalog: SitePageDesignCatalogItem[] = [
  { key: "news", label: "Новости", group: "sections", route: "/news", editableText: true, supportsContentImage: false, preview: { eyebrow: "FC EDINEȚ", title: "Новости", description: "Последние новости и события футбольного клуба." } },
  { key: "team", label: "Команда", group: "sections", route: "/team", editableText: true, supportsContentImage: false, preview: { eyebrow: "FC EDINEȚ", title: "Команда", description: "Игроки основного состава FC Edineț." } },
  { key: "matches", label: "Матчи", group: "sections", route: "/matches", editableText: true, supportsContentImage: false, preview: { eyebrow: "FC EDINEȚ", title: "Матчи", description: "Календарь, результаты и ближайшие игры клуба." } },
  { key: "standings", label: "Турнирная таблица", group: "sections", route: "/standings", editableText: true, supportsContentImage: false, preview: { eyebrow: "FC EDINEȚ", title: "Турнирная таблица", description: "Положение команд в текущем соревновании." } },
  { key: "club", label: "Клуб", group: "sections", route: "/club", editableText: false, supportsContentImage: true, preview: { eyebrow: "EDINEȚ • MOLDOVA", title: "FC EDINEȚ", description: "История, стадион и люди клуба." } },
  { key: "media", label: "Медиа", group: "sections", route: "/media", editableText: true, supportsContentImage: false, preview: { eyebrow: "FC EDINEȚ MEDIA", title: "Медиа", description: "Фотоальбомы и видео из жизни клуба." } },
  { key: "partners", label: "Партнёры", group: "sections", route: "/partners", editableText: true, supportsContentImage: false, preview: { eyebrow: "FC EDINEȚ", title: "Партнёры", description: "Компании и организации, которые поддерживают клуб." } },
  { key: "template_news", label: "Шаблон новости", group: "templates", route: "/news/[slug]", editableText: false, supportsContentImage: true, preview: { eyebrow: "НОВОСТЬ • 12 СЕНТЯБРЯ", title: "Заголовок новости", description: "Краткое описание опубликованного материала." } },
  { key: "template_player", label: "Шаблон игрока", group: "templates", route: "/team/[slug]", editableText: false, supportsContentImage: true, preview: { eyebrow: "ПОЛУЗАЩИТНИК", title: "ИМЯ ФАМИЛИЯ", description: "Профиль футболиста FC Edineț." } },
  { key: "template_album", label: "Шаблон фотоальбома", group: "templates", route: "/media/[slug]", editableText: false, supportsContentImage: true, preview: { eyebrow: "12 СЕНТЯБРЯ • EDINEȚ", title: "Название фотоальбома", description: "Фотографии с матча и клубных событий." } },
];

const defaults: Record<SitePageDesignKey, SitePageDesignSnapshot> = {
  news: base({ hero_height_desktop: 310, hero_height_mobile: 250 }),
  team: base({ hero_height_desktop: 310, hero_height_mobile: 250 }),
  matches: base({ hero_height_desktop: 310, hero_height_mobile: 250 }),
  standings: base({ hero_height_desktop: 310, hero_height_mobile: 250 }),
  club: base({ background_mode: "content", hero_height_desktop: 430, hero_height_mobile: 350, overlay_opacity: 70, overlay_style: "gradient-left", content_width: 1050 }),
  media: base({ hero_height_desktop: 330, hero_height_mobile: 270 }),
  partners: base({ hero_height_desktop: 310, hero_height_mobile: 250 }),
  template_news: base({ hero_height_desktop: 360, hero_height_mobile: 310, content_width: 980 }),
  template_player: base({ hero_height_desktop: 660, hero_height_mobile: 760, content_width: 1200 }),
  template_album: base({ background_mode: "content", hero_height_desktop: 390, hero_height_mobile: 340, overlay_opacity: 68, overlay_style: "gradient-left", content_width: 1000 }),
};

export function defaultSitePageDesign(key: SitePageDesignKey): SitePageDesignSnapshot {
  return { ...defaults[key], layer_config: defaultHeroLayerConfig(siteHeroLayerDefinitions(key)) };
}

export async function getPublishedSitePageDesign(
  supabase: SupabaseClient,
  key: SitePageDesignKey
): Promise<SitePageDesignSnapshot> {
  const fallback = defaultSitePageDesign(key);
  const { data } = await supabase.from("site_page_designs").select("*").eq("page_key", key).maybeSingle();
  if (!data) return fallback;
  return normalizeSitePageDesign(data as Record<string, unknown>, fallback);
}

export function normalizeSitePageDesign(
  raw: Record<string, unknown>,
  fallback: SitePageDesignSnapshot
): SitePageDesignSnapshot {
  return {
    background_mode: mode(raw.background_mode, fallback.background_mode),
    desktop_image_url: nullable(raw.desktop_image_url, fallback.desktop_image_url),
    tablet_image_url: nullable(raw.tablet_image_url, fallback.tablet_image_url),
    mobile_image_url: nullable(raw.mobile_image_url, fallback.mobile_image_url),
    desktop_position_x: integer(raw.desktop_position_x, 0, 100, fallback.desktop_position_x),
    desktop_position_y: integer(raw.desktop_position_y, 0, 100, fallback.desktop_position_y),
    desktop_zoom_percent: integer(raw.desktop_zoom_percent, 100, 300, fallback.desktop_zoom_percent),
    tablet_position_x: integer(raw.tablet_position_x, 0, 100, fallback.tablet_position_x),
    tablet_position_y: integer(raw.tablet_position_y, 0, 100, fallback.tablet_position_y),
    tablet_zoom_percent: integer(raw.tablet_zoom_percent, 100, 300, fallback.tablet_zoom_percent),
    mobile_position_x: integer(raw.mobile_position_x, 0, 100, fallback.mobile_position_x),
    mobile_position_y: integer(raw.mobile_position_y, 0, 100, fallback.mobile_position_y),
    mobile_zoom_percent: integer(raw.mobile_zoom_percent, 100, 300, fallback.mobile_zoom_percent),
    hero_height_desktop: integer(raw.hero_height_desktop, 200, 950, fallback.hero_height_desktop),
    hero_height_tablet: integer(raw.hero_height_tablet, 180, 950, fallback.hero_height_tablet),
    hero_height_mobile: integer(raw.hero_height_mobile, 180, 900, fallback.hero_height_mobile),
    overlay_opacity: integer(raw.overlay_opacity, 0, 95, fallback.overlay_opacity),
    overlay_style: overlayStyle(raw.overlay_style, fallback.overlay_style),
    text_alignment: alignment(raw.text_alignment, fallback.text_alignment),
    content_width: integer(raw.content_width, 420, 1200, fallback.content_width),
    show_eyebrow: boolean(raw.show_eyebrow, fallback.show_eyebrow),
    show_description: boolean(raw.show_description, fallback.show_description),
    eyebrow_ru: nullable(raw.eyebrow_ru, fallback.eyebrow_ru),
    eyebrow_ro: nullable(raw.eyebrow_ro, fallback.eyebrow_ro),
    title_ru: nullable(raw.title_ru, fallback.title_ru),
    title_ro: nullable(raw.title_ro, fallback.title_ro),
    description_ru: nullable(raw.description_ru, fallback.description_ru),
    description_ro: nullable(raw.description_ro, fallback.description_ro),
    layer_config: normalizeHeroLayerConfig(raw.layer_config, layerDefinitionsForRaw(raw, fallback), fallback.layer_config),
  };
}

export function resolvePageHeroText(
  design: SitePageDesignSnapshot,
  locale: Locale,
  fallback: { eyebrow?: string | null; title: string; description?: string | null }
) {
  const ro = locale === "ro";
  return {
    eyebrow: (ro ? design.eyebrow_ro : design.eyebrow_ru) || fallback.eyebrow || "",
    title: (ro ? design.title_ro : design.title_ru) || fallback.title,
    description: (ro ? design.description_ro : design.description_ru) || fallback.description || "",
  };
}

function base(overrides: Partial<SitePageDesignSnapshot> = {}): SitePageDesignSnapshot {
  return {
    background_mode: "default",
    desktop_image_url: null,
    tablet_image_url: null,
    mobile_image_url: null,
    desktop_position_x: 50,
    desktop_position_y: 50,
    desktop_zoom_percent: 100,
    tablet_position_x: 50,
    tablet_position_y: 50,
    tablet_zoom_percent: 100,
    mobile_position_x: 50,
    mobile_position_y: 50,
    mobile_zoom_percent: 100,
    hero_height_desktop: 310,
    hero_height_tablet: 290,
    hero_height_mobile: 250,
    overlay_opacity: 58,
    overlay_style: "solid",
    text_alignment: "left",
    content_width: 720,
    show_eyebrow: true,
    show_description: true,
    eyebrow_ru: null,
    eyebrow_ro: null,
    title_ru: null,
    title_ro: null,
    description_ru: null,
    description_ro: null,
    layer_config: {},
    ...overrides,
  };
}

function layerDefinitionsForRaw(raw: Record<string, unknown>, fallback: SitePageDesignSnapshot) {
  const key = raw.page_key;
  if (typeof key === "string" && sitePageDesignCatalog.some((item) => item.key === key)) return siteHeroLayerDefinitions(key as SitePageDesignKey);
  return Object.keys(fallback.layer_config).map((layerKey) => ({ key: layerKey, label: layerKey, description: "" }));
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}
function nullable(value: unknown, fallback: string | null) {
  return typeof value === "string" ? value || null : value === null ? null : fallback;
}
function boolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
function mode(value: unknown, fallback: PageHeroBackgroundMode): PageHeroBackgroundMode {
  return value === "default" || value === "custom" || value === "content" ? value : fallback;
}
function overlayStyle(value: unknown, fallback: PageHeroOverlayStyle): PageHeroOverlayStyle {
  return value === "solid" || value === "gradient-left" || value === "gradient-right" ? value : fallback;
}
function alignment(value: unknown, fallback: SitePageDesignSnapshot["text_alignment"]): SitePageDesignSnapshot["text_alignment"] {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}
