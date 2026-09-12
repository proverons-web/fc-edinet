"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/editorial";
import type { HomepageSectionKey } from "@/lib/types";

export type HomepageHeroState = {
  error?: string;
  success?: string;
};

export type HomepageLayoutState = {
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

const sectionKeys: HomepageSectionKey[] = [
  "matches",
  "standings",
  "news",
  "players",
  "media",
  "partners",
];

export async function saveHomepageHero(
  _previousState: HomepageHeroState,
  formData: FormData
): Promise<HomepageHeroState> {
  const { supabase, userId } = await requireEditor();

  const eyebrow = text(formData.get("eyebrow")) || "ЕДИНЕЦ • МОЛДОВА";
  const titleMain = text(formData.get("title_main")) || "ВМЕСТЕ";
  const titleAccent = text(formData.get("title_accent")) || "ЗА ЕДИНЕЦ";
  const description = text(formData.get("description"));
  const eyebrowRo = text(formData.get("eyebrow_ro"));
  const titleMainRo = text(formData.get("title_main_ro"));
  const titleAccentRo = text(formData.get("title_accent_ro"));
  const descriptionRo = text(formData.get("description_ro"));

  const primaryButtonText =
    text(formData.get("primary_button_text")) || "Смотреть матчи";
  const primaryButtonTextRo = text(formData.get("primary_button_text_ro"));
  const primaryButtonHref =
    safeHref(text(formData.get("primary_button_href"))) || "/matches";

  const secondaryButtonText =
    text(formData.get("secondary_button_text")) || "Последние новости";
  const secondaryButtonTextRo = text(formData.get("secondary_button_text_ro"));
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
    const validation = validateHomepageImage(image);
    if (validation) return { error: validation };

    const ext = imageExtension(image.type);
    const path = `${userId}/hero/${Date.now()}-hero.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("homepage")
      .upload(path, image, {
        cacheControl: "3600",
        upsert: false,
        contentType: image.type,
      });

    if (uploadError) {
      return {
        error: homepageUploadError(uploadError.message),
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
        eyebrow_ro: eyebrowRo || null,
        title_main: titleMain,
        title_main_ro: titleMainRo || null,
        title_accent: titleAccent,
        title_accent_ro: titleAccentRo || null,
        description,
        description_ro: descriptionRo || null,
        primary_button_text: primaryButtonText,
        primary_button_text_ro: primaryButtonTextRo || null,
        primary_button_href: primaryButtonHref,
        secondary_button_text: secondaryButtonText,
        secondary_button_text_ro: secondaryButtonTextRo || null,
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

export async function saveHomepageLayout(
  _previousState: HomepageLayoutState,
  formData: FormData
): Promise<HomepageLayoutState> {
  const { supabase, userId } = await requireEditor();

  const rawOrder = text(formData.get("section_order"))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as HomepageSectionKey[];

  const validOrder = rawOrder.filter(
    (key, index) => sectionKeys.includes(key) && rawOrder.indexOf(key) === index
  );

  const orderedKeys =
    validOrder.length === sectionKeys.length
      ? validOrder
      : sectionKeys;

  const sectionRows = orderedKeys.map((key, index) => ({
    section_key: key,
    is_enabled: formData.get(`section_${key}_enabled`) === "on",
    display_order: (index + 1) * 10,
  }));

  const { error: sectionsError } = await supabase
    .from("homepage_sections")
    .upsert(sectionRows, { onConflict: "section_key" });

  if (sectionsError) {
    return {
      error: `Не удалось сохранить порядок блоков: ${sectionsError.message}`,
    };
  }

  const showPinnedNews = formData.get("show_pinned_news") === "on";
  const pinnedRaw = text(formData.get("pinned_news_id"));
  let pinnedNewsId: number | null = null;

  if (pinnedRaw) {
    const parsed = Number(pinnedRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: "Выбрана некорректная закреплённая новость." };
    }

    const now = new Date().toISOString();
    const { data: article, error: articleError } = await supabase
      .from("news")
      .select("id")
      .eq("id", parsed)
      .eq("status", "published")
      .lte("published_at", now)
      .maybeSingle();

    if (articleError || !article) {
      return {
        error: "Закреплять на главной можно только уже опубликованную новость.",
      };
    }

    pinnedNewsId = parsed;
  }

  const bannerEnabled = formData.get("banner_enabled") === "on";
  const bannerEyebrow = text(formData.get("banner_eyebrow")) || "FC EDINEȚ";
  const bannerTitle = text(formData.get("banner_title")) || "Вместе с клубом";
  const bannerText = text(formData.get("banner_text"));
  const bannerEyebrowRo = text(formData.get("banner_eyebrow_ro"));
  const bannerTitleRo = text(formData.get("banner_title_ro"));
  const bannerTextRo = text(formData.get("banner_text_ro"));
  const bannerButtonText = text(formData.get("banner_button_text")) || "Подробнее";
  const bannerButtonTextRo = text(formData.get("banner_button_text_ro"));
  const bannerButtonHref = safeHref(text(formData.get("banner_button_href"))) || "/club";

  const bannerOverlayRaw = Number(text(formData.get("banner_overlay_opacity")));
  const bannerOverlayOpacity =
    Number.isInteger(bannerOverlayRaw) &&
    bannerOverlayRaw >= 0 &&
    bannerOverlayRaw <= 95
      ? bannerOverlayRaw
      : 72;

  const bannerPositionRaw = text(formData.get("banner_background_position"));
  const bannerBackgroundPosition = allowedPositions.has(bannerPositionRaw)
    ? bannerPositionRaw
    : "center";

  const { data: currentSettings } = await supabase
    .from("homepage_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  let bannerImageUrl = currentSettings?.banner_image_url ?? null;
  let newBannerPath: string | null = null;
  const bannerImage = formData.get("banner_image");

  if (bannerImage instanceof File && bannerImage.size > 0) {
    const validation = validateHomepageImage(bannerImage);
    if (validation) return { error: validation };

    const ext = imageExtension(bannerImage.type);
    const path = `${userId}/banner/${Date.now()}-banner.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("homepage")
      .upload(path, bannerImage, {
        cacheControl: "3600",
        upsert: false,
        contentType: bannerImage.type,
      });

    if (uploadError) {
      return { error: homepageUploadError(uploadError.message) };
    }

    bannerImageUrl = supabase.storage
      .from("homepage")
      .getPublicUrl(path).data.publicUrl;
    newBannerPath = path;
  }

  const clearBannerImage = formData.get("clear_banner_image") === "on";
  if (clearBannerImage) bannerImageUrl = null;

  const { error: settingsError } = await supabase
    .from("homepage_settings")
    .upsert(
      {
        id: 1,
        show_pinned_news: showPinnedNews,
        pinned_news_id: pinnedNewsId,
        banner_enabled: bannerEnabled,
        banner_eyebrow: bannerEyebrow,
        banner_eyebrow_ro: bannerEyebrowRo || null,
        banner_title: bannerTitle,
        banner_title_ro: bannerTitleRo || null,
        banner_text: bannerText,
        banner_text_ro: bannerTextRo || null,
        banner_button_text: bannerButtonText,
        banner_button_text_ro: bannerButtonTextRo || null,
        banner_button_href: bannerButtonHref,
        banner_image_url: bannerImageUrl,
        banner_overlay_opacity: bannerOverlayOpacity,
        banner_background_position: bannerBackgroundPosition,
      },
      { onConflict: "id" }
    );

  if (settingsError) {
    if (newBannerPath) {
      await supabase.storage.from("homepage").remove([newBannerPath]);
    }

    return {
      error: `Не удалось сохранить настройки главной: ${settingsError.message}`,
    };
  }

  if (
    currentSettings?.banner_image_url &&
    (newBannerPath || clearBannerImage)
  ) {
    const oldPath = storagePathFromPublicUrl(
      currentSettings.banner_image_url,
      "homepage"
    );

    if (oldPath) {
      await supabase.storage.from("homepage").remove([oldPath]);
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/home");

  return { success: "Порядок блоков и настройки главной сохранены." };
}

function validateHomepageImage(image: File) {
  if (!allowedImageMime.has(image.type)) {
    return "Изображение должно быть JPG, PNG или WEBP.";
  }

  if (image.size > 8 * 1024 * 1024) {
    return "Максимальный размер изображения — 8 МБ.";
  }

  return null;
}

function imageExtension(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function homepageUploadError(message: string) {
  if (message.toLowerCase().includes("bucket not found")) {
    return "Bucket homepage не найден. Выполни миграцию database/018_homepage_sections.sql.";
  }

  return `Не удалось загрузить изображение: ${message}`;
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
