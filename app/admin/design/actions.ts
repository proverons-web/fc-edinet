"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type {
  HomepageDesignSnapshot,
  HomepageHero,
  HomepageSection,
  HomepageSectionKey,
  SitePageDesignKey,
  SitePageDesignSnapshot,
} from "@/lib/types";
import { defaultSitePageDesign, normalizeSitePageDesign, sitePageDesignCatalog } from "@/lib/page-design";

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

  const [{ data: heroData }, { data: sectionsData }, { data: draftData }] =
    await Promise.all([
      supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("homepage_sections")
        .select("*")
        .order("display_order", { ascending: true }),
      supabase
        .from("homepage_design_draft")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  const currentPublished = publishedSnapshot(
    heroData as HomepageHero | null,
    (sectionsData ?? []) as HomepageSection[]
  );
  const currentDraft = draftData
    ? normalizeSnapshot(draftData as Record<string, unknown>, currentPublished)
    : currentPublished;

  let desktopImageUrl = currentDraft.background_image_url;
  let mobileImageUrl = currentDraft.mobile_background_image_url;

  const desktopFile = formData.get("background_image");
  if (desktopFile instanceof File && desktopFile.size > 0) {
    const validation = validateImage(desktopFile);
    if (validation) return { error: validation };
    const uploaded = await uploadVisualImage(desktopFile, "desktop", userId, supabase);
    if ("error" in uploaded) return { error: uploaded.error };
    desktopImageUrl = uploaded.url;
  }

  const mobileFile = formData.get("mobile_background_image");
  if (mobileFile instanceof File && mobileFile.size > 0) {
    const validation = validateImage(mobileFile);
    if (validation) return { error: validation };
    const uploaded = await uploadVisualImage(mobileFile, "mobile", userId, supabase);
    if ("error" in uploaded) return { error: uploaded.error };
    mobileImageUrl = uploaded.url;
  }

  if (formData.get("clear_background_image") === "on") desktopImageUrl = null;
  if (formData.get("clear_mobile_background_image") === "on") mobileImageUrl = null;

  const sectionOrder = parseSectionOrder(text(formData.get("section_order")));
  const sectionVisibility = Object.fromEntries(
    sectionKeys.map((key) => [key, formData.get(`section_${key}_enabled`) === "on"])
  ) as Record<HomepageSectionKey, boolean>;

  const snapshot: HomepageDesignSnapshot = {
    background_image_url: desktopImageUrl,
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
    section_order: sectionOrder,
    section_visibility: sectionVisibility,
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
    })
    .eq("id", 1);

  if (heroError) {
    return { error: `Не удалось опубликовать Hero: ${heroError.message}` };
  }

  const sectionRows = snapshot.section_order.map((key, index) => ({
    section_key: key,
    is_enabled: snapshot.section_visibility[key],
    display_order: (index + 1) * 10,
  }));

  const { error: sectionsError } = await supabase
    .from("homepage_sections")
    .upsert(sectionRows, { onConflict: "section_key" });

  if (sectionsError) {
    return { error: `Hero опубликован, но порядок блоков сохранить не удалось: ${sectionsError.message}` };
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
  const [{ data: hero }, { data: sections }] = await Promise.all([
    supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_sections").select("*").order("display_order"),
  ]);
  return publishedSnapshot(hero as HomepageHero | null, (sections ?? []) as HomepageSection[]);
}

function publishedSnapshot(hero: HomepageHero | null, sections: HomepageSection[]): HomepageDesignSnapshot {
  const legacy = legacyPosition(hero?.background_position);
  const order = normalizeSectionOrder(sections.map((section) => section.section_key));
  const visible = Object.fromEntries(
    sectionKeys.map((key) => [key, sections.find((section) => section.section_key === key)?.is_enabled ?? true])
  ) as Record<HomepageSectionKey, boolean>;

  return {
    background_image_url: hero?.background_image_url ?? null,
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
    section_order: order,
    section_visibility: visible,
  };
}

function normalizeSnapshot(raw: Record<string, unknown>, fallback: HomepageDesignSnapshot): HomepageDesignSnapshot {
  const rawVisibility = isRecord(raw.section_visibility) ? raw.section_visibility : {};
  return {
    background_image_url: nullableText(raw.background_image_url, fallback.background_image_url),
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
    section_order: normalizeSectionOrder(Array.isArray(raw.section_order) ? raw.section_order.map(String) : fallback.section_order),
    section_visibility: Object.fromEntries(
      sectionKeys.map((key) => [key, typeof rawVisibility[key] === "boolean" ? rawVisibility[key] : fallback.section_visibility[key]])
    ) as Record<HomepageSectionKey, boolean>,
  };
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
  variant: "desktop" | "mobile",
  userId: string,
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"]
) {
  const ext = imageExtension(file.type);
  const path = `${userId}/visual-editor/${Date.now()}-${variant}.${ext}`;
  const { error } = await supabase.storage.from("homepage").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) return { error: `Не удалось загрузить изображение: ${error.message}` } as const;
  return { url: supabase.storage.from("homepage").getPublicUrl(path).data.publicUrl } as const;
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
  let mobileImageUrl = current.mobile_image_url;

  const desktopFile = formData.get("desktop_image");
  if (desktopFile instanceof File && desktopFile.size > 0) {
    const validation = validateImage(desktopFile);
    if (validation) return { error: validation };
    const uploaded = await uploadSitePageImage(desktopFile, pageKey, "desktop", userId, supabase);
    if ("error" in uploaded) return { error: uploaded.error };
    desktopImageUrl = uploaded.url;
  }
  const mobileFile = formData.get("mobile_image");
  if (mobileFile instanceof File && mobileFile.size > 0) {
    const validation = validateImage(mobileFile);
    if (validation) return { error: validation };
    const uploaded = await uploadSitePageImage(mobileFile, pageKey, "mobile", userId, supabase);
    if ("error" in uploaded) return { error: uploaded.error };
    mobileImageUrl = uploaded.url;
  }
  if (formData.get("clear_desktop_image") === "on") desktopImageUrl = null;
  if (formData.get("clear_mobile_image") === "on") mobileImageUrl = null;

  const requestedMode = text(formData.get("background_mode"));
  const backgroundMode = requestedMode === "custom" || requestedMode === "default" || (requestedMode === "content" && item.supportsContentImage)
    ? requestedMode as SitePageDesignSnapshot["background_mode"]
    : current.background_mode;

  const snapshot: SitePageDesignSnapshot = {
    background_mode: backgroundMode,
    desktop_image_url: desktopImageUrl,
    mobile_image_url: mobileImageUrl,
    desktop_position_x: intInRange(formData.get("desktop_position_x"), 0, 100, current.desktop_position_x),
    desktop_position_y: intInRange(formData.get("desktop_position_y"), 0, 100, current.desktop_position_y),
    desktop_zoom_percent: intInRange(formData.get("desktop_zoom_percent"), 100, 240, current.desktop_zoom_percent),
    mobile_position_x: intInRange(formData.get("mobile_position_x"), 0, 100, current.mobile_position_x),
    mobile_position_y: intInRange(formData.get("mobile_position_y"), 0, 100, current.mobile_position_y),
    mobile_zoom_percent: intInRange(formData.get("mobile_zoom_percent"), 100, 300, current.mobile_zoom_percent),
    hero_height_desktop: intInRange(formData.get("hero_height_desktop"), 200, 950, current.hero_height_desktop),
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
  variant: "desktop" | "mobile",
  userId: string,
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"]
) {
  const ext = imageExtension(file.type);
  const path = `${userId}/visual-editor/pages/${pageKey}/${Date.now()}-${variant}.${ext}`;
  const { error } = await supabase.storage.from("homepage").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) return { error: `Не удалось загрузить изображение: ${error.message}` } as const;
  return { url: supabase.storage.from("homepage").getPublicUrl(path).data.publicUrl } as const;
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
