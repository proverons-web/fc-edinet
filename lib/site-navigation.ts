import type { SiteMenuItem } from "@/lib/site-builder";

// Canonical public navigation used only when the managed menu cannot be read
// or an older flat menu is returned. Keep this aligned with database/059+
// so a transient Data API/RLS issue can never resurrect the legacy header.
export const canonicalPublicMenu: SiteMenuItem[] = [
  { id: -100, system_key: "home", label_ru: "Главная", label_ro: "Acasă", href: "/", visible: true, display_order: 10, parent_id: null, custom_page_id: null },
  { id: -200, system_key: "news", label_ru: "Новости", label_ro: "Știri", href: "/news", visible: true, display_order: 20, parent_id: null, custom_page_id: null },
  { id: -300, system_key: "team", label_ru: "Сезон 26/27", label_ro: "Sezon 26/27", href: "/team", visible: true, display_order: 30, parent_id: null, custom_page_id: null },
  { id: -310, system_key: "team_squad", label_ru: "Состав", label_ro: "Lot", href: "/team", visible: true, display_order: 10, parent_id: -300, custom_page_id: null },
  { id: -320, system_key: "team_staff", label_ru: "Тренерский штаб", label_ro: "Staff tehnic", href: "/staff", visible: true, display_order: 20, parent_id: -300, custom_page_id: null },
  { id: -330, system_key: "matches", label_ru: "Календарь", label_ro: "Calendar", href: "/matches", visible: true, display_order: 30, parent_id: -300, custom_page_id: null },
  { id: -340, system_key: "statistics", label_ru: "Статистика", label_ro: "Statistici", href: "/statistics", visible: true, display_order: 40, parent_id: -300, custom_page_id: null },
  { id: -350, system_key: "standings", label_ru: "Таблица", label_ro: "Clasament", href: "/standings", visible: true, display_order: 50, parent_id: -300, custom_page_id: null },
  { id: -400, system_key: "club", label_ru: "Клуб", label_ro: "Club", href: "/club/about", visible: true, display_order: 40, parent_id: null, custom_page_id: null },
  { id: -410, system_key: "club_about", label_ru: "О клубе", label_ro: "Despre club", href: "/club/about", visible: true, display_order: 10, parent_id: -400, custom_page_id: null },
  { id: -420, system_key: "club_history", label_ru: "История FC Edineț", label_ro: "Istoria FC Edineț", href: "/club/history", visible: true, display_order: 20, parent_id: -400, custom_page_id: null },
  { id: -430, system_key: "club_stadium", label_ru: "Стадион", label_ro: "Stadion", href: "/club/stadium", visible: true, display_order: 30, parent_id: -400, custom_page_id: null },
  { id: -440, system_key: "club_leadership", label_ru: "Руководство", label_ro: "Conducere", href: "/club/leadership", visible: true, display_order: 40, parent_id: -400, custom_page_id: null },
  { id: -450, system_key: "club_achievements", label_ru: "Достижения", label_ro: "Performanțe", href: "/club/achievements", visible: true, display_order: 50, parent_id: -400, custom_page_id: null },
  { id: -460, system_key: "club_archive", label_ru: "Архивные фото", label_ro: "Fotografii de arhivă", href: "/club/archive", visible: true, display_order: 60, parent_id: -400, custom_page_id: null },
  { id: -470, system_key: "club_hall_of_fame", label_ru: "Зал славы", label_ro: "Galeria de onoare", href: "/club/hall-of-fame", visible: true, display_order: 70, parent_id: -400, custom_page_id: null },
  { id: -500, system_key: "media", label_ru: "Медиа", label_ro: "Media", href: "/media", visible: true, display_order: 50, parent_id: null, custom_page_id: null },
];

export function normalizeCanonicalMenuRoutes(items: SiteMenuItem[]) {
  return items.map((item) => item.system_key === "team_staff" && item.href !== "/staff"
    ? { ...item, href: "/staff" }
    : item);
}

export function hasCanonicalMenuHierarchy(items: SiteMenuItem[]) {
  const season = items.find((item) => item.system_key === "team" && item.parent_id == null);
  const club = items.find((item) => item.system_key === "club" && item.parent_id == null);
  if (!season || !club) return false;

  const seasonKeys = new Set(items.filter((item) => item.parent_id === season.id).map((item) => item.system_key));
  const clubKeys = new Set(items.filter((item) => item.parent_id === club.id).map((item) => item.system_key));

  return ["team_squad", "team_staff", "matches", "statistics", "standings"].every((key) => seasonKeys.has(key))
    && ["club_about", "club_history", "club_stadium", "club_leadership", "club_achievements", "club_archive", "club_hall_of_fame"].every((key) => clubKeys.has(key));
}
