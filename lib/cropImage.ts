export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function createCroppedImageFile(
  imageSrc: string,
  crop: PixelCrop,
  fileName: string
) {
  const image = await loadImage(imageSrc);

  // Финальный размер карточки. Этого достаточно для сайта и не раздувает Storage.
  const outputWidth = 1000;
  const outputHeight = 1250;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas недоступен.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Не удалось создать кадр."));
      },
      "image/webp",
      0.9
    );
  });

  const safeName = fileName.replace(/\.[^.]+$/, "") || "player";
  return new File([blob], `${safeName}-cropped.webp`, {
    type: "image/webp",
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось открыть изображение."));
    image.src = src;
  });
}
