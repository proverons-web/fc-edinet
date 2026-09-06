"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/news", label: "Новости" },
  { href: "/team", label: "Команда" },
  { href: "/matches", label: "Матчи" },
  { href: "/standings", label: "Таблица" },
  { href: "/club", label: "Клуб" },
  { href: "/media", label: "Медиа" },
];

export default function HeaderNavClient({
  isAuthenticated,
  isStaff,
}: {
  isAuthenticated: boolean;
  isStaff: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="menu">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        {isStaff && <Link href="/admin">Админка</Link>}
      </nav>

      <div className="navActions">
        <button className="searchButton" aria-label="Поиск">⌕</button>

        <Link className="login" href={isAuthenticated ? "/account" : "/login"}>
          {isAuthenticated ? "Кабинет" : "Войти"}
        </Link>

        <button
          className="menuToggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Открыть меню"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="mobileMenu mobileMenuAbsolute">
          <div className="container mobileMenuInner">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {isStaff && (
              <Link href="/admin" onClick={() => setMenuOpen(false)}>
                Админка
              </Link>
            )}

            <Link
              href={isAuthenticated ? "/account" : "/login"}
              onClick={() => setMenuOpen(false)}
            >
              {isAuthenticated ? "Личный кабинет" : "Войти"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
