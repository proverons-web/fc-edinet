import type { CSSProperties } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentPageBackground, ContentPageWidth } from "@/lib/content-page-builder";

export type ProPageKey = "media" | "partners" | "academy";
export type ProBreakpoint = "desktop" | "tablet" | "mobile";
export type ProPagePreset = "club-blue" | "editorial" | "minimal";

export type ProResponsiveNumber = Record<ProBreakpoint, number>;

export type ProSectionConfig = {
  key: string;
  visible: boolean;
  variant: string;
  width: ContentPageWidth;
  background: ContentPageBackground;
  padding_top: number;
  padding_bottom: number;
  columns: ProResponsiveNumber;
  gap: number;
  radius: number;
  align: "left" | "center" | "right";
  offset_x: ProResponsiveNumber;
  offset_y: ProResponsiveNumber;
  scale: ProResponsiveNumber;
  text_font: "inherit" | "arial" | "arial-black" | "verdana" | "tahoma" | "trebuchet" | "georgia" | "times";
  text_color: string;
  heading_size: number;
  body_size: number;
  font_weight: number;
  stroke_width: number;
  stroke_color: string;
  letter_spacing: number;
  line_height: number;
  text_transform: "none" | "uppercase" | "lowercase" | "capitalize";
  italic: boolean;
  underline: boolean;
};

export type AcademyContent = {
  hero_eyebrow_ru: string;
  hero_eyebrow_ro: string;
  hero_title_ru: string;
  hero_title_ro: string;
  hero_text_ru: string;
  hero_text_ro: string;
  intro_title_ru: string;
  intro_title_ro: string;
  intro_text_ru: string;
  intro_text_ro: string;
  contact_title_ru: string;
  contact_title_ro: string;
  contact_text_ru: string;
  contact_text_ro: string;
};

export type ProPageLayoutConfig = {
  version: 1;
  page_key: ProPageKey;
  preset: ProPagePreset;
  sections: ProSectionConfig[];
  academy?: AcademyContent;
};

export const proPageLabels: Record<ProPageKey, string> = {
  media: "Медиа",
  partners: "Партнёры",
  academy: "Академия",
};

export const proPageRoutes: Record<ProPageKey, string> = {
  media: "/media",
  partners: "/partners",
  academy: "/academy",
};

const responsive = (desktop: number, tablet: number, mobile: number): ProResponsiveNumber => ({ desktop, tablet, mobile });

function section(
  key: string,
  variant: string,
  options: Partial<ProSectionConfig> = {},
): ProSectionConfig {
  return {
    key,
    visible: true,
    variant,
    width: "container",
    background: "inherit",
    padding_top: 76,
    padding_bottom: 76,
    columns: responsive(3, 2, 1),
    gap: 24,
    radius: 22,
    align: "left",
    offset_x: responsive(0, 0, 0),
    offset_y: responsive(0, 0, 0),
    scale: responsive(100, 100, 100),
    text_font: "inherit",
    text_color: "",
    heading_size: 0,
    body_size: 0,
    font_weight: 0,
    stroke_width: 0,
    stroke_color: "#000000",
    letter_spacing: 0,
    line_height: 0,
    text_transform: "none",
    italic: false,
    underline: false,
    ...options,
  };
}

const academyDefaults: AcademyContent = {
  hero_eyebrow_ru: "FC EDINEȚ • ACADEMY",
  hero_eyebrow_ro: "FC EDINEȚ • ACADEMY",
  hero_title_ru: "Академия FC Edineț",
  hero_title_ro: "Academia FC Edineț",
  hero_text_ru: "Развиваем молодых футболистов и создаём путь от первых тренировок до основной команды.",
  hero_text_ro: "Dezvoltăm tineri fotbaliști și construim drumul de la primele antrenamente până la echipa mare.",
  intro_title_ru: "Футбол начинается здесь",
  intro_title_ro: "Fotbalul începe aici",
  intro_text_ru: "Академия объединяет обучение, дисциплину и игровую практику. Главная цель — развитие игрока, а не только результат одного матча.",
  intro_text_ro: "Academia combină educația, disciplina și practica de joc. Scopul principal este dezvoltarea jucătorului, nu doar rezultatul unui singur meci.",
  contact_title_ru: "Хочешь тренироваться в FC Edineț?",
  contact_title_ro: "Vrei să te antrenezi la FC Edineț?",
  contact_text_ru: "Свяжись с клубом, чтобы узнать о наборе, возрастных группах и расписании тренировок.",
  contact_text_ro: "Contactează clubul pentru informații despre înscriere, grupe de vârstă și programul antrenamentelor.",
};

function mediaPreset(preset: ProPagePreset): ProPageLayoutConfig {
  if (preset === "editorial") return {
    version: 1, page_key: "media", preset,
    sections: [
      section("hero", "compact", { background: "dark", padding_top: 0, padding_bottom: 0 }),
      section("albums", "editorial", { width: "wide", columns: responsive(2, 2, 1), gap: 28, radius: 18 }),
      section("videos", "list", { background: "surface", columns: responsive(2, 1, 1), gap: 22, radius: 18 }),
    ],
  };
  if (preset === "minimal") return {
    version: 1, page_key: "media", preset,
    sections: [
      section("hero", "minimal", { background: "light", padding_top: 0, padding_bottom: 0 }),
      section("albums", "grid", { columns: responsive(3, 2, 1), gap: 18, radius: 14, padding_top: 56, padding_bottom: 56 }),
      section("videos", "grid", { background: "light", columns: responsive(3, 2, 1), gap: 18, radius: 14, padding_top: 56, padding_bottom: 72 }),
    ],
  };
  return {
    version: 1, page_key: "media", preset: "club-blue",
    sections: [
      section("hero", "cinematic", { background: "dark", padding_top: 0, padding_bottom: 0 }),
      section("albums", "featured", { width: "wide", columns: responsive(3, 2, 1), gap: 24, radius: 24 }),
      section("videos", "cards", { background: "dark", width: "wide", columns: responsive(3, 2, 1), gap: 24, radius: 22 }),
    ],
  };
}

function partnersPreset(preset: ProPagePreset): ProPageLayoutConfig {
  if (preset === "editorial") return {
    version: 1, page_key: "partners", preset,
    sections: [
      section("hero", "compact", { background: "dark", padding_top: 0, padding_bottom: 0 }),
      section("partners", "rows", { width: "wide", columns: responsive(2, 2, 1), gap: 20, radius: 18 }),
      section("cta", "split", { background: "surface", width: "container", align: "left", radius: 24 }),
    ],
  };
  if (preset === "minimal") return {
    version: 1, page_key: "partners", preset,
    sections: [
      section("hero", "minimal", { background: "light", padding_top: 0, padding_bottom: 0 }),
      section("partners", "logos", { columns: responsive(4, 3, 2), gap: 16, radius: 14, padding_top: 56, padding_bottom: 56 }),
      section("cta", "minimal", { background: "light", align: "center", padding_top: 48, padding_bottom: 72 }),
    ],
  };
  return {
    version: 1, page_key: "partners", preset: "club-blue",
    sections: [
      section("hero", "cinematic", { background: "dark", padding_top: 0, padding_bottom: 0 }),
      section("partners", "cards", { width: "wide", columns: responsive(4, 3, 2), gap: 22, radius: 22 }),
      section("cta", "banner", { background: "brand", width: "wide", align: "left", radius: 28 }),
    ],
  };
}

function academyPreset(preset: ProPagePreset): ProPageLayoutConfig {
  if (preset === "editorial") return {
    version: 1, page_key: "academy", preset, academy: { ...academyDefaults },
    sections: [
      section("hero", "compact", { background: "dark", padding_top: 0, padding_bottom: 0 }),
      section("intro", "editorial", { width: "container", background: "light", align: "left" }),
      section("groups", "rows", { width: "wide", background: "surface", columns: responsive(1, 1, 1), gap: 16, radius: 18 }),
      section("pathway", "timeline", { width: "container", background: "light", columns: responsive(4, 2, 1), gap: 18 }),
      section("contact", "split", { width: "wide", background: "dark", radius: 26 }),
    ],
  };
  if (preset === "minimal") return {
    version: 1, page_key: "academy", preset, academy: { ...academyDefaults },
    sections: [
      section("hero", "minimal", { background: "light", padding_top: 0, padding_bottom: 0 }),
      section("intro", "minimal", { width: "container", padding_top: 56, padding_bottom: 56, align: "center" }),
      section("groups", "cards", { width: "container", columns: responsive(3, 2, 1), gap: 16, radius: 14 }),
      section("pathway", "steps", { width: "container", background: "surface", columns: responsive(4, 2, 1), gap: 16 }),
      section("contact", "minimal", { width: "container", align: "center", padding_top: 56, padding_bottom: 72 }),
    ],
  };
  return {
    version: 1, page_key: "academy", preset: "club-blue", academy: { ...academyDefaults },
    sections: [
      section("hero", "cinematic", { background: "dark", padding_top: 0, padding_bottom: 0 }),
      section("intro", "split", { width: "wide", background: "light" }),
      section("groups", "cards", { width: "wide", background: "surface", columns: responsive(3, 2, 1), gap: 22, radius: 22 }),
      section("pathway", "steps", { width: "wide", background: "dark", columns: responsive(4, 2, 1), gap: 18, radius: 20 }),
      section("contact", "banner", { width: "wide", background: "brand", radius: 28 }),
    ],
  };
}

export function defaultProPageLayout(pageKey: ProPageKey, preset: ProPagePreset = "club-blue"): ProPageLayoutConfig {
  const value = pageKey === "media" ? mediaPreset(preset) : pageKey === "partners" ? partnersPreset(preset) : academyPreset(preset);
  return clone(value);
}

export function proPagePresetOptions(): Array<{ key: ProPagePreset; label: string; description: string }> {
  return [
    { key: "club-blue", label: "Club Blue", description: "Фирменный тёмно-синий дизайн FC Edineț с крупными карточками." },
    { key: "editorial", label: "Editorial", description: "Спокойная журнальная подача: больше воздуха и читаемости." },
    { key: "minimal", label: "Minimal", description: "Чистая светлая версия с компактной сеткой и минимумом декора." },
  ];
}

export function proSectionLabels(pageKey: ProPageKey): Record<string, string> {
  if (pageKey === "media") return { hero: "Hero", albums: "Фотоальбомы", videos: "Видео" };
  if (pageKey === "partners") return { hero: "Hero", partners: "Партнёры", cta: "Стать партнёром" };
  return { hero: "Hero", intro: "Об академии", groups: "Возрастные группы", pathway: "Путь игрока", contact: "Контакты" };
}

export function proSectionVariants(pageKey: ProPageKey, key: string): Array<{ value: string; label: string }> {
  if (key === "hero") return [
    { value: "cinematic", label: "Cinematic" },
    { value: "compact", label: "Компактный" },
    { value: "minimal", label: "Минимальный" },
  ];
  if (pageKey === "media" && key === "albums") return [
    { value: "featured", label: "Featured + сетка" },
    { value: "grid", label: "Ровная сетка" },
    { value: "editorial", label: "Editorial" },
  ];
  if (pageKey === "media" && key === "videos") return [
    { value: "cards", label: "Карточки" },
    { value: "grid", label: "Компактная сетка" },
    { value: "list", label: "Список" },
  ];
  if (pageKey === "partners" && key === "partners") return [
    { value: "cards", label: "Карточки" },
    { value: "logos", label: "Только логотипы" },
    { value: "rows", label: "Строки" },
  ];
  if (key === "cta" || key === "contact") return [
    { value: "banner", label: "Большой баннер" },
    { value: "split", label: "Текст + кнопка" },
    { value: "minimal", label: "Минимальный" },
  ];
  if (pageKey === "academy" && key === "intro") return [
    { value: "split", label: "Крупный текст 2 колонки" },
    { value: "editorial", label: "Editorial" },
    { value: "minimal", label: "По центру" },
  ];
  if (pageKey === "academy" && key === "groups") return [
    { value: "cards", label: "Карточки" },
    { value: "rows", label: "Строки" },
  ];
  if (pageKey === "academy" && key === "pathway") return [
    { value: "steps", label: "Шаги" },
    { value: "timeline", label: "Таймлайн" },
  ];
  return [{ value: "default", label: "Обычный" }];
}

export function normalizeProPageLayout(pageKey: ProPageKey, raw: unknown): ProPageLayoutConfig {
  const root = record(raw);
  const preset: ProPagePreset = root.preset === "editorial" || root.preset === "minimal" || root.preset === "club-blue" ? root.preset : "club-blue";
  const fallback = defaultProPageLayout(pageKey, preset);
  const source = Array.isArray(root.sections) ? root.sections : [];
  const fallbackMap = new Map(fallback.sections.map((item) => [item.key, item]));
  const normalized: ProSectionConfig[] = [];

  for (const item of source) {
    const value = record(item);
    const key = typeof value.key === "string" ? value.key : "";
    const base = fallbackMap.get(key);
    if (!base || normalized.some((entry) => entry.key === key)) continue;
    normalized.push(normalizeSection(value, base));
  }
  for (const base of fallback.sections) if (!normalized.some((entry) => entry.key === base.key)) normalized.push(base);

  const academy = pageKey === "academy" ? normalizeAcademy(root.academy, fallback.academy ?? academyDefaults) : undefined;
  return { version: 1, page_key: pageKey, preset, sections: normalized, academy };
}

export async function getDraftProPageLayout(supabase: SupabaseClient, pageKey: ProPageKey) {
  const { data } = await supabase.from("content_page_layouts").select("draft_config,published_config").eq("page_key", pageKey).maybeSingle();
  return normalizeProPageLayout(pageKey, data?.draft_config ?? data?.published_config ?? defaultProPageLayout(pageKey));
}

export async function getPublishedProPageLayout(supabase: SupabaseClient, pageKey: ProPageKey) {
  const { data } = await supabase.from("content_page_published").select("published_config").eq("page_key", pageKey).maybeSingle();
  return normalizeProPageLayout(pageKey, data?.published_config ?? defaultProPageLayout(pageKey));
}

export function proSectionStyle(section: ProSectionConfig): CSSProperties {
  return {
    "--pro-pad-top": `${section.padding_top}px`,
    "--pro-pad-bottom": `${section.padding_bottom}px`,
    "--pro-gap": `${section.gap}px`,
    "--pro-radius": `${section.radius}px`,
    "--pro-cols-d": section.columns.desktop,
    "--pro-cols-t": section.columns.tablet,
    "--pro-cols-m": section.columns.mobile,
    "--pro-x-d": `${section.offset_x.desktop}px`,
    "--pro-x-t": `${section.offset_x.tablet}px`,
    "--pro-x-m": `${section.offset_x.mobile}px`,
    "--pro-y-d": `${section.offset_y.desktop}px`,
    "--pro-y-t": `${section.offset_y.tablet}px`,
    "--pro-y-m": `${section.offset_y.mobile}px`,
    "--pro-scale-d": section.scale.desktop / 100,
    "--pro-scale-t": section.scale.tablet / 100,
    "--pro-scale-m": section.scale.mobile / 100,
    "--pro-font-family": proFontStack(section.text_font),
    "--pro-text-color": section.text_color || "inherit",
    "--pro-heading-size": section.heading_size > 0 ? `${section.heading_size}px` : "inherit",
    "--pro-body-size": section.body_size > 0 ? `${section.body_size}px` : "inherit",
    "--pro-font-weight": section.font_weight > 0 ? String(section.font_weight) : "inherit",
    "--pro-letter-spacing": `${section.letter_spacing}px`,
    "--pro-line-height": section.line_height > 0 ? String(section.line_height) : "inherit",
    "--pro-text-transform": section.text_transform,
    "--pro-font-style": section.italic ? "italic" : "normal",
    "--pro-text-decoration": section.underline ? "underline" : "none",
    "--pro-text-stroke-width": `${section.stroke_width}px`,
    "--pro-text-stroke-color": section.stroke_color,
  } as CSSProperties;
}

export function proSectionClass(section: ProSectionConfig) {
  return [
    "proPageSection",
    `proWidth-${section.width}`,
    `proBg-${section.background}`,
    `proVariant-${section.variant}`,
    `proAlign-${section.align}`,
  ].join(" ");
}

function normalizeSection(value: Record<string, unknown>, base: ProSectionConfig): ProSectionConfig {
  const variants = proSectionVariants(base.key === "albums" || base.key === "videos" ? "media" : base.key === "partners" || base.key === "cta" ? "partners" : "academy", base.key).map((item) => item.value);
  return {
    key: base.key,
    visible: typeof value.visible === "boolean" ? value.visible : base.visible,
    variant: typeof value.variant === "string" && variants.includes(value.variant) ? value.variant : base.variant,
    width: value.width === "wide" || value.width === "full" || value.width === "container" ? value.width : base.width,
    background: value.background === "light" || value.background === "surface" || value.background === "dark" || value.background === "brand" || value.background === "inherit" ? value.background : base.background,
    padding_top: integer(value.padding_top, 0, 220, base.padding_top),
    padding_bottom: integer(value.padding_bottom, 0, 220, base.padding_bottom),
    columns: normalizeResponsive(value.columns, base.columns, 1, 6),
    gap: integer(value.gap, 0, 64, base.gap),
    radius: integer(value.radius, 0, 48, base.radius),
    align: value.align === "center" || value.align === "right" || value.align === "left" ? value.align : base.align,
    offset_x: normalizeResponsive(value.offset_x, base.offset_x, -300, 300),
    offset_y: normalizeResponsive(value.offset_y, base.offset_y, -300, 300),
    scale: normalizeResponsive(value.scale, base.scale, 70, 130),
    text_font: fontPreset(value.text_font, base.text_font),
    text_color: color(value.text_color, base.text_color),
    heading_size: integer(value.heading_size, 0, 160, base.heading_size),
    body_size: integer(value.body_size, 0, 72, base.body_size),
    font_weight: integer(value.font_weight, 0, 950, base.font_weight),
    stroke_width: numberValue(value.stroke_width, 0, 8, base.stroke_width),
    stroke_color: color(value.stroke_color, base.stroke_color),
    letter_spacing: numberValue(value.letter_spacing, -12, 24, base.letter_spacing),
    line_height: numberValue(value.line_height, 0, 2.4, base.line_height),
    text_transform: textTransform(value.text_transform, base.text_transform),
    italic: typeof value.italic === "boolean" ? value.italic : base.italic,
    underline: typeof value.underline === "boolean" ? value.underline : base.underline,
  };
}

function normalizeAcademy(raw: unknown, fallback: AcademyContent): AcademyContent {
  const value = record(raw);
  return Object.fromEntries(Object.entries(fallback).map(([key, fallbackValue]) => [key, typeof value[key] === "string" ? String(value[key]).slice(0, 4000) : fallbackValue])) as AcademyContent;
}

function normalizeResponsive(raw: unknown, fallback: ProResponsiveNumber, min: number, max: number): ProResponsiveNumber {
  const value = record(raw);
  return {
    desktop: integer(value.desktop, min, max, fallback.desktop),
    tablet: integer(value.tablet, min, max, fallback.tablet),
    mobile: integer(value.mobile, min, max, fallback.mobile),
  };
}
function proFontStack(value: ProSectionConfig["text_font"]) {
  if (value === "arial-black") return '"Arial Black",Arial,Helvetica,sans-serif';
  if (value === "verdana") return 'Verdana,Geneva,sans-serif';
  if (value === "tahoma") return 'Tahoma,Verdana,sans-serif';
  if (value === "trebuchet") return '"Trebuchet MS",Arial,sans-serif';
  if (value === "georgia") return 'Georgia,"Times New Roman",serif';
  if (value === "times") return '"Times New Roman",Times,serif';
  if (value === "arial") return 'Arial,Helvetica,sans-serif';
  return 'inherit';
}
function fontPreset(value: unknown, fallback: ProSectionConfig["text_font"]): ProSectionConfig["text_font"] { const allowed=["inherit","arial","arial-black","verdana","tahoma","trebuchet","georgia","times"]; return typeof value === "string" && allowed.includes(value) ? value as ProSectionConfig["text_font"] : fallback; }
function textTransform(value: unknown, fallback: ProSectionConfig["text_transform"]): ProSectionConfig["text_transform"] { const allowed=["none","uppercase","lowercase","capitalize"]; return typeof value === "string" && allowed.includes(value) ? value as ProSectionConfig["text_transform"] : fallback; }
function color(value: unknown, fallback: string){ if(value === "") return ""; return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toLowerCase() : fallback; }
function numberValue(value: unknown,min:number,max:number,fallback:number){ const n=Number(value); return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n*100)/100)):fallback; }

function integer(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
