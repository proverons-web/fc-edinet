import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
import { defaultFooterDesign, localizedValue, normalizeFooterDesign } from "@/lib/global-design";
import { getGlobalDesignConfigs } from "@/lib/site-global-designs";
import { createClient } from "@/lib/supabase/server";

type VisitCounts = { unique_24h: number; unique_7d: number; unique_30d: number };

async function getVisitCounts(): Promise<VisitCounts | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_visit_counts");
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") return null;
    const value = row as Record<string, unknown>;
    return {
      unique_24h: Number(value.unique_24h ?? 0),
      unique_7d: Number(value.unique_7d ?? 0),
      unique_30d: Number(value.unique_30d ?? 0),
    };
  } catch {
    return null;
  }
}

export default async function SiteFooter() {
  const locale = await getLocale();
  const fallbackText = publicText[locale].footer;
  const [globalDesigns, visitCounts] = await Promise.all([getGlobalDesignConfigs(), getVisitCounts()]);
  const config = normalizeFooterDesign(globalDesigns.footer, defaultFooterDesign);
  const visibleColumns = config.columns.filter((column) => column.visible);
  const social = [
    ["Facebook", config.facebook_url], ["Instagram", config.instagram_url], ["YouTube", config.youtube_url], ["TikTok", config.tiktok_url],
  ].filter((item) => item[1]);

  return (
    <footer className={`footer globalFooter globalFooter-${config.background}`} style={{ paddingTop: config.padding_top, paddingBottom: config.padding_bottom }}>
      <div className="globalFooterWordmark" aria-hidden="true">FC EDINEȚ</div>
      <div className="container footerGrid globalFooterGrid" style={{ "--footer-columns": String(Math.max(1, visibleColumns.length)) } as React.CSSProperties}>
        <div className="globalFooterBrand">
          <Link className="brand" href="/">
            <img className="globalBrandLogo" src={config.logo_mode === "image" && config.logo_url ? config.logo_url : "/brand/fc-edinet-crest.png"} alt="FC Edineț" loading="lazy" decoding="async" style={{ width: Math.max(config.logo_width, 54) }} />
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
        {config.show_version && <span className="footerVisitorCounter" title={locale === "ro" ? "Vizitatori unici: 24 ore · 7 zile · 30 zile" : "Уникальные посетители: 24 часа · 7 дней · 30 дней"} aria-label={locale === "ro" ? "Vizitatori unici în 24 ore, 7 zile și 30 zile" : "Уникальные посетители за 24 часа, 7 дней и 30 дней"}>
          <small>{locale === "ro" ? "24h" : "24ч"}</small><b>{visitCounts?.unique_24h ?? "—"}</b><i>·</i><small>{locale === "ro" ? "7z" : "7д"}</small><b>{visitCounts?.unique_7d ?? "—"}</b><i>·</i><small>{locale === "ro" ? "30z" : "30д"}</small><b>{visitCounts?.unique_30d ?? "—"}</b>
        </span>}
      </div>}
    </footer>
  );
}
