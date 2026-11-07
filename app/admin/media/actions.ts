"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import { extractYouTubeId, isVideoKind } from "@/lib/media-video";

export type MediaFormState = {
  error?: string;
  success?: string;
};

export type UploadedMediaRecord = {
  imageUrl: string;
  thumbUrl: string;
  storagePath: string;
  thumbStoragePath: string;
  originalName: string;
};

export type RegisterPhotosResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createAlbum(
  _previousState: MediaFormState,
  formData: FormData
): Promise<MediaFormState> {
  const { supabase } = await requireEditor();

  const title = text(formData.get("title"));
  const slug = slugify(text(formData.get("slug")) || title);
  const description = nullableText(formData.get("description"));
  const eventDate = nullableText(formData.get("event_date"));
  const location = nullableText(formData.get("location"));
  const isPublished = formData.get("is_published") === "on";
  const matchId = await validateMatchSelection(supabase, formData.get("match_id"));
  if (matchId === "invalid") return { error: "Выбранный матч не найден." };

  if (title.length < 3) {
    return { error: "Название альбома слишком короткое." };
  }

  if (!slug) {
    return { error: "Не удалось сформировать адрес альбома." };
  }

  const { data, error } = await supabase
    .from("media_albums")
    .insert({
      title,
      slug,
      description,
      event_date: eventDate,
      location,
      match_id: matchId,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error?.message.toLowerCase().includes("unique")
        ? "Альбом с таким slug уже существует."
        : `Не удалось создать альбом: ${error?.message ?? "unknown error"}`,
    };
  }

  revalidatePath("/media");
  revalidatePath("/admin/media");

  redirect(`/admin/media/${data.id}/edit?created=1`);
  return { success: "Альбом создан." };
}

export async function updateAlbum(
  _previousState: MediaFormState,
  formData: FormData
): Promise<MediaFormState> {
  const { supabase } = await requireEditor();

  const albumId = text(formData.get("album_id"));
  const title = text(formData.get("title"));
  const slug = slugify(text(formData.get("slug")) || title);
  const description = nullableText(formData.get("description"));
  const eventDate = nullableText(formData.get("event_date"));
  const location = nullableText(formData.get("location"));
  const displayOrder = integer(formData.get("display_order"), 100);
  const coverPositionX = percent(formData.get("cover_position_x"));
  const coverPositionY = percent(formData.get("cover_position_y"));
  const isPublished = formData.get("is_published") === "on";
  const matchId = await validateMatchSelection(supabase, formData.get("match_id"));
  if (matchId === "invalid") return { error: "Выбранный матч не найден." };

  if (!albumId || title.length < 3 || !slug) {
    return { error: "Проверь название и slug альбома." };
  }

  const { error } = await supabase
    .from("media_albums")
    .update({
      title,
      slug,
      description,
      event_date: eventDate,
      location,
      display_order: displayOrder,
      cover_position_x: coverPositionX,
      cover_position_y: coverPositionY,
      match_id: matchId,
      is_published: isPublished,
    })
    .eq("id", albumId);

  if (error) {
    return {
      error: error.message.toLowerCase().includes("unique")
        ? "Такой slug уже используется."
        : `Не удалось сохранить альбом: ${error.message}`,
    };
  }

  revalidatePath("/media");
  revalidatePath(`/media/${slug}`);
  if (matchId) revalidatePath(`/matches/${matchId}`);
  revalidatePath("/admin/media");
  revalidatePath(`/admin/media/${albumId}/edit`);

  return { success: "Альбом сохранён." };
}

export async function registerUploadedPhotos(
  albumId: string,
  photos: UploadedMediaRecord[]
): Promise<RegisterPhotosResult> {
  const { supabase } = await requireEditor();

  if (!albumId || photos.length === 0 || photos.length > 50) {
    return { ok: false as const, error: "Некорректная пачка фотографий." };
  }

  const { data: album, error: albumError } = await supabase
    .from("media_albums")
    .select("id,slug,cover_image_url")
    .eq("id", albumId)
    .maybeSingle();

  if (albumError || !album) {
    return { ok: false as const, error: "Альбом не найден." };
  }

  const rows = photos.map((photo, index) => ({
    album_id: albumId,
    image_url: photo.imageUrl,
    thumb_url: photo.thumbUrl,
    storage_path: photo.storagePath,
    thumb_storage_path: photo.thumbStoragePath,
    original_name: photo.originalName,
    display_order: 100 + index,
    is_published: true,
  }));

  const { error } = await supabase.from("media_photos").insert(rows);

  if (error) {
    return {
      ok: false as const,
      error: `Не удалось зарегистрировать фото: ${error.message}`,
    };
  }

  if (!album.cover_image_url) {
    await supabase
      .from("media_albums")
      .update({ cover_image_url: photos[0].thumbUrl })
      .eq("id", albumId);
  }

  revalidatePath("/media");
  revalidatePath(`/media/${album.slug}`);
  revalidatePath(`/admin/media/${albumId}/edit`);

  return { ok: true as const };
}

export async function updatePhoto(formData: FormData) {
  const { supabase } = await requireEditor();

  const photoId = text(formData.get("photo_id"));
  if (!photoId) return;

  const caption = nullableText(formData.get("caption"));
  const photographer = nullableText(formData.get("photographer"));
  const displayOrder = integer(formData.get("display_order"), 100);
  const isPublished = formData.get("is_published") === "on";

  const { data: photo } = await supabase
    .from("media_photos")
    .select("album_id,album:media_albums!media_photos_album_id_fkey(slug)")
    .eq("id", photoId)
    .maybeSingle();

  await supabase
    .from("media_photos")
    .update({
      caption,
      photographer,
      display_order: displayOrder,
      is_published: isPublished,
    })
    .eq("id", photoId);

  revalidatePath("/media");
  revalidatePath("/admin/media");

  const albumValue = photo?.album as unknown as { slug?: string } | null;
  if (albumValue?.slug) {
    revalidatePath(`/media/${albumValue.slug}`);
  }
  revalidatePath(`/media/photo/${photoId}`);
}

/** Persist an explicit, fully validated ordering for one album. */
export async function saveAlbumPhotoOrder(albumId: string, orderedIds: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireEditor();
  if (!albumId || !Array.isArray(orderedIds) || orderedIds.length > 500 || orderedIds.some(id => typeof id !== "string" || !id)) {
    return { ok: false, error: "Некорректный список фотографий." };
  }
  const { data: album, error: albumError } = await supabase.from("media_albums").select("slug").eq("id", albumId).maybeSingle();
  if (albumError || !album) return { ok: false, error: "Альбом не найден." };
  const { data: existing, error: readError } = await supabase.from("media_photos").select("id").eq("album_id", albumId);
  if (readError || !existing) return { ok: false, error: "Не удалось прочитать фотографии." };
  const expected = new Set(existing.map(photo => String(photo.id)));
  if (expected.size !== orderedIds.length || new Set(orderedIds).size !== orderedIds.length || orderedIds.some(id => !expected.has(id))) {
    return { ok: false, error: "Список фотографий изменился. Обнови страницу и повтори попытку." };
  }
  for (let index = 0; index < orderedIds.length; index++) {
    const { error } = await supabase.from("media_photos").update({ display_order: index + 1 }).eq("id", orderedIds[index]).eq("album_id", albumId);
    if (error) return { ok: false, error: "Ошибка сохранения. Обнови страницу перед повторной попыткой." };
  }
  revalidatePath(`/admin/media/${albumId}/edit`);
  revalidatePath(`/media/${album.slug}`);
  revalidatePath("/media");
  return { ok: true };
}

export async function setAlbumCover(formData: FormData) {
  const { supabase } = await requireEditor();

  const albumId = text(formData.get("album_id"));
  const photoId = text(formData.get("photo_id"));
  if (!albumId || !photoId) return;

  const { data: photo } = await supabase
    .from("media_photos")
    .select("thumb_url")
    .eq("id", photoId)
    .eq("album_id", albumId)
    .maybeSingle();

  if (!photo) return;

  await supabase
    .from("media_albums")
    .update({ cover_image_url: photo.thumb_url })
    .eq("id", albumId);

  revalidatePath("/media");
  revalidatePath("/admin/media");
  revalidatePath(`/admin/media/${albumId}/edit`);
}

export async function deletePhoto(formData: FormData) {
  const { supabase, profile } = await requireEditor();
  if (profile.role !== "admin") return;

  const photoId = text(formData.get("photo_id"));
  if (!photoId) return;

  const { data: photo } = await supabase
    .from("media_photos")
    .select(`
      id,album_id,storage_path,thumb_storage_path,
      album:media_albums!media_photos_album_id_fkey(id,slug,cover_image_url)
    `)
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) return;

  await supabase.storage
    .from("media")
    .remove([photo.storage_path, photo.thumb_storage_path]);

  await supabase.from("media_photos").delete().eq("id", photoId);

  const album = photo.album as unknown as {
    id: string | number;
    slug: string;
    cover_image_url: string | null;
  } | null;

  if (album) {
    const { data: firstPhoto } = await supabase
      .from("media_photos")
      .select("thumb_url")
      .eq("album_id", album.id)
      .eq("is_published", true)
      .order("display_order")
      .order("id")
      .limit(1)
      .maybeSingle();

    await supabase
      .from("media_albums")
      .update({ cover_image_url: firstPhoto?.thumb_url ?? null })
      .eq("id", album.id);

    revalidatePath(`/media/${album.slug}`);
    revalidatePath(`/admin/media/${album.id}/edit`);
  }

  revalidatePath("/media");
}

export async function deleteAlbum(formData: FormData) {
  const { supabase, profile } = await requireEditor();
  if (profile.role !== "admin") {
    redirect("/admin/media");
  }

  const albumId = text(formData.get("album_id"));
  if (!albumId) redirect("/admin/media");

  const { data: photos } = await supabase
    .from("media_photos")
    .select("storage_path,thumb_storage_path")
    .eq("album_id", albumId);

  const paths = (photos ?? []).flatMap(
    (photo: { storage_path: string; thumb_storage_path: string }) => [
      photo.storage_path,
      photo.thumb_storage_path,
    ]
  );

  if (paths.length > 0) {
    await supabase.storage.from("media").remove(paths);
  }

  await supabase.from("media_albums").delete().eq("id", albumId);

  revalidatePath("/media");
  revalidatePath("/admin/media");
  redirect("/admin/media");
}

export async function addVideo(
  _previousState: MediaFormState,
  formData: FormData
): Promise<MediaFormState> {
  const { supabase } = await requireEditor();
  const title = text(formData.get("title"));
  const youtubeUrl = text(formData.get("youtube_url"));
  const youtubeId = extractYouTubeId(youtubeUrl);
  const videoKind = text(formData.get("video_kind"));
  const matchId = await validateMatchSelection(supabase, formData.get("match_id"));
  const publishedAt = nullableText(formData.get("published_at"));
  const description = nullableText(formData.get("description"));
  const isPublished = formData.get("is_published") === "on";
  const showOnHomepage = isPublished && formData.get("show_on_homepage") === "on";
  if (!title || !youtubeId) return { error: "Укажи название и корректную YouTube-ссылку." };
  if (!isVideoKind(videoKind)) return { error: "Выбери корректный тип видео." };
  if (matchId === "invalid") return { error: "Выбранный матч не найден." };

  const { data: insertedVideo, error } = await supabase.from("media_videos").insert({
    title, youtube_url: youtubeUrl, youtube_id: youtubeId,
    description, published_at: publishedAt, video_kind: videoKind, match_id: matchId,
    is_published: isPublished, show_on_homepage: false,
  }).select("id").single();
  if (error || !insertedVideo) return { error: `Не удалось добавить видео: ${error?.message ?? "unknown error"}` };

  if (showOnHomepage) {
    const { error: featureError } = await setFeaturedVideo(supabase, String(insertedVideo.id));
    if (featureError) return { error: `Видео добавлено, но не удалось показать его на главной: ${featureError}` };
  }
  revalidatePath("/"); revalidatePath("/media"); revalidatePath("/admin/media");
  if (matchId) revalidatePath(`/matches/${matchId}`);
  return { success: "Видео добавлено." };
}

export async function updateVideo(
  _previousState: MediaFormState,
  formData: FormData
): Promise<MediaFormState> {
  const { supabase } = await requireEditor();
  const id = text(formData.get("video_id"));
  if (!/^\d+$/.test(id)) return { error: "Неверный идентификатор видео." };
  const { data: original, error: originalError } = await supabase.from("media_videos")
    .select("id,match_id").eq("id", id).maybeSingle();
  if (originalError || !original) return { error: "Видео не найдено или недоступно." };

  const title = text(formData.get("title"));
  const youtubeUrl = text(formData.get("youtube_url"));
  const youtubeId = extractYouTubeId(youtubeUrl);
  const videoKind = text(formData.get("video_kind"));
  const matchId = await validateMatchSelection(supabase, formData.get("match_id"));
  const publishedAt = nullableText(formData.get("published_at"));
  const description = nullableText(formData.get("description"));
  const isPublished = formData.get("is_published") === "on";
  const showOnHomepage = isPublished && formData.get("show_on_homepage") === "on";
  if (!title || !youtubeId) return { error: "Укажи название и корректную YouTube-ссылку." };
  if (!isVideoKind(videoKind)) return { error: "Выбери корректный тип видео." };
  if (matchId === "invalid") return { error: "Выбранный матч не найден." };

  const { error } = await supabase.from("media_videos").update({
    title, youtube_url: youtubeUrl, youtube_id: youtubeId, description,
    published_at: publishedAt, video_kind: videoKind, match_id: matchId,
    is_published: isPublished, show_on_homepage: false,
  }).eq("id", id);
  if (error) return { error: `Не удалось сохранить видео: ${error.message}` };

  if (showOnHomepage) {
    const { error: featureError } = await setFeaturedVideo(supabase, id);
    if (featureError) return { error: `Видео сохранено, но не удалось закрепить его на главной: ${featureError}` };
  }
  revalidatePath("/"); revalidatePath("/media"); revalidatePath("/admin/media");
  revalidatePath(`/admin/media/videos/${id}/edit`);
  if (matchId) revalidatePath(`/matches/${matchId}`);
  if (original.match_id) revalidatePath(`/matches/${original.match_id}`);
  return { success: "Изменения сохранены." };
}

async function setFeaturedVideo(supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"], id: string) {
  const { error: clearError } = await supabase.from("media_videos")
    .update({ show_on_homepage: false }).eq("show_on_homepage", true);
  if (clearError) return { error: clearError.message };
  const { error } = await supabase.from("media_videos")
    .update({ show_on_homepage: true }).eq("id", id).eq("is_published", true);
  return { error: error?.message ?? null };
}

export async function setVideoHomepage(formData: FormData) {
  const { supabase } = await requireEditor();
  const id = text(formData.get("video_id"));
  const enable = formData.getAll("show_on_homepage").includes("on");
  if (!id) return;

  if (enable) {
    const { data: video } = await supabase
      .from("media_videos")
      .select("id,is_published")
      .eq("id", id)
      .maybeSingle();
    if (!video?.is_published) return;

    await supabase
      .from("media_videos")
      .update({ show_on_homepage: false })
      .eq("show_on_homepage", true);
    await supabase
      .from("media_videos")
      .update({ show_on_homepage: true })
      .eq("id", id);
  } else {
    await supabase
      .from("media_videos")
      .update({ show_on_homepage: false })
      .eq("id", id);
  }

  revalidatePath("/");
  revalidatePath("/media");
  revalidatePath("/admin/media");
}

export async function deleteVideo(formData: FormData) {
  const { supabase, profile } = await requireEditor();
  if (profile.role !== "admin") return;

  const id = text(formData.get("video_id"));
  if (!id) return;

  await supabase.from("media_videos").delete().eq("id", id);

  revalidatePath("/");
  revalidatePath("/media");
  revalidatePath("/admin/media");
}

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullableText(value: FormDataEntryValue | null) {
  const result = text(value);
  return result || null;
}

function integer(value: FormDataEntryValue | null, fallback: number) {
  const valueNumber = Number(text(value));
  return Number.isInteger(valueNumber) ? valueNumber : fallback;
}

function percent(value: FormDataEntryValue | null) {
  const n = Number(value);
  return value === null || !Number.isFinite(n) ? 50 : Math.min(100, Math.max(0, Math.round(n)));
}

function slugify(value: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",
    и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
    с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",
    щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Verify IDs server-side. The empty selection intentionally means an unlinked album.
async function validateMatchSelection(supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"], raw: FormDataEntryValue | null): Promise<string | null | "invalid"> {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  if (!/^\d+$/.test(value)) return "invalid";
  const { data, error } = await supabase.from("matches").select("id").eq("id", value).maybeSingle();
  return error || !data ? "invalid" : value;
}
