import type { Locale } from "@/lib/i18n";

export const clubPages = [
  { key: "about", href: "/club/about", ru: "О клубе", ro: "Despre club" },
  { key: "history", href: "/club/history", ru: "История FC Edineț", ro: "Istoria FC Edineț" },
  { key: "stadium", href: "/club/stadium", ru: "Стадион", ro: "Stadion" },
  { key: "leadership", href: "/club/leadership", ru: "Руководство", ro: "Conducere" },
  { key: "achievements", href: "/club/achievements", ru: "Достижения", ro: "Performanțe" },
  { key: "archive", href: "/club/archive", ru: "Архивные фото", ro: "Fotografii de arhivă" },
  { key: "hall-of-fame", href: "/club/hall-of-fame", ru: "Зал славы", ro: "Galeria de onoare" },
] as const;

export type ClubPageKey = typeof clubPages[number]["key"];

export function clubPageLabel(key: ClubPageKey, locale: Locale) {
  const item = clubPages.find((entry) => entry.key === key)!;
  return locale === "ro" ? item.ro : item.ru;
}
