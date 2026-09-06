"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  createCroppedImageFile,
  type PixelCrop,
} from "@/lib/cropImage";

export default function PlayerPhotoCropper({
  sourceFile,
  onCancel,
  onConfirm,
}: {
  sourceFile: File;
  onCancel: () => void;
  onConfirm: (file: File, previewUrl: string) => void;
}) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(sourceFile);
    setSourceUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  const onCropComplete = useCallback(
    (_area: Area, croppedAreaPixels: Area) => {
      setPixels({
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
      });
    },
    []
  );

  async function confirmCrop() {
    if (!sourceUrl || !pixels) return;

    setProcessing(true);
    setError("");

    try {
      const file = await createCroppedImageFile(
        sourceUrl,
        pixels,
        sourceFile.name
      );
      const preview = URL.createObjectURL(file);
      onConfirm(file, preview);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось кадрировать фотографию."
      );
      setProcessing(false);
    }
  }

  return (
    <div className="cropModalBackdrop" role="dialog" aria-modal="true">
      <div className="cropModal">
        <div className="cropModalHeader">
          <div>
            <p className="eyebrow blue">ФОТО ИГРОКА</p>
            <h2>Выбери нужный участок</h2>
            <p>
              Перетаскивай фото мышью и используй масштаб. В рамке должен
              остаться только нужный футболист.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="cropClose">
            ✕
          </button>
        </div>

        <div className="cropStage">
          {sourceUrl && (
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={4 / 5}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              showGrid
              objectFit="contain"
            />
          )}
        </div>

        <div className="cropControls">
          <label>
            <span>Масштаб</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>

          {error && <div className="formError">{error}</div>}

          <div className="cropButtons">
            <button type="button" className="cropCancel" onClick={onCancel}>
              Отмена
            </button>
            <button
              type="button"
              className="cropApply"
              onClick={confirmCrop}
              disabled={processing || !pixels}
            >
              {processing ? "Обрабатываем..." : "Использовать этот кадр"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
