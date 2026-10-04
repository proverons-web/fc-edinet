import type { CSSProperties } from "react";
import type {
  HeroLayerConfig,
  HeroLayerState,
  HeroLayerFontFamily,
  HeroLayerTextTransform,
  SitePageDesignKey,
} from "@/lib/types";

export type HeroLayerDefinition = {
  key: string;
  label: string;
  description: string;
};

export const homeHeroLayerDefinitions: HeroLayerDefinition[] = [
  { key: "background", label: "Фон", description: "Изображение и затемнение Hero." },
  { key: "intro", label: "Текст Hero", description: "Eyebrow, заголовок, описание и кнопки." },
  { key: "match_card", label: "Карточка матча", description: "Карточка следующего матча на главной." },
];

const simplePageLayers: HeroLayerDefinition[] = [
  { key: "background", label: "Фон", description: "Изображение или системный фон Hero." },
  { key: "eyebrow", label: "Eyebrow", description: "Маленькая строка над заголовком." },
  { key: "title", label: "Заголовок", description: "Главный заголовок страницы." },
  { key: "description", label: "Описание", description: "Подзаголовок или описание раздела." },
];

const catalog: Record<SitePageDesignKey, HeroLayerDefinition[]> = {
  news: simplePageLayers,
  team: simplePageLayers,
  matches: simplePageLayers,
  standings: simplePageLayers,
  media: simplePageLayers,
  partners: simplePageLayers,
  academy: simplePageLayers,
  club: [
    { key: "background", label: "Фон", description: "Фото клуба или системный фон." },
    { key: "intro", label: "Информация клуба", description: "Город, название клуба и девиз." },
    { key: "facts", label: "Факты клуба", description: "Год основания, город и цвета." },
  ],
  template_news: [
    { key: "background", label: "Фон", description: "Обложка новости или выбранное фото." },
    { key: "navigation", label: "Навигация и мета", description: "Ссылка назад, категория и дата." },
    { key: "title", label: "Заголовок", description: "Заголовок текущей новости." },
    { key: "description", label: "Анонс", description: "Краткое описание новости." },
    { key: "author", label: "Автор", description: "Подпись автора материала." },
  ],
  template_player: [
    { key: "background", label: "Фон", description: "Фон Hero профиля игрока." },
    { key: "photo", label: "Фото игрока", description: "Фото футболиста и игровой номер." },
    { key: "intro", label: "Информация игрока", description: "Имя, позиция, факты и избранное." },
  ],
  template_album: [
    { key: "background", label: "Фон", description: "Обложка альбома или выбранное фото." },
    { key: "navigation", label: "Навигация", description: "Ссылка назад, дата и место." },
    { key: "title", label: "Название", description: "Название текущего фотоальбома." },
    { key: "description", label: "Описание", description: "Описание фотоальбома." },
    { key: "count", label: "Счётчик фото", description: "Количество фотографий в альбоме." },
  ],
};

export function siteHeroLayerDefinitions(key: SitePageDesignKey) {
  return catalog[key];
}

export function defaultHeroLayerConfig(definitions: HeroLayerDefinition[]): HeroLayerConfig {
  return Object.fromEntries(
    definitions.map((definition, index) => [
      definition.key,
      { visible: true, locked: definition.key === "background", order: (index + 1) * 10 },
    ])
  );
}

export function normalizeHeroLayerConfig(
  raw: unknown,
  definitions: HeroLayerDefinition[],
  fallback?: HeroLayerConfig
): HeroLayerConfig {
  const base = fallback ?? defaultHeroLayerConfig(definitions);
  const source = isRecord(raw) ? raw : {};
  const normalized: HeroLayerConfig = {};
  for (const [index, definition] of definitions.entries()) {
    const current = isRecord(source[definition.key]) ? source[definition.key] : {};
    const fallbackState = base[definition.key] ?? { visible: true, locked: false, order: (index + 1) * 10 };
    normalized[definition.key] = {
      visible: typeof current.visible === "boolean" ? current.visible : fallbackState.visible,
      locked: typeof current.locked === "boolean" ? current.locked : fallbackState.locked,
      order: integer(current.order, 0, 1000, fallbackState.order),
      font_family: fontFamily(current.font_family, fallbackState.font_family),
      font_size: optionalInteger(current.font_size, 8, 220, fallbackState.font_size),
      font_weight: optionalInteger(current.font_weight, 100, 950, fallbackState.font_weight),
      color: optionalColor(current.color, fallbackState.color),
      stroke_width: optionalNumber(current.stroke_width, 0, 8, fallbackState.stroke_width),
      stroke_color: optionalColor(current.stroke_color, fallbackState.stroke_color),
      letter_spacing: optionalNumber(current.letter_spacing, -12, 24, fallbackState.letter_spacing),
      line_height: optionalNumber(current.line_height, 0.7, 2.4, fallbackState.line_height),
      text_transform: textTransform(current.text_transform, fallbackState.text_transform),
      italic: typeof current.italic === "boolean" ? current.italic : fallbackState.italic,
      underline: typeof current.underline === "boolean" ? current.underline : fallbackState.underline,
      shadow_strength: optionalInteger(current.shadow_strength, 0, 100, fallbackState.shadow_strength),
    };
  }
  return normalizeOrders(normalized, definitions);
}

export function heroLayerState(config: HeroLayerConfig | null | undefined, key: string): HeroLayerState {
  const value = config?.[key];
  return value ?? { visible: true, locked: false, order: 100 };
}

export function heroLayerVisible(config: HeroLayerConfig | null | undefined, key: string) {
  return heroLayerState(config, key).visible;
}

export function heroLayerStyle(config: HeroLayerConfig | null | undefined, key: string): CSSProperties {
  const state = heroLayerState(config, key);
  const style: CSSProperties & Record<string, string | number | undefined> = { order: state.order };
  if (state.font_family && state.font_family !== "inherit") style.fontFamily = heroFontStack(state.font_family);
  if (state.font_size) style.fontSize = `${state.font_size}px`;
  if (state.font_weight) style.fontWeight = state.font_weight;
  if (state.color) style.color = state.color;
  if (state.stroke_width && state.stroke_width > 0) {
    style.WebkitTextStrokeWidth = `${state.stroke_width}px`;
    style.WebkitTextStrokeColor = state.stroke_color || "#000000";
    style.paintOrder = "stroke fill";
  }
  if (state.letter_spacing != null) style.letterSpacing = `${state.letter_spacing}px`;
  if (state.line_height != null) style.lineHeight = state.line_height;
  if (state.text_transform && state.text_transform !== "none") style.textTransform = state.text_transform;
  if (state.italic) style.fontStyle = "italic";
  if (state.underline) style.textDecoration = "underline";
  if (state.shadow_strength && state.shadow_strength > 0) {
    const a = Math.min(.9, state.shadow_strength / 100);
    style.textShadow = `0 2px 8px rgba(0,0,0,${a.toFixed(2)})`;
  }
  return style as CSSProperties;
}

export function heroFontStack(preset: HeroLayerFontFamily) {
  if (preset === "arial-black") return '"Arial Black",Arial,Helvetica,sans-serif';
  if (preset === "verdana") return 'Verdana,Geneva,sans-serif';
  if (preset === "tahoma") return 'Tahoma,Verdana,sans-serif';
  if (preset === "trebuchet") return '"Trebuchet MS",Arial,sans-serif';
  if (preset === "georgia") return 'Georgia,"Times New Roman",serif';
  if (preset === "times") return '"Times New Roman",Times,serif';
  if (preset === "arial") return 'Arial,Helvetica,sans-serif';
  return 'inherit';
}

export function updateHeroLayer(
  config: HeroLayerConfig,
  key: string,
  patch: Partial<HeroLayerState>
): HeroLayerConfig {
  return {
    ...config,
    [key]: { ...heroLayerState(config, key), ...patch },
  };
}

export function moveHeroLayer(
  config: HeroLayerConfig,
  definitions: HeroLayerDefinition[],
  key: string,
  direction: -1 | 1
): HeroLayerConfig {
  const ordered = [...definitions]
    .map((definition) => ({ definition, state: heroLayerState(config, definition.key) }))
    .sort((a, b) => a.state.order - b.state.order);
  const index = ordered.findIndex((item) => item.definition.key === key);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return config;
  if (ordered[index].state.locked) return config;
  [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
  const next = { ...config };
  ordered.forEach((item, orderIndex) => {
    next[item.definition.key] = { ...item.state, order: (orderIndex + 1) * 10 };
  });
  return next;
}

function normalizeOrders(config: HeroLayerConfig, definitions: HeroLayerDefinition[]) {
  const ordered = definitions
    .map((definition, index) => ({
      definition,
      state: config[definition.key] ?? { visible: true, locked: false, order: (index + 1) * 10 },
    }))
    .sort((a, b) => a.state.order - b.state.order);
  const result: HeroLayerConfig = {};
  ordered.forEach((item, index) => {
    result[item.definition.key] = { ...item.state, order: (index + 1) * 10 };
  });
  return result;
}


function optionalInteger(value: unknown, min: number, max: number, fallback?: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}
function optionalNumber(value: unknown, min: number, max: number, fallback?: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number * 100) / 100)) : fallback;
}
function optionalColor(value: unknown, fallback?: string) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback;
}
function fontFamily(value: unknown, fallback?: HeroLayerFontFamily): HeroLayerFontFamily | undefined {
  const values: HeroLayerFontFamily[] = ["inherit","arial","arial-black","verdana","tahoma","trebuchet","georgia","times"];
  return typeof value === "string" && values.includes(value as HeroLayerFontFamily) ? value as HeroLayerFontFamily : fallback;
}
function textTransform(value: unknown, fallback?: HeroLayerTextTransform): HeroLayerTextTransform | undefined {
  const values: HeroLayerTextTransform[] = ["none","uppercase","lowercase","capitalize"];
  return typeof value === "string" && values.includes(value as HeroLayerTextTransform) ? value as HeroLayerTextTransform : fallback;
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
