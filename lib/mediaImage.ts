export async function prepareMediaPhoto(file: File) {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);

    const full = await renderImage(image, 2400, 0.9);
    const thumb = await renderImage(image, 900, 0.84);

    const baseName =
      file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 70) || "photo";

    return {
      full: new File([full], `${baseName}.webp`, {
        type: "image/webp",
      }),
      thumb: new File([thumb], `${baseName}-thumb.webp`, {
        type: "image/webp",
      }),
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function renderImage(
  image: HTMLImageElement,
  maxDimension: number,
  quality: number
) {
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
  );

  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas недоступен.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Не удалось подготовить изображение."));
      },
      "image/webp",
      quality
    );
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Не удалось открыть выбранную фотографию."));
    image.src = src;
  });
}
