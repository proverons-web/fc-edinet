import type { CSSProperties } from "react";
import type {
  HeroLayerConfig,
  HeroLayerState,
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
  return { order: heroLayerState(config, key).order };
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

function integer(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
