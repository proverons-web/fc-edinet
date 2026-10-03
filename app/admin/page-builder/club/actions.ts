"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/editorial";
import { normalizeClubPageLayout } from "@/lib/content-page-builder";

export type PageBuilderState = { error?: string; success?: string };

export async function saveClubPageLayout(_state: PageBuilderState, formData: FormData): Promise<PageBuilderState> {
  const { supabase, userId } = await requireEditor();
  const raw = String(formData.get("layout_json") ?? "");
  const intent = String(formData.get("intent") ?? "draft");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { error: "Не удалось прочитать конфигурацию конструктора." }; }
  const config = normalizeClubPageLayout(parsed);
  const now = new Date().toISOString();

  const { data: current } = await supabase.from("content_page_layouts").select("published_config").eq("page_key", "club").maybeSingle();
  let error: { message: string } | null = null;

  if (intent === "publish") {
    const result = await supabase.from("content_page_layouts").upsert(
      {
        page_key: "club",
        draft_config: config,
        published_config: config,
        updated_by: userId,
        updated_at: now,
        published_at: now,
      },
      { onConflict: "page_key" },
    );
    error = result.error;
  } else {
    const result = await supabase.from("content_page_layouts").upsert(
      {
        page_key: "club",
        draft_config: config,
        published_config: current?.published_config ?? config,
        updated_by: userId,
        updated_at: now,
      },
      { onConflict: "page_key" },
    );
    error = result.error;
  }

  if (error) return { error: `Не удалось сохранить конструктор: ${error.message}` };

  if (intent === "publish") {
    const { error: publishError } = await supabase.from("content_page_published").upsert({ page_key: "club", published_config: config, published_at: now }, { onConflict: "page_key" });
    if (publishError) return { error: `Черновик сохранён, но публикация не удалась: ${publishError.message}` };
  }

  revalidatePath("/club");
  revalidatePath("/admin/page-builder/club");
  return { success: intent === "publish" ? "Макет страницы опубликован." : "Черновик макета сохранён." };
}
