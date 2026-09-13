import type {
  HomepageSectionDesign,
  HomepageSectionDesignMap,
  HomepageSectionKey,
} from "@/lib/types";

const defaults: Record<HomepageSectionKey, HomepageSectionDesign> = {
  matches: {
    width: "container",
    background: "inherit",
    padding_top: 0,
    padding_bottom: 0,
    item_limit: 3,
    columns_desktop: 3,
    columns_tablet: 2,
    columns_mobile: 1,
    show_heading: false,
    show_action: false,
  },
  standings: {
    width: "container",
    background: "inherit",
    padding_top: 88,
    padding_bottom: 88,
    item_limit: 5,
    columns_desktop: 1,
    columns_tablet: 1,
    columns_mobile: 1,
    show_heading: true,
    show_action: true,
  },
  news: {
    width: "container",
    background: "inherit",
    padding_top: 88,
    padding_bottom: 88,
    item_limit: 4,
    columns_desktop: 4,
    columns_tablet: 2,
    columns_mobile: 1,
    show_heading: true,
    show_action: true,
  },
  players: {
    width: "container",
    background: "inherit",
    padding_top: 88,
    padding_bottom: 88,
    item_limit: 4,
    columns_desktop: 4,
    columns_tablet: 2,
    columns_mobile: 1,
    show_heading: true,
    show_action: true,
  },
  media: {
    width: "container",
    background: "inherit",
    padding_top: 88,
    padding_bottom: 88,
    item_limit: 5,
    columns_desktop: 5,
    columns_tablet: 3,
    columns_mobile: 1,
    show_heading: true,
    show_action: true,
  },
  partners: {
    width: "container",
    background: "inherit",
    padding_top: 88,
    padding_bottom: 88,
    item_limit: 12,
    columns_desktop: 6,
    columns_tablet: 3,
    columns_mobile: 2,
    show_heading: true,
    show_action: true,
  },
};

export function defaultHomepageSectionDesign(key: HomepageSectionKey): HomepageSectionDesign {
  return { ...defaults[key] };
}

export function defaultHomepageSectionDesignMap(): HomepageSectionDesignMap {
  return {
    matches: defaultHomepageSectionDesign("matches"),
    standings: defaultHomepageSectionDesign("standings"),
    news: defaultHomepageSectionDesign("news"),
    players: defaultHomepageSectionDesign("players"),
    media: defaultHomepageSectionDesign("media"),
    partners: defaultHomepageSectionDesign("partners"),
  };
}

export function normalizeHomepageSectionDesign(
  key: HomepageSectionKey,
  raw: unknown,
  fallback = defaultHomepageSectionDesign(key)
): HomepageSectionDesign {
  const value = isRecord(raw) ? raw : {};
  return {
    width: width(value.width, fallback.width),
    background: background(value.background, fallback.background),
    padding_top: integer(value.padding_top, 0, 180, fallback.padding_top),
    padding_bottom: integer(value.padding_bottom, 0, 180, fallback.padding_bottom),
    item_limit: integer(value.item_limit, 1, key === "partners" ? 24 : 12, fallback.item_limit),
    columns_desktop: integer(value.columns_desktop, 1, 6, fallback.columns_desktop),
    columns_tablet: integer(value.columns_tablet, 1, 4, fallback.columns_tablet),
    columns_mobile: integer(value.columns_mobile, 1, 2, fallback.columns_mobile),
    show_heading: boolean(value.show_heading, fallback.show_heading),
    show_action: boolean(value.show_action, fallback.show_action),
  };
}

export function normalizeHomepageSectionDesignMap(
  raw: unknown,
  fallback = defaultHomepageSectionDesignMap()
): HomepageSectionDesignMap {
  const value = isRecord(raw) ? raw : {};
  return {
    matches: normalizeHomepageSectionDesign("matches", value.matches, fallback.matches),
    standings: normalizeHomepageSectionDesign("standings", value.standings, fallback.standings),
    news: normalizeHomepageSectionDesign("news", value.news, fallback.news),
    players: normalizeHomepageSectionDesign("players", value.players, fallback.players),
    media: normalizeHomepageSectionDesign("media", value.media, fallback.media),
    partners: normalizeHomepageSectionDesign("partners", value.partners, fallback.partners),
  };
}

export function homepageSectionCapabilities(key: HomepageSectionKey) {
  return {
    grid: key !== "standings",
    itemLimit: key !== "matches",
    heading: key !== "matches",
    action: key !== "matches",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function width(value: unknown, fallback: HomepageSectionDesign["width"]): HomepageSectionDesign["width"] {
  return value === "container" || value === "wide" || value === "full" ? value : fallback;
}

function background(value: unknown, fallback: HomepageSectionDesign["background"]): HomepageSectionDesign["background"] {
  return value === "inherit" || value === "light" || value === "dark" || value === "brand" ? value : fallback;
}
