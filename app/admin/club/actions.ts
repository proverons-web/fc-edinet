"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/editorial";

export type ClubFormState = {
  error?: string;
  success?: string;
};

const allowedImageMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const maxImageBytes = 8 * 1024 * 1024;

export async function saveClubProfile(
  _previousState: ClubFormState,
  formData: FormData
): Promise<ClubFormState> {
  const { supabase, userId } = await requireEditor();

  const clubName = text(formData.get("club_name")) || "FC Edineț";
  const city = text(formData.get("city")) || "Edineț";
  const foundedRaw = text(formData.get("founded_year"));
  const foundedYear = foundedRaw ? Number(foundedRaw) : null;
  const clubColors = nullableText(formData.get("club_colors"));
  const motto = nullableText(formData.get("motto"));
  const aboutText = nullableText(formData.get("about_text"));
  const historyText = nullableText(formData.get("history_text"));
  const email = nullableText(formData.get("email"));
  const phone = nullableText(formData.get("phone"));
  const address = nullableText(formData.get("address"));
  const stadiumName = nullableText(formData.get("stadium_name"));
  const stadiumCapacityRaw = text(formData.get("stadium_capacity"));
  const stadiumCapacity = stadiumCapacityRaw
    ? Number(stadiumCapacityRaw)
    : null;
  const stadiumAddress = nullableText(
    formData.get("stadium_address")
  );
  const stadiumDescription = nullableText(
    formData.get("stadium_description")
  );

  if (
    foundedYear !== null &&
    (!Number.isInteger(foundedYear) ||
      foundedYear < 1900 ||
      foundedYear > 2100)
  ) {
    return { error: "Проверь год основания клуба." };
  }

  if (
    stadiumCapacity !== null &&
    (!Number.isInteger(stadiumCapacity) || stadiumCapacity < 0)
  ) {
    return { error: "Вместимость стадиона должна быть целым числом." };
  }

  const { data: current } = await supabase
    .from("club_profile")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  let heroImageUrl = current?.hero_image_url ?? null;
  let stadiumImageUrl = current?.stadium_image_url ?? null;

  const heroFile = formData.get("hero_image");
  if (heroFile instanceof File && heroFile.size > 0) {
    const uploaded = await uploadClubImage(
      supabase,
      userId,
      "hero",
      heroFile
    );
    if (!uploaded.ok) return { error: uploaded.error };
    heroImageUrl = uploaded.publicUrl;
  }

  const stadiumFile = formData.get("stadium_image");
  if (stadiumFile instanceof File && stadiumFile.size > 0) {
    const uploaded = await uploadClubImage(
      supabase,
      userId,
      "stadium",
      stadiumFile
    );
    if (!uploaded.ok) return { error: uploaded.error };
    stadiumImageUrl = uploaded.publicUrl;
  }

  if (formData.get("clear_hero") === "on") {
    heroImageUrl = null;
  }

  if (formData.get("clear_stadium") === "on") {
    stadiumImageUrl = null;
  }

  const { error } = await supabase
    .from("club_profile")
    .upsert(
      {
        id: 1,
        club_name: clubName,
        city,
        founded_year: foundedYear,
        club_colors: clubColors,
        motto,
        about_text: aboutText,
        history_text: historyText,
        email,
        phone,
        address,
        stadium_name: stadiumName,
        stadium_capacity: stadiumCapacity,
        stadium_address: stadiumAddress,
        stadium_description: stadiumDescription,
        hero_image_url: heroImageUrl,
        stadium_image_url: stadiumImageUrl,
      },
      { onConflict: "id" }
    );

  if (error) {
    return { error: `Не удалось сохранить данные клуба: ${error.message}` };
  }

  revalidatePath("/club");
  revalidatePath("/admin/club");
  revalidatePath("/");

  return { success: "Данные клуба сохранены." };
}

export async function addLeader(
  _previousState: ClubFormState,
  formData: FormData
): Promise<ClubFormState> {
  const { supabase, userId } = await requireEditor();

  const name = text(formData.get("name"));
  const role = text(formData.get("role"));
  const bio = nullableText(formData.get("bio"));
  const displayOrder = integer(formData.get("display_order"), 100);
  const isActive = formData.get("is_active") === "on";

  if (!name || !role) {
    return { error: "Укажи имя и должность." };
  }

  let photoUrl: string | null = null;
  const photo = formData.get("photo_file");

  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadClubImage(
      supabase,
      userId,
      "leadership",
      photo
    );
    if (!uploaded.ok) return { error: uploaded.error };
    photoUrl = uploaded.publicUrl;
  }

  const { error } = await supabase.from("club_leadership").insert({
    name,
    role,
    bio,
    photo_url: photoUrl,
    display_order: displayOrder,
    is_active: isActive,
  });

  if (error) {
    return { error: `Не удалось добавить сотрудника: ${error.message}` };
  }

  revalidatePath("/club");
  revalidatePath("/admin/club");

  return { success: "Сотрудник добавлен." };
}

export async function updateLeader(formData: FormData) {
  const { supabase } = await requireEditor();

  const id = text(formData.get("leader_id"));
  if (!id) return;

  const displayOrder = integer(formData.get("display_order"), 100);
  const isActive = formData.get("is_active") === "on";

  await supabase
    .from("club_leadership")
    .update({
      display_order: displayOrder,
      is_active: isActive,
    })
    .eq("id", id);

  revalidatePath("/club");
  revalidatePath("/admin/club");
}

export async function deleteLeader(formData: FormData) {
  const { supabase, profile } = await requireEditor();
  if (profile.role !== "admin") return;

  const id = text(formData.get("leader_id"));
  if (!id) return;

  await supabase.from("club_leadership").delete().eq("id", id);

  revalidatePath("/club");
  revalidatePath("/admin/club");
}

export async function addAchievement(
  _previousState: ClubFormState,
  formData: FormData
): Promise<ClubFormState> {
  const { supabase } = await requireEditor();

  const year = nullableText(formData.get("year"));
  const title = text(formData.get("title"));
  const description = nullableText(formData.get("description"));
  const displayOrder = integer(formData.get("display_order"), 100);
  const isActive = formData.get("is_active") === "on";

  if (!title) {
    return { error: "Укажи название достижения." };
  }

  const { error } = await supabase.from("club_achievements").insert({
    year,
    title,
    description,
    display_order: displayOrder,
    is_active: isActive,
  });

  if (error) {
    return {
      error: `Не удалось добавить достижение: ${error.message}`,
    };
  }

  revalidatePath("/club");
  revalidatePath("/admin/club");

  return { success: "Достижение добавлено." };
}

export async function updateAchievement(formData: FormData) {
  const { supabase } = await requireEditor();

  const id = text(formData.get("achievement_id"));
  if (!id) return;

  const displayOrder = integer(formData.get("display_order"), 100);
  const isActive = formData.get("is_active") === "on";

  await supabase
    .from("club_achievements")
    .update({
      display_order: displayOrder,
      is_active: isActive,
    })
    .eq("id", id);

  revalidatePath("/club");
  revalidatePath("/admin/club");
}

export async function deleteAchievement(formData: FormData) {
  const { supabase, profile } = await requireEditor();
  if (profile.role !== "admin") return;

  const id = text(formData.get("achievement_id"));
  if (!id) return;

  await supabase.from("club_achievements").delete().eq("id", id);

  revalidatePath("/club");
  revalidatePath("/admin/club");
}

async function uploadClubImage(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  userId: string,
  folder: string,
  file: File
): Promise<
  | { ok: true; publicUrl: string }
  | { ok: false; error: string }
> {
  if (!allowedImageMime.has(file.type)) {
    return {
      ok: false,
      error: "Изображение должно быть JPG, PNG или WEBP.",
    };
  }

  if (file.size > maxImageBytes) {
    return {
      ok: false,
      error: "Максимальный размер изображения — 8 МБ.",
    };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  const path = `${userId}/${folder}/${Date.now()}-${safeName(file.name)}.${ext}`;

  const { error } = await supabase.storage
    .from("club")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    if (error.message.toLowerCase().includes("bucket not found")) {
      return {
        ok: false,
        error:
          "Bucket club не найден. Выполни database/012_club_profile.sql.",
      };
    }

    return {
      ok: false,
      error: `Не удалось загрузить изображение: ${error.message}`,
    };
  }

  const { data } = supabase.storage.from("club").getPublicUrl(path);

  return {
    ok: true,
    publicUrl: data.publicUrl,
  };
}

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullableText(value: FormDataEntryValue | null) {
  const result = text(value);
  return result || null;
}

function integer(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(text(value));
  return Number.isInteger(parsed) ? parsed : fallback;
}

function safeName(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "image";
}
