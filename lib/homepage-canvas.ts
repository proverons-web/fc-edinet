import type { HomepageCanvasConfig, HomepageCanvasViewport } from "@/lib/types";

type LegacyInput = {
  desktop_position_x?: number | null;
  desktop_position_y?: number | null;
  desktop_zoom_percent?: number | null;
  mobile_position_x?: number | null;
  mobile_position_y?: number | null;
  mobile_zoom_percent?: number | null;
  hero_height_desktop?: number | null;
  hero_height_mobile?: number | null;
  text_alignment?: "left" | "center" | "right" | null;
  show_match_card?: boolean | null;
};

export function defaultHomepageCanvas(input: LegacyInput = {}): HomepageCanvasConfig {
  const desktopBgX = clampInt(input.desktop_position_x, 0, 100, 50);
  const desktopBgY = clampInt(input.desktop_position_y, 0, 100, 50);
  const desktopZoom = clampInt(input.desktop_zoom_percent, 100, 240, 100);
  const mobileBgX = clampInt(input.mobile_position_x, 0, 100, desktopBgX);
  const mobileBgY = clampInt(input.mobile_position_y, 0, 100, desktopBgY);
  const mobileZoom = clampInt(input.mobile_zoom_percent, 100, 300, desktopZoom);
  const desktopHeight = clampInt(input.hero_height_desktop, 420, 900, 650);
  const mobileHeight = clampInt(input.hero_height_mobile, 360, 850, 620);
  const alignment = input.text_alignment ?? "left";
  const textX = alignment === "center" ? 50 : alignment === "right" ? 66 : 34;
  const show = input.show_match_card ?? true;

  return {
    snap_enabled: true,
    lock_safe_zone: true,
    desktop: viewport({
      background_x: desktopBgX,
      background_y: desktopBgY,
      background_zoom: desktopZoom,
      hero_height: desktopHeight,
      text_x: textX,
      text_y: 50,
      match_x: 74,
      match_y: 50,
      match_width: 360,
      match_visible: show,
      safe_top: 8,
      safe_right: 7,
      safe_bottom: 8,
      safe_left: 7,
    }),
    tablet: viewport({
      background_x: desktopBgX,
      background_y: desktopBgY,
      background_zoom: desktopZoom,
      hero_height: Math.max(520, Math.min(760, desktopHeight)),
      text_x: 50,
      text_y: show ? 30 : 50,
      match_x: 50,
      match_y: 72,
      match_width: 350,
      match_visible: show,
      safe_top: 7,
      safe_right: 6,
      safe_bottom: 7,
      safe_left: 6,
    }),
    mobile: viewport({
      background_x: mobileBgX,
      background_y: mobileBgY,
      background_zoom: mobileZoom,
      hero_height: mobileHeight,
      text_x: 50,
      text_y: 34,
      match_x: 50,
      match_y: 74,
      match_width: 320,
      match_visible: false,
      safe_top: 5,
      safe_right: 5,
      safe_bottom: 5,
      safe_left: 5,
    }),
  };
}

export function normalizeHomepageCanvas(value: unknown, fallback: HomepageCanvasConfig): HomepageCanvasConfig {
  if (!isRecord(value)) return fallback;
  return {
    snap_enabled: typeof value.snap_enabled === "boolean" ? value.snap_enabled : fallback.snap_enabled,
    lock_safe_zone: typeof value.lock_safe_zone === "boolean" ? value.lock_safe_zone : fallback.lock_safe_zone,
    desktop: normalizeViewport(value.desktop, fallback.desktop),
    tablet: normalizeViewport(value.tablet, fallback.tablet),
    mobile: normalizeViewport(value.mobile, fallback.mobile),
  };
}

export function normalizeCanvasForSave(value: unknown, fallback: HomepageCanvasConfig): HomepageCanvasConfig {
  return normalizeHomepageCanvas(value, fallback);
}

function normalizeViewport(value: unknown, fallback: HomepageCanvasViewport): HomepageCanvasViewport {
  if (!isRecord(value)) return fallback;
  return viewport({
    background_x: clampInt(value.background_x, 0, 100, fallback.background_x),
    background_y: clampInt(value.background_y, 0, 100, fallback.background_y),
    background_zoom: clampInt(value.background_zoom, 100, 300, fallback.background_zoom),
    hero_height: clampInt(value.hero_height, 320, 950, fallback.hero_height),
    text_x: clampInt(value.text_x, 0, 100, fallback.text_x),
    text_y: clampInt(value.text_y, 0, 100, fallback.text_y),
    match_x: clampInt(value.match_x, 0, 100, fallback.match_x),
    match_y: clampInt(value.match_y, 0, 100, fallback.match_y),
    match_width: clampInt(value.match_width, 240, 520, fallback.match_width),
    match_visible: typeof value.match_visible === "boolean" ? value.match_visible : fallback.match_visible,
    safe_top: clampInt(value.safe_top, 0, 30, fallback.safe_top),
    safe_right: clampInt(value.safe_right, 0, 30, fallback.safe_right),
    safe_bottom: clampInt(value.safe_bottom, 0, 30, fallback.safe_bottom),
    safe_left: clampInt(value.safe_left, 0, 30, fallback.safe_left),
  });
}

function viewport(value: HomepageCanvasViewport): HomepageCanvasViewport {
  return value;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
