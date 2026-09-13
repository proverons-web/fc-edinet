export type DesignCropPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function createDesignCropFile(
  imageSrc: string,
  crop: DesignCropPixels,
  fileName: string,
  outputWidth: number,
  outputHeight: number
) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas недоступен.");
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
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Не удалось создать WebP-кроп.")), "image/webp", 0.9);
  });
  const safeName = (fileName.replace(/\.[^.]+$/, "") || "hero")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "hero";
  return new File([blob], `${safeName}-${outputWidth}x${outputHeight}.webp`, { type: "image/webp" });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("blob:") && !src.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось открыть изображение для кадрирования."));
    image.src = src;
  });
}
