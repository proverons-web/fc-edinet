"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type { Player } from "@/lib/types";

export type PlayerFormState = {
  error?: string;
};

const validPositions = new Set([
  "goalkeeper",
  "defender",
  "midfielder",
  "forward",
]);

const validFeet = new Set(["", "left", "right", "both"]);

const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const maxImageBytes = 5 * 1024 * 1024;

export async function savePlayer(
  _previousState: PlayerFormState,
  formData: FormData
): Promise<PlayerFormState> {
  const { supabase, userId } = await requireEditor();

  const rawId = String(formData.get("player_id") ?? "").trim();
  const playerId = rawId || null;

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const shirtNumberRaw = String(formData.get("shirt_number") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const birthDate = nullableString(formData.get("birth_date"));
  const nationality = nullableString(formData.get("nationality"));
  const heightRaw = String(formData.get("height_cm") ?? "").trim();
  const preferredFoot = String(formData.get("preferred_foot") ?? "").trim();
  const hometown = nullableString(formData.get("hometown"));
  const previousClub = nullableString(formData.get("previous_club"));
  const joinedAt = nullableString(formData.get("joined_at"));
  const bio = nullableString(formData.get("bio"));
  const bioRo = nullableString(formData.get("bio_ro"));
  const displayOrderRaw = String(formData.get("display_order") ?? "").trim();
  const isActive = formData.get("is_active") === "on";
  const clearPhoto = formData.get("clear_photo") === "on";

  if (firstName.length < 1 || firstName.length > 80) {
    return { error: "Имя должно содержать от 1 до 80 символов." };
  }

  if (lastName.length < 1 || lastName.length > 80) {
    return { error: "Фамилия должна содержать от 1 до 80 символов." };
  }

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return {
      error: "Slug должен содержать только a-z, 0-9 и дефисы.",
    };
  }

  if (!validPositions.has(position)) {
    return { error: "Выбери позицию игрока." };
  }

  if (!validFeet.has(preferredFoot)) {
    return { error: "Некорректное значение рабочей ноги." };
  }

  const shirtNumber = shirtNumberRaw ? Number(shirtNumberRaw) : null;
  if (
    shirtNumber !== null &&
    (!Number.isInteger(shirtNumber) || shirtNumber < 0 || shirtNumber > 99)
  ) {
    return { error: "Игровой номер должен быть от 0 до 99." };
  }

  const heightCm = heightRaw ? Number(heightRaw) : null;
  if (
    heightCm !== null &&
    (!Number.isInteger(heightCm) || heightCm < 120 || heightCm > 230)
  ) {
    return { error: "Проверь рост игрока." };
  }

  const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 100;
  if (
    !Number.isInteger(displayOrder) ||
    displayOrder < 0 ||
    displayOrder > 10000
  ) {
    return { error: "Порядок отображения должен быть целым числом." };
  }

  let existing: Player | null = null;

  if (playerId !== null) {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .maybeSingle();

    if (error || !data) {
      return { error: "Игрок не найден." };
    }

    existing = data as Player;
  }

  let photoUrl = clearPhoto ? null : existing?.photo_url ?? null;
  let newUploadedPath: string | null = null;

  const fileValue = formData.get("photo_file");

  if (fileValue instanceof File && fileValue.size > 0) {
    if (!allowedMime.has(fileValue.type)) {
      return { error: "Фото должно быть JPG, PNG или WEBP." };
    }

    if (fileValue.size > maxImageBytes) {
      return { error: "Максимальный размер фотографии — 5 МБ." };
    }

    const ext = extensionForFile(fileValue);
    const path = `${userId}/${Date.now()}-${slug}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("players")
      .upload(path, fileValue, {
        cacheControl: "3600",
        upsert: false,
        contentType: fileValue.type,
      });

    if (uploadError) {
      return {
        error: `Не удалось загрузить фотографию: ${uploadError.message}`,
      };
    }

    newUploadedPath = path;

    const { data: publicData } = supabase.storage
      .from("players")
      .getPublicUrl(path);

    photoUrl = publicData.publicUrl;
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    slug,
    shirt_number: shirtNumber,
    position,
    birth_date: birthDate,
    nationality,
    height_cm: heightCm,
    photo_url: photoUrl,
    bio,
    bio_ro: bioRo,
    is_active: isActive,
    display_order: displayOrder,
    preferred_foot: preferredFoot || null,
    hometown,
    previous_club: previousClub,
    joined_at: joinedAt,
  };

  let savedId: string;

  if (existing && playerId !== null) {
    const { data, error } = await supabase
      .from("players")
      .update(payload)
      .eq("id", playerId)
      .select("id")
      .single();

    if (error || !data) {
      if (newUploadedPath) {
        await supabase.storage.from("players").remove([newUploadedPath]);
      }

      return { error: humanizeDatabaseError(error?.message) };
    }

    savedId = String(data.id);
  } else {
    const { data, error } = await supabase
      .from("players")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      if (newUploadedPath) {
        await supabase.storage.from("players").remove([newUploadedPath]);
      }

      return { error: humanizeDatabaseError(error?.message) };
    }

    savedId = String(data.id);
  }

  // После успешного сохранения можно удалить старый файл,
  // если его заменили или явно убрали из профиля.
  if (
    existing?.photo_url &&
    (
      clearPhoto ||
      (newUploadedPath && existing.photo_url !== photoUrl)
    )
  ) {
    const oldPath = storagePathFromPublicUrl(existing.photo_url, "players");
    if (oldPath) {
      await supabase.storage.from("players").remove([oldPath]);
    }
  }

  revalidatePath("/");
  revalidatePath("/team");
  revalidatePath(`/team/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/players");

  redirect(`/admin/players/${savedId}/edit?saved=1`);
}

export async function deletePlayer(formData: FormData) {
  const { supabase, profile } = await requireEditor();

  if (profile.role !== "admin") {
    redirect("/admin/players");
  }

  const playerId = String(formData.get("player_id") ?? "").trim();

  if (!playerId) {
    redirect("/admin/players");
  }

  const { data: player } = await supabase
    .from("players")
    .select("id,slug,photo_url")
    .eq("id", playerId)
    .maybeSingle();

  if (!player) {
    redirect("/admin/players");
  }

  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (!error && player.photo_url) {
    const path = storagePathFromPublicUrl(player.photo_url, "players");
    if (path) {
      await supabase.storage.from("players").remove([path]);
    }
  }

  revalidatePath("/");
  revalidatePath("/team");
  revalidatePath(`/team/${player.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/players");

  redirect("/admin/players");
}

function nullableString(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extensionForFile(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function storagePathFromPublicUrl(url: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);

  if (index === -1) return null;

  return decodeURIComponent(url.slice(index + marker.length));
}

function humanizeDatabaseError(message?: string) {
  if (!message) return "Не удалось сохранить игрока.";

  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "Такой slug уже используется другим игроком.";
  }

  if (lower.includes("row-level security") || lower.includes("permission")) {
    return "Недостаточно прав для этого действия.";
  }

  return `Не удалось сохранить игрока: ${message}`;
}
