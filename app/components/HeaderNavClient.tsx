"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { logout } from "@/app/account/actions";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import type { Locale } from "@/lib/i18n";
import type { HeaderNavKey } from "@/lib/global-design";
import type { SiteMenuItem } from "@/lib/site-builder";

type HeaderClientLabels = {
  home: string;
  search: string;
  admin: string;
  login: string;
  account: string;
  openMenu: string;
  nav: Record<HeaderNavKey, string>;
  dashboard: string;
  profile: string;
  favorites: string;
  settings: string;
  logout: string;
};

export default function HeaderNavClient({
  isAuthenticated,
  isStaff,
  locale,
  labels,
  accountName,
  navOrder,
  navVisibility,
  showSearch = true,
  showAccount = true,
  showAdminLink = true,
  showLanguageMobile = true,
  managedMenu = [],
}: {
  isAuthenticated: boolean;
  isStaff: boolean;
  locale: Locale;
  labels: HeaderClientLabels;
  accountName?: string | null;
  navOrder?: HeaderNavKey[];
  navVisibility?: Record<HeaderNavKey, boolean>;
  showSearch?: boolean;
  showAccount?: boolean;
  showAdminLink?: boolean;
  showLanguageMobile?: boolean;
  managedMenu?: SiteMenuItem[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement>(null);
  const linkMap: Record<HeaderNavKey, { href: string; label: string }> = {
    news: { href: "/news", label: labels.nav.news },
    team: { href: "/team", label: labels.nav.team },
    statistics: { href: "/statistics", label: labels.nav.statistics },
    matches: { href: "/matches", label: labels.nav.matches },
    standings: { href: "/standings", label: labels.nav.standings },
    club: { href: "/club", label: labels.nav.club },
    academy: { href: "/academy", label: labels.nav.academy },
    media: { href: "/media", label: labels.nav.media },
    partners: { href: "/partners", label: labels.nav.partners },
  };
  const order = navOrder?.length ? navOrder : Object.keys(linkMap) as HeaderNavKey[];
  const legacyLinks = order.filter((key) => navVisibility?.[key] !== false).map((key) => linkMap[key]);
  const useManagedMenu = managedMenu.length > 0;
  const topManaged = managedMenu.filter((item) => !item.parent_id);
  const childMap = new Map<number, SiteMenuItem[]>();
  for (const item of managedMenu) if (item.parent_id) childMap.set(item.parent_id, [...(childMap.get(item.parent_id) ?? []), item]);
  const localizedMenuLabel = (item: SiteMenuItem) => locale === "ro" ? (item.label_ro || item.label_ru) : item.label_ru;
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setAccountOpen(false); };
    const onPointerDown = (event: MouseEvent) => {
      if (accountWrapRef.current && !accountWrapRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [accountOpen]);

  return (
    <>
      <nav className="menu">
        {useManagedMenu ? topManaged.map((item) => {
          const children = childMap.get(item.id) ?? [];
          return children.length ? <span className="managedMenuGroup" key={item.id}><Link href={item.href} className={isActive(item.href) ? "isActive" : undefined}>{localizedMenuLabel(item)}</Link><span className="managedMenuDropdown">{children.map((child) => <Link key={child.id} href={child.href}>{localizedMenuLabel(child)}</Link>)}</span></span> : <Link key={item.id} href={item.href} className={isActive(item.href) ? "isActive" : undefined} aria-current={isActive(item.href) ? "page" : undefined}>{localizedMenuLabel(item)}</Link>;
        }) : <>
          <Link href="/" className={isActive("/") ? "isActive" : undefined} aria-current={isActive("/") ? "page" : undefined}>{labels.home}</Link>
          {legacyLinks.map((link) => <Link key={link.href} href={link.href} className={isActive(link.href) ? "isActive" : undefined} aria-current={isActive(link.href) ? "page" : undefined}>{link.label}</Link>)}
        </>}
        {showAdminLink && isStaff && <Link href="/admin">{labels.admin}</Link>}
      </nav>

      <div className="navActions">
        {showLanguageMobile && <div className="headerMobileLanguage"><LanguageSwitcher locale={locale}/></div>}
        {showSearch && <Link href="/search" className="searchButton" aria-label={labels.search} title={labels.search}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg></Link>}
        {showAccount && (isAuthenticated ? (
          <div className="accountMenuWrap" ref={accountWrapRef}>
            <button className="accountMenuButton" type="button" onClick={() => setAccountOpen(!accountOpen)} aria-expanded={accountOpen} aria-haspopup="menu" aria-controls="account-menu-dropdown">
              <span className="accountMenuAvatar">{(accountName || labels.account).slice(0, 1).toUpperCase()}</span>
              <span>{accountName || labels.account}</span><b aria-hidden="true">⌄</b>
            </button>
            {accountOpen && <div className="accountMenuDropdown" id="account-menu-dropdown" role="menu">
              <Link role="menuitem" href="/account" onClick={() => setAccountOpen(false)}>{labels.dashboard}</Link>
              <Link role="menuitem" href="/account/profile" onClick={() => setAccountOpen(false)}>{labels.profile}</Link>
              <Link role="menuitem" href="/account/favorites" onClick={() => setAccountOpen(false)}>{labels.favorites}</Link>
              <Link role="menuitem" href="/account/settings" onClick={() => setAccountOpen(false)}>{labels.settings}</Link>
              {showAdminLink && isStaff && <Link role="menuitem" href="/admin" onClick={() => setAccountOpen(false)}>{labels.admin}</Link>}
              <form action={logout}><button role="menuitem" type="submit">{labels.logout}</button></form>
            </div>}
          </div>
        ) : <Link className="login" href="/login">{labels.login}</Link>)}
        <button className="menuToggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={labels.openMenu} aria-expanded={menuOpen} aria-controls="mobile-site-menu">{menuOpen ? "✕" : "☰"}</button>
      </div>

      {menuOpen && <div className="mobileMenu mobileMenuAbsolute" id="mobile-site-menu" role="dialog" aria-modal="true" aria-label={labels.openMenu}><div className="container mobileMenuInner">
        {useManagedMenu ? topManaged.map((item) => <div className="mobileManagedGroup" key={item.id}><Link href={item.href} className={isActive(item.href) ? "isActive" : undefined} onClick={() => setMenuOpen(false)}>{localizedMenuLabel(item)}</Link>{(childMap.get(item.id) ?? []).map((child) => <Link className="mobileManagedChild" key={child.id} href={child.href} onClick={() => setMenuOpen(false)}>{localizedMenuLabel(child)}</Link>)}</div>) : <>
          <Link href="/" className={isActive("/") ? "isActive" : undefined} aria-current={isActive("/") ? "page" : undefined} onClick={() => setMenuOpen(false)}>{labels.home}</Link>
          {legacyLinks.map((link) => <Link key={link.href} href={link.href} className={isActive(link.href) ? "isActive" : undefined} aria-current={isActive(link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}
        </>}
        {showAdminLink && isStaff && <Link href="/admin" onClick={() => setMenuOpen(false)}>{labels.admin}</Link>}
        {showSearch && <Link href="/search" onClick={() => setMenuOpen(false)}>{labels.search}</Link>}
        {showAccount && (isAuthenticated ? <>
          <Link href="/account" onClick={() => setMenuOpen(false)}>{labels.dashboard}</Link>
          <Link href="/account/profile" onClick={() => setMenuOpen(false)}>{labels.profile}</Link>
          <Link href="/account/favorites" onClick={() => setMenuOpen(false)}>{labels.favorites}</Link>
          <Link href="/account/settings" onClick={() => setMenuOpen(false)}>{labels.settings}</Link>
          <form action={logout}><button className="mobileLogoutButton" type="submit">{labels.logout}</button></form>
        </> : <Link href="/login" onClick={() => setMenuOpen(false)}>{labels.login}</Link>)}
      </div></div>}
    </>
  );
}
