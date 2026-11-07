"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireEditor } from "@/lib/editorial";
import { parseHistoryEventPayload } from "@/lib/club-history";

export type HistoryFormState = { error?: string; success?: string };
const text = (fd: FormData, key: string) => typeof fd.get(key) === "string" ? String(fd.get(key)).trim() : "";
const validId = (value: string) => /^[1-9]\d{0,12}$/.test(value);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);


function refresh() {
  revalidatePath("/admin/club/history");
  revalidatePath("/club/history");
  revalidatePath("/club/seasons", "layout");
  revalidatePath("/club/hall-of-fame", "layout");
  revalidatePath("/sitemap.xml");
}

export async function saveHistoryEvent(_state: HistoryFormState, fd: FormData): Promise<HistoryFormState> {
  const { supabase, userId } = await requireEditor();
  const validated = parseHistoryEventPayload(fd);
  if ("error" in validated) return { error: validated.error };
  const input = validated.data;
  const rawId = text(fd, "event_id");
  if (rawId && !validId(rawId)) return { error: "Некорректный ID события." };

  // Validate relations using editor credentials; never create dangling/private links.
  if (input.season_id) {
    const { data, error } = await supabase.from("seasons").select("id")
      .eq("id", input.season_id).eq("is_active", true).maybeSingle();
    if (error || !data) return { error: "Выбранный сезон не найден или скрыт." };
  }
  if (input.hall_entry_id) {
    const { data, error } = await supabase.from("club_hall_of_fame").select("id")
      .eq("id", input.hall_entry_id).eq("is_active", true).eq("is_placeholder", false).maybeSingle();
    if (error || !data) return { error: "Выбранная запись Зала славы ещё не опубликована." };
  }

  let imageUrl: string | null = null;
  if (rawId) {
    const { data, error } = await supabase.from("club_history_events")
      .select("image_url").eq("id", rawId).maybeSingle();
    if (error) return { error: "Не удалось получить событие. Проверь миграцию 077." };
    if (!data) return { error: "Это событие не найдено." };
    imageUrl = data.image_url;
  }
  if (fd.get("clear_image") === "on") imageUrl = null;
  const file = fd.get("image_file");
  if (file instanceof File && file.size > 0) {
    if (!allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024) {
      return { error: "Допустимы JPG, PNG, WebP размером до 8 МБ." };
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const objectPath = `${userId}/history/${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("club").upload(objectPath, file, {
      contentType: file.type, cacheControl: "3600", upsert: false,
    });
    if (uploadError) return { error: "Не получилось загрузить фотографию. Проверь Storage клуба." };
    imageUrl = supabase.storage.from("club").getPublicUrl(objectPath).data.publicUrl;
  }

  const query = rawId
    ? supabase.from("club_history_events").update({ ...input, image_url: imageUrl }).eq("id", rawId)
    : supabase.from("club_history_events").insert({ ...input, image_url: imageUrl });
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return { error: error?.message ?? "Не удалось сохранить событие." };
  refresh();
  return { success: rawId ? "Событие обновлено." : "Событие добавлено. Данные сохранены." };
}

export async function deleteHistoryEvent(_state: HistoryFormState, fd: FormData): Promise<HistoryFormState> {
  const { supabase } = await requireAdmin();
  const id = text(fd, "event_id");
  if (!validId(id)) return { error: "Некорректный идентификатор события." };
  const { data, error } = await supabase.from("club_history_events").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: error?.message ?? "Не удалось удалить запись." };
  refresh();
  return { success: "Событие удалено." };
}
