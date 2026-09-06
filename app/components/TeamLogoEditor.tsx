"use client";

import { useEffect, useState } from "react";
import { createLogoFile } from "@/lib/logoImage";

export default function TeamLogoEditor({
  sourceFile,
  onCancel,
  onConfirm,
}: {
  sourceFile: File;
  onCancel: () => void;
  onConfirm: (file: File, previewUrl: string) => void;
}) {
  const previewSize = 360;
  const [sourceUrl, setSourceUrl] = useState("");
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(sourceFile);
    setSourceUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  async function apply() {
    if (!sourceUrl) return;

    setProcessing(true);
    setError("");

    try {
      const file = await createLogoFile(
        sourceUrl,
        sourceFile.name,
        zoom,
        x,
        y,
        previewSize
      );

      const preview = URL.createObjectURL(file);
      onConfirm(file, preview);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось подготовить логотип."
      );
      setProcessing(false);
    }
  }

  return (
    <div className="cropModalBackdrop" role="dialog" aria-modal="true">
      <div className="logoModal">
        <div className="cropModalHeader">
          <div>
            <p className="eyebrow blue">ЛОГОТИП КОМАНДЫ</p>
            <h2>Подгони герб под блок</h2>
            <p>
              Логотип сохраняется на прозрачном квадратном холсте.
              Вертикальный герб полностью помещается внутрь, а масштаб
              и положение можно настроить вручную.
            </p>
          </div>

          <button type="button" className="cropClose" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="logoEditorBody">
          <div
            className="logoArtboard"
            style={{
              width: previewSize,
              height: previewSize,
            }}
          >
            <div className="logoSafeArea" />

            {sourceUrl && (
              <img
                className="logoEditorImage"
                src={sourceUrl}
                alt=""
                style={{
                  transform:
                    `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${zoom})`,
                }}
              />
            )}
          </div>

          <div className="logoControls">
            <label>
              <span>Масштаб</span>
              <input
                type="range"
                min={0.5}
                max={2.2}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
              <strong>{Math.round(zoom * 100)}%</strong>
            </label>

            <label>
              <span>По горизонтали</span>
              <input
                type="range"
                min={-80}
                max={80}
                step={1}
                value={x}
                onChange={(event) => setX(Number(event.target.value))}
              />
              <strong>{x}</strong>
            </label>

            <label>
              <span>По вертикали</span>
              <input
                type="range"
                min={-80}
                max={80}
                step={1}
                value={y}
                onChange={(event) => setY(Number(event.target.value))}
              />
              <strong>{y}</strong>
            </label>

            <button
              type="button"
              className="logoReset"
              onClick={() => {
                setZoom(1);
                setX(0);
                setY(0);
              }}
            >
              Сбросить положение
            </button>

            {error && <div className="formError">{error}</div>}

            <div className="cropButtons">
              <button type="button" className="cropCancel" onClick={onCancel}>
                Отмена
              </button>

              <button
                type="button"
                className="cropApply"
                disabled={processing}
                onClick={apply}
              >
                {processing ? "Подготавливаем..." : "Использовать логотип"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
