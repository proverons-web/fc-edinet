import type { CSSProperties } from "react";
import Link from "next/link";
import HeaderNavClient from "@/app/components/HeaderNavClient";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Profile } from "@/lib/types";
import { staffRoles } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
import { accountText } from "@/lib/account-i18n";
import { defaultHeaderDesign, localizedValue, normalizeHeaderDesign } from "@/lib/global-design";
import type { SiteMenuItem } from "@/lib/site-builder";
import { canonicalPublicMenu, hasCanonicalMenuHierarchy, normalizeCanonicalMenuRoutes } from "@/lib/site-navigation";
import { getGlobalDesignConfigs } from "@/lib/site-global-designs";

export default async function SiteHeader() {
  const locale = await getLocale();
  const text = publicText[locale];
  const account = accountText[locale];
  const supabase = await createClient();
  const publicSupabase = createPublicClient();
  const [{ data: claimsData }, globalDesigns, menuResult] = await Promise.all([
    supabase.auth.getClaims(),
    getGlobalDesignConfigs(),
    publicSupabase.from("site_menu_items").select("*").eq("visible", true).order("display_order").order("id"),
  ]);
  const userId = claimsData?.claims?.sub;
  const design = normalizeHeaderDesign(globalDesigns.header, defaultHeaderDesign);
  const fetchedMenu = normalizeCanonicalMenuRoutes((menuResult.data ?? []) as SiteMenuItem[]);
  const managedMenu = !menuResult.error && hasCanonicalMenuHierarchy(fetchedMenu)
    ? fetchedMenu
    : canonicalPublicMenu;

  let profile: Profile | null = null;
  if (userId) {
    const { data } = await supabase.from("profiles").select("id,role,display_name,full_name").eq("id", userId).maybeSingle();
    profile = data as Profile | null;
  }

  const isAuthenticated = Boolean(userId);
  const isStaff = profile ? staffRoles.includes(profile.role) : false;
  const topbarText = localizedValue(design.topbar_text_ru, design.topbar_text_ro, locale) || text.officialSite;
  const headerClass = `header globalHeader globalHeader-${design.background}${design.sticky ? " isSticky" : " notSticky"}`;

  return (
    <>
      {design.topbar_enabled && <div className="topbar globalTopbar">
        <div className="container topbarInner">
          <span>{topbarText}</span>
          <div className="topbarLinks">{design.show_language && <LanguageSwitcher locale={locale} />}</div>
        </div>
      </div>}

      <header className={headerClass} style={{ "--header-height": `${design.height_desktop}px`, "--header-height-mobile": `${design.height_mobile}px` } as CSSProperties}>
        <div className="container nav">
          <Link className="brand" href="/">
            <img className="globalBrandLogo" src={design.logo_mode === "image" && design.logo_url ? design.logo_url : "/brand/fc-edinet-crest.png"} alt="FC Edineț" decoding="async" style={{ width: Math.max(design.logo_width, 42) }} />
            {design.show_brand_text && <span className="brandText"><strong>{design.brand_name}</strong><small>{design.brand_subtitle}</small></span>}
          </Link>

          <HeaderNavClient
            isAuthenticated={isAuthenticated}
            isStaff={isStaff}
            locale={locale}
            labels={{
              home: locale === "ro" ? "Acasă" : "Главная",
              search: locale === "ro" ? "Căutare" : "Поиск",
              admin: text.nav.admin,
              login: text.nav.login,
              account: text.nav.account,
              openMenu: text.nav.openMenu,
              nav: {
                news: text.nav.news,
                team: text.nav.team,
                statistics: text.nav.statistics,
                matches: text.nav.matches,
                standings: text.nav.standings,
                club: text.nav.club,
                academy: text.nav.academy,
                media: text.nav.media,
                partners: text.nav.partners,
              },
              dashboard: account.dashboard,
              profile: account.profile,
              favorites: account.favorites,
              settings: account.settings,
              logout: account.logout,
            }}
            accountName={profile?.display_name || profile?.full_name || null}
            navOrder={design.nav_order}
            navVisibility={design.nav_visibility}
            showSearch={design.show_search}
            showAccount={design.show_account}
            showAdminLink={design.show_admin_link}
            showLanguageMobile={design.show_language}
            managedMenu={managedMenu}
          />
        </div>
      </header>
    </>
  );
}
