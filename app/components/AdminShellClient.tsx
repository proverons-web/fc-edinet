"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@/lib/types";

const groups = [
  {
    label: "ГЛАВНОЕ",
    items: [
      { href: "/admin", label: "Обзор", icon: "⌂", minRole: "author" as UserRole },
      { href: "/admin/site-builder", label: "Редактор сайта", icon: "✦", minRole: "editor" as UserRole },
      { href: "/admin/design", label: "Дизайн", icon: "◈", minRole: "editor" as UserRole },
    ],
  },
  {
    label: "КОНТЕНТ",
    items: [
      { href: "/admin/news", label: "Новости", icon: "N", minRole: "author" as UserRole },
      { href: "/admin/players", label: "Команда", icon: "P", minRole: "editor" as UserRole },
      { href: "/admin/matches", label: "Матчи", icon: "M", minRole: "editor" as UserRole },
      { href: "/admin/match-center", label: "Матч-центр", icon: "MC", minRole: "editor" as UserRole },
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

  if (pathname.includes("/preview") || searchParams.get("embedded") === "1") {
    return <div className="adminEmbedded">{children}</div>;
  }

  const isActive = (href: string) => href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="adminAppShell">
      <aside className={`adminSidebar${mobileOpen ? " isOpen" : ""}`}>
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
          <button type="button" className="adminMobileMenu" onClick={() => setMobileOpen((value) => !value)} aria-label="Открыть меню" aria-expanded={mobileOpen}>☰</button>
          <div className="adminTopbarTrail"><span>FC Edineț</span><b>{pathname === "/admin" ? "Обзор" : pathname.split("/").filter(Boolean).slice(-1)[0]?.replaceAll("-", " ")}</b></div>
          <div className="adminTopbarUser"><span>{displayName}</span><small>{roleLabel}</small><Link href="/account" aria-label="Открыть профиль">↗</Link></div>
        </header>
        <div className="adminShellContent">{children}</div>
      </div>

      {mobileOpen && <button type="button" className="adminSidebarBackdrop" aria-label="Закрыть меню" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
