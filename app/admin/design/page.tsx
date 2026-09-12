import Link from "next/link";
import VisualPageEditor from "@/app/components/VisualPageEditor";
import { requireEditor } from "@/lib/editorial";
import {
  homepageSectionLabels,
  type HomepageDesignDraft,
  type HomepageDesignSnapshot,
  type HomepageDesignVersion,
  type HomepageHero,
  type HomepageSection,
  type HomepageSectionKey,
} from "@/lib/types";
import { resetVisualDraft, restoreVisualVersion } from "./actions";

export const metadata = { title: "Визуальный редактор — Админ" };
export const dynamic = "force-dynamic";

const keys: HomepageSectionKey[] = ["matches", "standings", "news", "players", "media", "partners"];

export default async function AdminDesignPage() {
  const { supabase } = await requireEditor();

  const [heroResult, sectionsResult, draftResult, versionsResult] = await Promise.all([
    supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_sections").select("*").order("display_order"),
    supabase.from("homepage_design_draft").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_design_versions").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  const hero = heroResult.data as HomepageHero | null;
  const sections = (sectionsResult.data ?? []) as HomepageSection[];
  const published = buildPublished(hero, sections);
  const draft = draftResult.data as HomepageDesignDraft | null;
  const initial = draft ? buildDraft(draft, published) : published;
  const versions = (versionsResult.data ?? []) as HomepageDesignVersion[];

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero visualAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • VISUAL EDITOR</p>
            <h1>Визуальный редактор</h1>
            <p>Подгонка Hero-фото, отдельный мобильный кадр, высота, затемнение и порядок блоков без ручного CSS.</p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">← Админка</Link>
            <Link href="/admin/home" className="rowAction muted">Тексты главной</Link>
            <Link href="/" className="rowAction muted">Открыть сайт ↗</Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface visualEditorPage">
        <div className="container">
          <div className="visualEditorIntro">
            <div>
              <span className={`visualStatus ${draft ? "draft" : "published"}`}>
                {draft ? "Есть неопубликованный черновик" : "Редактируется опубликованный дизайн"}
              </span>
              <p>Изменения в редакторе становятся видимыми посетителям только после кнопки «Опубликовать дизайн».</p>
            </div>
            {draft && (
              <form action={resetVisualDraft}>
                <button type="submit" className="rowAction danger">Сбросить черновик</button>
              </form>
            )}
          </div>

          <VisualPageEditor initial={initial} hero={hero} hasDraft={Boolean(draft)} />

          <section className="visualHistory">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow blue">ИСТОРИЯ</p>
                <h2>Опубликованные версии</h2>
                <p>Восстановление сначала помещает старую версию в черновик. Публичный сайт не меняется, пока ты её не опубликуешь.</p>
              </div>
            </div>

            {versions.length ? (
              <div className="visualHistoryList">
                {versions.map((version) => (
                  <article className="visualHistoryRow" key={version.id}>
                    <div>
                      <strong>{version.label || `Версия #${version.id}`}</strong>
                      <span>{formatDate(version.created_at)}</span>
                    </div>
                    <div className="visualHistoryMeta">
                      <span>{version.snapshot?.hero_height_desktop ?? 650}px</span>
                      <span>{version.snapshot?.text_alignment === "center" ? "Текст по центру" : version.snapshot?.text_alignment === "right" ? "Текст справа" : "Текст слева"}</span>
                    </div>
                    <form action={restoreVisualVersion}>
                      <input type="hidden" name="version_id" value={String(version.id)} />
                      <button className="rowAction" type="submit">Восстановить в черновик</button>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <div className="adminEmpty">История появится после первой публикации через Visual Editor.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function buildPublished(hero: HomepageHero | null, sections: HomepageSection[]): HomepageDesignSnapshot {
  const position = legacyPosition(hero?.background_position);
  const order = normalizeOrder(sections.map((item) => item.section_key));
  const visibility = Object.fromEntries(keys.map((key) => [key, sections.find((item) => item.section_key === key)?.is_enabled ?? true])) as Record<HomepageSectionKey, boolean>;

  return {
    background_image_url: hero?.background_image_url ?? null,
    mobile_background_image_url: hero?.mobile_background_image_url ?? null,
    desktop_position_x: hero?.desktop_position_x ?? position.x,
    desktop_position_y: hero?.desktop_position_y ?? position.y,
    desktop_zoom_percent: hero?.desktop_zoom_percent ?? 100,
    mobile_position_x: hero?.mobile_position_x ?? position.x,
    mobile_position_y: hero?.mobile_position_y ?? position.y,
    mobile_zoom_percent: hero?.mobile_zoom_percent ?? 100,
    hero_height_desktop: hero?.hero_height_desktop ?? 650,
    hero_height_mobile: hero?.hero_height_mobile ?? 520,
    overlay_opacity: hero?.overlay_opacity ?? 72,
    text_alignment: hero?.text_alignment ?? "left",
    show_match_card: hero?.show_match_card ?? true,
    section_order: order,
    section_visibility: visibility,
  };
}

function buildDraft(draft: HomepageDesignDraft, fallback: HomepageDesignSnapshot): HomepageDesignSnapshot {
  const rawOrder = Array.isArray(draft.section_order) ? draft.section_order : fallback.section_order;
  const rawVisibility = draft.section_visibility && typeof draft.section_visibility === "object" ? draft.section_visibility : fallback.section_visibility;
  return {
    background_image_url: draft.background_image_url ?? null,
    mobile_background_image_url: draft.mobile_background_image_url ?? null,
    desktop_position_x: draft.desktop_position_x ?? fallback.desktop_position_x,
    desktop_position_y: draft.desktop_position_y ?? fallback.desktop_position_y,
    desktop_zoom_percent: draft.desktop_zoom_percent ?? fallback.desktop_zoom_percent,
    mobile_position_x: draft.mobile_position_x ?? fallback.mobile_position_x,
    mobile_position_y: draft.mobile_position_y ?? fallback.mobile_position_y,
    mobile_zoom_percent: draft.mobile_zoom_percent ?? fallback.mobile_zoom_percent,
    hero_height_desktop: draft.hero_height_desktop ?? fallback.hero_height_desktop,
    hero_height_mobile: draft.hero_height_mobile ?? fallback.hero_height_mobile,
    overlay_opacity: draft.overlay_opacity ?? fallback.overlay_opacity,
    text_alignment: draft.text_alignment ?? fallback.text_alignment,
    show_match_card: draft.show_match_card ?? fallback.show_match_card,
    section_order: normalizeOrder(rawOrder.map(String)),
    section_visibility: Object.fromEntries(keys.map((key) => [key, typeof rawVisibility[key] === "boolean" ? rawVisibility[key] : fallback.section_visibility[key]])) as Record<HomepageSectionKey, boolean>,
  };
}

function normalizeOrder(order: string[]): HomepageSectionKey[] {
  const valid = order.filter((key, index): key is HomepageSectionKey => keys.includes(key as HomepageSectionKey) && order.indexOf(key) === index);
  return valid.length === keys.length ? valid : [...keys];
}

function legacyPosition(position?: HomepageHero["background_position"] | null) {
  if (position === "top") return { x: 50, y: 0 };
  if (position === "bottom") return { x: 50, y: 100 };
  if (position === "left") return { x: 0, y: 50 };
  if (position === "right") return { x: 100, y: 50 };
  return { x: 50, y: 50 };
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Chisinau" }).format(new Date(value));
  } catch {
    return value;
  }
}
