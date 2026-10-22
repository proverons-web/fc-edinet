"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/editorial";

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 8 * 1024 * 1024;
const validCategories = new Set(["coaching", "medical", "operations"]);

function text(value: FormDataEntryValue | null) { return String(value ?? "").trim(); }
function nullableText(value: FormDataEntryValue | null) { const v = text(value); return v || null; }
function intOrNull(value: FormDataEntryValue | null) { const v = text(value); if (!v) return null; const n = Number(v); return Number.isInteger(n) ? n : null; }
function safeName(value: string) { return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "staff"; }

async function uploadStaffPhoto(supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"], userId: string, file: File) {
  if (!allowedMime.has(file.type)) return { ok: false as const, error: "Фото должно быть JPG, PNG или WEBP." };
  if (file.size > maxImageBytes) return { ok: false as const, error: "Максимальный размер фото — 8 МБ." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/staff/${Date.now()}-${safeName(file.name)}.${ext}`;
  const { error } = await supabase.storage.from("club").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) return { ok: false as const, error: `Не удалось загрузить фото: ${error.message}` };
  const { data } = supabase.storage.from("club").getPublicUrl(path);
  return { ok: true as const, publicUrl: data.publicUrl };
}

function basePayload(formData: FormData) {
  const first_name = text(formData.get("first_name"));
  const last_name = text(formData.get("last_name"));
  const role_title = text(formData.get("role_title"));
  const role_title_ro = nullableText(formData.get("role_title_ro"));
  const role_key = text(formData.get("role_key")) || "staff_member";
  const categoryRaw = text(formData.get("category"));
  const category = validCategories.has(categoryRaw) ? categoryRaw : "coaching";
  const bio = nullableText(formData.get("bio"));
  const bio_ro = nullableText(formData.get("bio_ro"));
  const joined_year = intOrNull(formData.get("joined_year"));
  const left_year = intOrNull(formData.get("left_year"));
  const display_order = intOrNull(formData.get("display_order")) ?? 100;
  const is_active = formData.get("is_active") === "on";
  const is_placeholder = formData.get("is_placeholder") === "on";
  return { first_name, last_name, role_title, role_title_ro, role_key, category, bio, bio_ro, joined_year, left_year, display_order, is_active, is_placeholder };
}

export async function createStaffMember(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const payload = basePayload(formData);
  if (!payload.first_name || !payload.last_name || !payload.role_title) return;
  let photo_url: string | null = null;
  const photo = formData.get("photo_file");
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadStaffPhoto(supabase, userId, photo);
    if (!uploaded.ok) return;
    photo_url = uploaded.publicUrl;
  }
  await supabase.from("team_staff").insert({ ...payload, photo_url });
  revalidatePath("/admin/staff");
  revalidatePath("/staff");
}

export async function updateStaffMember(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const id = text(formData.get("staff_id"));
  if (!id) return;
  const payload = basePayload(formData);
  if (!payload.first_name || !payload.last_name || !payload.role_title) return;
  const { data: current } = await supabase.from("team_staff").select("photo_url").eq("id", id).maybeSingle();
  let photo_url = current?.photo_url ?? null;
  const photo = formData.get("photo_file");
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadStaffPhoto(supabase, userId, photo);
    if (!uploaded.ok) return;
    photo_url = uploaded.publicUrl;
  }
  if (formData.get("clear_photo") === "on") photo_url = null;
  await supabase.from("team_staff").update({ ...payload, photo_url }).eq("id", id);
  revalidatePath("/admin/staff");
  revalidatePath("/staff");
}

export async function deleteStaffMember(formData: FormData) {
  const { supabase, profile } = await requireEditor();
  if (profile.role !== "admin") return;
  const id = text(formData.get("staff_id"));
  if (!id) return;
  await supabase.from("team_staff").delete().eq("id", id);
  revalidatePath("/admin/staff");
  revalidatePath("/staff");
}
