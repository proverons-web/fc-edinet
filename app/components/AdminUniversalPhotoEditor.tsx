"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { exportAdminPhotoCrop, preferredAdminPhotoAspect, shouldUseAdminPhotoEditor, type AdminPhotoAspect, type AdminPhotoPixels } from "@/lib/admin-photo-crop";
import "./admin-universal-photo-editor.css";

type Selection = {
  input: HTMLInputElement;
  original: File[];
  edited: File[];
  position: number;
};

const aspects: { key: AdminPhotoAspect; label: string; value: number | null }[] = [
  { key: "original", label: "Оригинал", value: null },
  { key: "portrait", label: "Портрет 4:5", value: 4 / 5 },
  { key: "landscape", label: "Широкий 16:9", value: 16 / 9 },
  { key: "square", label: "Квадрат 1:1", value: 1 },
];

/** Shared across the *admin route only*. No database migration or public style changes. */
export default function AdminUniversalPhotoEditor() {
  const pathname = usePathname();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [aspect, setAspect] = useState<AdminPhotoAspect>("original");
  const [naturalRatio, setNaturalRatio] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<AdminPhotoPixels | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const bypass = useRef(new WeakSet<HTMLInputElement>());
  const previousFocus = useRef<HTMLElement | null>(null);
  const currentFile = selection?.original[selection.position] ?? null;
  const isRaster = currentFile ? ["image/jpeg", "image/png", "image/webp"].includes(currentFile.type) : false;

  const finish = useCallback((input: HTMLInputElement, finalFiles: File[]) => {
    setSelection(null);
    if (!input.isConnected) return;
    if (!finalFiles.length) { input.value = ""; return; }
    try {
      const transfer = new DataTransfer();
      for (const file of finalFiles) transfer.items.add(file);
      input.files = transfer.files;
      // Existing form upload and preview listeners receive the APPROVED file(s).
      bypass.current.add(input);
      try { input.dispatchEvent(new Event("change", { bubbles: true })); }
      finally { bypass.current.delete(input); }
    } catch {
      // Never submit an unapproved or partially edited selection silently.
      input.value = "";
      window.alert("Браузер не смог передать готовое фото форме. Выбери файл ещё раз.");
    }
  }, []);

  useEffect(() => {
    const capture = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file" || bypass.current.has(input)) return;
      const files = Array.from(input.files ?? []);
      if (!shouldUseAdminPhotoEditor(input, files)) return;
      // Intercept before React input onChange callbacks upload the raw file.
      event.stopImmediatePropagation();
      event.stopPropagation();
      input.value = "";
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setAspect(preferredAdminPhotoAspect(input));
      setSelection({ input, original: files, edited: [], position: 0 });
    };
    document.addEventListener("change", capture, true);
    return () => document.removeEventListener("change", capture, true);
  }, []);

  useEffect(() => { setSelection(null); }, [pathname]);

  useEffect(() => {
    if (!currentFile) { setSourceUrl(""); return; }
    const url = URL.createObjectURL(currentFile);
    setSourceUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setNaturalRatio(1);
    setPixels(null);
    setError("");
    return () => URL.revokeObjectURL(url);
  }, [currentFile]);

  useEffect(() => {
    if (!selection) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !processing) {
        event.preventDefault();
        selection.input.value = "";
        setSelection(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prior;
      window.removeEventListener("keydown", onKey);
      previousFocus.current?.focus();
    };
  }, [selection, processing]);

  function advance(file: File) {
    if (!selection) return;
    const next = [...selection.edited, file];
    if (selection.position + 1 >= selection.original.length) {
      finish(selection.input, next);
    } else {
      setAspect(preferredAdminPhotoAspect(selection.input));
      setSelection({ ...selection, edited: next, position: selection.position + 1 });
    }
  }

  async function applyCrop() {
    if (!currentFile || !pixels || processing) return;
    setError("");
    setProcessing(true);
    try {
      const output = await exportAdminPhotoCrop(currentFile, pixels);
      advance(output);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обработать фотографию.");
    } finally { setProcessing(false); }
  }

  const cancel = () => {
    if (!selection || processing) return;
    selection.input.value = "";
    setSelection(null);
  };

  if (!selection || !currentFile) return null;
  const computedAspect = aspects.find((item) => item.key === aspect)?.value ?? naturalRatio;

  return <div className="adminPhotoBackdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) cancel();
  }}>
    <section className="adminPhotoDialog" role="dialog" aria-modal="true" aria-label="Визуальный редактор фотографии">
      <header className="adminPhotoHeader">
        <div>
          <small>FC EDINEȚ · ФОТОРЕДАКТОР</small>
          <h2>Настроить фотографию</h2>
          <p>Перемещай изображение мышью, меняй масштаб и выбирай границы кадра перед загрузкой.</p>
          {selection.original.length > 1 && <strong className="adminPhotoSequence">Фото {selection.position + 1} из {selection.original.length}</strong>}
        </div>
        <button type="button" onClick={cancel} disabled={processing} className="adminPhotoClose" aria-label="Закрыть">×</button>
      </header>
      {isRaster ? <>
        <div className="adminPhotoAspectOptions" role="group" aria-label="Формат кадра">
          {aspects.map((option) => <button type="button" key={option.key} disabled={processing}
            className={aspect === option.key ? "active" : ""} onClick={() => { setAspect(option.key); setCrop({ x: 0, y: 0 }); setZoom(1); }}>{option.label}</button>)}
        </div>
        <div className="adminPhotoStage" aria-label="Перетащи фотографию для выбора кадра">
          {sourceUrl && <Cropper image={sourceUrl} crop={crop} zoom={zoom} aspect={computedAspect}
            showGrid objectFit="cover" minZoom={1} maxZoom={3}
            onCropChange={setCrop} onZoomChange={setZoom}
            onMediaLoaded={(media) => { if (media.naturalHeight > 0) setNaturalRatio(media.naturalWidth / media.naturalHeight); }}
            onCropComplete={(_area: Area, pixelArea: Area) => setPixels({
              x: Math.round(pixelArea.x), y: Math.round(pixelArea.y),
              width: Math.round(pixelArea.width), height: Math.round(pixelArea.height),
            })} />}
        </div>
        <div className="adminPhotoControls">
          <label className="adminPhotoZoom"><span>Масштаб <strong>{Math.round(zoom * 100)}%</strong></span><input type="range" min="1" max="3" step="0.01" value={zoom} disabled={processing} onChange={(event) => setZoom(Number(event.target.value))}/></label>
          <div className="adminPhotoNudges" aria-label="Переместить фото">
            <span>Позиция</span>
            <button type="button" aria-label="Влево" title="Сдвинуть влево" disabled={processing} onClick={() => setCrop((v) => ({ ...v, x: v.x - 12 }))}>←</button>
            <button type="button" aria-label="Вверх" title="Сдвинуть вверх" disabled={processing} onClick={() => setCrop((v) => ({ ...v, y: v.y - 12 }))}>↑</button>
            <button type="button" aria-label="Вниз" title="Сдвинуть вниз" disabled={processing} onClick={() => setCrop((v) => ({ ...v, y: v.y + 12 }))}>↓</button>
            <button type="button" aria-label="Вправо" title="Сдвинуть вправо" disabled={processing} onClick={() => setCrop((v) => ({ ...v, x: v.x + 12 }))}>→</button>
            <button type="button" title="Восстановить кадр" disabled={processing} onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}>Сброс</button>
          </div>
        </div>
      </> : <p className="adminPhotoVectorMessage">Это векторный файл. Он будет загружен без кадрирования, чтобы сохранить качество.</p>}
      {error && <div className="adminPhotoError" role="alert">{error}</div>}
      <footer className="adminPhotoFooter">
        <span className="adminPhotoFilename" title={currentFile.name}>{currentFile.name}</span>
        <div className="adminPhotoButtons">
          <button type="button" onClick={cancel} disabled={processing} className="adminPhotoCancel">Отмена</button>
          {selection.original.length > 1 && <button type="button" onClick={() => {
            if (!selection) return;
            finish(selection.input, [...selection.edited, ...selection.original.slice(selection.position)]);
          }} disabled={processing} className="adminPhotoUseOriginal" title="Оставить остальные фотографии без обработки">Остальные без изменений</button>}
          <button type="button" onClick={() => advance(currentFile)} disabled={processing} className="adminPhotoUseOriginal">Без изменений</button>
          {isRaster && <button type="button" onClick={() => void applyCrop()} disabled={processing || !pixels} className="adminPhotoApply">
            {processing ? "Обрабатываем…" : selection.position + 1 < selection.original.length ? "Применить и далее" : "Применить кадр"}
          </button>}
        </div>
      </footer>
    </section>
  </div>;
}
