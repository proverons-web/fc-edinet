import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { defaultFooterDesign, localizedValue, normalizeFooterDesign } from "@/lib/global-design";

export default async function SiteFooter() {
  const locale = await getLocale();
  const fallbackText = publicText[locale].footer;
  const supabase = await createClient();
  const { data: row } = await supabase.from("site_global_designs").select("config").eq("component_key", "footer").maybeSingle();
  const config = normalizeFooterDesign(row?.config, defaultFooterDesign);
  const visibleColumns = config.columns.filter((column) => column.visible);
  const social = [
    ["Facebook", config.facebook_url], ["Instagram", config.instagram_url], ["YouTube", config.youtube_url], ["TikTok", config.tiktok_url],
  ].filter((item) => item[1]);

  return (
    <footer className={`footer globalFooter globalFooter-${config.background}`} style={{ paddingTop: config.padding_top, paddingBottom: config.padding_bottom }}>
      <div className="container footerGrid globalFooterGrid" style={{ "--footer-columns": String(Math.max(1, visibleColumns.length)) } as React.CSSProperties}>
        <div className="globalFooterBrand">
          <Link className="brand" href="/">
            {config.logo_mode === "image" && config.logo_url ? <img className="globalBrandLogo" src={config.logo_url} alt="FC Edineț" style={{ width: config.logo_width }} /> : <span className="crest" style={{ width: config.logo_width, height: Math.round(config.logo_width * 1.17) }}>FCE</span>}
            <span className="brandText"><strong>{config.brand_name}</strong><small>{config.brand_subtitle}</small></span>
          </Link>
          {config.show_about && <p>{localizedValue(config.about_ru, config.about_ro, locale) || fallbackText.about}</p>}
          {config.social_enabled && social.length > 0 && <div className="footerSocialLinks">{social.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>)}</div>}
        </div>
        {visibleColumns.map((column) => <div key={column.id} className="globalFooterColumn">
          <strong>{localizedValue(column.title_ru, column.title_ro, locale)}</strong>
          {column.links.map((link) => link.href.startsWith("/") ? <Link key={link.id} href={link.href}>{localizedValue(link.label_ru, link.label_ro, locale)}</Link> : /^(mailto:|tel:)/i.test(link.href) ? <a key={link.id} href={link.href}>{localizedValue(link.label_ru, link.label_ro, locale)}</a> : <a key={link.id} href={link.href} target="_blank" rel="noreferrer">{localizedValue(link.label_ru, link.label_ro, locale)}</a>)}
        </div>)}
      </div>
      {(config.show_copyright || config.show_version) && <div className="container footerBottom">
        {config.show_copyright && <span>{config.copyright_text}</span>}
        {config.show_version && <span>{fallbackText.version}</span>}
      </div>}
    </footer>
  );
}
