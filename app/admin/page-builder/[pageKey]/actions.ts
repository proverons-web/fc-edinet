"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/editorial";
import { normalizeProPageLayout, proPageRoutes, type ProPageKey } from "@/lib/pro-page-builder";
import type { ProPageBuilderState } from "@/app/components/ProPageBuilder";

const allowed = new Set<ProPageKey>(["media", "partners", "academy"]);

export async function saveProPageLayout(_state: ProPageBuilderState, formData: FormData): Promise<ProPageBuilderState> {
  const pageKey = String(formData.get("page_key") ?? "") as ProPageKey;
  if (!allowed.has(pageKey)) return { error: "Неизвестная страница конструктора." };
  const raw = String(formData.get("layout_json") ?? "");
  const intent = String(formData.get("intent") ?? "draft");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { error: "Не удалось прочитать конфигурацию страницы." }; }
  const config = normalizeProPageLayout(pageKey, parsed);
  const { supabase, userId } = await requireEditor();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("content_page_layouts").select("published_config").eq("page_key", pageKey).maybeSingle();

  if (intent === "publish") {
    const { error } = await supabase.from("content_page_layouts").upsert({ page_key: pageKey, draft_config: config, published_config: config, updated_by: userId, updated_at: now, published_at: now }, { onConflict: "page_key" });
    if (error) return { error: `Не удалось сохранить макет: ${error.message}` };
    const { error: publishError } = await supabase.from("content_page_published").upsert({ page_key: pageKey, published_config: config, published_at: now }, { onConflict: "page_key" });
    if (publishError) return { error: `Макет сохранён, но публикация не удалась: ${publishError.message}` };
  } else {
    const { error } = await supabase.from("content_page_layouts").upsert({ page_key: pageKey, draft_config: config, published_config: current?.published_config ?? config, updated_by: userId, updated_at: now }, { onConflict: "page_key" });
    if (error) return { error: `Не удалось сохранить черновик: ${error.message}` };
  }

  revalidatePath(proPageRoutes[pageKey]);
  revalidatePath(`/admin/page-builder/${pageKey}`);
  return { success: intent === "publish" ? "Макет опубликован." : "Черновик сохранён." };
}
