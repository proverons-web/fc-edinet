import type { Locale } from "@/lib/i18n";

export const HISTORY_KINDS = ["milestone", "achievement", "people", "squad", "stadium"] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];
export type HistoryFilter = HistoryKind | "all";

export type ClubHistoryEvent = {
  id: number;
  event_year: number;
  event_month: number | null;
  event_kind: HistoryKind;
  title: string;
  title_ro: string | null;
  description: string | null;
  description_ro: string | null;
  image_url: string | null;
  source_url: string | null;
  season_id: number | null;
  hall_entry_id: number | null;
  display_order: number;
  is_published: boolean;
  updated_at?: string | null;
};

export const HISTORY_COPY = {
  ru: {
    heading: "Хронология клуба", eyebrow: "НАША ИСТОРИЯ ПО ГОДАМ",
    intro: "Подтверждённые события, важные матчи, люди и эпохи FC Edineț.",
    all: "Все события", milestone: "События", achievement: "Достижения",
    people: "Люди", squad: "Составы", stadium: "Стадион",
    empty: "Подтверждённые события пока не опубликованы.",
    error: "Не удалось загрузить историческую хронологию.",
    source: "Источник", season: "Сезон", person: "Зал славы", details: "Подробнее",
    back: "К истории клуба", previous: "Назад", next: "Далее", page: "Страница",
    related: "События этой эпохи", noRelated: "Событий этой эпохи пока нет.",
  },
  ro: {
    heading: "Cronologia clubului", eyebrow: "ISTORIA NOASTRĂ, AN CU AN",
    intro: "Evenimente confirmate, meciuri importante, oameni și epoci din istoria FC Edineț.",
    all: "Toate evenimentele", milestone: "Evenimente", achievement: "Performanțe",
    people: "Personalități", squad: "Loturi", stadium: "Stadion",
    empty: "Evenimentele confirmate nu au fost publicate încă.",
    error: "Cronologia istorică nu poate fi încărcată.",
    source: "Sursa", season: "Sezon", person: "Galeria de onoare", details: "Detalii",
    back: "Înapoi la istoria clubului", previous: "Înapoi", next: "Înainte", page: "Pagina",
    related: "Evenimentele acestei epoci", noRelated: "Nu există încă evenimente din această perioadă.",
  },
} as const;

export function historyFilter(value: unknown): HistoryFilter {
  return typeof value === "string" && (HISTORY_KINDS as readonly string[]).includes(value)
    ? value as HistoryKind : "all";
}

export function historyPage(value: unknown): number {
  return typeof value === "string" && /^[1-9]\d{0,3}$/.test(value) ? Number(value) : 1;
}

export function historyHref(kind: HistoryFilter = "all", page = 1): string {
  const params = new URLSearchParams();
  if (kind !== "all") params.set("kind", kind);
  if (page > 1) params.set("page", String(page));
  return `/club/history${params.size ? `?${params.toString()}` : ""}#club-chronology`;
}

export function historyText(value: string | null | undefined, translated: string | null | undefined, locale: Locale): string {
  return (locale === "ro" && translated?.trim() ? translated : value)?.trim() || "";
}

export function historyDate(event: Pick<ClubHistoryEvent, "event_year" | "event_month">, locale: Locale): string {
  if (!event.event_month) return String(event.event_year);
  const date = new Date(Date.UTC(event.event_year, event.event_month - 1, 15));
  const month = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "ru-RU", { month: "long", timeZone: "UTC" }).format(date);
  return `${month[0].toLocaleUpperCase(locale === "ro" ? "ro-RO" : "ru-RU")}${month.slice(1)} ${event.event_year}`;
}

export function safeHistorySource(value: string | null | undefined): string | null {
  if (!value || value.length > 1000) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && parsed.hostname.includes(".") ? parsed.href : null;
  } catch { return null; }
}

export function historyEventHref(id: number | string): string {
  return `/club/history/events/${encodeURIComponent(String(id))}`;
}


export type HistoryEventPayload = {
  event_year: number; event_month: number | null; event_kind: HistoryKind;
  title: string; title_ro: string | null; description: string | null;
  description_ro: string | null; source_url: string | null;
  season_id: number | null; hall_entry_id: number | null;
  display_order: number; is_published: boolean;
};

export function parseHistoryEventPayload(fd: FormData): { error: string } | { data: HistoryEventPayload } {
  const text = (key: string) => typeof fd.get(key) === "string" ? String(fd.get(key)).trim() : "";
  const title = text("title");
  const titleRo = text("title_ro");
  const description = text("description");
  const descriptionRo = text("description_ro");
  const yearRaw = text("event_year");
  const monthRaw = text("event_month");
  const year = Number(yearRaw);
  const month = monthRaw ? Number(monthRaw) : null;
  const kind = text("event_kind");
  const orderRaw = text("display_order") || "100";
  const order = Number(orderRaw);
  const source = text("source_url");
  const seasonRaw = text("season_id");
  const hallRaw = text("hall_entry_id");
  const validId = (id: string) => /^[1-9]\d{0,12}$/.test(id);

  if (!/^\d{4}$/.test(yearRaw) || !Number.isInteger(year) || year < 1850 || year > 2100)
    return { error: "Укажи корректный год (1850–2100)." };
  if (monthRaw && (month === null || !/^\d{1,2}$/.test(monthRaw) || !Number.isInteger(month) || month < 1 || month > 12))
    return { error: "Месяц должен быть от 1 до 12." };
  if (!(HISTORY_KINDS as readonly string[]).includes(kind)) return { error: "Недопустимый тип события." };
  if (!title || title.length > 180 || titleRo.length > 180) return { error: "Заголовок RU обязателен и должен быть не длиннее 180 символов." };
  if (description.length > 6000 || descriptionRo.length > 6000) return { error: "Описание не может быть длиннее 6000 символов." };
  if (!Number.isInteger(order) || order < 0 || order > 100000) return { error: "Порядок должен быть от 0 до 100000." };
  if (source && !safeHistorySource(source)) return { error: "Укажи корректную HTTPS-ссылку на источник." };
  if (seasonRaw && !validId(seasonRaw)) return { error: "Неверный идентификатор сезона." };
  if (hallRaw && !validId(hallRaw)) return { error: "Неверный идентификатор Зала славы." };

  return { data: {
    event_year: year, event_month: month, event_kind: kind as HistoryKind,
    title, title_ro: titleRo || null, description: description || null, description_ro: descriptionRo || null,
    source_url: source ? safeHistorySource(source) : null,
    season_id: seasonRaw ? Number(seasonRaw) : null,
    hall_entry_id: hallRaw ? Number(hallRaw) : null,
    display_order: order,
    is_published: fd.get("is_published") === "on",
  } };
}
