export type ClubRichBlockType = "paragraph" | "heading" | "subheading" | "quote" | "image" | "divider" | "bulleted_list" | "numbered_list";
export type ClubRichAlign = "left" | "center" | "right";
export type ClubRichImageWrap = "none" | "left" | "right";

export type ClubRichBlock = {
  id: string;
  type: ClubRichBlockType;
  text?: string;
  html?: string;
  items?: string[];
  html_items?: string[];
  image_url?: string;
  caption?: string;
  alt?: string;
  align?: ClubRichAlign;
  width?: number;
  wrap?: ClubRichImageWrap;
  radius?: number;
};

export type ClubRichContent = { version: 1; blocks: ClubRichBlock[] };

export function emptyClubRichContent(): ClubRichContent { return { version: 1, blocks: [] }; }

export function plainTextToClubRichContent(value: string | null | undefined): ClubRichContent {
  const blocks = String(value ?? "").split(/\n\s*\n/g).map((part) => part.trim()).filter(Boolean)
    .map((text, index) => ({ id: `legacy-${index + 1}`, type: "paragraph" as const, text, align: "left" as const }));
  return { version: 1, blocks };
}

export function normalizeClubRichContent(raw: unknown): ClubRichContent | null {
  if (!raw) return null;
  const source = typeof raw === "string" ? tryJson(raw) : raw;
  if (!isRecord(source) || !Array.isArray(source.blocks)) return null;
  const blocks: ClubRichBlock[] = [];
  for (let index = 0; index < source.blocks.length && index < 180; index += 1) {
    const item = source.blocks[index];
    if (!isRecord(item)) continue;
    const type = normalizeType(item.type);
    if (!type) continue;
    const id = safeId(item.id, index);
    if (type === "divider") { blocks.push({ id, type }); continue; }
    if (type === "image") {
      const imageUrl = safeUrl(item.image_url); if (!imageUrl) continue;
      blocks.push({ id, type, image_url: imageUrl, caption: cleanText(item.caption, 500), alt: cleanText(item.alt, 300), align: normalizeAlign(item.align), width: clampNumber(item.width, 20, 100, 100), wrap: normalizeWrap(item.wrap), radius: clampNumber(item.radius, 0, 40, 18) });
      continue;
    }
    if (type === "bulleted_list" || type === "numbered_list") {
      const rawItems = Array.isArray(item.items) ? item.items : [];
      const rawHtml = Array.isArray(item.html_items) ? item.html_items : [];
      const items = rawItems.map((v) => cleanText(v, 4000)).filter((v): v is string => Boolean(v)).slice(0, 80);
      const htmlItems = items.map((text, i) => sanitizeInlineHtml(rawHtml[i] ?? escapeHtml(text)) || escapeHtml(text));
      if (items.length) blocks.push({ id, type, items, html_items: htmlItems, align: normalizeAlign(item.align) });
      continue;
    }
    const text = cleanText(item.text, 20000); if (!text) continue;
    const html = sanitizeInlineHtml(item.html ?? "");
    blocks.push({ id, type, text, html: html || undefined, align: normalizeAlign(item.align) });
  }
  return { version: 1, blocks };
}

export function clubRichContentToPlainText(content: ClubRichContent | null | undefined): string | null {
  if (!content?.blocks?.length) return null;
  const chunks: string[] = [];
  for (const block of content.blocks) {
    if (block.type === "image" || block.type === "divider") continue;
    if (block.type === "bulleted_list" || block.type === "numbered_list") {
      const prefix = block.type === "numbered_list";
      (block.items ?? []).forEach((item, i) => chunks.push(`${prefix ? `${i + 1}.` : "•"} ${item}`));
    } else if (String(block.text ?? "").trim()) chunks.push(String(block.text).trim());
  }
  return chunks.length ? chunks.join("\n\n") : null;
}

export function mergeTranslatedTextIntoRichContent(source: unknown, translatedPlain: string | null | undefined): ClubRichContent | null {
  const normalized = normalizeClubRichContent(source); if (!normalized?.blocks.length) return null;
  const translated = String(translatedPlain ?? "").split(/\n\s*\n/g).map((item) => item.trim()).filter(Boolean); if (!translated.length) return normalized;
  let cursor = 0;
  return { version: 1, blocks: normalized.blocks.map((block) => {
    if (block.type === "image" || block.type === "divider") return block;
    if (block.type === "bulleted_list" || block.type === "numbered_list") {
      const count = block.items?.length ?? 0; const items = Array.from({ length: count }, (_, i) => translated[cursor++] ?? block.items?.[i] ?? "");
      return { ...block, items, html_items: items.map(escapeHtml) };
    }
    const text = translated[cursor++] ?? block.text; return { ...block, text, html: text ? escapeHtml(text) : undefined };
  }) };
}

export function richContentHasBlocks(value: unknown): boolean { return (normalizeClubRichContent(value)?.blocks.length ?? 0) > 0; }

export function sanitizeInlineHtml(value: unknown): string {
  let html = String(value ?? "").slice(0, 30000);
  html = html.replace(/<\s*(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  html = html.replace(/<!--([\s\S]*?)-->/g, "");
  html = html.replace(/<\s*a\b([^>]*)>/gi, (_m, attrs: string) => {
    const hrefMatch = attrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = safeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
    return href ? `<a href="${escapeAttr(href)}" rel="noopener noreferrer">` : "<a>";
  });
  html = html.replace(/<\s*\/\s*a\s*>/gi, "</a>");
  html = html.replace(/<\s*(strong|b|em|i|u|s|br)\b[^>]*>/gi, (_m, tag: string) => `<${tag.toLowerCase()}>`);
  html = html.replace(/<\s*\/\s*(strong|b|em|i|u|s)\s*>/gi, (_m, tag: string) => `</${tag.toLowerCase()}>`);
  html = html.replace(/<(?!\/?(?:strong|b|em|i|u|s|a|br)\b)[^>]*>/gi, "");
  html = html.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  html = html.replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  return html.trim();
}

function tryJson(value: string): unknown { try { return JSON.parse(value); } catch { return null; } }
function normalizeType(value: unknown): ClubRichBlockType | null { return value === "paragraph" || value === "heading" || value === "subheading" || value === "quote" || value === "image" || value === "divider" || value === "bulleted_list" || value === "numbered_list" ? value : null; }
function normalizeAlign(value: unknown): ClubRichAlign { return value === "center" || value === "right" ? value : "left"; }
function normalizeWrap(value: unknown): ClubRichImageWrap { return value === "left" || value === "right" ? value : "none"; }
function cleanText(value: unknown, max: number): string | undefined { const text = String(value ?? "").replace(/\r/g, "").trim().slice(0, max); return text || undefined; }
function safeUrl(value: unknown): string | undefined { const url = String(value ?? "").trim().slice(0, 2000); if (!url) return undefined; if (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("/")) return url; return undefined; }
function safeHref(value: string): string | undefined { const v = value.trim().slice(0, 2000); return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(v) ? v : undefined; }
function safeId(value: unknown, index: number): string { const source = String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80); return source || `block-${index + 1}`; }
function clampNumber(value: unknown, min: number, max: number, fallback: number): number { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function escapeHtml(value: string): string { return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function escapeAttr(value: string): string { return escapeHtml(value); }
