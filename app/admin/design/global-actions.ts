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

type State = { success?: string; error?: string };

export async function saveGlobalDesign(_prev: State, formData: FormData): Promise<State> {
  const { supabase, userId } = await requireEditor();
  const key = String(formData.get("component_key") || "");
  if (key !== "header" && key !== "footer") return { error: "Неизвестный глобальный компонент." };
  const intent = String(formData.get("intent") || "draft") === "publish" ? "publish" : "draft";
  const rawConfig = parseJson(formData.get("config_json"));
  if (!rawConfig) return { error: "Не удалось прочитать настройки конструктора." };

  const { data: currentRow, error: rowError } = await supabase
    .from("site_global_designs")
    .select("config")
    .eq("component_key", key)
    .maybeSingle();
  if (rowError) return { error: `Не удалось загрузить текущий дизайн: ${rowError.message}` };

  const fallback = key === "header" ? defaultHeaderDesign : defaultFooterDesign;
  const currentConfig = key === "header"
    ? normalizeHeaderDesign(currentRow?.config, defaultHeaderDesign)
    : normalizeFooterDesign(currentRow?.config, defaultFooterDesign);
  const config = key === "header"
    ? normalizeHeaderDesign(rawConfig, currentConfig as HeaderDesignConfig)
    : normalizeFooterDesign(rawConfig, currentConfig as FooterDesignConfig);

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
    published_by: userId,
  });
  if (versionError) return { error: `Дизайн опубликован, но история версии не записалась: ${versionError.message}` };

  await supabase.from("site_global_design_drafts").delete().eq("component_key", key);

  revalidatePath("/");
  revalidatePath("/admin/design");
  return { success: key === "header" ? "Header опубликован." : "Footer опубликован." };
}

export async function resetGlobalDesignDraft(formData: FormData) {
  const { supabase } = await requireEditor();
  const key = String(formData.get("component_key") || "");
  if (key !== "header" && key !== "footer") redirect("/admin/design");
  await supabase.from("site_global_design_drafts").delete().eq("component_key", key);
  revalidatePath("/admin/design");
  redirect(`/admin/design?page=global_${key}&draft=reset`);
}

export async function restoreGlobalDesignVersion(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const key = String(formData.get("component_key") || "");
  const versionId = String(formData.get("version_id") || "");
  if ((key !== "header" && key !== "footer") || !/^\d+$/.test(versionId)) redirect("/admin/design");
  const { data } = await supabase.from("site_global_design_versions").select("snapshot").eq("id", versionId).eq("component_key", key).maybeSingle();
  if (!data?.snapshot) redirect(`/admin/design?page=global_${key}&restore=error`);
  const snapshot = key === "header" ? normalizeHeaderDesign(data.snapshot) : normalizeFooterDesign(data.snapshot);
  await supabase.from("site_global_design_drafts").upsert({ component_key: key, config: snapshot, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "component_key" });
  revalidatePath("/admin/design");
  redirect(`/admin/design?page=global_${key}&restore=ok`);
}

function parseJson(value: FormDataEntryValue | null): unknown | null {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
}
