"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/editorial";
import { resolveRomanianTranslation } from "@/lib/auto-translation";

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
  const clubNameRo = nullableText(formData.get("club_name_ro"));
  const cityRo = nullableText(formData.get("city_ro"));
  const foundedRaw = text(formData.get("founded_year"));
  const foundedYear = foundedRaw ? Number(foundedRaw) : null;
  const clubColors = nullableText(formData.get("club_colors"));
  const clubColorsRo = nullableText(formData.get("club_colors_ro"));
  const motto = nullableText(formData.get("motto"));
  const mottoRo = nullableText(formData.get("motto_ro"));
  const aboutText = nullableText(formData.get("about_text"));
  const aboutTextRo = nullableText(formData.get("about_text_ro"));
  const historyText = nullableText(formData.get("history_text"));
  const historyTextRo = nullableText(formData.get("history_text_ro"));
  const email = nullableText(formData.get("email"));
  const phone = nullableText(formData.get("phone"));
  const address = nullableText(formData.get("address"));
  const addressRo = nullableText(formData.get("address_ro"));
  const stadiumName = nullableText(formData.get("stadium_name"));
  const stadiumNameRo = nullableText(formData.get("stadium_name_ro"));
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
  const stadiumAddressRo = nullableText(formData.get("stadium_address_ro"));
  const stadiumDescriptionRo = nullableText(formData.get("stadium_description_ro"));

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

  const translationLocked = formData.get("ro_translation_locked") === "on";
  const translation = await resolveRomanianTranslation({
    source: {
      club_name: clubName,
      city,
      club_colors: clubColors,
      motto,
      about_text: aboutText,
      history_text: historyText,
      address,
      stadium_name: stadiumName,
      stadium_address: stadiumAddress,
      stadium_description: stadiumDescription,
    },
    manual: {
      club_name: clubNameRo,
      city: cityRo,
      club_colors: clubColorsRo,
      motto: mottoRo,
      about_text: aboutTextRo,
      history_text: historyTextRo,
      address: addressRo,
      stadium_name: stadiumNameRo,
      stadium_address: stadiumAddressRo,
      stadium_description: stadiumDescriptionRo,
    },
    context: "FC Edinet club profile, history, contacts and stadium",
    locked: translationLocked,
    previousHash: current?.ro_translation_source_hash ?? null,
  });

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
        club_name_ro: translation.values.club_name || null,
        city,
        city_ro: translation.values.city || null,
        founded_year: foundedYear,
        club_colors: clubColors,
        club_colors_ro: translation.values.club_colors || null,
        motto,
        motto_ro: translation.values.motto || null,
        about_text: aboutText,
        about_text_ro: translation.values.about_text || null,
        history_text: historyText,
        history_text_ro: translation.values.history_text || null,
        email,
        phone,
        address,
        address_ro: translation.values.address || null,
        stadium_name: stadiumName,
        stadium_name_ro: translation.values.stadium_name || null,
        stadium_capacity: stadiumCapacity,
        stadium_address: stadiumAddress,
        stadium_address_ro: translation.values.stadium_address || null,
        stadium_description: stadiumDescription,
        stadium_description_ro: translation.values.stadium_description || null,
        ro_translation_locked: translationLocked,
        ro_translation_source_hash: translation.sourceHash,
        ro_translation_updated_at:
          translation.translatedAt ?? current?.ro_translation_updated_at ?? null,
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

  return { success: translation.warning ? `Данные клуба сохранены. ${translation.warning}` : "Данные клуба сохранены." };
}

export async function addLeader(
  _previousState: ClubFormState,
  formData: FormData
): Promise<ClubFormState> {
  const { supabase, userId } = await requireEditor();

  const name = text(formData.get("name"));
  const role = text(formData.get("role"));
  const roleRo = nullableText(formData.get("role_ro"));
  const bio = nullableText(formData.get("bio"));
  const bioRo = nullableText(formData.get("bio_ro"));
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

  const translationLocked = formData.get("ro_translation_locked") === "on";
  const translation = await resolveRomanianTranslation({
    source: { role, bio },
    manual: { role: roleRo, bio: bioRo },
    context: `FC Edinet leadership profile: ${name}`,
    locked: translationLocked,
  });

  const { error } = await supabase.from("club_leadership").insert({
    name,
    role,
    role_ro: translation.values.role || null,
    bio,
    bio_ro: translation.values.bio || null,
    ro_translation_locked: translationLocked,
    ro_translation_source_hash: translation.sourceHash,
    ro_translation_updated_at: translation.translatedAt,
    photo_url: photoUrl,
    display_order: displayOrder,
    is_active: isActive,
  });

  if (error) {
    return { error: `Не удалось добавить сотрудника: ${error.message}` };
  }

  revalidatePath("/club");
  revalidatePath("/admin/club");

  return { success: translation.warning ? `Сотрудник добавлен. ${translation.warning}` : "Сотрудник добавлен." };
}

export async function updateLeader(formData: FormData) {
  const { supabase } = await requireEditor();

  const id = text(formData.get("leader_id"));
  if (!id) return;

  const role = text(formData.get("role"));
  const roleRo = nullableText(formData.get("role_ro"));
  const bio = nullableText(formData.get("bio"));
  const bioRo = nullableText(formData.get("bio_ro"));
  const displayOrder = integer(formData.get("display_order"), 100);
  const isActive = formData.get("is_active") === "on";

  const { data: existing } = await supabase
    .from("club_leadership")
    .select("ro_translation_source_hash,ro_translation_updated_at")
    .eq("id", id)
    .maybeSingle();

  const translationLocked = formData.get("ro_translation_locked") === "on";
  const translation = await resolveRomanianTranslation({
    source: { role, bio },
    manual: { role: roleRo, bio: bioRo },
    context: "FC Edinet leadership role and biography",
    locked: translationLocked,
    previousHash: existing?.ro_translation_source_hash ?? null,
  });

  await supabase
    .from("club_leadership")
    .update({
      role,
      role_ro: translation.values.role || null,
      bio,
      bio_ro: translation.values.bio || null,
      ro_translation_locked: translationLocked,
      ro_translation_source_hash: translation.sourceHash,
      ro_translation_updated_at:
        translation.translatedAt ?? existing?.ro_translation_updated_at ?? null,
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
  const titleRo = nullableText(formData.get("title_ro"));
  const description = nullableText(formData.get("description"));
  const descriptionRo = nullableText(formData.get("description_ro"));
  const displayOrder = integer(formData.get("display_order"), 100);
  const isActive = formData.get("is_active") === "on";

  if (!title) {
    return { error: "Укажи название достижения." };
  }

  const translationLocked = formData.get("ro_translation_locked") === "on";
  const translation = await resolveRomanianTranslation({
    source: { title, description },
    manual: { title: titleRo, description: descriptionRo },
    context: "FC Edinet club achievement",
    locked: translationLocked,
  });

  const { error } = await supabase.from("club_achievements").insert({
    year,
    title,
    title_ro: translation.values.title || null,
    description,
    description_ro: translation.values.description || null,
    ro_translation_locked: translationLocked,
    ro_translation_source_hash: translation.sourceHash,
    ro_translation_updated_at: translation.translatedAt,
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

  return { success: translation.warning ? `Достижение добавлено. ${translation.warning}` : "Достижение добавлено." };
}

export async function updateAchievement(formData: FormData) {
  const { supabase } = await requireEditor();

  const id = text(formData.get("achievement_id"));
  if (!id) return;

  const title = text(formData.get("title"));
  const titleRo = nullableText(formData.get("title_ro"));
  const description = nullableText(formData.get("description"));
  const descriptionRo = nullableText(formData.get("description_ro"));
  const displayOrder = integer(formData.get("display_order"), 100);
  const isActive = formData.get("is_active") === "on";

  const { data: existing } = await supabase
    .from("club_achievements")
    .select("ro_translation_source_hash,ro_translation_updated_at")
    .eq("id", id)
    .maybeSingle();

  const translationLocked = formData.get("ro_translation_locked") === "on";
  const translation = await resolveRomanianTranslation({
    source: { title, description },
    manual: { title: titleRo, description: descriptionRo },
    context: "FC Edinet club achievement",
    locked: translationLocked,
    previousHash: existing?.ro_translation_source_hash ?? null,
  });

  await supabase
    .from("club_achievements")
    .update({
      title,
      title_ro: translation.values.title || null,
      description,
      description_ro: translation.values.description || null,
      ro_translation_locked: translationLocked,
      ro_translation_source_hash: translation.sourceHash,
      ro_translation_updated_at:
        translation.translatedAt ?? existing?.ro_translation_updated_at ?? null,
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
