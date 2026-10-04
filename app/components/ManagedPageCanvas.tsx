import Link from "next/link";
import type { MediaAlbum, MediaVideo, Partner, PartnerLevel, SitePageDesignSnapshot } from "@/lib/types";
import type { CSSProperties } from "react";
import { dateLocale, localized, partnerLevelLabelsI18n, publicText, type Locale } from "@/lib/i18n";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";
import { resolvePageHeroText } from "@/lib/page-design";
import {
  proSectionClass,
  proSectionStyle,
  type ProPageLayoutConfig,
  type ProPageKey,
} from "@/lib/pro-page-builder";

const partnerLevels: PartnerLevel[] = ["main", "official", "technical", "supporter"];

export default function ManagedPageCanvas({
  pageKey,
  layout,
  locale,
  heroDesign,
  albums = [],
  videos = [],
  partners = [],
  preview = false,
}: {
  pageKey: ProPageKey;
  layout: ProPageLayoutConfig;
  locale: Locale;
  heroDesign: SitePageDesignSnapshot;
  albums?: MediaAlbum[];
  videos?: MediaVideo[];
  partners?: Partner[];
  preview?: boolean;
}) {
  const labels = pageLabels(pageKey, locale, layout);
  return <div className={`managedProPage managedProPage-${pageKey}${preview ? " isPreview" : ""}`}>
    {layout.sections.filter((section) => section.visible).map((section) => {
      if (section.key === "hero") return <HeroSection key={section.key} pageKey={pageKey} locale={locale} layout={layout} design={heroDesign} section={section}/>;
      if (pageKey === "media" && section.key === "albums") return <MediaAlbums key={section.key} section={section} albums={albums} locale={locale}/>;
      if (pageKey === "media" && section.key === "videos") return <MediaVideos key={section.key} section={section} videos={videos} locale={locale}/>;
      if (pageKey === "partners" && section.key === "partners") return <PartnersGrid key={section.key} section={section} partners={partners} locale={locale}/>;
      if (pageKey === "partners" && section.key === "cta") return <CtaSection key={section.key} section={section} eyebrow={labels.ctaEyebrow} title={labels.ctaTitle} body={labels.ctaBody} href="/club" button={labels.ctaButton}/>;
      if (pageKey === "academy" && section.key === "intro") return <AcademyIntro key={section.key} section={section} layout={layout} locale={locale}/>;
      if (pageKey === "academy" && section.key === "groups") return <AcademyGroups key={section.key} section={section} locale={locale}/>;
      if (pageKey === "academy" && section.key === "pathway") return <AcademyPathway key={section.key} section={section} locale={locale}/>;
      if (pageKey === "academy" && section.key === "contact") return <CtaSection key={section.key} section={section} eyebrow={locale === "ro" ? "ACADEMIA FC EDINEȚ" : "АКАДЕМИЯ FC EDINEȚ"} title={localizedAcademy(layout, "contact_title", locale)} body={localizedAcademy(layout, "contact_text", locale)} href="/club" button={locale === "ro" ? "Contacte" : "Контакты клуба"}/>;
      return null;
    })}
  </div>;
}

function HeroSection({ pageKey, locale, layout, design, section }: { pageKey: ProPageKey; locale: Locale; layout: ProPageLayoutConfig; design: SitePageDesignSnapshot; section: ProPageLayoutConfig["sections"][number] }) {
  const fallback = pageKey === "media"
    ? { eyebrow: "FC EDINEȚ MEDIA", title: publicText[locale].media.heroTitle, description: publicText[locale].media.heroText }
    : pageKey === "partners"
      ? { eyebrow: publicText[locale].partners.eyebrow, title: publicText[locale].partners.title, description: publicText[locale].partners.description }
      : { eyebrow: localizedAcademy(layout, "hero_eyebrow", locale), title: localizedAcademy(layout, "hero_title", locale), description: localizedAcademy(layout, "hero_text", locale) };
  const hero = resolvePageHeroText(design, locale, fallback);
  const desktop = design.background_mode === "custom" ? design.desktop_image_url : null;
  const tablet = design.background_mode === "custom" ? design.tablet_image_url || desktop : desktop;
  const mobile = design.background_mode === "custom" ? design.mobile_image_url || tablet || desktop : desktop;
  const style = {
    ...proSectionStyle(section),
    "--pro-hero-height-d": `${design.hero_height_desktop}px`,
    "--pro-hero-height-t": `${design.hero_height_tablet}px`,
    "--pro-hero-height-m": `${design.hero_height_mobile}px`,
    "--pro-hero-overlay": design.overlay_opacity / 100,
    "--pro-hero-content": `${design.content_width}px`,
    "--pro-hero-d-x": `${design.desktop_position_x}%`, "--pro-hero-d-y": `${design.desktop_position_y}%`, "--pro-hero-d-z": design.desktop_zoom_percent / 100,
    "--pro-hero-t-x": `${design.tablet_position_x}%`, "--pro-hero-t-y": `${design.tablet_position_y}%`, "--pro-hero-t-z": design.tablet_zoom_percent / 100,
    "--pro-hero-m-x": `${design.mobile_position_x}%`, "--pro-hero-m-y": `${design.mobile_position_y}%`, "--pro-hero-m-z": design.mobile_zoom_percent / 100,
  } as CSSProperties;
  return <div className={proSectionClass(section)} style={style}>
    <div className="proSectionMotion">
      <section className={`proManagedHero proHero-${section.variant} align-${design.text_alignment}`}>
        {desktop && <div className="proManagedHeroMedia" aria-hidden="true"><img className="proHeroImage proHeroImageDesktop" src={desktop} alt=""/>{tablet && <img className="proHeroImage proHeroImageTablet" src={tablet} alt=""/>}{mobile && <img className="proHeroImage proHeroImageMobile" src={mobile} alt=""/>}</div>}
        <div className={`proManagedHeroOverlay ${design.overlay_style}`} aria-hidden="true"/>
        <div className="proManagedHeroInner heroBuilderContent">
          {design.show_eyebrow && heroLayerVisible(design.layer_config, "eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config, "eyebrow")}>{hero.eyebrow}</p>}
          {heroLayerVisible(design.layer_config, "title") && <h1 style={heroLayerStyle(design.layer_config, "title")}>{hero.title}</h1>}
          {design.show_description && heroLayerVisible(design.layer_config, "description") && <p style={heroLayerStyle(design.layer_config, "description")}>{hero.description}</p>}
        </div>
      </section>
    </div>
  </div>;
}

function MediaAlbums({ section, albums, locale }: { section: ProPageLayoutConfig["sections"][number]; albums: MediaAlbum[]; locale: Locale }) {
  const text = publicText[locale].media;
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner">
    <SectionHeading eyebrow={text.photo} title={text.albums} align={section.align}/>
    {albums.length ? <div className={`proCardGrid proMediaAlbums proAlbums-${section.variant}`}>
      {albums.map((album, index) => <Link href={`/media/${album.slug}`} className={`proMediaAlbumCard${section.variant === "featured" && index === 0 ? " isFeatured" : ""}`} key={album.id}>
        <div className="proMediaAlbumImage">{album.cover_image_url ? <img src={album.cover_image_url} alt={album.title}/> : <span>FC EDINEȚ</span>}<div className="proMediaShade"/></div>
        <div className="proMediaAlbumCopy"><span>{formatDate(album.event_date, locale)}{album.location ? ` · ${album.location}` : ""}</span><h3>{album.title}</h3>{album.description && section.variant !== "grid" && <p>{album.description}</p>}<b>{text.openAlbum} →</b></div>
      </Link>)}
    </div> : <div className="adminEmpty">{text.albumsEmpty}</div>}
  </div></div></section>;
}

function MediaVideos({ section, videos, locale }: { section: ProPageLayoutConfig["sections"][number]; videos: MediaVideo[]; locale: Locale }) {
  const text = publicText[locale].media;
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner">
    <SectionHeading eyebrow="FC EDINEȚ TV" title={text.videos} align={section.align}/>
    {videos.length ? <div className={`proCardGrid proMediaVideos proVideos-${section.variant}`}>
      {videos.map((video) => <article className="proMediaVideoCard" key={video.id}><div className="proMediaVideoEmbed"><iframe src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`} title={video.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div><div className="proMediaVideoCopy"><span>{formatDate(video.published_at, locale)}</span><h3>{video.title}</h3>{video.description && section.variant !== "grid" && <p>{video.description}</p>}</div></article>)}
    </div> : <div className="adminEmpty">{text.videosEmpty}</div>}
  </div></div></section>;
}

function PartnersGrid({ section, partners, locale }: { section: ProPageLayoutConfig["sections"][number]; partners: Partner[]; locale: Locale }) {
  const text = publicText[locale].partners;
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner">
    {!partners.length ? <div className="adminEmpty">{text.empty}</div> : <div className="proPartnerGroups">{partnerLevels.map((level) => {
      const items = partners.filter((partner) => partner.partner_level === level); if (!items.length) return null;
      return <section className="proPartnerGroup" key={level}><SectionHeading eyebrow={text.cooperation} title={partnerLevelLabelsI18n[locale][level]} align={section.align}/><div className={`proCardGrid proPartnersGrid proPartners-${section.variant}`}>{items.map((partner) => <PartnerCard key={partner.id} partner={partner} locale={locale} variant={section.variant}/>)}</div></section>;
    })}</div>}
  </div></div></section>;
}

function PartnerCard({ partner, locale, variant }: { partner: Partner; locale: Locale; variant: string }) {
  const body = <><div className="proPartnerLogo"><img src={partner.logo_url} alt={partner.name}/></div><div className="proPartnerCopy"><strong>{partner.name}</strong>{variant !== "logos" && localized(partner.description, partner.description_ro, locale) && <p>{localized(partner.description, partner.description_ro, locale)}</p>}{partner.website_url && variant !== "logos" && <span>{publicText[locale].partners.openSite} ↗</span>}</div></>;
  return partner.website_url ? <a className="proPartnerCard" href={partner.website_url} target="_blank" rel="noopener noreferrer">{body}</a> : <article className="proPartnerCard">{body}</article>;
}

function AcademyIntro({ section, layout, locale }: { section: ProPageLayoutConfig["sections"][number]; layout: ProPageLayoutConfig; locale: Locale }) {
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner proAcademyIntro"><p className="eyebrow blue">FC EDINEȚ ACADEMY</p><h2>{localizedAcademy(layout, "intro_title", locale)}</h2><p>{localizedAcademy(layout, "intro_text", locale)}</p><div className="proAcademyFact"><strong>FC EDINEȚ</strong><span>{locale === "ro" ? "De la primii pași până la echipa mare" : "От первых шагов до основной команды"}</span></div></div></div></section>;
}

function AcademyGroups({ section, locale }: { section: ProPageLayoutConfig["sections"][number]; locale: Locale }) {
  const groups = locale === "ro" ? [
    ["U7–U9", "Primii pași", "Tehnică, coordonare și dragoste pentru joc."],
    ["U11–U13", "Dezvoltare", "Înțelegerea jocului, disciplină și lucru în echipă."],
    ["U15–U17", "Performanță", "Pregătire pentru fotbalul competitiv și echipa mare."],
  ] : [
    ["U7–U9", "Первые шаги", "Техника, координация и любовь к игре."],
    ["U11–U13", "Развитие", "Понимание футбола, дисциплина и командная работа."],
    ["U15–U17", "Подготовка", "Переход к соревновательному футболу и основной команде."],
  ];
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner"><SectionHeading eyebrow="FC EDINEȚ" title={locale === "ro" ? "Grupe de vârstă" : "Возрастные группы"} align={section.align}/><div className={`proCardGrid proAcademyGroups proAcademyGroups-${section.variant}`}>{groups.map(([age, title, body]) => <article className="proAcademyGroupCard" key={age}><b>{age}</b><h3>{title}</h3><p>{body}</p></article>)}</div></div></div></section>;
}

function AcademyPathway({ section, locale }: { section: ProPageLayoutConfig["sections"][number]; locale: Locale }) {
  const steps = locale === "ro" ? ["Selecție", "Fundamente", "Competiție", "Echipa mare"] : ["Набор", "Фундамент", "Соревнования", "Основная команда"];
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner"><SectionHeading eyebrow="PLAYER PATHWAY" title={locale === "ro" ? "Drumul jucătorului" : "Путь игрока"} align={section.align}/><div className={`proCardGrid proAcademyPathway proAcademyPathway-${section.variant}`}>{steps.map((title, index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3></article>)}</div></div></div></section>;
}

function CtaSection({ section, eyebrow, title, body, href, button }: { section: ProPageLayoutConfig["sections"][number]; eyebrow: string; title: string; body: string; href: string; button: string }) {
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner"><div className={`proCta proCta-${section.variant}`}><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{body}</p></div><Link className="primaryButton" href={href}>{button}</Link></div></div></div></section>;
}

function SectionHeading({ eyebrow, title, align }: { eyebrow: string; title: string; align: "left" | "center" | "right" }) {
  return <div className={`proSectionHeading align-${align}`}><p className="eyebrow blue">{eyebrow}</p><h2>{title}</h2></div>;
}

function localizedAcademy(layout: ProPageLayoutConfig, key: "hero_eyebrow" | "hero_title" | "hero_text" | "intro_title" | "intro_text" | "contact_title" | "contact_text", locale: Locale) {
  const content = layout.academy;
  if (!content) return "";
  return String(content[`${key}_${locale}` as keyof typeof content] ?? content[`${key}_ru` as keyof typeof content] ?? "");
}

function pageLabels(pageKey: ProPageKey, locale: Locale, layout: ProPageLayoutConfig) {
  if (pageKey === "partners") return {
    ctaEyebrow: publicText[locale].partners.cooperation,
    ctaTitle: publicText[locale].partners.become,
    ctaBody: publicText[locale].partners.contact,
    ctaButton: publicText[locale].partners.clubContacts,
  };
  if (pageKey === "academy") return {
    ctaEyebrow: "FC EDINEȚ ACADEMY", ctaTitle: localizedAcademy(layout, "contact_title", locale), ctaBody: localizedAcademy(layout, "contact_text", locale), ctaButton: locale === "ro" ? "Contacte" : "Контакты",
  };
  return { ctaEyebrow: "", ctaTitle: "", ctaBody: "", ctaButton: "" };
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return publicText[locale].media.defaultAlbum;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Chisinau" }).format(new Date(normalized));
}
