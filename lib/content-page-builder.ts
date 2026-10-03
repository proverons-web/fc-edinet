import type { CSSProperties } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ContentPageWidth = "container" | "wide" | "full";
export type ContentPageBackground = "inherit" | "light" | "surface" | "dark" | "brand";
export type ClubSectionKey = "about" | "history" | "stadium" | "leadership" | "achievements";

export type ClubSectionConfig = {
  key: ClubSectionKey;
  visible: boolean;
  width: ContentPageWidth;
  background: ContentPageBackground;
  padding_top: number;
  padding_bottom: number;
  variant: string;
  image_position_x?: number;
  image_position_y?: number;
  image_height?: number;
  columns?: number;
};

export type ClubPageLayoutConfig = {
  version: 1;
  sections: ClubSectionConfig[];
};

const defaults: ClubPageLayoutConfig = {
  version: 1,
  sections: [
    { key: "about", visible: true, width: "container", background: "inherit", padding_top: 88, padding_bottom: 88, variant: "contact-right" },
    { key: "stadium", visible: true, width: "wide", background: "dark", padding_top: 88, padding_bottom: 88, variant: "cinematic", image_position_x: 50, image_position_y: 52, image_height: 520 },
    { key: "history", visible: true, width: "container", background: "surface", padding_top: 88, padding_bottom: 88, variant: "readable" },
    { key: "leadership", visible: true, width: "container", background: "inherit", padding_top: 88, padding_bottom: 88, variant: "cards", columns: 3 },
    { key: "achievements", visible: true, width: "container", background: "dark", padding_top: 88, padding_bottom: 88, variant: "timeline" },
  ],
};

export function defaultClubPageLayout(): ClubPageLayoutConfig {
  return JSON.parse(JSON.stringify(defaults)) as ClubPageLayoutConfig;
}

export function normalizeClubPageLayout(raw: unknown): ClubPageLayoutConfig {
  const fallback = defaultClubPageLayout();
  const source = isRecord(raw) && Array.isArray(raw.sections) ? raw.sections : [];
  const byKey = new Map<string, unknown>();
  for (const item of source) if (isRecord(item) && typeof item.key === "string") byKey.set(item.key, item);

  const normalized = fallback.sections.map((base) => normalizeSection(base, byKey.get(base.key)));
  const requestedOrder = source
    .filter(isRecord)
    .map((item) => String(item.key ?? ""))
    .filter((key): key is ClubSectionKey => normalized.some((section) => section.key === key));
  const order = [...new Set([...requestedOrder, ...normalized.map((section) => section.key)])];
  return { version: 1, sections: order.map((key) => normalized.find((section) => section.key === key)!) };
}

export async function getPublishedClubPageLayout(supabase: SupabaseClient): Promise<ClubPageLayoutConfig> {
  const { data, error } = await supabase
    .from("content_page_published")
    .select("published_config")
    .eq("page_key", "club")
    .maybeSingle();
  if (error || !data) return defaultClubPageLayout();
  return normalizeClubPageLayout(data.published_config);
}

export async function getDraftClubPageLayout(supabase: SupabaseClient): Promise<ClubPageLayoutConfig> {
  const { data, error } = await supabase
    .from("content_page_layouts")
    .select("draft_config,published_config")
    .eq("page_key", "club")
    .maybeSingle();
  if (error || !data) return defaultClubPageLayout();
  return normalizeClubPageLayout(data.draft_config ?? data.published_config);
}

export function sectionClass(section: ClubSectionConfig) {
  return [
    "contentBuilderSection",
    `contentBuilderBg-${section.background}`,
    `contentBuilderWidth-${section.width}`,
    `contentBuilderVariant-${section.variant}`,
  ].join(" ");
}

export function sectionStyle(section: ClubSectionConfig) {
  return {
    "--content-pad-top": `${section.padding_top}px`,
    "--content-pad-bottom": `${section.padding_bottom}px`,
  } as CSSProperties;
}

function normalizeSection(base: ClubSectionConfig, raw: unknown): ClubSectionConfig {
  const value = isRecord(raw) ? raw : {};
  return {
    key: base.key,
    visible: typeof value.visible === "boolean" ? value.visible : base.visible,
    width: width(value.width, base.width),
    background: background(value.background, base.background),
    padding_top: integer(value.padding_top, 0, 180, base.padding_top),
    padding_bottom: integer(value.padding_bottom, 0, 180, base.padding_bottom),
    variant: variant(base.key, value.variant, base.variant),
    image_position_x: base.key === "stadium" ? integer(value.image_position_x, 0, 100, base.image_position_x ?? 50) : undefined,
    image_position_y: base.key === "stadium" ? integer(value.image_position_y, 0, 100, base.image_position_y ?? 50) : undefined,
    image_height: base.key === "stadium" ? integer(value.image_height, 280, 760, base.image_height ?? 520) : undefined,
    columns: base.key === "leadership" ? integer(value.columns, 2, 4, base.columns ?? 3) : undefined,
  };
}

function variant(key: ClubSectionKey, value: unknown, fallback: string) {
  const allowed: Record<ClubSectionKey, string[]> = {
    about: ["contact-right", "contact-left", "stacked"],
    history: ["readable", "columns", "card"],
    stadium: ["cinematic", "split-left", "split-right", "full-photo"],
    leadership: ["cards", "compact"],
    achievements: ["timeline", "cards"],
  };
  return typeof value === "string" && allowed[key].includes(value) ? value : fallback;
}

function width(value: unknown, fallback: ContentPageWidth): ContentPageWidth {
  return value === "container" || value === "wide" || value === "full" ? value : fallback;
}
function background(value: unknown, fallback: ContentPageBackground): ContentPageBackground {
  return value === "inherit" || value === "light" || value === "surface" || value === "dark" || value === "brand" ? value : fallback;
}
function integer(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
