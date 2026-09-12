"use client";

import Link from "next/link";
import { useState } from "react";
import { publicText, type Locale } from "@/lib/i18n";

export default function HeaderNavClient({
  isAuthenticated,
  isStaff,
  locale,
}: {
  isAuthenticated: boolean;
  isStaff: boolean;
  locale: Locale;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const text = publicText[locale].nav;
  const links = [
    { href: "/news", label: text.news },
    { href: "/team", label: text.team },
    { href: "/matches", label: text.matches },
    { href: "/standings", label: text.standings },
    { href: "/club", label: text.club },
    { href: "/media", label: text.media },
  ];

  return (
    <>
      <nav className="menu">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>{link.label}</Link>
        ))}
        {isStaff && <Link href="/admin">{text.admin}</Link>}
      </nav>

      <div className="navActions">
        <button className="searchButton" aria-label="Search">⌕</button>
        <Link className="login" href={isAuthenticated ? "/account" : "/login"}>
          {isAuthenticated ? text.account : text.login}
        </Link>
        <button
          className="menuToggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={text.openMenu}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="mobileMenu mobileMenuAbsolute">
          <div className="container mobileMenuInner">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            {isStaff && (
              <Link href="/admin" onClick={() => setMenuOpen(false)}>{text.admin}</Link>
            )}
            <Link href={isAuthenticated ? "/account" : "/login"} onClick={() => setMenuOpen(false)}>
              {isAuthenticated ? text.personalAccount : text.login}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
