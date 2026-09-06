export async function createLogoFile(
  imageSrc: string,
  originalName: string,
  zoom: number,
  offsetX: number,
  offsetY: number,
  previewSize = 360
) {
  const image = await loadImage(imageSrc);

  const size = 800;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas недоступен.");
  }

  // Оставляем прозрачный фон. Это особенно важно для PNG/SVG гербов.
  context.clearRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  // Вписываем весь герб в 82% холста, затем применяем масштаб пользователя.
  const safeArea = size * 0.82;
  const baseScale = Math.min(
    safeArea / image.naturalWidth,
    safeArea / image.naturalHeight
  );

  const scale = baseScale * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  const previewToCanvas = size / previewSize;
  const x = (size - width) / 2 + offsetX * previewToCanvas;
  const y = (size - height) / 2 + offsetY * previewToCanvas;

  context.drawImage(image, x, y, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Не удалось подготовить логотип."));
      },
      "image/png"
    );
  });

  const safeName = originalName.replace(/\.[^.]+$/, "") || "team-logo";

  return new File([blob], `${safeName}-prepared.png`, {
    type: "image/png",
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось открыть логотип."));
    image.src = src;
  });
}
