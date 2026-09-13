"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import {
  defaultFooterDesign,
  defaultHeaderDesign,
  normalizeFooterDesign,
  normalizeHeaderDesign,
  type FooterDesignConfig,
  type HeaderDesignConfig,
} from "@/lib/global-design";
import { defaultDesignSystem, normalizeDesignSystem, type DesignSystemConfig } from "@/lib/design-system";
import { blockingPublishingChecks, globalPublishingChecks, summarizeVersionChanges } from "@/lib/publishing";

type State = { success?: string; error?: string };
export type GlobalComponentKey = "header" | "footer" | "design_system";

export async function saveGlobalDesign(_prev: State, formData: FormData): Promise<State> {
  const { supabase, userId } = await requireEditor();
  const key = String(formData.get("component_key") || "") as GlobalComponentKey;
  if (!isGlobalKey(key)) return { error: "Неизвестный глобальный компонент." };
  const intent = String(formData.get("intent") || "draft") === "publish" ? "publish" : "draft";
  const rawConfig = parseJson(formData.get("config_json"));
  if (!rawConfig) return { error: "Не удалось прочитать настройки конструктора." };

  const { data: currentRow, error: rowError } = await supabase
    .from("site_global_designs")
    .select("config")
    .eq("component_key", key)
    .maybeSingle();
  if (rowError) return { error: `Не удалось загрузить текущий дизайн: ${rowError.message}` };

  const currentConfig = normalizeForKey(key, currentRow?.config);
  const config = normalizeForKey(key, rawConfig, currentConfig);
  const publishChecks = globalPublishingChecks(key, config);
  if (intent === "publish") {
    const blockers = blockingPublishingChecks(publishChecks);
    if (blockers.length) return { error: `Публикация остановлена: ${blockers.map((item) => item.detail).join(" ")}` };
  }

  if (intent === "draft") {
    const { error } = await supabase.from("site_global_design_drafts").upsert({
      component_key: key,
      config,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "component_key" });
    if (error) return { error: `Не удалось сохранить черновик: ${error.message}` };
    revalidatePath("/admin/design");
    return { success: "Черновик сохранён. Публичный сайт не изменён." };
  }

  const { count } = await supabase.from("site_global_design_versions").select("id", { head: true, count: "exact" }).eq("component_key", key);
  if ((count ?? 0) === 0) {
    const { error: baselineError } = await supabase.from("site_global_design_versions").insert({
      component_key: key,
      label: "Исходный дизайн",
      snapshot: currentConfig,
      change_summary: [],
      published_by: userId,
    });
    if (baselineError) return { error: `Не удалось создать исходную версию: ${baselineError.message}` };
  }

  const { error: publishError } = await supabase.from("site_global_designs").upsert({
    component_key: key,
    config,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "component_key" });
  if (publishError) return { error: `Не удалось опубликовать дизайн: ${publishError.message}` };

  const labelInput = String(formData.get("version_label") || "").trim();
  const label = labelInput || `Опубликовано ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Chisinau" }).format(new Date())}`;
  const { error: versionError } = await supabase.from("site_global_design_versions").insert({
    component_key: key,
    label,
    snapshot: config,
    change_summary: summarizeVersionChanges(currentConfig, config),
    published_by: userId,
  });
  if (versionError) return { error: `Дизайн опубликован, но история версии не записалась: ${versionError.message}` };

  await supabase.from("site_global_design_drafts").delete().eq("component_key", key);

  revalidatePath("/");
  revalidatePath("/admin/design");
  return { success: key === "header" ? "Header опубликован." : key === "footer" ? "Footer опубликован." : "Design System опубликован." };
}

export async function autosaveGlobalDesign(key: GlobalComponentKey, rawConfig: unknown) {
  const { supabase, userId } = await requireEditor();
  if (!isGlobalKey(key)) return { ok: false, error: "Неизвестный глобальный компонент." };
  const { data: currentRow } = await supabase.from("site_global_designs").select("config").eq("component_key", key).maybeSingle();
  const currentConfig = normalizeForKey(key, currentRow?.config);
  const config = normalizeForKey(key, rawConfig, currentConfig);
  const { data: draftRow } = await supabase.from("site_global_design_drafts").select("autosave_revision").eq("component_key", key).maybeSingle();
  const savedAt = new Date().toISOString();
  const revision = Number((draftRow as { autosave_revision?: number } | null)?.autosave_revision ?? 0) + 1;
  const { error } = await supabase.from("site_global_design_drafts").upsert({ component_key: key, config, updated_by: userId, updated_at: savedAt, autosaved_at: savedAt, autosave_revision: revision }, { onConflict: "component_key" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, savedAt };
}

export async function resetGlobalDesignDraft(formData: FormData) {
  const { supabase } = await requireEditor();
  const key = String(formData.get("component_key") || "") as GlobalComponentKey;
  if (!isGlobalKey(key)) redirect("/admin/design");
  await supabase.from("site_global_design_drafts").delete().eq("component_key", key);
  revalidatePath("/admin/design");
  redirect(globalEditorHref(key, "draft=reset"));
}

export async function restoreGlobalDesignVersion(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const key = String(formData.get("component_key") || "") as GlobalComponentKey;
  const versionId = String(formData.get("version_id") || "");
  if (!isGlobalKey(key) || !/^\d+$/.test(versionId)) redirect("/admin/design");
  const { data } = await supabase.from("site_global_design_versions").select("snapshot").eq("id", versionId).eq("component_key", key).maybeSingle();
  if (!data?.snapshot) redirect(globalEditorHref(key, "restore=error"));
  const snapshot = normalizeForKey(key, data.snapshot);
  await supabase.from("site_global_design_drafts").upsert({ component_key: key, config: snapshot, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "component_key" });
  revalidatePath("/admin/design");
  redirect(globalEditorHref(key, "restore=ok"));
}

function normalizeForKey(key: GlobalComponentKey, value: unknown, fallback?: HeaderDesignConfig | FooterDesignConfig | DesignSystemConfig) {
  if (key === "header") return normalizeHeaderDesign(value, (fallback as HeaderDesignConfig | undefined) ?? defaultHeaderDesign);
  if (key === "footer") return normalizeFooterDesign(value, (fallback as FooterDesignConfig | undefined) ?? defaultFooterDesign);
  return normalizeDesignSystem(value, (fallback as DesignSystemConfig | undefined) ?? defaultDesignSystem);
}
function isGlobalKey(value: string): value is GlobalComponentKey { return value === "header" || value === "footer" || value === "design_system"; }
function globalEditorHref(key: GlobalComponentKey, suffix: string) { return `/admin/design?page=${key === "design_system" ? "global_design_system" : `global_${key}`}&${suffix}`; }
function parseJson(value: FormDataEntryValue | null): unknown | null { if (typeof value !== "string") return null; try { return JSON.parse(value); } catch { return null; } }
