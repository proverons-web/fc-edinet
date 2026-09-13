import type {
  HomepageCanvasViewport,
  HomepageDesignSnapshot,
  SitePageDesignSnapshot,
} from "@/lib/types";
import type { FooterDesignConfig, HeaderDesignConfig } from "@/lib/global-design";
import type { DesignSystemConfig } from "@/lib/design-system";

export type PublishingCheckLevel = "pass" | "warning" | "error";
export type PublishingCheck = {
  key: string;
  label: string;
  level: PublishingCheckLevel;
  detail: string;
};

export type VersionChange = {
  path: string;
  label: string;
  before: string;
  after: string;
};

const VIEWPORT_WIDTH = { desktop: 1440, tablet: 900, mobile: 390 } as const;

export function homepagePublishingChecks(snapshot: HomepageDesignSnapshot): PublishingCheck[] {
  const checks: PublishingCheck[] = [];
  const deviceIssues: string[] = [];
  for (const mode of ["desktop", "tablet", "mobile"] as const) {
    const viewport = snapshot.canvas_config[mode];
    const issues = viewportSafeIssues(viewport, mode, snapshot.hero_layer_config);
    if (issues.length) deviceIssues.push(`${mode}: ${issues.join(", ")}`);
  }
  checks.push({
    key: "responsive",
    label: "Desktop / Tablet / Mobile",
    level: "pass",
    detail: "Три адаптивных режима настроены и входят в публикацию.",
  });
  checks.push({
    key: "safe-zone",
    label: "Safe Zone",
    level: deviceIssues.length ? "warning" : "pass",
    detail: deviceIssues.length ? `За безопасной зоной: ${deviceIssues.join("; ")}.` : "Текст и карточка матча находятся внутри Safe Zone.",
  });
  const unique = new Set(snapshot.layout_order);
  const hasAllSections = snapshot.section_order.every((key) => unique.has(`section:${key}`));
  const allBlocksPresent = snapshot.custom_blocks.every((block) => unique.has(`block:${block.id}`));
  checks.push({
    key: "layout",
    label: "Структура страницы",
    level: hasAllSections && allBlocksPresent ? "pass" : "error",
    detail: hasAllSections && allBlocksPresent ? "Системные секции и пользовательские блоки присутствуют в общем порядке." : "В layout_order отсутствуют секции или пользовательские блоки.",
  });
  const enabledCount = snapshot.section_order.filter((key) => snapshot.section_visibility[key]).length + snapshot.custom_blocks.filter((block) => block.enabled).length;
  checks.push({
    key: "content",
    label: "Контент главной",
    level: enabledCount > 0 ? "pass" : "warning",
    detail: enabledCount > 0 ? `Активных секций/блоков: ${enabledCount}.` : "Все секции и блоки скрыты — после Hero страница будет почти пустой.",
  });
  return checks;
}

export function sitePagePublishingChecks(snapshot: SitePageDesignSnapshot, supportsContentImage: boolean): PublishingCheck[] {
  const checks: PublishingCheck[] = [{
    key: "responsive",
    label: "Desktop / Tablet / Mobile",
    level: "pass",
    detail: `${snapshot.hero_height_desktop}px / ${snapshot.hero_height_tablet}px / ${snapshot.hero_height_mobile}px`,
  }];
  if (snapshot.background_mode === "custom" && !snapshot.desktop_image_url && !snapshot.tablet_image_url && !snapshot.mobile_image_url) {
    checks.push({ key: "background", label: "Фон Hero", level: "error", detail: "Выбран режим «Своё фото», но изображение не задано." });
  } else if (snapshot.background_mode === "content" && !supportsContentImage) {
    checks.push({ key: "background", label: "Фон Hero", level: "error", detail: "Эта страница не поддерживает фон из текущего материала." });
  } else {
    checks.push({ key: "background", label: "Фон Hero", level: "pass", detail: snapshot.background_mode === "custom" ? "Пользовательское изображение настроено." : snapshot.background_mode === "content" ? "Будет использовано изображение текущего материала." : "Используется системный фон страницы." });
  }
  const visibleLayers = Object.values(snapshot.layer_config).filter((layer) => layer.visible).length;
  checks.push({ key: "layers", label: "Слои Hero", level: visibleLayers ? "pass" : "warning", detail: visibleLayers ? `Видимых слоёв: ${visibleLayers}.` : "Все слои Hero скрыты." });
  return checks;
}

export function globalPublishingChecks(key: "header" | "footer" | "design_system", config: HeaderDesignConfig | FooterDesignConfig | DesignSystemConfig): PublishingCheck[] {
  if (key === "header") {
    const value = config as HeaderDesignConfig;
    const visibleNav = value.nav_order.filter((item) => value.nav_visibility[item]);
    return [
      { key: "brand", label: "Бренд", level: value.logo_mode === "image" && !value.logo_url && !value.show_brand_text ? "error" : "pass", detail: value.logo_mode === "image" && !value.logo_url && !value.show_brand_text ? "Нет ни логотипа, ни текста бренда." : "Логотип/название Header настроены." },
      { key: "navigation", label: "Навигация", level: visibleNav.length ? "pass" : "warning", detail: visibleNav.length ? `Видимых пунктов меню: ${visibleNav.length}.` : "Все пункты основного меню скрыты." },
      { key: "responsive", label: "Desktop / Mobile", level: "pass", detail: `${value.height_desktop}px / ${value.height_mobile}px` },
    ];
  }
  if (key === "footer") {
    const value = config as FooterDesignConfig;
    const badLinks = value.columns.flatMap((column) => column.links).filter((link) => !validHref(link.href));
    return [
      { key: "columns", label: "Колонки Footer", level: value.columns.some((column) => column.visible) ? "pass" : "warning", detail: `${value.columns.filter((column) => column.visible).length} видимых колонок.` },
      { key: "links", label: "Ссылки", level: badLinks.length ? "error" : "pass", detail: badLinks.length ? `Некорректных ссылок: ${badLinks.length}. Разрешены /path, https://, http://, mailto:, tel:.` : "Все ссылки имеют допустимый формат." },
    ];
  }
  const value = config as DesignSystemConfig;
  const colors = [value.primary, value.navy, value.navy_alt, value.accent, value.text, value.muted, value.surface, value.line, value.white];
  const invalidColors = colors.filter((color) => !/^#[0-9a-f]{6}$/i.test(color));
  return [
    { key: "colors", label: "Палитра", level: invalidColors.length ? "error" : "pass", detail: invalidColors.length ? `Некорректных HEX-цветов: ${invalidColors.length}.` : "Все глобальные цвета корректны." },
    { key: "container", label: "Контейнер", level: value.container_max >= 960 && value.container_max <= 1600 ? "pass" : "warning", detail: `Максимальная ширина: ${value.container_max}px.` },
    { key: "typography", label: "Типографика", level: "pass", detail: `${value.font_body} / ${value.font_heading}, базовый размер ${value.body_size}px.` },
  ];
}

export function blockingPublishingChecks(checks: PublishingCheck[]) {
  return checks.filter((check) => check.level === "error");
}

export function summarizeVersionChanges(before: unknown, after: unknown, max = 40): VersionChange[] {
  const changes: VersionChange[] = [];
  walkDiff(before, after, "", changes, max);
  return changes.slice(0, max);
}

function walkDiff(before: unknown, after: unknown, path: string, out: VersionChange[], max: number) {
  if (out.length >= max || equalValue(before, after)) return;
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) {
      walkDiff(before[key], after[key], path ? `${path}.${key}` : key, out, max);
      if (out.length >= max) return;
    }
    return;
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    out.push(makeChange(path, before, after));
    return;
  }
  out.push(makeChange(path, before, after));
}

function makeChange(path: string, before: unknown, after: unknown): VersionChange {
  return { path, label: changeLabel(path), before: formatValue(before), after: formatValue(after) };
}

function viewportSafeIssues(viewport: HomepageCanvasViewport, mode: keyof typeof VIEWPORT_WIDTH, layers: HomepageDesignSnapshot["hero_layer_config"]) {
  const issues: string[] = [];
  const stageWidth = VIEWPORT_WIDTH[mode];
  const intro = layers.intro;
  const match = layers.match_card;
  if (!intro || intro.visible) {
    const halfText = mode === "mobile" ? 39 : mode === "tablet" ? 34 : 27;
    const topHalf = 8;
    if (viewport.text_x - halfText < viewport.safe_left || viewport.text_x + halfText > 100 - viewport.safe_right || viewport.text_y - topHalf < viewport.safe_top || viewport.text_y + topHalf > 100 - viewport.safe_bottom) issues.push("текст");
  }
  if ((!match || match.visible) && viewport.match_visible) {
    const halfMatch = Math.min(45, (viewport.match_width / stageWidth) * 50);
    const halfHeight = Math.max(5, Math.min(16, (110 / Math.max(220, viewport.hero_height)) * 50));
    if (viewport.match_x - halfMatch < viewport.safe_left || viewport.match_x + halfMatch > 100 - viewport.safe_right || viewport.match_y - halfHeight < viewport.safe_top || viewport.match_y + halfHeight > 100 - viewport.safe_bottom) issues.push("карточка матча");
  }
  return issues;
}

function validHref(value: string) {
  return /^(\/|https?:\/\/|mailto:|tel:)/i.test(value.trim());
}
function isPlainObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function equalValue(a: unknown, b: unknown) { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return Object.is(a, b); } }
function formatValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Вкл" : "Выкл";
  if (typeof value === "string" || typeof value === "number") return String(value);
  try { const text = JSON.stringify(value); return text.length > 90 ? `${text.slice(0, 87)}…` : text; } catch { return String(value); }
}
function changeLabel(path: string) {
  const key = path.split(".").pop() || path;
  const labels: Record<string, string> = {
    background_image_url: "Desktop изображение", tablet_background_image_url: "Tablet изображение", mobile_background_image_url: "Mobile изображение",
    desktop_image_url: "Desktop изображение", tablet_image_url: "Tablet изображение", mobile_image_url: "Mobile изображение",
    overlay_opacity: "Затемнение", text_alignment: "Выравнивание текста", hero_height_desktop: "Высота Desktop", hero_height_tablet: "Высота Tablet", hero_height_mobile: "Высота Mobile",
    section_order: "Порядок секций", section_visibility: "Видимость секций", section_config: "Настройки секций", custom_blocks: "Пользовательские блоки", layout_order: "Общий порядок блоков",
    canvas_config: "Canvas", hero_layer_config: "Слои Hero", layer_config: "Слои Hero", background_mode: "Режим фона", content_width: "Ширина контента",
    primary: "Primary", navy: "Navy", navy_alt: "Navy 2", accent: "Accent", container_max: "Ширина контейнера", card_shadow: "Тень карточек",
    nav_order: "Порядок меню", nav_visibility: "Видимость меню", columns: "Колонки Footer",
  };
  return labels[key] || path.replace(/_/g, " ");
}
