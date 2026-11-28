export type FrameSize = { width: number; height: number };
export type FramePoint = { x: number; y: number };
export type FrameCrop = FrameSize & FramePoint;

export function zoomToFit(image: FrameSize, frame: FrameSize) {
  return Math.min(frame.width / image.width, frame.height / image.height) / Math.max(frame.width / image.width, frame.height / image.height);
}

/** Zoom is relative to the scale that covers the chosen output frame. */
export function frameGeometry(image: FrameSize, frame: FrameSize, zoom: number, position: FramePoint) {
  const scale = Math.max(frame.width / image.width, frame.height / image.height) * zoom;
  const width = image.width * scale, height = image.height * scale;
  const limitX = Math.abs(width - frame.width) / 2, limitY = Math.abs(height - frame.height) / 2;
  const x = Math.max(-limitX, Math.min(limitX, position.x));
  const y = Math.max(-limitY, Math.min(limitY, position.y));
  const left = (frame.width - width) / 2 + x, top = (frame.height - height) / 2 + y;
  return { width, height, left, top, x, y, crop: { x: -left / scale, y: -top / scale, width: frame.width / scale, height: frame.height / scale } };
}

export function fitFrame(stage: FrameSize, aspect: number): FrameSize {
  const width = Math.min(stage.width, stage.height * aspect);
  return { width, height: width / aspect };
}

/** Draw the exact frame, including intentional padding, without stretching. */
export function paintFrame(ctx: CanvasRenderingContext2D, image: HTMLImageElement, crop: FrameCrop, width: number, height: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const x = Math.max(0, crop.x), y = Math.max(0, crop.y);
  const right = Math.min(image.naturalWidth, crop.x + crop.width), bottom = Math.min(image.naturalHeight, crop.y + crop.height);
  if (right <= x || bottom <= y) return;
  const sx = width / crop.width, sy = height / crop.height;
  ctx.drawImage(image, x, y, right - x, bottom - y, (x - crop.x) * sx, (y - crop.y) * sy, (right - x) * sx, (bottom - y) * sy);
}
