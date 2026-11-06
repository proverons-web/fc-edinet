/** Browser-only export: replaces selected raster upload with the approved crop. */
export type AdminPhotoPixels = { x: number; y: number; width: number; height: number };

export async function exportAdminPhotoCrop(file: File, crop: AdminPhotoPixels): Promise<File> {
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Не удалось прочитать изображение."));
      element.src = source;
    });
    if (![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) || crop.width < 1 || crop.height < 1) {
      throw new Error("Выбранный кадр некорректен. Измени положение фотографии.");
    }
    const scale = Math.min(1, 2400 / Math.max(crop.width, crop.height));
    const width = Math.max(1, Math.round(crop.width * scale));
    const height = Math.max(1, Math.round(crop.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Не удалось открыть графический редактор браузера.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((output) => output ? resolve(output) : reject(new Error("Не удалось создать готовое фото.")), "image/webp", 0.92);
    });
    const stem = file.name.replace(/\.[^.]+$/, "").slice(0, 110) || "image";
    return new File([blob], `${stem}-edited.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(source);
  }
}

export type AdminPhotoAspect = "original" | "portrait" | "landscape" | "square";

/** Field-specific default while leaving the aspect override under admin control. */
export function preferredAdminPhotoAspect(input: { name?: string; id?: string }): AdminPhotoAspect {
  const field = `${input.name ?? ""} ${input.id ?? ""}`.toLowerCase();
  if (/(photo_file|avatar|portrait|person|staff|leader|player)/.test(field)) return "portrait";
  if (/(cover|hero|banner|background|stadium|slide)/.test(field)) return "landscape";
  if (/(thumb|icon)/.test(field)) return "square";
  return "original";
}

export function shouldUseAdminPhotoEditor(input: HTMLInputElement, files: File[]): boolean {
  if (input.type !== "file" || !files.length || input.disabled) return false;
  if (input.dataset.photoEditor === "off") return false;
  // These fields already open a more specialized crop editor with its own upload pipeline.
  if (["photo_source", "team_logo_source", "logo_source"].includes(input.id)) return false;
  if (input.closest(".imageEditorField")) return false;
  return files.some((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
}
