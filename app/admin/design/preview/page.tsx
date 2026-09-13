import type { CSSProperties } from "react";
import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import { defaultSitePageDesign, normalizeSitePageDesign, sitePageDesignCatalog } from "@/lib/page-design";
import { defaultHomepageCanvas, normalizeHomepageCanvas } from "@/lib/homepage-canvas";
import { repairHomepageCanvas } from "@/lib/homepage-safe-zone";
import { defaultHeroLayerConfig, heroLayerVisible, homeHeroLayerDefinitions, normalizeHeroLayerConfig } from "@/lib/hero-builder";
import { defaultHomepageSectionDesignMap, normalizeHomepageSectionDesignMap } from "@/lib/section-builder";
import { normalizeHomepageBlock, normalizeHomepageBlocks, normalizeHomepageLayoutOrder } from "@/lib/block-library";
import { defaultHeaderDesign, defaultFooterDesign, normalizeHeaderDesign, normalizeFooterDesign, type HeaderDesignConfig, type FooterDesignConfig } from "@/lib/global-design";
import { defaultDesignSystem, normalizeDesignSystem, designSystemCssVariables, type DesignSystemConfig } from "@/lib/design-system";
import PageHeroShell from "@/app/components/PageHeroShell";
import type { HomepageDesignSnapshot, HomepageHero, HomepageSection, HomepageSectionKey, HomepagePublishedBlock, SitePageDesignKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview Visual Editor — FC Edineț" };

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type PreviewDevice = "desktop" | "tablet" | "mobile";

export default async function DesignPreviewPage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : {};
  const rawPage = first(query.page) || "home";
  const device = parseDevice(first(query.device));
  const { supabase } = await requireEditor();

  const [{ data: headerPublished }, { data: headerDraft }, { data: footerPublished }, { data: footerDraft }, { data: dsPublished }, { data: dsDraft }] = await Promise.all([
    supabase.from("site_global_designs").select("config").eq("component_key", "header").maybeSingle(),
    supabase.from("site_global_design_drafts").select("config").eq("component_key", "header").maybeSingle(),
    supabase.from("site_global_designs").select("config").eq("component_key", "footer").maybeSingle(),
    supabase.from("site_global_design_drafts").select("config").eq("component_key", "footer").maybeSingle(),
    supabase.from("site_global_designs").select("config").eq("component_key", "design_system").maybeSingle(),
    supabase.from("site_global_design_drafts").select("config").eq("component_key", "design_system").maybeSingle(),
  ]);
  const header = normalizeHeaderDesign(headerDraft?.config, normalizeHeaderDesign(headerPublished?.config, defaultHeaderDesign));
  const footer = normalizeFooterDesign(footerDraft?.config, normalizeFooterDesign(footerPublished?.config, defaultFooterDesign));
  const designSystem = normalizeDesignSystem(dsDraft?.config, normalizeDesignSystem(dsPublished?.config, defaultDesignSystem));

  return <main className="publishingPreviewRoot" style={designSystemCssVariables(designSystem)}>
    <PreviewToolbar page={rawPage} device={device} />
    <div className={`publishingPreviewViewport ${device}`}>
      <div className="publishingPreviewSite">
        <PreviewHeader config={header} device={device} />
        {rawPage === "home" ? <HomeDraftPreview supabase={supabase} /> : rawPage === "global_header" ? <GlobalShowcase title="Global Header" text="Preview показывает текущий черновик Header вместе с черновиками Footer и Design System." /> : rawPage === "global_footer" ? <GlobalShowcase title="Global Footer" text="Прокрути страницу вниз — Footer ниже отображается из текущего черновика." /> : rawPage === "global_design_system" ? <DesignSystemShowcase config={designSystem} /> : <SiteHeroDraftPreview pageKey={rawPage as SitePageDesignKey} supabase={supabase} />}
        <PreviewFooter config={footer} />
      </div>
    </div>
  </main>;
}

async function HomeDraftPreview({ supabase }: { supabase: any }) {
  const [{ data: heroData }, { data: sectionsData }, { data: blocksData }, { data: draftData }] = await Promise.all([
    supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_sections").select("*").order("display_order"),
    supabase.from("homepage_blocks").select("*").order("display_order"),
    supabase.from("homepage_design_draft").select("*").eq("id", 1).maybeSingle(),
  ]);
  const hero = heroData as HomepageHero | null;
  const sections = (sectionsData ?? []) as HomepageSection[];
  const blocks: HomepagePublishedBlock[] = [];
  for (const raw of (blocksData ?? []) as Record<string, unknown>[]) {
    const block = normalizeHomepageBlock({ id: raw.id, type: raw.block_type, enabled: raw.is_enabled, content: raw.content, design: raw.design_config });
    if (block) blocks.push({ ...block, display_order: Number(raw.display_order ?? 100) });
  }
  const published = buildPublishedHome(hero, sections, blocks);
  const snapshot = draftData ? normalizeHomeDraft(draftData as Record<string, unknown>, published) : published;
  const canvas = snapshot.canvas_config;
  const layers = snapshot.hero_layer_config;
  const desktopHeroImage = snapshot.background_image_url || snapshot.tablet_background_image_url || snapshot.mobile_background_image_url;
  const tabletHeroImage = snapshot.tablet_background_image_url || snapshot.background_image_url || snapshot.mobile_background_image_url;
  const mobileHeroImage = snapshot.mobile_background_image_url || snapshot.tablet_background_image_url || snapshot.background_image_url;
  const style = {
    "--preview-home-desktop-height": `${canvas.desktop.hero_height}px`,
    "--preview-home-tablet-height": `${canvas.tablet.hero_height}px`,
    "--preview-home-mobile-height": `${canvas.mobile.hero_height}px`,
    "--preview-home-desktop-x": `${canvas.desktop.background_x}%`, "--preview-home-desktop-y": `${canvas.desktop.background_y}%`, "--preview-home-desktop-zoom": String(canvas.desktop.background_zoom / 100),
    "--preview-home-tablet-x": `${canvas.tablet.background_x}%`, "--preview-home-tablet-y": `${canvas.tablet.background_y}%`, "--preview-home-tablet-zoom": String(canvas.tablet.background_zoom / 100),
    "--preview-home-mobile-x": `${canvas.mobile.background_x}%`, "--preview-home-mobile-y": `${canvas.mobile.background_y}%`, "--preview-home-mobile-zoom": String(canvas.mobile.background_zoom / 100),
    "--preview-text-desktop-x": `${canvas.desktop.text_x}%`, "--preview-text-desktop-y": `${canvas.desktop.text_y}%`,
    "--preview-text-tablet-x": `${canvas.tablet.text_x}%`, "--preview-text-tablet-y": `${canvas.tablet.text_y}%`,
    "--preview-text-mobile-x": `${canvas.mobile.text_x}%`, "--preview-text-mobile-y": `${canvas.mobile.text_y}%`,
    "--preview-match-desktop-x": `${canvas.desktop.match_x}%`, "--preview-match-desktop-y": `${canvas.desktop.match_y}%`, "--preview-match-desktop-width": `${canvas.desktop.match_width}px`,
    "--preview-match-tablet-x": `${canvas.tablet.match_x}%`, "--preview-match-tablet-y": `${canvas.tablet.match_y}%`, "--preview-match-tablet-width": `${canvas.tablet.match_width}px`,
    "--preview-match-mobile-x": `${canvas.mobile.match_x}%`, "--preview-match-mobile-y": `${canvas.mobile.match_y}%`, "--preview-match-mobile-width": `${canvas.mobile.match_width}px`,
    "--preview-home-overlay": String(snapshot.overlay_opacity / 100),
  } as CSSProperties;
  return <>
    <section className="draftHomeHero" style={style}>
      {heroLayerVisible(layers, "background") && desktopHeroImage && <img className="draftHeroImage desktop" src={desktopHeroImage} alt="" />}
      {heroLayerVisible(layers, "background") && tabletHeroImage && <img className="draftHeroImage tablet" src={tabletHeroImage} alt="" />}
      {heroLayerVisible(layers, "background") && mobileHeroImage && <img className="draftHeroImage mobile" src={mobileHeroImage} alt="" />}
      <div className="draftHomeOverlay" />
      {heroLayerVisible(layers, "intro") && <div className={`draftHomeIntro align-${snapshot.text_alignment}`}><p>ЕДИНЕЦ • МОЛДОВА</p><h1>{hero?.title_main || "ВМЕСТЕ"}<br/><span>{hero?.title_accent || "ЗА ЕДИНЕЦ"}</span></h1><small>{hero?.description || "Официальный сайт футбольного клуба FC Edineț."}</small><div><button>Смотреть матчи</button><button>Последние новости</button></div></div>}
      {heroLayerVisible(layers, "match_card") && (canvas.desktop.match_visible || canvas.tablet.match_visible || canvas.mobile.match_visible) && <article className={`draftMatchCard ${canvas.desktop.match_visible ? "showDesktop" : ""} ${canvas.tablet.match_visible ? "showTablet" : ""} ${canvas.mobile.match_visible ? "showMobile" : ""}`}><span>СЛЕДУЮЩИЙ МАТЧ</span><strong>FC EDINEȚ — СОПЕРНИК</strong><small>14 сентября • 17:00</small></article>}
    </section>
    <div className="draftLayoutPreview">{snapshot.layout_order.map((entry) => {
      if (entry.startsWith("section:")) {
        const key = entry.slice(8) as HomepageSectionKey;
        if (!snapshot.section_visibility[key]) return null;
        return <PreviewSection key={entry} title={sectionLabels[key]} detail={`${snapshot.section_config[key].columns_desktop} / ${snapshot.section_config[key].columns_tablet} / ${snapshot.section_config[key].columns_mobile} колонок`} />;
      }
      const id = entry.slice(6); const block = snapshot.custom_blocks.find((item) => item.id === id); if (!block?.enabled) return null;
      return <PreviewSection key={entry} title={`Блок: ${block.content.title_ru || block.type}`} detail={block.type} />;
    })}</div>
  </>;
}

async function SiteHeroDraftPreview({ pageKey, supabase }: { pageKey: SitePageDesignKey; supabase: any }) {
  const item = sitePageDesignCatalog.find((entry) => entry.key === pageKey);
  if (!item) return <GlobalShowcase title="Неизвестная страница" text="Вернись в Visual Editor и выбери существующую страницу." />;
  const [{ data: publishedData }, { data: draftData }] = await Promise.all([
    supabase.from("site_page_designs").select("*").eq("page_key", pageKey).maybeSingle(),
    supabase.from("site_page_design_drafts").select("*").eq("page_key", pageKey).maybeSingle(),
  ]);
  const fallback = defaultSitePageDesign(pageKey);
  const published = publishedData ? normalizeSitePageDesign(publishedData as Record<string, unknown>, fallback) : fallback;
  const design = draftData ? normalizeSitePageDesign(draftData as Record<string, unknown>, published) : published;
  const showEyebrow = design.show_eyebrow && heroLayerVisible(design.layer_config, "eyebrow");
  const showTitle = heroLayerVisible(design.layer_config, "title") || heroLayerVisible(design.layer_config, "intro");
  const showDescription = design.show_description && (heroLayerVisible(design.layer_config, "description") || heroLayerVisible(design.layer_config, "intro"));
  return <>
    <PageHeroShell design={design} className="pageHero publishingDraftPageHero">
      <div className="publishingDraftHeroText">
        {showEyebrow && <p className="eyebrow">{design.eyebrow_ru || item.preview.eyebrow}</p>}
        {showTitle && <h1>{design.title_ru || item.preview.title}</h1>}
        {showDescription && <p>{design.description_ru || item.preview.description}</p>}
      </div>
    </PageHeroShell>
    <div className="draftPageBody"><p className="eyebrow blue">FULL SCREEN PREVIEW</p><h2>{item.label}</h2><p>Ниже Hero показан нейтральный макет содержимого страницы. После публикации реальный контент страницы остаётся прежним.</p><div className="draftSkeletonGrid"><span/><span/><span/></div></div>
  </>;
}

function PreviewToolbar({ page, device }: { page: string; device: PreviewDevice }) {
  return <div className="publishingPreviewToolbar"><div><strong>FC EDINEȚ • DRAFT PREVIEW</strong><span>Только для editor/admin. Публичный сайт не изменён.</span></div><div className="publishingPreviewDevices">{(["desktop","tablet","mobile"] as PreviewDevice[]).map((item) => <Link key={item} className={device === item ? "active" : ""} href={`/admin/design/preview?page=${encodeURIComponent(page)}&device=${item}`}>{item}</Link>)}<Link className="back" href={`/admin/design?page=${encodeURIComponent(page)}`}>← Редактор</Link></div></div>;
}

function PreviewHeader({ config, device }: { config: HeaderDesignConfig; device: PreviewDevice }) {
  const visible = config.nav_order.filter((key) => config.nav_visibility[key]);
  return <>{config.topbar_enabled && <div className="draftPreviewTopbar"><span>{config.topbar_text_ru}</span>{config.show_language && <b>RU / RO</b>}</div>}<header className={`draftPreviewHeader ${config.background}`} style={{ minHeight: device === "mobile" ? config.height_mobile : config.height_desktop }}><div className="draftPreviewBrand">{config.logo_mode === "image" && config.logo_url ? <img src={config.logo_url} alt="" style={{ width: config.logo_width }} /> : <span style={{ width: config.logo_width, height: Math.round(config.logo_width * 1.17) }}>FCE</span>}{config.show_brand_text && <b>{config.brand_name}<small>{config.brand_subtitle}</small></b>}</div>{device === "mobile" ? <button>☰</button> : <nav>{visible.map((key) => <span key={key}>{headerLabels[key]}</span>)}</nav>}<div>{config.show_search && <span>⌕</span>}{config.show_account && <span>●</span>}</div></header></>;
}
function PreviewFooter({ config }: { config: FooterDesignConfig }) {
  return <footer className={`draftPreviewFooter ${config.background}`} style={{ paddingTop: config.padding_top, paddingBottom: config.padding_bottom }}><div className="draftPreviewFooterGrid"><div><strong>{config.brand_name}</strong>{config.show_about && <p>{config.about_ru}</p>}</div>{config.columns.filter((c) => c.visible).map((column) => <div key={column.id}><b>{column.title_ru}</b>{column.links.map((link) => <span key={link.id}>{link.label_ru}</span>)}</div>)}</div><div className="draftPreviewFooterBottom">{config.show_copyright && <span>{config.copyright_text}</span>}{config.show_version && <span>Версия 2.2.0</span>}</div></footer>;
}
function GlobalShowcase({ title, text }: { title: string; text: string }) { return <div className="globalDraftShowcase"><p className="eyebrow blue">PUBLISHING 2.0</p><h1>{title}</h1><p>{text}</p><div className="draftSkeletonGrid"><span/><span/><span/></div><div className="draftSkeletonGrid"><span/><span/><span/></div></div>; }
function DesignSystemShowcase({ config }: { config: DesignSystemConfig }) { return <div className="globalDraftShowcase"><p className="eyebrow blue">DESIGN SYSTEM PREVIEW</p><h1 style={{ color: config.primary }}>FC EDINEȚ</h1><p>Primary: {config.primary} • Navy: {config.navy} • Accent: {config.accent}</p><div className="designPreviewSwatches"><span style={{ background: config.primary }}/><span style={{ background: config.navy }}/><span style={{ background: config.accent }}/><span style={{ background: config.surface }}/></div><div className="draftSkeletonGrid"><span/><span/><span/></div></div>; }
function PreviewSection({ title, detail }: { title: string; detail: string }) { return <section className="draftSectionCard"><p className="eyebrow blue">FC EDINEȚ</p><h2>{title}</h2><small>{detail}</small><div className="draftSkeletonGrid"><span/><span/><span/><span/></div></section>; }

const sectionLabels: Record<HomepageSectionKey, string> = { matches: "Матчи", standings: "Турнирная таблица", news: "Новости", players: "Команда", media: "Фото и видео", partners: "Партнёры" };
const headerLabels: Record<string, string> = { news: "Новости", team: "Команда", matches: "Матчи", standings: "Таблица", club: "Клуб", media: "Медиа" };

function buildPublishedHome(hero: HomepageHero | null, sections: HomepageSection[], blocks: HomepagePublishedBlock[]): HomepageDesignSnapshot {
  const canvasFallback = defaultHomepageCanvas({ desktop_position_x: hero?.desktop_position_x, desktop_position_y: hero?.desktop_position_y, desktop_zoom_percent: hero?.desktop_zoom_percent, mobile_position_x: hero?.mobile_position_x, mobile_position_y: hero?.mobile_position_y, mobile_zoom_percent: hero?.mobile_zoom_percent, hero_height_desktop: hero?.hero_height_desktop, hero_height_mobile: hero?.hero_height_mobile, text_alignment: hero?.text_alignment, show_match_card: hero?.show_match_card });
  const heroLayers = normalizeHeroLayerConfig(hero?.hero_layer_config, homeHeroLayerDefinitions, defaultHeroLayerConfig(homeHeroLayerDefinitions));
  const canvas = repairHomepageCanvas(normalizeHomepageCanvas(hero?.canvas_config, canvasFallback), canvasFallback, heroLayers);
  const order = normalizeSectionOrder(sections.map((item) => item.section_key));
  const visibility = Object.fromEntries(order.map((key) => [key, sections.find((item) => item.section_key === key)?.is_enabled ?? true])) as Record<HomepageSectionKey, boolean>;
  return { background_image_url: hero?.background_image_url ?? null, tablet_background_image_url: hero?.tablet_background_image_url ?? null, mobile_background_image_url: hero?.mobile_background_image_url ?? null, desktop_position_x: canvas.desktop.background_x, desktop_position_y: canvas.desktop.background_y, desktop_zoom_percent: canvas.desktop.background_zoom, mobile_position_x: canvas.mobile.background_x, mobile_position_y: canvas.mobile.background_y, mobile_zoom_percent: canvas.mobile.background_zoom, hero_height_desktop: canvas.desktop.hero_height, hero_height_mobile: canvas.mobile.hero_height, overlay_opacity: hero?.overlay_opacity ?? 72, text_alignment: hero?.text_alignment ?? "left", show_match_card: hero?.show_match_card ?? true, canvas_config: canvas, hero_layer_config: heroLayers, section_order: order, section_visibility: visibility, section_config: normalizeHomepageSectionDesignMap(Object.fromEntries(sections.map((section) => [section.section_key, section.design_config ?? {}])), defaultHomepageSectionDesignMap()), custom_blocks: blocks, layout_order: normalizeHomepageLayoutOrder([...sections, ...blocks].sort((a,b)=>(a.display_order??0)-(b.display_order??0)).map((item) => "section_key" in item ? `section:${item.section_key}` : `block:${item.id}`), order, blocks) };
}
function normalizeHomeDraft(raw: Record<string, unknown>, fallback: HomepageDesignSnapshot): HomepageDesignSnapshot {
  const blocks = normalizeHomepageBlocks(raw.custom_blocks, fallback.custom_blocks);
  const order = normalizeSectionOrder(Array.isArray(raw.section_order) ? raw.section_order.map(String) : fallback.section_order);
  const visibilityRaw = raw.section_visibility && typeof raw.section_visibility === "object" ? raw.section_visibility as Record<string, unknown> : {};
  const heroLayers = normalizeHeroLayerConfig(raw.hero_layer_config, homeHeroLayerDefinitions, fallback.hero_layer_config);
  const canvas = repairHomepageCanvas(normalizeHomepageCanvas(raw.canvas_config, fallback.canvas_config), fallback.canvas_config, heroLayers);
  return { ...fallback, ...raw, background_image_url: nullable(raw.background_image_url, fallback.background_image_url), tablet_background_image_url: nullable(raw.tablet_background_image_url, fallback.tablet_background_image_url), mobile_background_image_url: nullable(raw.mobile_background_image_url, fallback.mobile_background_image_url), canvas_config: canvas, hero_layer_config: heroLayers, section_order: order, section_visibility: Object.fromEntries(order.map((key) => [key, typeof visibilityRaw[key] === "boolean" ? visibilityRaw[key] : fallback.section_visibility[key]])) as Record<HomepageSectionKey, boolean>, section_config: normalizeHomepageSectionDesignMap(raw.section_config, fallback.section_config), custom_blocks: blocks, layout_order: normalizeHomepageLayoutOrder(raw.layout_order, order, blocks) } as HomepageDesignSnapshot;
}
function normalizeSectionOrder(raw: string[]) { const keys: HomepageSectionKey[] = ["matches","standings","news","players","media","partners"]; const valid = raw.filter((value, index): value is HomepageSectionKey => keys.includes(value as HomepageSectionKey) && raw.indexOf(value) === index); return valid.length === keys.length ? valid : keys; }
function nullable(value: unknown, fallback: string | null) { return typeof value === "string" ? value || null : value === null ? null : fallback; }
function parseDevice(value?: string): PreviewDevice { return value === "tablet" || value === "mobile" ? value : "desktop"; }
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
