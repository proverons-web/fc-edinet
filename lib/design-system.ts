import type { CSSProperties } from "react";

export type SiteFontPreset = "arial" | "system" | "trebuchet" | "georgia";
export type SiteShadowPreset = "none" | "soft" | "medium" | "strong";

export type DesignSystemConfig = {
  primary: string;
  navy: string;
  navy_alt: string;
  accent: string;
  text: string;
  muted: string;
  surface: string;
  line: string;
  white: string;
  font_body: SiteFontPreset;
  font_heading: SiteFontPreset;
  body_size: number;
  body_line_height: number;
  heading_weight: number;
  heading_letter_spacing: number;
  h1_scale: number;
  h2_scale: number;
  h3_scale: number;
  container_max: number;
  page_gutter_desktop: number;
  page_gutter_mobile: number;
  radius_small: number;
  radius_medium: number;
  radius_large: number;
  card_shadow: SiteShadowPreset;
  button_height: number;
  spacing_unit: number;
};

export const defaultDesignSystem: DesignSystemConfig = {
  primary: "#0f63ff",
  navy: "#06162e",
  navy_alt: "#0a2245",
  accent: "#f4c842",
  text: "#162033",
  muted: "#68758a",
  surface: "#f5f8fc",
  line: "#e6ebf2",
  white: "#ffffff",
  font_body: "arial",
  font_heading: "arial",
  body_size: 16,
  body_line_height: 1.6,
  heading_weight: 900,
  heading_letter_spacing: -2,
  h1_scale: 100,
  h2_scale: 100,
  h3_scale: 100,
  container_max: 1200,
  page_gutter_desktop: 40,
  page_gutter_mobile: 28,
  radius_small: 10,
  radius_medium: 16,
  radius_large: 24,
  card_shadow: "soft",
  button_height: 42,
  spacing_unit: 8,
};

export function normalizeDesignSystem(value: unknown, fallback: DesignSystemConfig = defaultDesignSystem): DesignSystemConfig {
  const raw = objectValue(value);
  return {
    primary: colorValue(raw.primary, fallback.primary),
    navy: colorValue(raw.navy, fallback.navy),
    navy_alt: colorValue(raw.navy_alt, fallback.navy_alt),
    accent: colorValue(raw.accent, fallback.accent),
    text: colorValue(raw.text, fallback.text),
    muted: colorValue(raw.muted, fallback.muted),
    surface: colorValue(raw.surface, fallback.surface),
    line: colorValue(raw.line, fallback.line),
    white: colorValue(raw.white, fallback.white),
    font_body: enumValue(raw.font_body, ["arial", "system", "trebuchet", "georgia"] as const, fallback.font_body),
    font_heading: enumValue(raw.font_heading, ["arial", "system", "trebuchet", "georgia"] as const, fallback.font_heading),
    body_size: numberValue(raw.body_size, 14, 20, fallback.body_size),
    body_line_height: decimalValue(raw.body_line_height, 1.3, 2, fallback.body_line_height),
    heading_weight: numberValue(raw.heading_weight, 600, 950, fallback.heading_weight),
    heading_letter_spacing: numberValue(raw.heading_letter_spacing, -6, 2, fallback.heading_letter_spacing),
    h1_scale: numberValue(raw.h1_scale, 80, 125, fallback.h1_scale),
    h2_scale: numberValue(raw.h2_scale, 80, 125, fallback.h2_scale),
    h3_scale: numberValue(raw.h3_scale, 80, 125, fallback.h3_scale),
    container_max: numberValue(raw.container_max, 960, 1600, fallback.container_max),
    page_gutter_desktop: numberValue(raw.page_gutter_desktop, 20, 96, fallback.page_gutter_desktop),
    page_gutter_mobile: numberValue(raw.page_gutter_mobile, 16, 48, fallback.page_gutter_mobile),
    radius_small: numberValue(raw.radius_small, 0, 24, fallback.radius_small),
    radius_medium: numberValue(raw.radius_medium, 0, 36, fallback.radius_medium),
    radius_large: numberValue(raw.radius_large, 0, 56, fallback.radius_large),
    card_shadow: enumValue(raw.card_shadow, ["none", "soft", "medium", "strong"] as const, fallback.card_shadow),
    button_height: numberValue(raw.button_height, 36, 58, fallback.button_height),
    spacing_unit: numberValue(raw.spacing_unit, 4, 12, fallback.spacing_unit),
  };
}

export function designSystemCssVariables(config: DesignSystemConfig): CSSProperties {
  return {
    "--blue": config.primary,
    "--navy": config.navy,
    "--navy2": config.navy_alt,
    "--accent": config.accent,
    "--white": config.white,
    "--text": config.text,
    "--muted": config.muted,
    "--line": config.line,
    "--surface": config.surface,
    "--ds-font-body": fontStack(config.font_body),
    "--ds-font-heading": fontStack(config.font_heading),
    "--ds-body-size": `${config.body_size}px`,
    "--ds-body-line-height": String(config.body_line_height),
    "--ds-heading-weight": String(config.heading_weight),
    "--ds-heading-letter-spacing": `${config.heading_letter_spacing / 10}em`,
    "--ds-h1-scale": String(config.h1_scale / 100),
    "--ds-h2-scale": String(config.h2_scale / 100),
    "--ds-h3-scale": String(config.h3_scale / 100),
    "--ds-hero-h1-min": `${Math.round(62 * config.h1_scale / 100)}px`,
    "--ds-hero-h1-fluid": `${(8 * config.h1_scale / 100).toFixed(2)}vw`,
    "--ds-hero-h1-max": `${Math.round(108 * config.h1_scale / 100)}px`,
    "--ds-page-h1-min": `${Math.round(58 * config.h1_scale / 100)}px`,
    "--ds-page-h1-fluid": `${(8 * config.h1_scale / 100).toFixed(2)}vw`,
    "--ds-page-h1-max": `${Math.round(96 * config.h1_scale / 100)}px`,
    "--ds-section-h2-min": `${Math.round(36 * config.h2_scale / 100)}px`,
    "--ds-section-h2-fluid": `${(5 * config.h2_scale / 100).toFixed(2)}vw`,
    "--ds-section-h2-max": `${Math.round(56 * config.h2_scale / 100)}px`,
    "--ds-mobile-hero-h1": `${Math.round(56 * config.h1_scale / 100)}px`,
    "--ds-container-max": `${config.container_max}px`,
    "--ds-page-gutter": `${config.page_gutter_desktop}px`,
    "--ds-page-gutter-mobile": `${config.page_gutter_mobile}px`,
    "--ds-radius-sm": `${config.radius_small}px`,
    "--ds-radius-md": `${config.radius_medium}px`,
    "--ds-radius-lg": `${config.radius_large}px`,
    "--ds-card-shadow": shadowValue(config.card_shadow),
    "--ds-button-height": `${config.button_height}px`,
    "--ds-space": `${config.spacing_unit}px`,
  } as CSSProperties;
}

export function fontStack(preset: SiteFontPreset) {
  if (preset === "system") return "-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif";
  if (preset === "trebuchet") return "\"Trebuchet MS\",Arial,sans-serif";
  if (preset === "georgia") return "Georgia,\"Times New Roman\",serif";
  return "Arial,Helvetica,sans-serif";
}

export function shadowValue(preset: SiteShadowPreset) {
  if (preset === "none") return "none";
  if (preset === "medium") return "0 16px 40px rgba(6,22,46,.14)";
  if (preset === "strong") return "0 24px 60px rgba(6,22,46,.22)";
  return "0 10px 30px rgba(6,22,46,.09)";
}

function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function numberValue(value: unknown, min: number, max: number, fallback: number) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback; }
function decimalValue(value: unknown, min: number, max: number, fallback: number) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number * 10) / 10)) : fallback; }
function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T { return typeof value === "string" && values.includes(value as T) ? value as T : fallback; }
function colorValue(value: unknown, fallback: string) { if (typeof value !== "string") return fallback; const candidate = value.trim(); return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback; }
