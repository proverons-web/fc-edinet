export type ClubRichBlockType = "paragraph" | "heading" | "subheading" | "quote" | "image" | "divider";
export type ClubRichAlign = "left" | "center" | "right";
export type ClubRichImageWrap = "none" | "left" | "right";

export type ClubRichBlock = {
  id: string;
  type: ClubRichBlockType;
  text?: string;
  image_url?: string;
  caption?: string;
  alt?: string;
  align?: ClubRichAlign;
  width?: number;
  wrap?: ClubRichImageWrap;
  radius?: number;
};

export type ClubRichContent = {
  version: 1;
  blocks: ClubRichBlock[];
};

export function emptyClubRichContent(): ClubRichContent {
  return { version: 1, blocks: [] };
}

export function plainTextToClubRichContent(value: string | null | undefined): ClubRichContent {
  const blocks = String(value ?? "")
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text, index) => ({ id: `legacy-${index + 1}`, type: "paragraph" as const, text, align: "left" as const }));
  return { version: 1, blocks };
}

export function normalizeClubRichContent(raw: unknown): ClubRichContent | null {
  if (!raw) return null;
  const source = typeof raw === "string" ? tryJson(raw) : raw;
  if (!isRecord(source) || !Array.isArray(source.blocks)) return null;
  const blocks: ClubRichBlock[] = [];
  for (let index = 0; index < source.blocks.length && index < 120; index += 1) {
    const item = source.blocks[index];
    if (!isRecord(item)) continue;
    const type = normalizeType(item.type);
    if (!type) continue;
    const id = safeId(item.id, index);
    if (type === "divider") {
      blocks.push({ id, type });
      continue;
    }
    if (type === "image") {
      const imageUrl = safeUrl(item.image_url);
      if (!imageUrl) continue;
      blocks.push({
        id,
        type,
        image_url: imageUrl,
        caption: cleanText(item.caption, 500),
        alt: cleanText(item.alt, 300),
        align: normalizeAlign(item.align),
        width: clampNumber(item.width, 20, 100, 100),
        wrap: normalizeWrap(item.wrap),
        radius: clampNumber(item.radius, 0, 40, 18),
      });
      continue;
    }
    const text = cleanText(item.text, 12000);
    if (!text) continue;
    blocks.push({ id, type, text, align: normalizeAlign(item.align) });
  }
  return { version: 1, blocks };
}


export function clubRichContentToPlainText(content: ClubRichContent | null | undefined): string | null {
  if (!content?.blocks?.length) return null;
  const chunks = content.blocks
    .filter((block) => block.type !== "image" && block.type !== "divider")
    .map((block) => String(block.text ?? "").trim())
    .filter(Boolean);
  return chunks.length ? chunks.join("\n\n") : null;
}

export function mergeTranslatedTextIntoRichContent(source: unknown, translatedPlain: string | null | undefined): ClubRichContent | null {
  const normalized = normalizeClubRichContent(source);
  if (!normalized?.blocks.length) return null;
  const translated = String(translatedPlain ?? "").split(/\n\s*\n/g).map((item) => item.trim()).filter(Boolean);
  if (!translated.length) return normalized;
  let cursor = 0;
  return {
    version: 1,
    blocks: normalized.blocks.map((block) => {
      if (block.type === "image" || block.type === "divider") return block;
      const text = translated[cursor++] ?? block.text;
      return { ...block, text };
    }),
  };
}

export function richContentHasBlocks(value: unknown): boolean {
  return (normalizeClubRichContent(value)?.blocks.length ?? 0) > 0;
}

function tryJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}
function normalizeType(value: unknown): ClubRichBlockType | null {
  return value === "paragraph" || value === "heading" || value === "subheading" || value === "quote" || value === "image" || value === "divider" ? value : null;
}
function normalizeAlign(value: unknown): ClubRichAlign {
  return value === "center" || value === "right" ? value : "left";
}
function normalizeWrap(value: unknown): ClubRichImageWrap {
  return value === "left" || value === "right" ? value : "none";
}
function cleanText(value: unknown, max: number): string | undefined {
  const text = String(value ?? "").replace(/\r/g, "").trim().slice(0, max);
  return text || undefined;
}
function safeUrl(value: unknown): string | undefined {
  const url = String(value ?? "").trim().slice(0, 2000);
  if (!url) return undefined;
  if (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("/")) return url;
  return undefined;
}
function safeId(value: unknown, index: number): string {
  const source = String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return source || `block-${index + 1}`;
}
function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
