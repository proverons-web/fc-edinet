export const videoKinds = ["highlights", "full_match", "interview", "other"] as const;
export type MediaVideoKind = typeof videoKinds[number];

export function isVideoKind(value: string): value is MediaVideoKind {
  return (videoKinds as readonly string[]).includes(value);
}

export function videoKindLabel(value: string | null | undefined, locale: "ru" | "ro" = "ru") {
  const labels = locale === "ro"
    ? { highlights: "Rezumat video", full_match: "Meci integral", interview: "Interviu", other: "Video" }
    : { highlights: "Обзор матча", full_match: "Полная запись", interview: "Интервью", other: "Видео" };
  return labels[isVideoKind(value ?? "") ? value as MediaVideoKind : "other"];
}

/** Accepted YouTube URL hosts only. Avoid suffix spoofing and malformed IDs. */
export function extractYouTubeId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const hostname = url.hostname.toLowerCase();
    let candidate: string | null = null;
    if (hostname === "youtu.be" || hostname === "www.youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(hostname)) {
      const segments = url.pathname.split("/").filter(Boolean);
      candidate = ["shorts", "embed", "live"].includes(segments[0]) ? segments[1] ?? null : url.searchParams.get("v");
    }
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
