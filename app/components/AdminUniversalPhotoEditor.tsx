"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { exportAdminPhotoCrop, preferredAdminPhotoAspect, shouldUseAdminPhotoEditor, type AdminPhotoAspect } from "@/lib/admin-photo-crop";
import { fitFrame, frameGeometry, paintFrame, zoomToFit } from "@/lib/photo-framing";
import NewsFramePreviews from "./NewsFramePreviews";
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
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({width: 1, height: 1});
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [sitePreview, setSitePreview] = useState("");
  const [safeRatio, setSafeRatio] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{x:number;y:number;startX:number;startY:number}|null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const bypass = useRef(new WeakSet<HTMLInputElement>());
  const previousFocus = useRef<HTMLElement | null>(null);
  const currentFile = selection?.original[selection.position] ?? null;
  const isRaster = currentFile ? ["image/jpeg", "image/png", "image/webp"].includes(currentFile.type) : false;
  const isNews = selection?.input.dataset.newsCover === "true";
  const naturalSize = image ? {width:image.naturalWidth,height:image.naturalHeight} : null;
  const computedAspect = aspects.find((item) => item.key === aspect)?.value ?? (naturalSize ? naturalSize.width / naturalSize.height : 1);
  const frame = fitFrame(stageSize, computedAspect);
  const safeFrame = safeRatio ? fitFrame(frame,safeRatio) : null;
  const geometry = naturalSize ? frameGeometry(naturalSize, frame, zoom, {x:crop.x * frame.width,y:crop.y * frame.height}) : null;
  const minZoom = naturalSize ? Math.min(.1, zoomToFit(naturalSize, frame)) : .1;

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
      setAspect(input.dataset.newsCover === "true" ? "original" : preferredAdminPhotoAspect(input));
      setSelection({ input, original: files, edited: [], position: 0 });
    };
    document.addEventListener("change", capture, true);
    return () => document.removeEventListener("change", capture, true);
  }, []);

  useEffect(() => { setSelection(null); }, [pathname]);

  useEffect(() => {
    if (!currentFile) { setSourceUrl(""); setImage(null); setSitePreview(""); return; }
    const url = URL.createObjectURL(currentFile);
    setSourceUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setImage(null);
    setSitePreview("");
    setSafeRatio(null);
    drag.current=null;
    setError("");
    const decoded = new Image();
    let active = true;
    decoded.onload = () => { if (active) setImage(decoded); };
    decoded.onerror = () => { if (active && isRaster) setError("Не удалось прочитать фотографию."); };
    decoded.src = url;
    return () => { active = false; URL.revokeObjectURL(url); };
  }, [currentFile]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setStageSize({width:Math.max(1,stage.clientWidth - 16),height:Math.max(1,stage.clientHeight - 16)});
    update(); const observer = new ResizeObserver(update); observer.observe(stage);
    return () => observer.disconnect();
  }, [currentFile, isRaster]);

  useEffect(() => {
    if (!isNews || !image || !geometry) return;
    const canvas = document.createElement("canvas");
    const scale = 600 / Math.max(geometry.crop.width,geometry.crop.height);
    canvas.width = Math.max(1,Math.round(geometry.crop.width*scale));
    canvas.height = Math.max(1,Math.round(geometry.crop.height*scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintFrame(ctx,image,geometry.crop,canvas.width,canvas.height);
    setSitePreview(canvas.toDataURL("image/jpeg",.82));
  }, [isNews,image,zoom,crop,aspect,stageSize]);

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
      setAspect(isNews ? "original" : preferredAdminPhotoAspect(selection.input));
      setSelection({ ...selection, edited: next, position: selection.position + 1 });
    }
  }

  async function applyCrop() {
    if (!currentFile || !geometry || processing) return;
    setError("");
    setProcessing(true);
    try {
      const output = await exportAdminPhotoCrop(currentFile, geometry.crop);
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
  const reset = () => {setZoom(1);setCrop({x:0,y:0});};
  const nudge = (x:number,y:number) => { if (!geometry) return;const next=frameGeometry(naturalSize!,frame,zoom,{x:geometry.x+x,y:geometry.y+y});setCrop({x:next.x/frame.width,y:next.y/frame.height}); };

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
            className={aspect === option.key ? "active" : ""} onClick={() => { setAspect(option.key); reset(); }}>{option.label}</button>)}
          <button type="button" disabled={!naturalSize || processing} onClick={()=>{setZoom(zoomToFit(naturalSize!,frame));setCrop({x:0,y:0});}}>Вписать</button>
          <button type="button" disabled={processing} onClick={reset}>Заполнить</button>
        </div>
        <div ref={stageRef} className="adminPhotoStage" aria-label="Перетащи фотографию для выбора кадра">
          {sourceUrl && geometry && <div className="adminPhotoFrame" style={{width:frame.width,height:frame.height}}
            onPointerDown={e=>{if(processing)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,startX:geometry.x,startY:geometry.y};}}
            onPointerMove={e=>{if(!drag.current || processing)return;const next=frameGeometry(naturalSize!,frame,zoom,{x:drag.current.startX+e.clientX-drag.current.x,y:drag.current.startY+e.clientY-drag.current.y});setCrop({x:next.x/frame.width,y:next.y/frame.height});}}
            onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
            <img src={sourceUrl} alt="" draggable={false} style={{left:geometry.left,top:geometry.top,width:geometry.width,height:geometry.height}}/>
            {isNews && safeFrame && <div className="adminPhotoActualSafeZone" aria-hidden="true" style={{width:safeFrame.width,height:safeFrame.height}}><span>ВИДНО НА САЙТЕ</span></div>}
          </div>}
        </div>
        <div className="adminPhotoControls">
          <label className="adminPhotoZoom"><span>Масштаб <strong>{Math.round(zoom * 100)}%</strong></span><input type="range" min={minZoom} max="3" step="any" value={zoom} disabled={processing} onChange={(event) => setZoom(Number(event.target.value))}/></label>
          <div className="adminPhotoNudges" aria-label="Переместить фото">
            <span>Позиция</span>
            <button type="button" aria-label="Влево" title="Сдвинуть влево" disabled={processing} onClick={() => nudge(-12,0)}>←</button>
            <button type="button" aria-label="Вверх" title="Сдвинуть вверх" disabled={processing} onClick={() => nudge(0,-12)}>↑</button>
            <button type="button" aria-label="Вниз" title="Сдвинуть вниз" disabled={processing} onClick={() => nudge(0,12)}>↓</button>
            <button type="button" aria-label="Вправо" title="Сдвинуть вправо" disabled={processing} onClick={() => nudge(12,0)}>→</button>
            <button type="button" title="Восстановить кадр" disabled={processing} onClick={reset}>Сброс</button>
          </div>
        </div>
        {isNews && <div className="adminPhotoNewsPreviews"><NewsFramePreviews src={sitePreview} onFrameRatio={setSafeRatio}/></div>}
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
          {isRaster && <button type="button" onClick={() => void applyCrop()} disabled={processing || !geometry} className="adminPhotoApply">
            {processing ? "Обрабатываем…" : selection.position + 1 < selection.original.length ? "Применить и далее" : "Применить кадр"}
          </button>}
        </div>
      </footer>
    </section>
  </div>;
}
