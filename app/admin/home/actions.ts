"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/editorial";

export type HomepageHeroState = {
  error?: string;
  success?: string;
};

const allowedImageMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const allowedPositions = new Set([
  "center",
  "top",
  "bottom",
  "left",
  "right",
]);

export async function saveHomepageHero(
  _previousState: HomepageHeroState,
  formData: FormData
): Promise<HomepageHeroState> {
  const { supabase, userId } = await requireEditor();

  const eyebrow = text(formData.get("eyebrow")) || "ЕДИНЕЦ • МОЛДОВА";
  const titleMain = text(formData.get("title_main")) || "ВМЕСТЕ";
  const titleAccent = text(formData.get("title_accent")) || "ЗА ЕДИНЕЦ";
  const description = text(formData.get("description"));

  const primaryButtonText =
    text(formData.get("primary_button_text")) || "Смотреть матчи";
  const primaryButtonHref =
    safeHref(text(formData.get("primary_button_href"))) || "/matches";

  const secondaryButtonText =
    text(formData.get("secondary_button_text")) || "Последние новости";
  const secondaryButtonHref =
    safeHref(text(formData.get("secondary_button_href"))) || "/news";

  const overlayRaw = Number(text(formData.get("overlay_opacity")));
  const overlayOpacity =
    Number.isInteger(overlayRaw) && overlayRaw >= 0 && overlayRaw <= 95
      ? overlayRaw
      : 72;

  const positionRaw = text(formData.get("background_position"));
  const backgroundPosition = allowedPositions.has(positionRaw)
    ? positionRaw
    : "center";

  const showPrimaryButton =
    formData.get("show_primary_button") === "on";
  const showSecondaryButton =
    formData.get("show_secondary_button") === "on";

  const { data: current } = await supabase
    .from("homepage_hero")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  let backgroundImageUrl = current?.background_image_url ?? null;
  let newStoragePath: string | null = null;

  const image = formData.get("background_image");

  if (image instanceof File && image.size > 0) {
    if (!allowedImageMime.has(image.type)) {
      return { error: "Фоновое изображение должно быть JPG, PNG или WEBP." };
    }

    if (image.size > 8 * 1024 * 1024) {
      return { error: "Максимальный размер фонового изображения — 8 МБ." };
    }

    const ext =
      image.type === "image/png"
        ? "png"
        : image.type === "image/webp"
          ? "webp"
          : "jpg";

    const path = `${userId}/hero/${Date.now()}-hero.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("homepage")
      .upload(path, image, {
        cacheControl: "3600",
        upsert: false,
        contentType: image.type,
      });

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes("bucket not found")) {
        return {
          error:
            "Bucket homepage не найден. Выполни database/014_homepage_hero.sql в Supabase.",
        };
      }

      return {
        error: `Не удалось загрузить фоновое изображение: ${uploadError.message}`,
      };
    }

    backgroundImageUrl = supabase.storage
      .from("homepage")
      .getPublicUrl(path).data.publicUrl;

    newStoragePath = path;
  }

  const clearImage = formData.get("clear_background_image") === "on";

  if (clearImage) {
    backgroundImageUrl = null;
  }

  const { error } = await supabase
    .from("homepage_hero")
    .upsert(
      {
        id: 1,
        eyebrow,
        title_main: titleMain,
        title_accent: titleAccent,
        description,
        primary_button_text: primaryButtonText,
        primary_button_href: primaryButtonHref,
        secondary_button_text: secondaryButtonText,
        secondary_button_href: secondaryButtonHref,
        background_image_url: backgroundImageUrl,
        overlay_opacity: overlayOpacity,
        background_position: backgroundPosition,
        show_primary_button: showPrimaryButton,
        show_secondary_button: showSecondaryButton,
      },
      { onConflict: "id" }
    );

  if (error) {
    if (newStoragePath) {
      await supabase.storage.from("homepage").remove([newStoragePath]);
    }

    return {
      error: `Не удалось сохранить hero-блок: ${error.message}`,
    };
  }

  if (
    current?.background_image_url &&
    (newStoragePath || clearImage)
  ) {
    const oldPath = storagePathFromPublicUrl(
      current.background_image_url,
      "homepage"
    );

    if (oldPath) {
      await supabase.storage.from("homepage").remove([oldPath]);
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/home");

  return { success: "Главный экран сохранён." };
}

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function safeHref(value: string) {
  if (!value) return "";

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return value;
    }
  } catch {
    return "";
  }

  return "";
}

function storagePathFromPublicUrl(url: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);

  if (index === -1) return null;

  return decodeURIComponent(url.slice(index + marker.length));
}
