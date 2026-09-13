import Link from "next/link";
import VisualPageEditor from "@/app/components/VisualPageEditor";
import SitePageVisualEditor from "@/app/components/SitePageVisualEditor";
import { requireEditor } from "@/lib/editorial";
import {
  defaultSitePageDesign,
  normalizeSitePageDesign,
  sitePageDesignCatalog,
} from "@/lib/page-design";
import { defaultHomepageCanvas, normalizeHomepageCanvas } from "@/lib/homepage-canvas";
import type {
  HomepageDesignDraft,
  HomepageDesignSnapshot,
  HomepageDesignVersion,
  HomepageHero,
  DesignMediaAsset,
  HomepageSection,
  HomepageSectionKey,
  SitePageDesignKey,
  SitePageDesignVersion,
} from "@/lib/types";
import {
  resetSitePageVisualDraft,
  resetVisualDraft,
  restoreSitePageVisualVersion,
  restoreVisualVersion,
} from "./actions";

export const metadata = { title: "Визуальный редактор — Админ" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
const keys: HomepageSectionKey[] = ["matches", "standings", "news", "players", "media", "partners"];
const validSiteKeys = new Set(sitePageDesignCatalog.map((item) => item.key));

export default async function AdminDesignPage({ searchParams }: PageProps) {
  const query = searchParams ? await searchParams : {};
  const rawPage = first(query.page);
  const selected = rawPage && validSiteKeys.has(rawPage as SitePageDesignKey) ? rawPage as SitePageDesignKey : "home";

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero visualAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • SITE-WIDE VISUAL EDITOR</p>
            <h1>Визуальный редактор</h1>
            <p>Hero всех основных страниц + Image Editor 2.0. Desktop/Tablet/Mobile имеют независимое кадрирование, Media Library и точный focus/zoom; главная дополнительно поддерживает Canvas 2.0.</p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">← Админка</Link>
            <Link href="/admin/home" className="rowAction muted">Контент главной</Link>
            <Link href="/" className="rowAction muted">Открыть сайт ↗</Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface visualEditorPage">
        <div className="container">
          <DesignNavigation selected={selected} />
          {selected === "home" ? <HomeEditor /> : <GenericEditor pageKey={selected} />}
        </div>
      </section>
    </main>
  );
}

async function HomeEditor() {
  const { supabase } = await requireEditor();
  const [heroResult, sectionsResult, draftResult, versionsResult, assetsResult] = await Promise.all([
    supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_sections").select("*").order("display_order"),
    supabase.from("homepage_design_draft").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_design_versions").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("design_media_assets").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(60),
  ]);
  const hero = heroResult.data as HomepageHero | null;
  const sections = (sectionsResult.data ?? []) as HomepageSection[];
  const published = buildPublished(hero, sections);
  const draft = draftResult.data as HomepageDesignDraft | null;
  const initial = draft ? buildDraft(draft, published) : published;
  const versions = (versionsResult.data ?? []) as HomepageDesignVersion[];
  const assets = (assetsResult.data ?? []) as DesignMediaAsset[];

  return <>
    <div className="visualEditorIntro"><div><span className={`visualStatus ${draft ? "draft" : "published"}`}>{draft ? "Есть неопубликованный черновик" : "Опубликованный дизайн"}</span><p>Главная дополнительно управляет порядком и видимостью секций.</p></div>{draft && <form action={resetVisualDraft}><button type="submit" className="rowAction danger">Сбросить черновик</button></form>}</div>
    <VisualPageEditor initial={initial} hero={hero} hasDraft={Boolean(draft)} assets={assets} />
    <HomeHistory versions={versions} />
  </>;
}

async function GenericEditor({ pageKey }: { pageKey: SitePageDesignKey }) {
  const { supabase } = await requireEditor();
  const item = sitePageDesignCatalog.find((entry) => entry.key === pageKey)!;
  const [publishedResult, draftResult, versionsResult, assetsResult] = await Promise.all([
    supabase.from("site_page_designs").select("*").eq("page_key", pageKey).maybeSingle(),
    supabase.from("site_page_design_drafts").select("*").eq("page_key", pageKey).maybeSingle(),
    supabase.from("site_page_design_versions").select("*").eq("page_key", pageKey).order("created_at", { ascending: false }).limit(20),
    supabase.from("design_media_assets").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(60),
  ]);
  const fallback = defaultSitePageDesign(pageKey);
  const published = publishedResult.data ? normalizeSitePageDesign(publishedResult.data as Record<string, unknown>, fallback) : fallback;
  const draft = draftResult.data ? normalizeSitePageDesign(draftResult.data as Record<string, unknown>, published) : null;
  const initial = draft ?? published;
  const versions = (versionsResult.data ?? []) as SitePageDesignVersion[];
  const assets = (assetsResult.data ?? []) as DesignMediaAsset[];

  return <>
    <div className="visualEditorIntro"><div><span className={`visualStatus ${draft ? "draft" : "published"}`}>{draft ? `Черновик: ${item.label}` : `Опубликовано: ${item.label}`}</span><p>Изменения этой страницы не затрагивают остальные разделы сайта.</p></div><div className="visualIntroActions"><Link className="rowAction muted" href={item.route.includes("[") ? item.route.split("/[")[0] || "/" : item.route}>Открыть раздел ↗</Link>{draft && <form action={resetSitePageVisualDraft}><input type="hidden" name="page_key" value={pageKey}/><button type="submit" className="rowAction danger">Сбросить черновик</button></form>}</div></div>
    <SitePageVisualEditor pageKey={pageKey} item={item} initial={initial} hasDraft={Boolean(draft)} assets={assets} />
    <SitePageHistory pageKey={pageKey} versions={versions} />
  </>;
}

function DesignNavigation({ selected }: { selected: "home" | SitePageDesignKey }) {
  const sections = sitePageDesignCatalog.filter((item) => item.group === "sections");
  const templates = sitePageDesignCatalog.filter((item) => item.group === "templates");
  return <nav className="designPageNav" aria-label="Страницы Visual Editor">
    <div><span>ОБЩИЕ</span><Link className={selected === "home" ? "active" : ""} href="/admin/design?page=home">Главная</Link></div>
    <div><span>РАЗДЕЛЫ</span>{sections.map((item) => <Link className={selected === item.key ? "active" : ""} href={`/admin/design?page=${item.key}`} key={item.key}>{item.label}</Link>)}</div>
    <div><span>ШАБЛОНЫ</span>{templates.map((item) => <Link className={selected === item.key ? "active" : ""} href={`/admin/design?page=${item.key}`} key={item.key}>{item.label}</Link>)}</div>
  </nav>;
}

function HomeHistory({ versions }: { versions: HomepageDesignVersion[] }) {
  return <section className="visualHistory"><div className="sectionHeading"><div><p className="eyebrow blue">ИСТОРИЯ</p><h2>Версии главной</h2><p>Восстановление сначала помещает старую версию в черновик.</p></div></div>{versions.length ? <div className="visualHistoryList">{versions.map((version) => <article className="visualHistoryRow" key={version.id}><div><strong>{version.label || `Версия #${version.id}`}</strong><span>{formatDate(version.created_at)}</span></div><div className="visualHistoryMeta"><span>{version.snapshot?.hero_height_desktop ?? 650}px</span></div><form action={restoreVisualVersion}><input type="hidden" name="version_id" value={String(version.id)} /><button className="rowAction" type="submit">Восстановить в черновик</button></form></article>)}</div> : <div className="adminEmpty">История появится после первой публикации.</div>}</section>;
}

function SitePageHistory({ pageKey, versions }: { pageKey: SitePageDesignKey; versions: SitePageDesignVersion[] }) {
  return <section className="visualHistory"><div className="sectionHeading"><div><p className="eyebrow blue">ИСТОРИЯ</p><h2>Версии выбранной страницы</h2><p>Каждая страница и шаблон имеют независимую историю.</p></div></div>{versions.length ? <div className="visualHistoryList">{versions.map((version) => <article className="visualHistoryRow" key={version.id}><div><strong>{version.label || `Версия #${version.id}`}</strong><span>{formatDate(version.created_at)}</span></div><div className="visualHistoryMeta"><span>{version.snapshot?.hero_height_desktop ?? "—"}px</span><span>{version.snapshot?.background_mode ?? "default"}</span></div><form action={restoreSitePageVisualVersion}><input type="hidden" name="page_key" value={pageKey}/><input type="hidden" name="version_id" value={String(version.id)}/><button className="rowAction" type="submit">Восстановить в черновик</button></form></article>)}</div> : <div className="adminEmpty">История появится после первой публикации этой страницы.</div>}</section>;
}

function buildPublished(hero: HomepageHero | null, sections: HomepageSection[]): HomepageDesignSnapshot {
  const position = legacyPosition(hero?.background_position);
  const order = normalizeOrder(sections.map((item) => item.section_key));
  const visibility = Object.fromEntries(keys.map((key) => [key, sections.find((item) => item.section_key === key)?.is_enabled ?? true])) as Record<HomepageSectionKey, boolean>;
  const canvasFallback = defaultHomepageCanvas({ desktop_position_x: hero?.desktop_position_x ?? position.x, desktop_position_y: hero?.desktop_position_y ?? position.y, desktop_zoom_percent: hero?.desktop_zoom_percent, mobile_position_x: hero?.mobile_position_x ?? position.x, mobile_position_y: hero?.mobile_position_y ?? position.y, mobile_zoom_percent: hero?.mobile_zoom_percent, hero_height_desktop: hero?.hero_height_desktop, hero_height_mobile: hero?.hero_height_mobile, text_alignment: hero?.text_alignment, show_match_card: hero?.show_match_card });
  return { background_image_url: hero?.background_image_url ?? null, tablet_background_image_url: hero?.tablet_background_image_url ?? null, mobile_background_image_url: hero?.mobile_background_image_url ?? null, desktop_position_x: hero?.desktop_position_x ?? position.x, desktop_position_y: hero?.desktop_position_y ?? position.y, desktop_zoom_percent: hero?.desktop_zoom_percent ?? 100, mobile_position_x: hero?.mobile_position_x ?? position.x, mobile_position_y: hero?.mobile_position_y ?? position.y, mobile_zoom_percent: hero?.mobile_zoom_percent ?? 100, hero_height_desktop: hero?.hero_height_desktop ?? 650, hero_height_mobile: hero?.hero_height_mobile ?? 520, overlay_opacity: hero?.overlay_opacity ?? 72, text_alignment: hero?.text_alignment ?? "left", show_match_card: hero?.show_match_card ?? true, canvas_config: normalizeHomepageCanvas(hero?.canvas_config, canvasFallback), section_order: order, section_visibility: visibility };
}
function buildDraft(draft: HomepageDesignDraft, fallback: HomepageDesignSnapshot): HomepageDesignSnapshot {
  const rawOrder = Array.isArray(draft.section_order) ? draft.section_order : fallback.section_order;
  const rawVisibility = draft.section_visibility && typeof draft.section_visibility === "object" ? draft.section_visibility : fallback.section_visibility;
  return { background_image_url: draft.background_image_url ?? null, tablet_background_image_url: draft.tablet_background_image_url ?? fallback.tablet_background_image_url, mobile_background_image_url: draft.mobile_background_image_url ?? null, desktop_position_x: draft.desktop_position_x ?? fallback.desktop_position_x, desktop_position_y: draft.desktop_position_y ?? fallback.desktop_position_y, desktop_zoom_percent: draft.desktop_zoom_percent ?? fallback.desktop_zoom_percent, mobile_position_x: draft.mobile_position_x ?? fallback.mobile_position_x, mobile_position_y: draft.mobile_position_y ?? fallback.mobile_position_y, mobile_zoom_percent: draft.mobile_zoom_percent ?? fallback.mobile_zoom_percent, hero_height_desktop: draft.hero_height_desktop ?? fallback.hero_height_desktop, hero_height_mobile: draft.hero_height_mobile ?? fallback.hero_height_mobile, overlay_opacity: draft.overlay_opacity ?? fallback.overlay_opacity, text_alignment: draft.text_alignment ?? fallback.text_alignment, show_match_card: draft.show_match_card ?? fallback.show_match_card, canvas_config: normalizeHomepageCanvas(draft.canvas_config, fallback.canvas_config), section_order: normalizeOrder(rawOrder.map(String)), section_visibility: Object.fromEntries(keys.map((key) => [key, typeof rawVisibility[key] === "boolean" ? rawVisibility[key] : fallback.section_visibility[key]])) as Record<HomepageSectionKey, boolean> };
}
function normalizeOrder(order: string[]): HomepageSectionKey[] { const valid = order.filter((key, index): key is HomepageSectionKey => keys.includes(key as HomepageSectionKey) && order.indexOf(key) === index); return valid.length === keys.length ? valid : [...keys]; }
function legacyPosition(position?: HomepageHero["background_position"] | null) { if (position === "top") return { x: 50, y: 0 }; if (position === "bottom") return { x: 50, y: 100 }; if (position === "left") return { x: 0, y: 50 }; if (position === "right") return { x: 100, y: 50 }; return { x: 50, y: 50 }; }
function formatDate(value: string) { try { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Chisinau" }).format(new Date(value)); } catch { return value; } }
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
