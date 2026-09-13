"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type {
  HomepageDesignSnapshot,
  HomepageHero,
  HomepageSection,
  HomepageSectionKey,
  HomepagePublishedBlock,
  SitePageDesignKey,
  SitePageDesignSnapshot,
} from "@/lib/types";
import { defaultSitePageDesign, normalizeSitePageDesign, sitePageDesignCatalog } from "@/lib/page-design";
import { defaultHomepageCanvas, normalizeHomepageCanvas } from "@/lib/homepage-canvas";
import { defaultHeroLayerConfig, homeHeroLayerDefinitions, normalizeHeroLayerConfig, siteHeroLayerDefinitions } from "@/lib/hero-builder";
import { defaultHomepageSectionDesignMap, normalizeHomepageSectionDesignMap } from "@/lib/section-builder";
import { normalizeHomepageBlock, normalizeHomepageBlocks, normalizeHomepageLayoutOrder } from "@/lib/block-library";

export type VisualEditorState = {
  error?: string;
  success?: string;
};

const sectionKeys: HomepageSectionKey[] = [
  "matches",
  "standings",
  "news",
  "players",
  "media",
  "partners",
];

const allowedImageMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedAlignment = new Set(["left", "center", "right"]);

export async function saveVisualEditor(
  _previousState: VisualEditorState,
  formData: FormData
): Promise<VisualEditorState> {
  const { supabase, userId } = await requireEditor();
  const intent = text(formData.get("intent")) === "publish" ? "publish" : "draft";

  const [{ data: heroData }, { data: sectionsData }, { data: blocksData }, { data: draftData }] =
    await Promise.all([
      supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("homepage_sections")
        .select("*")
        .order("display_order", { ascending: true }),
      supabase.from("homepage_blocks").select("*").order("display_order", { ascending: true }),
      supabase
        .from("homepage_design_draft")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  const currentPublished = publishedSnapshot(
    heroData as HomepageHero | null,
    (sectionsData ?? []) as HomepageSection[],
    publishedBlocks(blocksData ?? [])
  );
  const currentDraft = draftData
    ? normalizeSnapshot(draftData as Record<string, unknown>, currentPublished)
    : currentPublished;

  let desktopImageUrl = currentDraft.background_image_url;
  let tabletImageUrl = currentDraft.tablet_background_image_url;
  let mobileImageUrl = currentDraft.mobile_background_image_url;

  desktopImageUrl = await resolveAssetSelection(formData, "background_image_asset_id", desktopImageUrl, supabase);
  tabletImageUrl = await resolveAssetSelection(formData, "tablet_background_image_asset_id", tabletImageUrl, supabase);
  mobileImageUrl = await resolveAssetSelection(formData, "mobile_background_image_asset_id", mobileImageUrl, supabase);

  const desktopFile = formData.get("background_image");
  if (desktopFile instanceof File && desktopFile.size > 0) {
    const validation = validateImage(desktopFile);
    if (validation) return { error: validation };
    const uploaded = await uploadVisualImage(desktopFile, "desktop", userId, supabase, intInRange(formData.get("background_image_width"), 1, 5000, 1920), intInRange(formData.get("background_image_height"), 1, 5000, 800));
    if ("error" in uploaded) return { error: uploaded.error };
    desktopImageUrl = uploaded.url;
  }

  const tabletFile = formData.get("tablet_background_image");
  if (tabletFile instanceof File && tabletFile.size > 0) {
    const validation = validateImage(tabletFile);
    if (validation) return { error: validation };
    const uploaded = await uploadVisualImage(tabletFile, "tablet", userId, supabase, intInRange(formData.get("tablet_background_image_width"), 1, 5000, 1400), intInRange(formData.get("tablet_background_image_height"), 1, 5000, 900));
    if ("error" in uploaded) return { error: uploaded.error };
    tabletImageUrl = uploaded.url;
  }

  const mobileFile = formData.get("mobile_background_image");
  if (mobileFile instanceof File && mobileFile.size > 0) {
    const validation = validateImage(mobileFile);
    if (validation) return { error: validation };
    const uploaded = await uploadVisualImage(mobileFile, "mobile", userId, supabase, intInRange(formData.get("mobile_background_image_width"), 1, 5000, 900), intInRange(formData.get("mobile_background_image_height"), 1, 5000, 1200));
    if ("error" in uploaded) return { error: uploaded.error };
    mobileImageUrl = uploaded.url;
  }

  if (formData.get("clear_background_image") === "on") desktopImageUrl = null;
  if (formData.get("clear_tablet_background_image") === "on") tabletImageUrl = null;
  if (formData.get("clear_mobile_background_image") === "on") mobileImageUrl = null;

  const sectionOrder = parseSectionOrder(text(formData.get("section_order")));
  const sectionVisibility = Object.fromEntries(
    sectionKeys.map((key) => [key, formData.get(`section_${key}_enabled`) === "on"])
  ) as Record<HomepageSectionKey, boolean>;
  const sectionConfig = parseSectionConfig(formData.get("section_config"), currentDraft.section_config);
  const customBlocks = parseCustomBlocks(formData.get("custom_blocks"), currentDraft.custom_blocks);
  const layoutOrder = parseLayoutOrder(formData.get("layout_order"), sectionOrder, customBlocks, currentDraft.layout_order);

  const snapshot: HomepageDesignSnapshot = {
    background_image_url: desktopImageUrl,
    tablet_background_image_url: tabletImageUrl,
    mobile_background_image_url: mobileImageUrl,
    desktop_position_x: intInRange(formData.get("desktop_position_x"), 0, 100, currentDraft.desktop_position_x),
    desktop_position_y: intInRange(formData.get("desktop_position_y"), 0, 100, currentDraft.desktop_position_y),
    desktop_zoom_percent: intInRange(formData.get("desktop_zoom_percent"), 100, 240, currentDraft.desktop_zoom_percent),
    mobile_position_x: intInRange(formData.get("mobile_position_x"), 0, 100, currentDraft.mobile_position_x),
    mobile_position_y: intInRange(formData.get("mobile_position_y"), 0, 100, currentDraft.mobile_position_y),
    mobile_zoom_percent: intInRange(formData.get("mobile_zoom_percent"), 100, 300, currentDraft.mobile_zoom_percent),
    hero_height_desktop: intInRange(formData.get("hero_height_desktop"), 420, 900, currentDraft.hero_height_desktop),
    hero_height_mobile: intInRange(formData.get("hero_height_mobile"), 360, 850, currentDraft.hero_height_mobile),
    overlay_opacity: intInRange(formData.get("overlay_opacity"), 0, 95, currentDraft.overlay_opacity),
    text_alignment: alignment(text(formData.get("text_alignment")), currentDraft.text_alignment),
    show_match_card: formData.get("show_match_card") === "on",
    canvas_config: parseCanvasConfig(formData.get("canvas_config"), currentDraft.canvas_config),
    hero_layer_config: parseHeroLayerConfig(formData.get("hero_layer_config"), homeHeroLayerDefinitions, currentDraft.hero_layer_config),
    section_order: sectionOrder,
    section_visibility: sectionVisibility,
    section_config: sectionConfig,
    custom_blocks: customBlocks,
    layout_order: layoutOrder,
  };

  const { error: draftError } = await supabase
    .from("homepage_design_draft")
    .upsert(
      {
        id: 1,
        ...snapshot,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (draftError) {
    return { error: `Не удалось сохранить черновик дизайна: ${draftError.message}` };
  }

  if (intent === "draft") {
    revalidatePath("/admin/design");
    return { success: "Черновик сохранён. Публичная главная страница не изменена." };
  }

  const { count: versionCount } = await supabase
    .from("homepage_design_versions")
    .select("id", { count: "exact", head: true });

  if ((versionCount ?? 0) === 0) {
    const { error: baselineError } = await supabase
      .from("homepage_design_versions")
      .insert({
        label: "Исходный дизайн до Visual Editor",
        snapshot: currentPublished,
        published_by: userId,
      });

    if (baselineError) {
      return { error: `Не удалось создать исходную версию дизайна: ${baselineError.message}` };
    }
  }

  const { error: heroError } = await supabase
    .from("homepage_hero")
    .update({
      background_image_url: snapshot.background_image_url,
      tablet_background_image_url: snapshot.tablet_background_image_url,
      mobile_background_image_url: snapshot.mobile_background_image_url,
      desktop_position_x: snapshot.desktop_position_x,
      desktop_position_y: snapshot.desktop_position_y,
      desktop_zoom_percent: snapshot.desktop_zoom_percent,
      mobile_position_x: snapshot.mobile_position_x,
      mobile_position_y: snapshot.mobile_position_y,
      mobile_zoom_percent: snapshot.mobile_zoom_percent,
      hero_height_desktop: snapshot.hero_height_desktop,
      hero_height_mobile: snapshot.hero_height_mobile,
      overlay_opacity: snapshot.overlay_opacity,
      text_alignment: snapshot.text_alignment,
      show_match_card: snapshot.show_match_card,
      canvas_config: snapshot.canvas_config,
      hero_layer_config: snapshot.hero_layer_config,
    })
    .eq("id", 1);

  if (heroError) {
    return { error: `Не удалось опубликовать Hero: ${heroError.message}` };
  }

  const displayOrder = new Map(snapshot.layout_order.map((item, index) => [item, (index + 1) * 10]));
  const sectionRows = snapshot.section_order.map((key) => ({
    section_key: key,
    is_enabled: snapshot.section_visibility[key],
    display_order: displayOrder.get(`section:${key}`) ?? 9990,
    design_config: snapshot.section_config[key],
  }));

  const { error: sectionsError } = await supabase
    .from("homepage_sections")
    .upsert(sectionRows, { onConflict: "section_key" });

  if (sectionsError) {
    return { error: `Hero опубликован, но порядок секций сохранить не удалось: ${sectionsError.message}` };
  }

  const existingIds = new Set<string>((blocksData ?? []).map((row: { id?: string }) => String(row.id ?? "")).filter(Boolean));
  const existingCreatedBy = new Map<string, string | null>((blocksData ?? []).map((row: { id?: string; created_by?: string | null }) => [String(row.id ?? ""), row.created_by ?? null]));
  const nextIds = new Set(snapshot.custom_blocks.map((block) => block.id));
  const blockRows = snapshot.custom_blocks.map((block) => ({
    id: block.id,
    block_type: block.type,
    content: block.content,
    design_config: block.design,
    is_enabled: block.enabled,
    display_order: displayOrder.get(`block:${block.id}`) ?? 9990,
    created_by: existingCreatedBy.get(block.id) ?? userId,
    updated_by: userId,
  }));
  if (blockRows.length) {
    const { error: blocksError } = await supabase.from("homepage_blocks").upsert(blockRows, { onConflict: "id" });
    if (blocksError) return { error: `Секции опубликованы, но пользовательские блоки сохранить не удалось: ${blocksError.message}` };
  }
  const removedIds = [...existingIds].filter((id) => !nextIds.has(id));
  if (removedIds.length) {
    const { error: deleteError } = await supabase.from("homepage_blocks").delete().in("id", removedIds);
    if (deleteError) return { error: `Не удалось удалить убранные блоки: ${deleteError.message}` };
  }

  const labelInput = text(formData.get("version_label"));
  const label = labelInput || `Опубликовано ${new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Chisinau",
  }).format(new Date())}`;

  const { error: versionError } = await supabase
    .from("homepage_design_versions")
    .insert({ label, snapshot, published_by: userId });

  if (versionError) {
    return { error: `Дизайн опубликован, но история версии не записалась: ${versionError.message}` };
  }

  await supabase.from("homepage_design_draft").delete().eq("id", 1);

  revalidatePath("/");
  revalidatePath("/admin/design");
  revalidatePath("/admin/home");

  return { success: "Дизайн опубликован. Новая версия главной страницы уже активна." };
}

export async function restoreVisualVersion(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const versionId = text(formData.get("version_id"));
  if (!/^\d+$/.test(versionId)) redirect("/admin/design");

  const { data, error } = await supabase
    .from("homepage_design_versions")
    .select("snapshot")
    .eq("id", versionId)
    .maybeSingle();

  if (error || !data?.snapshot) redirect("/admin/design?restore=error");

  const fallback = await getPublishedSnapshot(supabase);
  const snapshot = normalizeSnapshot(data.snapshot as Record<string, unknown>, fallback);

  const { error: upsertError } = await supabase
    .from("homepage_design_draft")
    .upsert(
      { id: 1, ...snapshot, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (upsertError) redirect("/admin/design?restore=error");

  revalidatePath("/admin/design");
  redirect("/admin/design?restore=ok");
}

export async function resetVisualDraft() {
  const { supabase } = await requireEditor();
  await supabase.from("homepage_design_draft").delete().eq("id", 1);
  revalidatePath("/admin/design");
  redirect("/admin/design?draft=reset");
}

async function getPublishedSnapshot(supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"]) {
  const [{ data: hero }, { data: sections }, { data: blocks }] = await Promise.all([
    supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_sections").select("*").order("display_order"),
    supabase.from("homepage_blocks").select("*").order("display_order"),
  ]);
  return publishedSnapshot(hero as HomepageHero | null, (sections ?? []) as HomepageSection[], publishedBlocks(blocks ?? []));
}

function publishedSnapshot(hero: HomepageHero | null, sections: HomepageSection[], blocks: HomepagePublishedBlock[]): HomepageDesignSnapshot {
  const legacy = legacyPosition(hero?.background_position);
  const order = normalizeSectionOrder(sections.map((section) => section.section_key));
  const visible = Object.fromEntries(
    sectionKeys.map((key) => [key, sections.find((section) => section.section_key === key)?.is_enabled ?? true])
  ) as Record<HomepageSectionKey, boolean>;

  return {
    background_image_url: hero?.background_image_url ?? null,
    tablet_background_image_url: hero?.tablet_background_image_url ?? null,
    mobile_background_image_url: hero?.mobile_background_image_url ?? null,
    desktop_position_x: hero?.desktop_position_x ?? legacy.x,
    desktop_position_y: hero?.desktop_position_y ?? legacy.y,
    desktop_zoom_percent: hero?.desktop_zoom_percent ?? 100,
    mobile_position_x: hero?.mobile_position_x ?? legacy.x,
    mobile_position_y: hero?.mobile_position_y ?? legacy.y,
    mobile_zoom_percent: hero?.mobile_zoom_percent ?? 100,
    hero_height_desktop: hero?.hero_height_desktop ?? 650,
    hero_height_mobile: hero?.hero_height_mobile ?? 520,
    overlay_opacity: hero?.overlay_opacity ?? 72,
    text_alignment: hero?.text_alignment ?? "left",
    show_match_card: hero?.show_match_card ?? true,
    canvas_config: normalizeHomepageCanvas(hero?.canvas_config, defaultHomepageCanvas({
      desktop_position_x: hero?.desktop_position_x,
      desktop_position_y: hero?.desktop_position_y,
      desktop_zoom_percent: hero?.desktop_zoom_percent,
      mobile_position_x: hero?.mobile_position_x,
      mobile_position_y: hero?.mobile_position_y,
      mobile_zoom_percent: hero?.mobile_zoom_percent,
      hero_height_desktop: hero?.hero_height_desktop,
      hero_height_mobile: hero?.hero_height_mobile,
      text_alignment: hero?.text_alignment,
      show_match_card: hero?.show_match_card,
    })),
    hero_layer_config: normalizeHeroLayerConfig(hero?.hero_layer_config, homeHeroLayerDefinitions, defaultHeroLayerConfig(homeHeroLayerDefinitions)),
    section_order: order,
    section_visibility: visible,
    section_config: normalizeHomepageSectionDesignMap(
      Object.fromEntries(sections.map((section) => [section.section_key, section.design_config ?? {}])),
      defaultHomepageSectionDesignMap()
    ),
    custom_blocks: blocks,
    layout_order: normalizeHomepageLayoutOrder(
      [...sections, ...blocks]
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((item) => "section_key" in item ? `section:${item.section_key}` : `block:${item.id}`),
      order,
      blocks
    ),
  };
}

function normalizeSnapshot(raw: Record<string, unknown>, fallback: HomepageDesignSnapshot): HomepageDesignSnapshot {
  const rawVisibility = isRecord(raw.section_visibility) ? raw.section_visibility : {};
  return {
    background_image_url: nullableText(raw.background_image_url, fallback.background_image_url),
    tablet_background_image_url: nullableText(raw.tablet_background_image_url, fallback.tablet_background_image_url),
    mobile_background_image_url: nullableText(raw.mobile_background_image_url, fallback.mobile_background_image_url),
    desktop_position_x: numberValue(raw.desktop_position_x, 0, 100, fallback.desktop_position_x),
    desktop_position_y: numberValue(raw.desktop_position_y, 0, 100, fallback.desktop_position_y),
    desktop_zoom_percent: numberValue(raw.desktop_zoom_percent, 100, 240, fallback.desktop_zoom_percent),
    mobile_position_x: numberValue(raw.mobile_position_x, 0, 100, fallback.mobile_position_x),
    mobile_position_y: numberValue(raw.mobile_position_y, 0, 100, fallback.mobile_position_y),
    mobile_zoom_percent: numberValue(raw.mobile_zoom_percent, 100, 300, fallback.mobile_zoom_percent),
    hero_height_desktop: numberValue(raw.hero_height_desktop, 420, 900, fallback.hero_height_desktop),
    hero_height_mobile: numberValue(raw.hero_height_mobile, 360, 850, fallback.hero_height_mobile),
    overlay_opacity: numberValue(raw.overlay_opacity, 0, 95, fallback.overlay_opacity),
    text_alignment: alignment(String(raw.text_alignment ?? ""), fallback.text_alignment),
    show_match_card: typeof raw.show_match_card === "boolean" ? raw.show_match_card : fallback.show_match_card,
    canvas_config: normalizeHomepageCanvas(raw.canvas_config, fallback.canvas_config),
    hero_layer_config: normalizeHeroLayerConfig(raw.hero_layer_config, homeHeroLayerDefinitions, fallback.hero_layer_config),
    section_order: normalizeSectionOrder(Array.isArray(raw.section_order) ? raw.section_order.map(String) : fallback.section_order),
    section_visibility: Object.fromEntries(
      sectionKeys.map((key) => [key, typeof rawVisibility[key] === "boolean" ? rawVisibility[key] : fallback.section_visibility[key]])
    ) as Record<HomepageSectionKey, boolean>,
    section_config: normalizeHomepageSectionDesignMap(raw.section_config, fallback.section_config),
    custom_blocks: normalizeHomepageBlocks(raw.custom_blocks, fallback.custom_blocks),
    layout_order: normalizeHomepageLayoutOrder(raw.layout_order, normalizeSectionOrder(Array.isArray(raw.section_order) ? raw.section_order.map(String) : fallback.section_order), normalizeHomepageBlocks(raw.custom_blocks, fallback.custom_blocks)),
  };
}

function parseCustomBlocks(value: FormDataEntryValue | null, fallback: HomepageDesignSnapshot["custom_blocks"]) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try { return normalizeHomepageBlocks(JSON.parse(value), fallback); } catch { return fallback; }
}

function parseLayoutOrder(value: FormDataEntryValue | null, sections: HomepageSectionKey[], blocks: HomepageDesignSnapshot["custom_blocks"], fallback: HomepageDesignSnapshot["layout_order"]) {
  if (typeof value !== "string" || !value.trim()) return normalizeHomepageLayoutOrder(fallback, sections, blocks);
  try { return normalizeHomepageLayoutOrder(JSON.parse(value), sections, blocks); } catch { return normalizeHomepageLayoutOrder(fallback, sections, blocks); }
}

function publishedBlocks(rows: Array<Record<string, unknown>>): HomepagePublishedBlock[] {
  return rows.map((row) => {
    const block = normalizeHomepageBlock({ id: row.id, type: row.block_type, enabled: row.is_enabled, content: row.content, design: row.design_config });
    return block ? { ...block, display_order: Number(row.display_order ?? 100) } as HomepagePublishedBlock : null;
  }).filter((block): block is HomepagePublishedBlock => Boolean(block));
}

function parseCanvasConfig(value: FormDataEntryValue | null, fallback: HomepageDesignSnapshot["canvas_config"]) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return normalizeHomepageCanvas(JSON.parse(value), fallback);
  } catch {
    return fallback;
  }
}

function parseHeroLayerConfig(value: FormDataEntryValue | null, definitions: ReturnType<typeof siteHeroLayerDefinitions> | typeof homeHeroLayerDefinitions, fallback: HomepageDesignSnapshot["hero_layer_config"] | SitePageDesignSnapshot["layer_config"]) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return normalizeHeroLayerConfig(JSON.parse(value), definitions, fallback);
  } catch {
    return fallback;
  }
}

function parseSectionConfig(value: FormDataEntryValue | null, fallback: HomepageDesignSnapshot["section_config"]) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return normalizeHomepageSectionDesignMap(JSON.parse(value), fallback);
  } catch {
    return fallback;
  }
}

function parseSectionOrder(raw: string) {
  return normalizeSectionOrder(raw.split(",").map((item) => item.trim()));
}

function normalizeSectionOrder(raw: string[]): HomepageSectionKey[] {
  const valid = raw.filter(
    (key, index): key is HomepageSectionKey =>
      sectionKeys.includes(key as HomepageSectionKey) && raw.indexOf(key) === index
  );
  return valid.length === sectionKeys.length ? valid : [...sectionKeys];
}

function legacyPosition(position?: HomepageHero["background_position"] | null) {
  switch (position) {
    case "top": return { x: 50, y: 0 };
    case "bottom": return { x: 50, y: 100 };
    case "left": return { x: 0, y: 50 };
    case "right": return { x: 100, y: 50 };
    default: return { x: 50, y: 50 };
  }
}

async function uploadVisualImage(
  file: File,
  variant: "desktop" | "tablet" | "mobile",
  userId: string,
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  width: number,
  height: number
) {
  const ext = imageExtension(file.type);
  const path = `${userId}/visual-editor/${Date.now()}-${variant}.${ext}`;
  const { error } = await supabase.storage.from("homepage").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) return { error: `Не удалось загрузить изображение: ${error.message}` } as const;
  const url = supabase.storage.from("homepage").getPublicUrl(path).data.publicUrl;
  await registerDesignMediaAsset({ supabase, path, url, file, userId, variant, width, height });
  return { url } as const;
}

function validateImage(file: File) {
  if (!allowedImageMime.has(file.type)) return "Изображение должно быть JPG, PNG или WEBP.";
  if (file.size > 8 * 1024 * 1024) return "Размер изображения не должен превышать 8 МБ.";
  return null;
}

function imageExtension(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function intInRange(value: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  return numberValue(value == null ? null : String(value), min, max, fallback);
}

function numberValue(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function alignment(value: string, fallback: HomepageDesignSnapshot["text_alignment"]) {
  return allowedAlignment.has(value) ? (value as HomepageDesignSnapshot["text_alignment"]) : fallback;
}

function nullableText(value: unknown, fallback: string | null) {
  return typeof value === "string" ? value || null : value === null ? null : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}


const sitePageKeys = new Set(sitePageDesignCatalog.map((item) => item.key));

export async function saveSitePageVisualEditor(
  _previousState: VisualEditorState,
  formData: FormData
): Promise<VisualEditorState> {
  const { supabase, userId } = await requireEditor();
  const pageKey = parseSitePageKey(text(formData.get("page_key")));
  if (!pageKey) return { error: "Неизвестная страница Visual Editor." };
  const item = sitePageDesignCatalog.find((entry) => entry.key === pageKey)!;
  const intent = text(formData.get("intent")) === "publish" ? "publish" : "draft";

  const [{ data: publishedData }, { data: draftData }] = await Promise.all([
    supabase.from("site_page_designs").select("*").eq("page_key", pageKey).maybeSingle(),
    supabase.from("site_page_design_drafts").select("*").eq("page_key", pageKey).maybeSingle(),
  ]);

  const fallback = defaultSitePageDesign(pageKey);
  const published = publishedData ? normalizeSitePageDesign(publishedData as Record<string, unknown>, fallback) : fallback;
  const current = draftData ? normalizeSitePageDesign(draftData as Record<string, unknown>, published) : published;

  let desktopImageUrl = current.desktop_image_url;
  let tabletImageUrl = current.tablet_image_url;
  let mobileImageUrl = current.mobile_image_url;

  desktopImageUrl = await resolveAssetSelection(formData, "desktop_image_asset_id", desktopImageUrl, supabase);
  tabletImageUrl = await resolveAssetSelection(formData, "tablet_image_asset_id", tabletImageUrl, supabase);
  mobileImageUrl = await resolveAssetSelection(formData, "mobile_image_asset_id", mobileImageUrl, supabase);

  const desktopFile = formData.get("desktop_image");
  if (desktopFile instanceof File && desktopFile.size > 0) {
    const validation = validateImage(desktopFile);
    if (validation) return { error: validation };
    const uploaded = await uploadSitePageImage(desktopFile, pageKey, "desktop", userId, supabase, intInRange(formData.get("desktop_image_width"), 1, 5000, 1920), intInRange(formData.get("desktop_image_height"), 1, 5000, 800));
    if ("error" in uploaded) return { error: uploaded.error };
    desktopImageUrl = uploaded.url;
  }
  const tabletFile = formData.get("tablet_image");
  if (tabletFile instanceof File && tabletFile.size > 0) {
    const validation = validateImage(tabletFile);
    if (validation) return { error: validation };
    const uploaded = await uploadSitePageImage(tabletFile, pageKey, "tablet", userId, supabase, intInRange(formData.get("tablet_image_width"), 1, 5000, 1400), intInRange(formData.get("tablet_image_height"), 1, 5000, 900));
    if ("error" in uploaded) return { error: uploaded.error };
    tabletImageUrl = uploaded.url;
  }

  const mobileFile = formData.get("mobile_image");
  if (mobileFile instanceof File && mobileFile.size > 0) {
    const validation = validateImage(mobileFile);
    if (validation) return { error: validation };
    const uploaded = await uploadSitePageImage(mobileFile, pageKey, "mobile", userId, supabase, intInRange(formData.get("mobile_image_width"), 1, 5000, 900), intInRange(formData.get("mobile_image_height"), 1, 5000, 1200));
    if ("error" in uploaded) return { error: uploaded.error };
    mobileImageUrl = uploaded.url;
  }
  if (formData.get("clear_desktop_image") === "on") desktopImageUrl = null;
  if (formData.get("clear_tablet_image") === "on") tabletImageUrl = null;
  if (formData.get("clear_mobile_image") === "on") mobileImageUrl = null;

  const requestedMode = text(formData.get("background_mode"));
  const backgroundMode = requestedMode === "custom" || requestedMode === "default" || (requestedMode === "content" && item.supportsContentImage)
    ? requestedMode as SitePageDesignSnapshot["background_mode"]
    : current.background_mode;

  const snapshot: SitePageDesignSnapshot = {
    background_mode: backgroundMode,
    desktop_image_url: desktopImageUrl,
    tablet_image_url: tabletImageUrl,
    mobile_image_url: mobileImageUrl,
    desktop_position_x: intInRange(formData.get("desktop_position_x"), 0, 100, current.desktop_position_x),
    desktop_position_y: intInRange(formData.get("desktop_position_y"), 0, 100, current.desktop_position_y),
    desktop_zoom_percent: intInRange(formData.get("desktop_zoom_percent"), 100, 300, current.desktop_zoom_percent),
    tablet_position_x: intInRange(formData.get("tablet_position_x"), 0, 100, current.tablet_position_x),
    tablet_position_y: intInRange(formData.get("tablet_position_y"), 0, 100, current.tablet_position_y),
    tablet_zoom_percent: intInRange(formData.get("tablet_zoom_percent"), 100, 300, current.tablet_zoom_percent),
    mobile_position_x: intInRange(formData.get("mobile_position_x"), 0, 100, current.mobile_position_x),
    mobile_position_y: intInRange(formData.get("mobile_position_y"), 0, 100, current.mobile_position_y),
    mobile_zoom_percent: intInRange(formData.get("mobile_zoom_percent"), 100, 300, current.mobile_zoom_percent),
    hero_height_desktop: intInRange(formData.get("hero_height_desktop"), 200, 950, current.hero_height_desktop),
    hero_height_tablet: intInRange(formData.get("hero_height_tablet"), 180, 950, current.hero_height_tablet),
    hero_height_mobile: intInRange(formData.get("hero_height_mobile"), 180, 900, current.hero_height_mobile),
    overlay_opacity: intInRange(formData.get("overlay_opacity"), 0, 95, current.overlay_opacity),
    overlay_style: parseOverlayStyle(text(formData.get("overlay_style")), current.overlay_style),
    text_alignment: alignment(text(formData.get("text_alignment")), current.text_alignment),
    content_width: intInRange(formData.get("content_width"), 420, 1200, current.content_width),
    show_eyebrow: formData.get("show_eyebrow") === "on",
    show_description: formData.get("show_description") === "on",
    eyebrow_ru: item.editableText ? nullableFormText(formData.get("eyebrow_ru")) : current.eyebrow_ru,
    eyebrow_ro: item.editableText ? nullableFormText(formData.get("eyebrow_ro")) : current.eyebrow_ro,
    title_ru: item.editableText ? nullableFormText(formData.get("title_ru")) : current.title_ru,
    title_ro: item.editableText ? nullableFormText(formData.get("title_ro")) : current.title_ro,
    description_ru: item.editableText ? nullableFormText(formData.get("description_ru")) : current.description_ru,
    description_ro: item.editableText ? nullableFormText(formData.get("description_ro")) : current.description_ro,
    layer_config: parseHeroLayerConfig(formData.get("layer_config"), siteHeroLayerDefinitions(pageKey), current.layer_config),
  };

  const { error: draftError } = await supabase.from("site_page_design_drafts").upsert({
    page_key: pageKey,
    ...snapshot,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "page_key" });
  if (draftError) return { error: `Не удалось сохранить черновик ${item.label}: ${draftError.message}` };

  if (intent === "draft") {
    revalidatePath("/admin/design");
    return { success: `Черновик «${item.label}» сохранён. Публичная страница не изменилась.` };
  }

  const { count } = await supabase.from("site_page_design_versions")
    .select("id", { count: "exact", head: true }).eq("page_key", pageKey);
  if ((count ?? 0) === 0) {
    const { error } = await supabase.from("site_page_design_versions").insert({
      page_key: pageKey,
      label: `Исходный дизайн: ${item.label}`,
      snapshot: published,
      published_by: userId,
    });
    if (error) return { error: `Не удалось сохранить исходную версию: ${error.message}` };
  }

  const { error: publishError } = await supabase.from("site_page_designs").upsert({
    page_key: pageKey,
    ...snapshot,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "page_key" });
  if (publishError) return { error: `Не удалось опубликовать дизайн: ${publishError.message}` };

  const labelInput = text(formData.get("version_label"));
  const label = labelInput || `${item.label} • ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Chisinau" }).format(new Date())}`;
  const { error: versionError } = await supabase.from("site_page_design_versions").insert({
    page_key: pageKey,
    label,
    snapshot,
    published_by: userId,
  });
  if (versionError) return { error: `Дизайн опубликован, но история версии не записалась: ${versionError.message}` };

  await supabase.from("site_page_design_drafts").delete().eq("page_key", pageKey);
  revalidatePath(item.route.includes("[") ? item.route.split("/[")[0] || "/" : item.route);
  revalidatePath("/admin/design");
  return { success: `Дизайн «${item.label}» опубликован.` };
}

export async function restoreSitePageVisualVersion(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const pageKey = parseSitePageKey(text(formData.get("page_key")));
  const versionId = text(formData.get("version_id"));
  if (!pageKey || !/^\d+$/.test(versionId)) { redirect("/admin/design"); throw new Error("redirect"); }

  const { data } = await supabase.from("site_page_design_versions")
    .select("snapshot").eq("id", versionId).eq("page_key", pageKey).maybeSingle();
  if (!data?.snapshot) redirect(`/admin/design?page=${pageKey}&restore=error`);

  const { data: publishedData } = await supabase.from("site_page_designs").select("*").eq("page_key", pageKey).maybeSingle();
  const fallback = publishedData
    ? normalizeSitePageDesign(publishedData as Record<string, unknown>, defaultSitePageDesign(pageKey))
    : defaultSitePageDesign(pageKey);
  const snapshot = normalizeSitePageDesign(data.snapshot as Record<string, unknown>, fallback);
  const { error } = await supabase.from("site_page_design_drafts").upsert({
    page_key: pageKey, ...snapshot, updated_by: userId, updated_at: new Date().toISOString(),
  }, { onConflict: "page_key" });
  if (error) redirect(`/admin/design?page=${pageKey}&restore=error`);
  revalidatePath("/admin/design");
  redirect(`/admin/design?page=${pageKey}&restore=ok`);
}

export async function resetSitePageVisualDraft(formData: FormData) {
  const { supabase } = await requireEditor();
  const pageKey = parseSitePageKey(text(formData.get("page_key")));
  if (!pageKey) { redirect("/admin/design"); throw new Error("redirect"); }
  await supabase.from("site_page_design_drafts").delete().eq("page_key", pageKey);
  revalidatePath("/admin/design");
  redirect(`/admin/design?page=${pageKey}&draft=reset`);
}

async function uploadSitePageImage(
  file: File,
  pageKey: SitePageDesignKey,
  variant: "desktop" | "tablet" | "mobile",
  userId: string,
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  width: number,
  height: number
) {
  const ext = imageExtension(file.type);
  const path = `${userId}/visual-editor/pages/${pageKey}/${Date.now()}-${variant}.${ext}`;
  const { error } = await supabase.storage.from("homepage").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) return { error: `Не удалось загрузить изображение: ${error.message}` } as const;
  const url = supabase.storage.from("homepage").getPublicUrl(path).data.publicUrl;
  await registerDesignMediaAsset({ supabase, path, url, file, userId, variant, width, height });
  return { url } as const;
}


async function resolveAssetSelection(
  formData: FormData,
  field: string,
  fallback: string | null,
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"]
) {
  const id = text(formData.get(field));
  if (!id) return fallback;
  const { data } = await supabase.from("design_media_assets").select("public_url").eq("id", id).eq("is_active", true).maybeSingle();
  return typeof data?.public_url === "string" ? data.public_url : fallback;
}

async function registerDesignMediaAsset({ supabase, path, url, file, userId, variant, width, height }: {
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"]; path: string; url: string; file: File; userId: string; variant: "desktop" | "tablet" | "mobile"; width: number; height: number;
}) {
  await supabase.from("design_media_assets").upsert({
    storage_path: path, public_url: url, file_name: file.name || `${variant}.webp`, mime_type: file.type || "image/webp", file_size: file.size, width, height, variant, uploaded_by: userId, is_active: true,
  }, { onConflict: "storage_path" });
}

function parseSitePageKey(value: string): SitePageDesignKey | null {
  return sitePageKeys.has(value as SitePageDesignKey) ? value as SitePageDesignKey : null;
}
function parseOverlayStyle(value: string, fallback: SitePageDesignSnapshot["overlay_style"]): SitePageDesignSnapshot["overlay_style"] {
  return value === "solid" || value === "gradient-left" || value === "gradient-right" ? value : fallback;
}
function nullableFormText(value: FormDataEntryValue | null) {
  const result = text(value);
  return result || null;
}
