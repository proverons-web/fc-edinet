"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/types";

const groups = [
  {
    label: "ГЛАВНОЕ",
    items: [
      { href: "/admin", label: "Обзор", icon: "⌂", minRole: "author" as UserRole },
      { href: "/admin/site-builder", label: "Редактор сайта", icon: "✦", minRole: "editor" as UserRole },
      { href: "/admin/design", label: "Глобальный дизайн", icon: "◈", minRole: "editor" as UserRole },
    ],
  },
  {
    label: "КОНТЕНТ",
    items: [
      { href: "/admin/news", label: "Новости", icon: "N", minRole: "author" as UserRole },
      { href: "/admin/players", label: "Команда", icon: "P", minRole: "editor" as UserRole },
      { href: "/admin/matches", label: "Матчи", icon: "M", minRole: "editor" as UserRole },
      { href: "/admin/match-center", label: "Протокол матча", icon: "MC", minRole: "editor" as UserRole },
      { href: "/admin/standings", label: "Таблица", icon: "T", minRole: "editor" as UserRole },
      { href: "/admin/statistics", label: "Статистика", icon: "S", minRole: "editor" as UserRole },
      { href: "/admin/media", label: "Медиа", icon: "◎", minRole: "editor" as UserRole },
      { href: "/admin/club", label: "Клуб", icon: "C", minRole: "editor" as UserRole },
      { href: "/admin/partners", label: "Партнёры", icon: "◇", minRole: "editor" as UserRole },
    ],
  },
  {
    label: "УПРАВЛЕНИЕ",
    items: [
      { href: "/admin/comments", label: "Комментарии", icon: "#", minRole: "editor" as UserRole },
      { href: "/admin/translations", label: "Переводы RU → RO", icon: "RO", minRole: "editor" as UserRole },
    ],
  },
  {
    label: "СИСТЕМА",
    items: [
      { href: "/admin/users", label: "Пользователи", icon: "U", minRole: "admin" as UserRole },
      { href: "/admin/audit", label: "Журнал действий", icon: "A", minRole: "admin" as UserRole },
    ],
  },
];

const rank: Record<UserRole, number> = { fan: 0, author: 1, editor: 2, admin: 3 };

const adminRouteLabels: Record<string, string> = {
  admin: "Обзор",
  "site-builder": "Редактор сайта",
  design: "Глобальный дизайн",
  news: "Новости",
  players: "Команда",
  matches: "Матчи",
  "match-center": "Протокол матча",
  standings: "Турнирная таблица",
  statistics: "Статистика",
  media: "Медиа",
  club: "Клуб",
  partners: "Партнёры",
  comments: "Комментарии",
  translations: "Переводы RU → RO",
  users: "Пользователи",
  audit: "Журнал действий",
  "page-builder": "Расширенный редактор",
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  if (pathname.includes("/preview") || searchParams.get("embedded") === "1") {
    return <div className="adminEmbedded">{children}</div>;
  }

  const isActive = (href: string) => href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const trail = getAdminTrail(pathname);

  return (
    <div className="adminAppShell">
      <aside id="admin-sidebar" className={`adminSidebar${mobileOpen ? " isOpen" : ""}`}>
        <div className="adminBrandBlock">
          <img src="/brand/fc-edinet-crest.png" alt="FC Edineț" />
          <div><strong>FC EDINEȚ</strong><span>ADMIN CENTER</span></div>
        </div>

        <nav className="adminSidebarNav" aria-label="Админ-навигация">
          {groups.map((group) => {
            const items = group.items.filter((item) => rank[role] >= rank[item.minRole]);
            if (!items.length) return null;
            return (
              <section key={group.label} className="adminNavGroup">
                <span>{group.label}</span>
                {items.map((item) => (
                  <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""} onClick={() => setMobileOpen(false)}>
                    <i aria-hidden="true">{item.icon}</i><b>{item.label}</b>
                  </Link>
                ))}
              </section>
            );
          })}
        </nav>

        <div className="adminSidebarBottom">
          <a href="/" target="_blank" rel="noreferrer">Открыть сайт ↗</a>
          <Link href="/account">Личный кабинет</Link>
        </div>
      </aside>

      <div className="adminShellMain">
        <header className="adminTopbar">
          <button type="button" className="adminMobileMenu" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={mobileOpen} aria-controls="admin-sidebar">☰</button>
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
