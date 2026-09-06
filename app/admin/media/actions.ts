"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";

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
  const isPublished = formData.get("is_published") === "on";

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
  const description = nullableText(formData.get("description"));
  const publishedAt = nullableText(formData.get("published_at"));
  const isPublished = formData.get("is_published") === "on";
  const youtubeId = extractYouTubeId(youtubeUrl);

  if (!title || !youtubeId) {
    return { error: "Укажи название и корректную YouTube-ссылку." };
  }

  const { error } = await supabase.from("media_videos").insert({
    title,
    youtube_url: youtubeUrl,
    youtube_id: youtubeId,
    description,
    published_at: publishedAt,
    is_published: isPublished,
  });

  if (error) {
    return { error: `Не удалось добавить видео: ${error.message}` };
  }

  revalidatePath("/media");
  revalidatePath("/admin/media");

  return { success: "Видео добавлено." };
}

export async function deleteVideo(formData: FormData) {
  const { supabase, profile } = await requireEditor();
  if (profile.role !== "admin") return;

  const id = text(formData.get("video_id"));
  if (!id) return;

  await supabase.from("media_videos").delete().eq("id", id);

  revalidatePath("/media");
  revalidatePath("/admin/media");
}

function extractYouTubeId(value: string) {
  try {
    const url = new URL(value);

    if (url.hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      url.hostname.endsWith("youtube.com") ||
      url.hostname.endsWith("youtube-nocookie.com")
    ) {
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] || null;
      }

      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || null;
      }

      return url.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
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
