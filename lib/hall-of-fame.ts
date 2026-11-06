import type { Locale } from "@/lib/i18n";
import type { ClubHallOfFameEntry } from "@/lib/types";

export const HALL_PAGE_SIZE = 12;
export const HALL_CATEGORIES = ["all", "player", "coach", "leader", "squad"] as const;
export type HallCategory = (typeof HALL_CATEGORIES)[number];

export const HALL_COPY = {
  ru: {
    heading: "Зал славы", eyebrow: "НАСЛЕДИЕ FC EDINEȚ",
    tagline: "Люди, которые создавали историю",
    intro: "Футболисты, тренеры, люди клуба и легендарные составы. У каждой истории — своё место.",
    all: "Все", player: "Игроки", coach: "Тренеры", leader: "Люди клуба", squad: "Исторические составы",
    search: "Поиск по имени, роли или периоду", searchButton: "Найти", reset: "Сбросить",
    results: "Найдено записей", participants: "Участников", details: "Узнать историю", back: "К Залу славы",
    period: "Период", biography: "История и заслуги", roster: "Состав команды", page: "Страница",
    prev: "Назад", next: "Далее", noResults: "По вашему запросу никого не найдено.",
    empty: "Истории для этого раздела пока готовятся.", noPhoto: "FC EDINEȚ", readMore: "Открыть карточку",
  },
  ro: {
    heading: "Galeria de onoare", eyebrow: "MOȘTENIREA FC EDINEȚ",
    tagline: "Oamenii care au scris istoria",
    intro: "Jucători, antrenori, personalități ale clubului și echipe istorice. Fiecare poveste merită să fie cunoscută.",
    all: "Toți", player: "Jucători", coach: "Antrenori", leader: "Oamenii clubului", squad: "Loturi istorice",
    search: "Caută după nume, rol sau perioadă", searchButton: "Caută", reset: "Resetează",
    results: "Înregistrări găsite", participants: "Personalități", details: "Descoperă povestea", back: "Înapoi la galeria de onoare",
    period: "Perioada", biography: "Poveste și realizări", roster: "Componența echipei", page: "Pagina",
    prev: "Înapoi", next: "Înainte", noResults: "Nu am găsit rezultate pentru această căutare.",
    empty: "Poveștile din această categorie vor fi adăugate în curând.", noPhoto: "FC EDINEȚ", readMore: "Deschide profilul",
  },
} as const;

export function hallCategory(value: unknown): HallCategory {
  return typeof value === "string" && (HALL_CATEGORIES as readonly string[]).includes(value)
    ? (value as HallCategory) : "all";
}

export function hallQuery(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  // PostgREST `.or(...)` grammar treats commas and parentheses as operators.
  return raw.normalize("NFC").replace(/[^\p{L}\p{N}\s\-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 80).trim();
}

export function hallPage(value: unknown): number {
  const raw = typeof value === "string" ? value : "";
  const parsed = /^\d{1,5}$/.test(raw) ? Number(raw) : 1;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function hallHref({ category = "all", q = "", page = 1 }: {
  category?: HallCategory; q?: string; page?: number;
} = {}): string {
  const query = new URLSearchParams();
  if (category !== "all") query.set("category", category);
  if (q) query.set("q", q);
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return `/club/hall-of-fame${suffix ? `?${suffix}` : ""}`;
}

export function hallLocalized(value: string | null | undefined, translated: string | null | undefined, locale: Locale) {
  return locale === "ro" && translated?.trim() ? translated.trim() : value?.trim() ?? "";
}

export function hallName(entry: Pick<ClubHallOfFameEntry,"entry_type" | "first_name" | "last_name" | "title" | "title_ro">, locale: Locale) {
  if (entry.entry_type === "squad") return hallLocalized(entry.title,entry.title_ro,locale);
  return [entry.first_name,entry.last_name].filter(Boolean).join(" ").trim() || hallLocalized(entry.title,entry.title_ro,locale);
}

export function hallFilterBySearch(query: any, q: string) {
  if (!q) return query;
  const columns = ["first_name", "last_name", "title", "title_ro", "era_label", "era_label_ro"];
  const terms = q.split(" ").filter(Boolean);
  const filters = columns.map((column) => `${column}.ilike.%${q}%`);
  if (terms.length > 1) {
    // One PostgREST OR expression, including a two-column full-name match.
    // Repeating `.or()` can behave inconsistently with multiple URL params.
    const first = terms[0];
    const last = terms.at(-1)!;
    filters.push(`and(first_name.ilike.%${first}%,last_name.ilike.%${last}%)`);
    filters.push(`and(first_name.ilike.%${last}%,last_name.ilike.%${first}%)`);
  }
  return query.or(filters.join(","));
}
