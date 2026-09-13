import type { HeroLayerConfig, HomepageCanvasConfig, HomepageCanvasViewport } from "@/lib/types";

export type HomepageCanvasMode = "desktop" | "tablet" | "mobile";
export type HomepageCanvasObject = "text" | "match";

export type HomepageSafeRange = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  fitsHorizontally: boolean;
  fitsVertically: boolean;
};

export type HomepageSafeIssue = {
  object: HomepageCanvasObject;
  label: string;
  horizontal: boolean;
  vertical: boolean;
  impossible: boolean;
};

const VIEWPORT_WIDTH: Record<HomepageCanvasMode, number> = {
  desktop: 1440,
  tablet: 900,
  mobile: 390,
};

/**
 * Keep these values in sync with the public Canvas Hero CSS in app/globals.css.
 * Width is deterministic. Height is intentionally a conservative estimate because
 * the real text/card height depends on locale and live match data.
 */
export function homepageObjectFootprint(viewport: HomepageCanvasViewport, mode: HomepageCanvasMode, object: HomepageCanvasObject) {
  const width = VIEWPORT_WIDTH[mode];
  if (object === "text") {
    const objectWidth = mode === "desktop"
      ? Math.min(610, width * 0.54)
      : mode === "tablet"
        ? Math.min(650, width * 0.78)
        : Math.min(520, width * 0.88);
    const estimatedHeight = mode === "desktop" ? 290 : mode === "tablet" ? 250 : 240;
    return {
      halfWidthPercent: (objectWidth / width) * 50,
      halfHeightPercent: Math.min(28, (estimatedHeight / Math.max(320, viewport.hero_height)) * 50),
    };
  }

  const responsiveCap = mode === "desktop" ? width * 0.42 : mode === "tablet" ? width * 0.72 : width * 0.88;
  const objectWidth = Math.min(viewport.match_width, responsiveCap);
  const estimatedHeight = mode === "desktop" ? 280 : mode === "tablet" ? 245 : 205;
  return {
    halfWidthPercent: (objectWidth / width) * 50,
    halfHeightPercent: Math.min(26, (estimatedHeight / Math.max(320, viewport.hero_height)) * 50),
  };
}

export function homepageObjectSafeRange(viewport: HomepageCanvasViewport, mode: HomepageCanvasMode, object: HomepageCanvasObject): HomepageSafeRange {
  const footprint = homepageObjectFootprint(viewport, mode, object);
  const minX = viewport.safe_left + footprint.halfWidthPercent;
  const maxX = 100 - viewport.safe_right - footprint.halfWidthPercent;
  const minY = viewport.safe_top + footprint.halfHeightPercent;
  const maxY = 100 - viewport.safe_bottom - footprint.halfHeightPercent;
  return {
    minX,
    maxX,
    minY,
    maxY,
    fitsHorizontally: minX <= maxX,
    fitsVertically: minY <= maxY,
  };
}

export function homepageViewportSafeIssues(viewport: HomepageCanvasViewport, mode: HomepageCanvasMode, layers?: HeroLayerConfig): HomepageSafeIssue[] {
  const issues: HomepageSafeIssue[] = [];
  const textVisible = !layers?.intro || layers.intro.visible;
  const matchVisible = (!layers?.match_card || layers.match_card.visible) && viewport.match_visible;

  if (textVisible) {
    const range = homepageObjectSafeRange(viewport, mode, "text");
    const horizontal = !range.fitsHorizontally || viewport.text_x < range.minX || viewport.text_x > range.maxX;
    const vertical = !range.fitsVertically || viewport.text_y < range.minY || viewport.text_y > range.maxY;
    if (horizontal || vertical) issues.push({ object: "text", label: "текст", horizontal, vertical, impossible: !range.fitsHorizontally || !range.fitsVertically });
  }

  if (matchVisible) {
    const range = homepageObjectSafeRange(viewport, mode, "match");
    const horizontal = !range.fitsHorizontally || viewport.match_x < range.minX || viewport.match_x > range.maxX;
    const vertical = !range.fitsVertically || viewport.match_y < range.minY || viewport.match_y > range.maxY;
    if (horizontal || vertical) issues.push({ object: "match", label: "карточка матча", horizontal, vertical, impossible: !range.fitsHorizontally || !range.fitsVertically });
  }

  return issues;
}

export function fitHomepageViewportToSafeZone(
  viewport: HomepageCanvasViewport,
  mode: HomepageCanvasMode,
  layers?: HeroLayerConfig,
  fallback?: HomepageCanvasViewport,
): HomepageCanvasViewport {
  let next = { ...viewport };
  const textVisible = !layers?.intro || layers.intro.visible;
  const matchVisible = (!layers?.match_card || layers.match_card.visible) && next.match_visible;

  if (textVisible) {
    const range = homepageObjectSafeRange(next, mode, "text");
    if (range.fitsHorizontally) next.text_x = repairCoordinate(next.text_x, range.minX, range.maxX, fallback?.text_x);
    else next.text_x = safeCenter(next.safe_left, next.safe_right);
    if (range.fitsVertically) next.text_y = repairCoordinate(next.text_y, range.minY, range.maxY, fallback?.text_y);
    else next.text_y = safeCenter(next.safe_top, next.safe_bottom);
  }

  if (matchVisible) {
    const range = homepageObjectSafeRange(next, mode, "match");
    if (range.fitsHorizontally) next.match_x = repairCoordinate(next.match_x, range.minX, range.maxX, fallback?.match_x);
    else next.match_x = safeCenter(next.safe_left, next.safe_right);
    if (range.fitsVertically) next.match_y = repairCoordinate(next.match_y, range.minY, range.maxY, fallback?.match_y);
    else next.match_y = safeCenter(next.safe_top, next.safe_bottom);
  }

  return {
    ...next,
    text_x: Math.round(next.text_x),
    text_y: Math.round(next.text_y),
    match_x: Math.round(next.match_x),
    match_y: Math.round(next.match_y),
  };
}

export function repairHomepageCanvas(
  canvas: HomepageCanvasConfig,
  fallback: HomepageCanvasConfig = canvas,
  layers?: HeroLayerConfig,
): HomepageCanvasConfig {
  if (!canvas.lock_safe_zone) return canvas;
  return {
    ...canvas,
    desktop: fitHomepageViewportToSafeZone(canvas.desktop, "desktop", layers, fallback.desktop),
    tablet: fitHomepageViewportToSafeZone(canvas.tablet, "tablet", layers, fallback.tablet),
    mobile: fitHomepageViewportToSafeZone(canvas.mobile, "mobile", layers, fallback.mobile),
  };
}

export function homepageCanvasSafeIssueSummary(canvas: HomepageCanvasConfig, layers?: HeroLayerConfig) {
  return (Object.keys(VIEWPORT_WIDTH) as HomepageCanvasMode[]).flatMap((mode) =>
    homepageViewportSafeIssues(canvas[mode], mode, layers).map((issue) => ({ mode, ...issue }))
  );
}

function repairCoordinate(value: number, min: number, max: number, fallback?: number) {
  if (value >= min && value <= max) return value;
  if (typeof fallback === "number" && Number.isFinite(fallback) && fallback >= min && fallback <= max) return fallback;
  return clamp(value, min, max);
}

function safeCenter(start: number, end: number) {
  return Math.round((start + (100 - end)) / 2);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
