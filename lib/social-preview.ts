/** Shared, side-effect-free formatting rules for the public social cards. */
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function socialText(value: string | null | undefined, maxLength = 125): string {
  const text = (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, Math.max(0, maxLength - 1));
  const space = cut.lastIndexOf(" ");
  return `${space >= maxLength * .65 ? cut.slice(0, space) : cut.trimEnd()}…`;
}

export function socialFontSize(title: string): number {
  const length = title.length;
  return length > 105 ? 43 : length > 74 ? 51 : length > 42 ? 60 : 69;
}

export function socialDate(value: string | null | undefined): string {
  if (!value) return "FC EDINEȚ";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "FC EDINEȚ";
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Chisinau" }).format(parsed);
}

/** Only our public storage may be fetched by the server-side social renderer. */
export function publicSocialImageUrl(candidate: string | null | undefined, supabaseBase: string | undefined): string | null {
  if (!candidate || !supabaseBase) return null;
  try {
    const url = new URL(candidate);
    const base = new URL(supabaseBase);
    if (url.protocol !== "https:" || base.protocol !== "https:" || url.host !== base.host) return null;
    if (!url.pathname.startsWith("/storage/v1/object/public/")) return null;
    if (url.username || url.password || url.port || url.hash) return null;
    return url.href;
  } catch { return null; }
}

/** Fetch failures should never turn a public OG request into a 500. */
export async function socialPhotoDataUrl(candidate: string | null | undefined): Promise<string | null> {
  const url = publicSocialImageUrl(candidate, process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4500), cache: "no-store", redirect: "error" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type")?.split(";")[0]?.toLowerCase();
    if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") return null;
    if (Number(response.headers.get("content-length") || 0) > 6_000_000) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 6_000_000 || bytes.byteLength === 0) return null;
    // Satori / @vercel/og may not decode WebP data URIs. Our albums store
    // WebP thumbnails, so convert these to JPEG before passing to ImageResponse.
    if (type === "image/webp") {
      const sharp = (await import("sharp")).default;
      const jpeg = await sharp(Buffer.from(bytes), { limitInputPixels: 24_000_000 })
        .rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 }).toBuffer();
      return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    }
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch { return null; }
}
