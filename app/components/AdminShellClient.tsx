"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UserRole } from "@/lib/types";

type NavItem = { href: string; label: string; icon: string; minRole: UserRole; keywords?: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    id: "main",
    label: "ГЛАВНОЕ",
    items: [
      { href: "/admin", label: "Главная админки", icon: "⌂", minRole: "author" },
      { href: "/admin/site-builder", label: "Редактор сайта", icon: "✎", minRole: "editor", keywords: "визуальный редактор страницы дизайн hero конструктор site builder меню" },
    ],
  },
  {
    id: "editorial",
    label: "РЕДАКЦИЯ",
    items: [
      { href: "/admin/news", label: "Новости", icon: "N", minRole: "author", keywords: "статьи публикации черновики" },
      { href: "/admin/media", label: "Медиа", icon: "◎", minRole: "editor", keywords: "фото видео альбомы youtube" },
      { href: "/admin/comments", label: "Комментарии", icon: "#", minRole: "editor", keywords: "модерация жалобы" },
      { href: "/admin/translations", label: "Переводы RU → RO", icon: "RO", minRole: "editor", keywords: "румынский локализация" },
    ],
  },
  {
    id: "team",
    label: "КОМАНДА",
    items: [
      { href: "/admin/players", label: "Игроки", icon: "P", minRole: "editor", keywords: "состав футболисты профили" },
      { href: "/admin/staff", label: "Штаб команды", icon: "ST", minRole: "editor", keywords: "тренеры медицина персонал" },
    ],
  },
  {
    id: "competition",
    label: "МАТЧИ И ТУРНИР",
    items: [
      { href: "/admin/matches", label: "Календарь", icon: "M", minRole: "editor", keywords: "матчи результаты соперники" },
      { href: "/admin/matches/competitions", label: "Соревнования", icon: "C", minRole: "editor", keywords: "лига кубок товарищеские турниры" },
      { href: "/admin/match-center", label: "Протокол матча", icon: "MC", minRole: "editor", keywords: "события составы статистика матч центр" },
      { href: "/admin/standings", label: "Таблица", icon: "T", minRole: "editor", keywords: "турнир очки положение" },
      { href: "/admin/statistics", label: "Статистика", icon: "S", minRole: "editor", keywords: "игроки сезоны матчи данные" },
    ],
  },
  {
    id: "club",
    label: "КЛУБ И ПАРТНЁРЫ",
    items: [
      { href: "/admin/club", label: "Клуб", icon: "C", minRole: "editor", keywords: "история стадион руководство достижения архив зал славы" },
      { href: "/admin/partners", label: "Партнёры", icon: "◇", minRole: "editor", keywords: "спонсоры логотипы" },
    ],
  },
  {
    id: "analytics",
    label: "АНАЛИТИКА",
    items: [{ href: "/admin/site-analytics", label: "Статистика сайта", icon: "AN", minRole: "editor", keywords: "посетители просмотры трафик" }],
  },
  {
    id: "system",
    label: "СИСТЕМА",
    items: [
      { href: "/admin/users", label: "Пользователи", icon: "U", minRole: "admin", keywords: "роли доступ аккаунты" },
      { href: "/admin/audit", label: "Журнал действий", icon: "A", minRole: "admin", keywords: "аудит история изменения" },
      { href: "/admin/diagnostics", label: "Диагностика", icon: "D", minRole: "admin", keywords: "версия окружение seo проверка" },
    ],
  },
];

const rank: Record<UserRole, number> = { fan: 0, author: 1, editor: 2, admin: 3 };

const adminRouteLabels: Record<string, string> = {
  admin: "Обзор",
  news: "Новости",
  players: "Игроки",
  staff: "Штаб команды",
  matches: "Календарь",
  "match-center": "Протокол матча",
  standings: "Турнирная таблица",
  statistics: "Статистика",
  media: "Медиа",
  club: "Клуб",
  about: "О клубе",
  history: "История",
  stadium: "Стадион",
  leadership: "Руководство",
  achievements: "Достижения",
  archive: "Архивные фото",
  "hall-of-fame": "Зал славы",
  partners: "Партнёры",
  comments: "Комментарии",
  translations: "Переводы RU → RO",
  "site-analytics": "Статистика сайта",
  users: "Пользователи",
  audit: "Журнал действий",
  diagnostics: "Диагностика",
  "page-builder": "Редактор страницы",
  "site-builder": "Редактор сайта",
  design: "Дизайн",
  competitions: "Соревнования",
  cups: "Кубковая сетка",
  new: "Новая запись",
  teams: "Команды",
};

function getAdminTrail(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return ["Обзор"];
  return parts.slice(1).map((part) => adminRouteLabels[part] ?? decodeURIComponent(part).replaceAll("-", " "));
}

export default function AdminShellClient({
  children,
  role,
  displayName,
  roleLabel,
}: {
  children: React.ReactNode;
  role: UserRole;
  displayName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ analytics: true, system: true });
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const navSearchRef = useRef<HTMLInputElement>(null);
  const wasMobileOpen = useRef(false);

  useEffect(() => {
    setMobileOpen(false);
    setNavQuery("");
  }, [pathname]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("fc-admin-nav-collapsed");
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (saved && typeof saved === "object" && !Array.isArray(saved)) {
          setCollapsed(Object.fromEntries(Object.entries(saved).filter((entry) => typeof entry[1] === "boolean")));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      if (wasMobileOpen.current) mobileMenuButtonRef.current?.focus();
      wasMobileOpen.current = false;
      return;
    }
    wasMobileOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navSearchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key !== "Tab" || !sidebarRef.current) return;
      const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])'
      )).filter((node) => node.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const normalizedQuery = navQuery.trim().toLocaleLowerCase("ru");
  const visibleGroups = useMemo(() => groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (rank[role] < rank[item.minRole]) return false;
      if (!normalizedQuery) return true;
      return `${item.label} ${item.keywords || ""}`.toLocaleLowerCase("ru").includes(normalizedQuery);
    }),
  })).filter((group) => group.items.length), [role, normalizedQuery]);

  if (pathname.includes("/preview") || searchParams.get("embedded") === "1") {
    return <div className="adminEmbedded">{children}</div>;
  }

  const matchingNavRoutes = visibleGroups.flatMap((group) => group.items)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length);
  const activeHref = matchingNavRoutes[0]?.href;
  const isActive = (href: string) => href === activeHref;
  const trail = getAdminTrail(pathname);

  const toggleGroup = (id: string) => {
    const next = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(next);
    try { window.localStorage.setItem("fc-admin-nav-collapsed", JSON.stringify(next)); } catch {}
  };

  return (
    <div className="adminAppShell">
      <aside ref={sidebarRef} id="admin-sidebar" className={`adminSidebar${mobileOpen ? " isOpen" : ""}`} aria-label="Разделы управления сайтом">
        <div className="adminBrandBlock">
          <img src="/brand/fc-edinet-crest.png" alt="FC Edineț" />
          <div><strong>FC EDINEȚ</strong><span>ADMIN CENTER</span></div>
        </div>

        <div className="adminNavSearch">
          <span aria-hidden="true">⌕</span>
          <input ref={navSearchRef} type="search" value={navQuery} onChange={(event) => setNavQuery(event.target.value)} placeholder="Найти раздел…" aria-label="Поиск по разделам админки" />
          {navQuery && <button type="button" onClick={() => setNavQuery("")} aria-label="Очистить поиск">×</button>}
        </div>

        <nav className="adminSidebarNav" aria-label="Админ-навигация">
          {visibleGroups.map((group) => {
            const hasActive = group.items.some((item) => isActive(item.href));
            const isCollapsed = !normalizedQuery && !hasActive && Boolean(collapsed[group.id]);
            return (
              <section key={group.id} className={`adminNavGroup${isCollapsed ? " isCollapsed" : ""}`}>
                <button type="button" className="adminNavGroupToggle" onClick={() => toggleGroup(group.id)} aria-expanded={!isCollapsed} aria-label={`${group.label}: ${isCollapsed ? "развернуть" : "свернуть"}`} >
                  <span>{group.label}</span><i aria-hidden="true">⌄</i>
                </button>
                {!isCollapsed && <div className="adminNavGroupItems">
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""} onClick={() => setMobileOpen(false)}>
                      <i aria-hidden="true">{item.icon}</i><b>{item.label}</b>
                    </Link>
                  ))}
                </div>}
              </section>
            );
          })}
          {normalizedQuery && !visibleGroups.length && <div className="adminNavEmpty">Раздел не найден</div>}
        </nav>

        <div className="adminSidebarBottom">
          <a href="/" target="_blank" rel="noreferrer">Открыть сайт ↗</a>
          <Link href="/account">Личный кабинет</Link>
        </div>
      </aside>

      <div className="adminShellMain">
        <header className="adminTopbar">
          <button ref={mobileMenuButtonRef} type="button" className="adminMobileMenu" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={mobileOpen} aria-controls="admin-sidebar">☰</button>
          <nav className="adminTopbarTrail" aria-label="Навигационная цепочка">
            <Link href="/admin">FC Edineț</Link>
            {trail.map((label, index) => (
              <span key={`${label}-${index}`} className={index === trail.length - 1 ? "current" : ""}>
                {index === trail.length - 1 ? label : <span>{label}</span>}
              </span>
            ))}
          </nav>
          <div className="adminTopbarUser"><span>{displayName}</span><small>{roleLabel}</small><Link href="/account" aria-label="Открыть профиль">↗</Link></div>
        </header>
        <div className="adminShellContent">{children}</div>
      </div>

      {mobileOpen && <button type="button" className="adminSidebarBackdrop" aria-label="Закрыть меню" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
