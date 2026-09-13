import Link from "next/link";
import HeaderNavClient from "@/app/components/HeaderNavClient";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { staffRoles } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
import { defaultHeaderDesign, localizedValue, normalizeHeaderDesign } from "@/lib/global-design";

export default async function SiteHeader() {
  const locale = await getLocale();
  const text = publicText[locale];
  const supabase = await createClient();
  const [{ data: claimsData }, { data: designRow }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("site_global_designs").select("config").eq("component_key", "header").maybeSingle(),
  ]);
  const userId = claimsData?.claims?.sub;
  const design = normalizeHeaderDesign(designRow?.config, defaultHeaderDesign);

  let profile: Profile | null = null;
  if (userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
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

      <header className={headerClass} style={{ "--header-height": `${design.height_desktop}px`, "--header-height-mobile": `${design.height_mobile}px` } as React.CSSProperties}>
        <div className="container nav">
          <Link className="brand" href="/">
            {design.logo_mode === "image" && design.logo_url ? <img className="globalBrandLogo" src={design.logo_url} alt="FC Edineț" style={{ width: design.logo_width }} /> : <span className="crest" style={{ width: design.logo_width, height: Math.round(design.logo_width * 1.17) }}>FCE</span>}
            {design.show_brand_text && <span className="brandText"><strong>{design.brand_name}</strong><small>{design.brand_subtitle}</small></span>}
          </Link>

          <HeaderNavClient
            isAuthenticated={isAuthenticated}
            isStaff={isStaff}
            locale={locale}
            accountName={profile?.display_name || profile?.full_name || null}
            navOrder={design.nav_order}
            navVisibility={design.nav_visibility}
            showSearch={design.show_search}
            showAccount={design.show_account}
            showAdminLink={design.show_admin_link}
            showLanguageMobile={design.show_language}
          />
        </div>
      </header>
    </>
  );
}
