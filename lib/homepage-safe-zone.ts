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

/**
 * Conservative widths for each breakpoint. Desktop/tablet use the smallest
 * width of their media-query range so a position that is safe here stays safe
 * as the browser gets wider. Mobile width is representative; the text width is
 * percentage-based, so its footprint remains effectively the same on smaller
 * devices.
 */
const VIEWPORT_WIDTH: Record<HomepageCanvasMode, number> = {
  desktop: 981,
  tablet: 681,
  mobile: 390,
};

/**
 * Keep these values in sync with the public Canvas Hero CSS in app/globals.css.
 * Width is deterministic. Height is a conservative estimate because real text
 * and live match data can wrap differently between RU/RO and devices.
 */
export function homepageObjectFootprint(viewport: HomepageCanvasViewport, mode: HomepageCanvasMode, object: HomepageCanvasObject) {
  const width = VIEWPORT_WIDTH[mode];
  if (object === "text") {
    const objectWidth = mode === "desktop"
      ? Math.min(610, width * 0.54)
      : mode === "tablet"
        ? Math.min(650, width * 0.78)
        : Math.min(520, width * 0.88);
    const estimatedHeight = mode === "desktop" ? 300 : mode === "tablet" ? 270 : 250;
    return {
      halfWidthPercent: (objectWidth / width) * 50,
      halfHeightPercent: Math.min(34, (estimatedHeight / Math.max(320, viewport.hero_height)) * 50),
    };
  }

  const responsiveCap = mode === "desktop" ? width * 0.42 : mode === "tablet" ? width * 0.72 : width * 0.88;
  const objectWidth = Math.min(viewport.match_width, responsiveCap);
  const estimatedHeight = mode === "desktop" ? 280 : mode === "tablet" ? 245 : 210;
  return {
    halfWidthPercent: (objectWidth / width) * 50,
    halfHeightPercent: Math.min(30, (estimatedHeight / Math.max(320, viewport.hero_height)) * 50),
  };
}

export function homepageObjectSafeRange(viewport: HomepageCanvasViewport, mode: HomepageCanvasMode, object: HomepageCanvasObject): HomepageSafeRange {
  return objectRange(viewport, mode, object, true);
}

export function homepageObjectVisibleRange(viewport: HomepageCanvasViewport, mode: HomepageCanvasMode, object: HomepageCanvasObject): HomepageSafeRange {
  return objectRange(viewport, mode, object, false);
}

function objectRange(viewport: HomepageCanvasViewport, mode: HomepageCanvasMode, object: HomepageCanvasObject, useSafeZone: boolean): HomepageSafeRange {
  const footprint = homepageObjectFootprint(viewport, mode, object);
  const safeLeft = useSafeZone ? viewport.safe_left : 0;
  const safeRight = useSafeZone ? viewport.safe_right : 0;
  const safeTop = useSafeZone ? viewport.safe_top : 0;
  const safeBottom = useSafeZone ? viewport.safe_bottom : 0;
  const minX = safeLeft + footprint.halfWidthPercent;
  const maxX = 100 - safeRight - footprint.halfWidthPercent;
  const minY = safeTop + footprint.halfHeightPercent;
  const maxY = 100 - safeBottom - footprint.halfHeightPercent;
  return {
    minX,
    maxX,
    minY,
    maxY,
    fitsHorizontally: Math.ceil(minX) <= Math.floor(maxX),
    fitsVertically: Math.ceil(minY) <= Math.floor(maxY),
  };
}

export function homepageViewportSafeIssues(viewport: HomepageCanvasViewport, mode: HomepageCanvasMode, layers?: HeroLayerConfig): HomepageSafeIssue[] {
  const issues: HomepageSafeIssue[] = [];
  const textVisible = !layers?.intro || layers.intro.visible;
  const matchVisible = (!layers?.match_card || layers.match_card.visible) && viewport.match_visible;

  if (textVisible) {
    const range = homepageObjectSafeRange(viewport, mode, "text");
    const horizontal = !range.fitsHorizontally || viewport.text_x < Math.ceil(range.minX) || viewport.text_x > Math.floor(range.maxX);
    const vertical = !range.fitsVertically || viewport.text_y < Math.ceil(range.minY) || viewport.text_y > Math.floor(range.maxY);
    if (horizontal || vertical) issues.push({ object: "text", label: "текст", horizontal, vertical, impossible: !range.fitsHorizontally || !range.fitsVertically });
  }

  if (matchVisible) {
    const range = homepageObjectSafeRange(viewport, mode, "match");
    const horizontal = !range.fitsHorizontally || viewport.match_x < Math.ceil(range.minX) || viewport.match_x > Math.floor(range.maxX);
    const vertical = !range.fitsVertically || viewport.match_y < Math.ceil(range.minY) || viewport.match_y > Math.floor(range.maxY);
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
  return fitHomepageViewport(viewport, mode, layers, fallback, true);
}

export function fitHomepageViewportToVisibleBounds(
  viewport: HomepageCanvasViewport,
  mode: HomepageCanvasMode,
  layers?: HeroLayerConfig,
  fallback?: HomepageCanvasViewport,
): HomepageCanvasViewport {
  return fitHomepageViewport(viewport, mode, layers, fallback, false);
}

function fitHomepageViewport(
  viewport: HomepageCanvasViewport,
  mode: HomepageCanvasMode,
  layers: HeroLayerConfig | undefined,
  fallback: HomepageCanvasViewport | undefined,
  useSafeZone: boolean,
): HomepageCanvasViewport {
  let next = { ...viewport };
  const textVisible = !layers?.intro || layers.intro.visible;
  const matchVisible = (!layers?.match_card || layers.match_card.visible) && next.match_visible;

  if (textVisible) {
    const range = objectRange(next, mode, "text", useSafeZone);
    next.text_x = repairCoordinate(next.text_x, range.minX, range.maxX, fallback?.text_x);
    next.text_y = repairCoordinate(next.text_y, range.minY, range.maxY, fallback?.text_y);
  }

  if (matchVisible) {
    const range = objectRange(next, mode, "match", useSafeZone);
    next.match_x = repairCoordinate(next.match_x, range.minX, range.maxX, fallback?.match_x);
    next.match_y = repairCoordinate(next.match_y, range.minY, range.maxY, fallback?.match_y);
  }

  return next;
}

/**
 * Safe Zone is advisory when Lock is disabled. Objects may intentionally
 * leave the safe rectangle and even the visible Hero. When Lock is enabled
 * the previous safe-clamping behaviour is preserved.
 */
export function repairHomepageCanvas(
  canvas: HomepageCanvasConfig,
  fallback: HomepageCanvasConfig = canvas,
  layers?: HeroLayerConfig,
): HomepageCanvasConfig {
  if (!canvas.lock_safe_zone) {
    return {
      ...canvas,
      desktop: { ...canvas.desktop },
      tablet: { ...canvas.tablet },
      mobile: { ...canvas.mobile },
    };
  }

  return {
    ...canvas,
    desktop: fitHomepageViewportToSafeZone(canvas.desktop, "desktop", layers, fallback.desktop),
    tablet: fitHomepageViewportToSafeZone(canvas.tablet, "tablet", layers, fallback.tablet),
    mobile: fitHomepageViewportToSafeZone(canvas.mobile, "mobile", layers, fallback.mobile),
  };
}

export function homepageCanvasSafeIssueSummary(canvas: HomepageCanvasConfig, layers?: HeroLayerConfig) {
  return (["desktop", "tablet", "mobile"] as HomepageCanvasMode[]).flatMap((mode) =>
    homepageViewportSafeIssues(canvas[mode], mode, layers).map((issue) => ({ mode, ...issue }))
  );
}

function repairCoordinate(value: number, min: number, max: number, fallback?: number) {
  const intMin = Math.ceil(min);
  const intMax = Math.floor(max);
  if (intMin > intMax) return Math.round((min + max) / 2);
  const rounded = Math.round(value);
  if (rounded >= intMin && rounded <= intMax) return rounded;
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    const roundedFallback = Math.round(fallback);
    if (roundedFallback >= intMin && roundedFallback <= intMax) return roundedFallback;
  }
  return clamp(rounded, intMin, intMax);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
