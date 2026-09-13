import type {
  DesignMediaAsset,
  HomepageBlockContent,
  HomepageBlockDesign,
  HomepageBlockType,
  HomepageCustomBlock,
  HomepageLayoutItem,
  HomepageSectionKey,
} from "@/lib/types";

export const homepageBlockCatalog: Array<{ type: HomepageBlockType; label: string; description: string }> = [
  { type: "text", label: "Текст", description: "Заголовок и текстовый материал." },
  { type: "image", label: "Изображение", description: "Большое изображение из Media Library." },
  { type: "text_image", label: "Текст + изображение", description: "Двухколоночный информационный блок." },
  { type: "cta", label: "Баннер / CTA", description: "Акцентный призыв с кнопкой." },
  { type: "news", label: "Новости", description: "Автоматическая подборка опубликованных новостей." },
  { type: "players", label: "Игроки", description: "Карточки действующих игроков." },
  { type: "media", label: "Медиа", description: "Фотоальбомы и видео." },
  { type: "partners", label: "Партнёры", description: "Логотипы партнёров клуба." },
  { type: "next_match", label: "Следующий матч", description: "Карточка ближайшего матча." },
  { type: "standings", label: "Турнирная таблица", description: "Компактная таблица текущего турнира." },
];

const blockTypes = new Set(homepageBlockCatalog.map((item) => item.type));
const sectionKeys: HomepageSectionKey[] = ["matches", "standings", "news", "players", "media", "partners"];

export function defaultHomepageBlockDesign(type: HomepageBlockType): HomepageBlockDesign {
  const dataBlock = ["news", "players", "media", "partners"].includes(type);
  return {
    width: "container",
    background: type === "cta" ? "brand" : "inherit",
    padding_top: type === "next_match" ? 48 : 72,
    padding_bottom: type === "next_match" ? 48 : 72,
    item_limit: type === "partners" ? 12 : type === "standings" ? 5 : dataBlock ? 4 : 1,
    columns_desktop: type === "partners" ? 6 : dataBlock ? 4 : 1,
    columns_tablet: type === "partners" ? 3 : dataBlock ? 2 : 1,
    columns_mobile: type === "partners" ? 2 : 1,
    text_align: "left",
    image_position: "right",
  };
}

export function defaultHomepageBlockContent(type: HomepageBlockType): HomepageBlockContent {
  const labels: Record<HomepageBlockType, string> = {
    text: "Новый текстовый блок",
    image: "Изображение",
    text_image: "История клуба",
    cta: "Вместе с FC Edineț",
    news: "Последние новости",
    players: "Команда",
    media: "Фото и видео",
    partners: "Партнёры",
    next_match: "Следующий матч",
    standings: "Турнирная таблица",
  };
  return {
    eyebrow_ru: "FC EDINEȚ",
    eyebrow_ro: "FC EDINEȚ",
    title_ru: labels[type],
    title_ro: "",
    text_ru: type === "text" || type === "text_image" || type === "cta" ? "Добавь текст этого блока в Visual Editor." : "",
    text_ro: "",
    image_url: null,
    image_alt_ru: "",
    image_alt_ro: "",
    button_text_ru: type === "cta" || type === "text_image" ? "Подробнее" : "",
    button_text_ro: "",
    button_href: type === "cta" || type === "text_image" ? "/club" : "",
  };
}

export function createHomepageBlock(type: HomepageBlockType, id: string): HomepageCustomBlock {
  return {
    id,
    type,
    enabled: true,
    content: defaultHomepageBlockContent(type),
    design: defaultHomepageBlockDesign(type),
  };
}

export function normalizeHomepageBlock(raw: unknown, fallback?: HomepageCustomBlock): HomepageCustomBlock | null {
  if (!isRecord(raw)) return fallback ?? null;
  const id = typeof raw.id === "string" && /^[0-9a-f-]{16,}$/i.test(raw.id) ? raw.id : fallback?.id;
  const type = blockTypes.has(raw.type as HomepageBlockType) ? raw.type as HomepageBlockType : fallback?.type;
  if (!id || !type) return fallback ?? null;
  const defaultContent = fallback?.content ?? defaultHomepageBlockContent(type);
  const defaultDesign = fallback?.design ?? defaultHomepageBlockDesign(type);
  return {
    id,
    type,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback?.enabled ?? true,
    content: normalizeContent(raw.content, defaultContent),
    design: normalizeDesign(type, raw.design, defaultDesign),
  };
}

export function normalizeHomepageBlocks(raw: unknown, fallback: HomepageCustomBlock[] = []): HomepageCustomBlock[] {
  if (!Array.isArray(raw)) return fallback.map((block) => ({ ...block, content: { ...block.content }, design: { ...block.design } }));
  const result: HomepageCustomBlock[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    const normalized = normalizeHomepageBlock(item);
    if (!normalized || ids.has(normalized.id)) continue;
    ids.add(normalized.id);
    result.push(normalized);
    if (result.length >= 30) break;
  }
  return result;
}

export function defaultHomepageLayoutOrder(sectionOrder: HomepageSectionKey[], blocks: HomepageCustomBlock[] = []): HomepageLayoutItem[] {
  return [
    ...sectionOrder.map((key) => `section:${key}` as HomepageLayoutItem),
    ...blocks.map((block) => `block:${block.id}` as HomepageLayoutItem),
  ];
}

export function normalizeHomepageLayoutOrder(raw: unknown, sections: HomepageSectionKey[], blocks: HomepageCustomBlock[]): HomepageLayoutItem[] {
  const validSections = new Set(sections);
  const validBlocks = new Set(blocks.map((block) => block.id));
  const output: HomepageLayoutItem[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== "string" || seen.has(item)) continue;
      if (item.startsWith("section:") && validSections.has(item.slice(8) as HomepageSectionKey)) {
        output.push(item as HomepageLayoutItem); seen.add(item);
      } else if (item.startsWith("block:") && validBlocks.has(item.slice(6))) {
        output.push(item as HomepageLayoutItem); seen.add(item);
      }
    }
  }
  for (const key of sections) {
    const item = `section:${key}` as HomepageLayoutItem;
    if (!seen.has(item)) { output.push(item); seen.add(item); }
  }
  for (const block of blocks) {
    const item = `block:${block.id}` as HomepageLayoutItem;
    if (!seen.has(item)) { output.push(item); seen.add(item); }
  }
  return output;
}

export function blockTypeLabel(type: HomepageBlockType) {
  return homepageBlockCatalog.find((item) => item.type === type)?.label ?? type;
}

export function resolveBlockImageAsset(assetId: string, assets: DesignMediaAsset[]) {
  return assets.find((asset) => asset.id === assetId)?.public_url ?? null;
}

export function blockSupportsImage(type: HomepageBlockType) {
  return type === "image" || type === "text_image" || type === "cta";
}

export function blockSupportsText(type: HomepageBlockType) {
  return type === "text" || type === "text_image" || type === "cta";
}

export function blockSupportsButton(type: HomepageBlockType) {
  return type === "text_image" || type === "cta";
}

export function blockSupportsGrid(type: HomepageBlockType) {
  return type === "news" || type === "players" || type === "media" || type === "partners";
}

export function blockSupportsItemLimit(type: HomepageBlockType) {
  return blockSupportsGrid(type) || type === "standings";
}

function normalizeContent(raw: unknown, fallback: HomepageBlockContent): HomepageBlockContent {
  const value = isRecord(raw) ? raw : {};
  return {
    eyebrow_ru: text(value.eyebrow_ru, fallback.eyebrow_ru, 120),
    eyebrow_ro: text(value.eyebrow_ro, fallback.eyebrow_ro, 120),
    title_ru: text(value.title_ru, fallback.title_ru, 180),
    title_ro: text(value.title_ro, fallback.title_ro, 180),
    text_ru: text(value.text_ru, fallback.text_ru, 4000),
    text_ro: text(value.text_ro, fallback.text_ro, 4000),
    image_url: nullableUrl(value.image_url, fallback.image_url),
    image_alt_ru: text(value.image_alt_ru, fallback.image_alt_ru, 220),
    image_alt_ro: text(value.image_alt_ro, fallback.image_alt_ro, 220),
    button_text_ru: text(value.button_text_ru, fallback.button_text_ru, 80),
    button_text_ro: text(value.button_text_ro, fallback.button_text_ro, 80),
    button_href: safeHref(value.button_href, fallback.button_href),
  };
}

function normalizeDesign(type: HomepageBlockType, raw: unknown, fallback: HomepageBlockDesign): HomepageBlockDesign {
  const value = isRecord(raw) ? raw : {};
  return {
    width: value.width === "container" || value.width === "wide" || value.width === "full" ? value.width : fallback.width,
    background: value.background === "inherit" || value.background === "light" || value.background === "dark" || value.background === "brand" ? value.background : fallback.background,
    padding_top: integer(value.padding_top, 0, 180, fallback.padding_top),
    padding_bottom: integer(value.padding_bottom, 0, 180, fallback.padding_bottom),
    item_limit: integer(value.item_limit, 1, type === "partners" ? 24 : 12, fallback.item_limit),
    columns_desktop: integer(value.columns_desktop, 1, 6, fallback.columns_desktop),
    columns_tablet: integer(value.columns_tablet, 1, 4, fallback.columns_tablet),
    columns_mobile: integer(value.columns_mobile, 1, 2, fallback.columns_mobile),
    text_align: value.text_align === "left" || value.text_align === "center" || value.text_align === "right" ? value.text_align : fallback.text_align,
    image_position: value.image_position === "left" || value.image_position === "right" ? value.image_position : fallback.image_position,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function integer(value: unknown, min: number, max: number, fallback: number) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback; }
function text(value: unknown, fallback: string, max: number) { return typeof value === "string" ? value.slice(0, max) : fallback; }
function nullableUrl(value: unknown, fallback: string | null) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return fallback;
  return /^(https?:\/\/|\/)/i.test(value) ? value.slice(0, 2000) : fallback;
}
function safeHref(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return !trimmed || /^(https?:\/\/|\/)/i.test(trimmed) ? trimmed.slice(0, 1000) : fallback;
}
