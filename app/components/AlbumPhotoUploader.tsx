"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareMediaPhoto } from "@/lib/mediaImage";
import {
  registerUploadedPhotos,
  type UploadedMediaRecord,
} from "@/app/admin/media/actions";

export default function AlbumPhotoUploader({
  albumId,
  albumSlug,
}: {
  albumId: string;
  albumSlug: string;
}) {
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const selected = Array.from(files).slice(0, 30);

    if (
      selected.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
    ) {
      setError("Используй JPG, PNG или WEBP.");
      return;
    }

    setBusy(true);
    setError("");
    setDone("");

    const supabase = createClient();
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setBusy(false);
      setError("Сессия истекла. Войди в админку заново.");
      return;
    }

    const userId = userData.user.id;
    const uploaded: UploadedMediaRecord[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        setProgress(
          `Подготавливаем ${index + 1} из ${selected.length}: ${file.name}`
        );

        const prepared = await prepareMediaPhoto(file);
        const token =
          `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
        const folder = `${userId}/albums/${albumId}`;
        const fullPath = `${folder}/${token}.webp`;
        const thumbPath = `${folder}/${token}-thumb.webp`;

        setProgress(
          `Загружаем ${index + 1} из ${selected.length}: ${file.name}`
        );

        const { error: fullError } = await supabase.storage
          .from("media")
          .upload(fullPath, prepared.full, {
            cacheControl: "31536000",
            upsert: false,
            contentType: "image/webp",
          });

        if (fullError) throw fullError;
        uploadedPaths.push(fullPath);

        const { error: thumbError } = await supabase.storage
          .from("media")
          .upload(thumbPath, prepared.thumb, {
            cacheControl: "31536000",
            upsert: false,
            contentType: "image/webp",
          });

        if (thumbError) throw thumbError;
        uploadedPaths.push(thumbPath);

        const fullUrl = supabase.storage
          .from("media")
          .getPublicUrl(fullPath).data.publicUrl;

        const thumbUrl = supabase.storage
          .from("media")
          .getPublicUrl(thumbPath).data.publicUrl;

        uploaded.push({
          imageUrl: fullUrl,
          thumbUrl,
          storagePath: fullPath,
          thumbStoragePath: thumbPath,
          originalName: file.name,
        });
      }

      setProgress("Сохраняем фотографии в альбоме...");

      const result = await registerUploadedPhotos(albumId, uploaded);

      if (!result.ok) {
        throw new Error(result.error);
      }

      setDone(
        `Готово: загружено ${uploaded.length} фото. Обновляем страницу...`
      );
      setProgress("");
      window.location.href = `/admin/media/${albumId}/edit?uploaded=${uploaded.length}`;
    } catch (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("media").remove(uploadedPaths);
      }

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Не удалось загрузить фотографии."
      );
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mediaUploader">
      <div className="mediaUploaderIcon">＋</div>
      <div>
        <h3>Добавить фотографии</h3>
        <p>
          Можно выбрать до 30 снимков за раз. Перед загрузкой сайт
          автоматически создаёт оптимизированный WEBP и отдельную миниатюру.
        </p>
      </div>

      <label className={`mediaUploadButton ${busy ? "disabled" : ""}`}>
        {busy ? "Загрузка..." : "Выбрать фотографии"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={(event) => {
            void upload(event.target.files);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {progress && <div className="mediaUploadProgress">{progress}</div>}
      {done && <div className="formSuccess">{done}</div>}
      {error && <div className="formError">{error}</div>}

      <small>
        Альбом: /media/{albumSlug}
      </small>
    </div>
  );
}
