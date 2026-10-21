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
        {desktop && <div className="proManagedHeroMedia" aria-hidden="true"><picture>{mobile && <source media="(max-width: 560px)" srcSet={mobile}/>} {tablet && <source media="(max-width: 1000px)" srcSet={tablet}/>}<img className="proHeroImage proHeroImageResponsive" src={desktop} alt="" loading="eager" decoding="async" fetchPriority="high"/></picture></div>}
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
      {albums.map((album, index) => <Link href={`/media/${album.slug}`} className={`proMediaAlbumCard${index === 0 ? " isLeadAlbum" : ""}${section.variant === "featured" && index === 0 ? " isFeatured" : ""}`} key={album.id}>
        <div className="proMediaAlbumImage">{album.cover_image_url ? <img src={album.cover_image_url} alt={album.title} loading="lazy" decoding="async"/> : <span>FC EDINEȚ</span>}<div className="proMediaShade"/></div>
        <div className="proMediaAlbumIndex" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
        <div className="proMediaAlbumCopy">
          <div className="proMediaAlbumMeta"><span>{formatDate(album.event_date, locale)}</span>{album.location && <span>{album.location}</span>}</div>
          <h3>{album.title}</h3>
          {album.description && section.variant !== "grid" && <p>{album.description}</p>}
          <b className="proMediaAlbumOpen">{text.openAlbum} <span>→</span></b>
        </div>
      </Link>)}
    </div> : <div className="adminEmpty">{text.albumsEmpty}</div>}
  </div></div></section>;
}

function MediaVideos({ section, videos, locale }: { section: ProPageLayoutConfig["sections"][number]; videos: MediaVideo[]; locale: Locale }) {
  const text = publicText[locale].media;
  const watchLabel = locale === "ro" ? "Vezi video" : "Смотреть видео";
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner">
    <SectionHeading eyebrow="FC EDINEȚ TV" title={text.videos} align={section.align}/>
    {videos.length ? <div className={`proCardGrid proMediaVideos proVideos-${section.variant}`}>
      {videos.map((video, index) => <a className={`proMediaVideoCard${index === 0 ? " isLeadVideo" : ""}`} href={video.youtube_url} target="_blank" rel="noopener noreferrer" key={video.id}>
        <div className="proMediaVideoPreview">
          <img src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async"/>
          <span className="proMediaVideoPlay" aria-hidden="true"><i>▶</i></span>
          <span className="proMediaVideoPlatform">FC EDINEȚ TV</span>
        </div>
        <div className="proMediaVideoCopy">
          <span>{formatDate(video.published_at, locale)}</span>
          <h3>{video.title}</h3>
          {video.description && section.variant !== "grid" && <p>{video.description}</p>}
          <b className="proMediaVideoWatch">{watchLabel} ↗</b>
        </div>
      </a>)}
    </div> : <div className="adminEmpty">{text.videosEmpty}</div>}
  </div></div></section>;
}

function PartnersGrid({ section, partners, locale }: { section: ProPageLayoutConfig["sections"][number]; partners: Partner[]; locale: Locale }) {
  const text = publicText[locale].partners;
  return <section className={proSectionClass(section)} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner">
    {!partners.length ? <div className="adminEmpty">{text.empty}</div> : <div className="proPartnerGroups">{partnerLevels.map((level) => {
      const items = partners.filter((partner) => partner.partner_level === level); if (!items.length) return null;
      return <section className={`proPartnerGroup proPartnerGroup-${level}`} key={level}>
        <div className="proPartnerGroupHead"><SectionHeading eyebrow={text.cooperation} title={partnerLevelLabelsI18n[locale][level]} align={section.align}/><span>{String(items.length).padStart(2, "0")}</span></div>
        <div className={`proCardGrid proPartnersGrid proPartners-${section.variant}`}>{items.map((partner) => <PartnerCard key={partner.id} partner={partner} locale={locale} variant={section.variant}/>)}</div>
      </section>;
    })}</div>}
  </div></div></section>;
}

function PartnerCard({ partner, locale, variant }: { partner: Partner; locale: Locale; variant: string }) {
  const body = <><div className="proPartnerLogo"><img src={partner.logo_url} alt={partner.name} loading="lazy" decoding="async"/></div><div className="proPartnerCopy"><strong>{partner.name}</strong>{variant !== "logos" && localized(partner.description, partner.description_ro, locale) && <p>{localized(partner.description, partner.description_ro, locale)}</p>}{partner.website_url && variant !== "logos" && <span>{publicText[locale].partners.openSite} ↗</span>}</div></>;
  const className = `proPartnerCard proPartnerCard-${partner.partner_level}`;
  return partner.website_url ? <a className={className} href={partner.website_url} target="_blank" rel="noopener noreferrer">{body}</a> : <article className={className}>{body}</article>;
}

function AcademyIntro({ section, layout, locale }: { section: ProPageLayoutConfig["sections"][number]; layout: ProPageLayoutConfig; locale: Locale }) {
  const benefits = locale === "ro" ? [
    ["01", "Tehnică", "Controlul mingii, coordonare și decizii bune sub presiune."],
    ["02", "Caracter", "Disciplină, responsabilitate și respect pentru echipă."],
    ["03", "Progres", "Obiective clare pentru fiecare etapă de dezvoltare."],
  ] : [
    ["01", "Техника", "Работа с мячом, координация и правильные решения под давлением."],
    ["02", "Характер", "Дисциплина, ответственность и уважение к команде."],
    ["03", "Прогресс", "Понятные цели на каждом этапе развития игрока."],
  ];
  return <section className={`${proSectionClass(section)} academyIntroSection`} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner proAcademyIntro">
    <div className="proAcademyIntroCopy"><p className="eyebrow blue">{locale === "ro" ? "ACADEMIA FC EDINEȚ" : "АКАДЕМИЯ FC EDINEȚ"}</p><h2>{localizedAcademy(layout, "intro_title", locale)}</h2><p>{localizedAcademy(layout, "intro_text", locale)}</p><div className="proAcademyBenefits">{benefits.map(([num,title,body]) => <article key={num}><span>{num}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></div>
    <div className="proAcademyFact"><div className="proAcademyFactMark">FCE</div><strong>FC EDINEȚ</strong><span>{locale === "ro" ? "De la primii pași până la echipa mare" : "От первых шагов до основной команды"}</span><small>{locale === "ro" ? "Academie • Edineț • Moldova" : "Академия • Единец • Молдова"}</small></div>
  </div></div></section>;
}

function AcademyGroups({ section, locale }: { section: ProPageLayoutConfig["sections"][number]; locale: Locale }) {
  const groups = locale === "ro" ? [
    ["U7–U9", "Primii pași", "Tehnică, coordonare și dragoste pentru joc.", "Bază tehnică", "2–3 sesiuni / săpt."],
    ["U11–U13", "Dezvoltare", "Înțelegerea jocului, disciplină și lucru în echipă.", "Tactică + tehnică", "3 sesiuni / săpt."],
    ["U15–U17", "Performanță", "Pregătire pentru fotbalul competitiv și echipa mare.", "Performanță", "3–4 sesiuni / săpt."],
  ] : [
    ["U7–U9", "Первые шаги", "Техника, координация и любовь к игре.", "Базовая техника", "2–3 тренировки / нед."],
    ["U11–U13", "Развитие", "Понимание футбола, дисциплина и командная работа.", "Тактика + техника", "3 тренировки / нед."],
    ["U15–U17", "Подготовка", "Переход к соревновательному футболу и основной команде.", "Высокая интенсивность", "3–4 тренировки / нед."],
  ];
  return <section className={`${proSectionClass(section)} academyGroupsSection`} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner"><SectionHeading eyebrow="FC EDINEȚ" title={locale === "ro" ? "Grupe de vârstă" : "Возрастные группы"} align={section.align}/><div className={`proCardGrid proAcademyGroups proAcademyGroups-${section.variant}`}>{groups.map(([age, title, body, focus, schedule], index) => <article className="proAcademyGroupCard" key={age}><div className="proAcademyGroupTop"><b>{age}</b><span>{String(index + 1).padStart(2, "0")}</span></div><h3>{title}</h3><p>{body}</p><div className="proAcademyGroupMeta"><span>{focus}</span><span>{schedule}</span></div></article>)}</div></div></div></section>;
}

function AcademyPathway({ section, locale }: { section: ProPageLayoutConfig["sections"][number]; locale: Locale }) {
  const steps = locale === "ro" ? [
    ["U7–U9", "Selecție", "Coordonare, tehnică de bază și bucuria jocului."],
    ["U11–U13", "Fundamente", "Citirea jocului, disciplină și responsabilitate."],
    ["U15–U17", "Competiție", "Ritm, intensitate și pregătire pentru seniori."],
    ["SENIOR", "Echipa mare", "Integrare în structura primei echipe FC Edineț."],
  ] : [
    ["U7–U9", "Набор", "Координация, базовая техника и удовольствие от игры."],
    ["U11–U13", "Фундамент", "Чтение игры, дисциплина и ответственность."],
    ["U15–U17", "Соревнования", "Темп, интенсивность и подготовка к взрослому футболу."],
    ["SENIOR", "Основная команда", "Переход в структуру первой команды FC Edineț."],
  ];
  return <section className={`${proSectionClass(section)} academyPathwaySection`} style={proSectionStyle(section)}><div className="proSectionMotion"><div className="proSectionInner"><SectionHeading eyebrow={locale === "ro" ? "DRUMUL JUCĂTORULUI" : "ПУТЬ ИГРОКА"} title={locale === "ro" ? "De la academie la prima echipă" : "От академии до первой команды"} align={section.align}/><div className={`proCardGrid proAcademyPathway proAcademyPathway-${section.variant}`}>{steps.map(([age,title,body], index) => <article key={title}><div className="proAcademyPathIndex"><span>{String(index + 1).padStart(2, "0")}</span><b>{age}</b></div><h3>{title}</h3><p>{body}</p></article>)}</div></div></div></section>;
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
    ctaEyebrow: locale === "ro" ? "ACADEMIA FC EDINEȚ" : "АКАДЕМИЯ FC EDINEȚ", ctaTitle: localizedAcademy(layout, "contact_title", locale), ctaBody: localizedAcademy(layout, "contact_text", locale), ctaButton: locale === "ro" ? "Contacte" : "Контакты",
  };
  return { ctaEyebrow: "", ctaTitle: "", ctaBody: "", ctaButton: "" };
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return publicText[locale].media.defaultAlbum;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Chisinau" }).format(new Date(normalized));
}
