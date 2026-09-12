"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/account/actions";
import { publicText, type Locale } from "@/lib/i18n";
import { accountText } from "@/lib/account-i18n";

export default function HeaderNavClient({
  isAuthenticated,
  isStaff,
  locale,
  accountName,
}: {
  isAuthenticated: boolean;
  isStaff: boolean;
  locale: Locale;
  accountName?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const text = publicText[locale].nav;
  const account = accountText[locale];
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
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        {isStaff && <Link href="/admin">{text.admin}</Link>}
      </nav>

      <div className="navActions">
        <button className="searchButton" aria-label="Search">⌕</button>
        {isAuthenticated ? (
          <div className="accountMenuWrap">
            <button className="accountMenuButton" type="button" onClick={() => setAccountOpen(!accountOpen)} aria-expanded={accountOpen}>
              <span className="accountMenuAvatar">{(accountName || text.account).slice(0, 1).toUpperCase()}</span>
              <span>{accountName || text.account}</span><b>⌄</b>
            </button>
            {accountOpen && <div className="accountMenuDropdown">
              <Link href="/account" onClick={() => setAccountOpen(false)}>{account.dashboard}</Link>
              <Link href="/account/profile" onClick={() => setAccountOpen(false)}>{account.profile}</Link>
              <Link href="/account/favorites" onClick={() => setAccountOpen(false)}>{account.favorites}</Link>
              <Link href="/account/settings" onClick={() => setAccountOpen(false)}>{account.settings}</Link>
              {isStaff && <Link href="/admin" onClick={() => setAccountOpen(false)}>{text.admin}</Link>}
              <form action={logout}><button type="submit">{account.logout}</button></form>
            </div>}
          </div>
        ) : <Link className="login" href="/login">{text.login}</Link>}
        <button className="menuToggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={text.openMenu}>{menuOpen ? "✕" : "☰"}</button>
      </div>

      {menuOpen && <div className="mobileMenu mobileMenuAbsolute"><div className="container mobileMenuInner">
        {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}
        {isStaff && <Link href="/admin" onClick={() => setMenuOpen(false)}>{text.admin}</Link>}
        {isAuthenticated ? <>
          <Link href="/account" onClick={() => setMenuOpen(false)}>{account.dashboard}</Link>
          <Link href="/account/profile" onClick={() => setMenuOpen(false)}>{account.profile}</Link>
          <Link href="/account/favorites" onClick={() => setMenuOpen(false)}>{account.favorites}</Link>
          <Link href="/account/settings" onClick={() => setMenuOpen(false)}>{account.settings}</Link>
          <form action={logout}><button className="mobileLogoutButton" type="submit">{account.logout}</button></form>
        </> : <Link href="/login" onClick={() => setMenuOpen(false)}>{text.login}</Link>}
      </div></div>}
    </>
  );
}
