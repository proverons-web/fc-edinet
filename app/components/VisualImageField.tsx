"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { createDesignCropFile, type DesignCropPixels } from "@/lib/designImage";
import type { DesignMediaAsset } from "@/lib/types";

export type VisualImageDevice = "desktop" | "tablet" | "mobile";

const outputByDevice: Record<VisualImageDevice, { width: number; height: number; label: string }> = {
  desktop: { width: 1920, height: 800, label: "Desktop" },
  tablet: { width: 1400, height: 900, label: "Tablet" },
  mobile: { width: 900, height: 1200, label: "Mobile" },
};

export default function VisualImageField({
  device,
  fileName,
  assetFieldName,
  currentUrl,
  assets,
  onPreviewChange,
  onClearChange,
  clear,
  onActivate,
}: {
  device: VisualImageDevice;
  fileName: string;
  assetFieldName: string;
  currentUrl: string;
  assets: DesignMediaAsset[];
  onPreviewChange: (url: string) => void;
  onClearChange: (value: boolean) => void;
  clear: boolean;
  onActivate?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [source, setSource] = useState<{ url: string; name: string } | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [assetId, setAssetId] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);

  useEffect(() => () => {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    if (source?.url.startsWith("blob:")) URL.revokeObjectURL(source.url);
  }, [previewObjectUrl, source]);

  function selectUpload(file: File) {
    if (source?.url.startsWith("blob:")) URL.revokeObjectURL(source.url);
    const url = URL.createObjectURL(file);
    setSource({ url, name: file.name });
    setAssetId("");
    setCropOpen(true);
    onActivate?.();
  }

  function chooseAsset(asset: DesignMediaAsset) {
    clearFileInput(fileRef.current);
    setAssetId(asset.id);
    setSource({ url: asset.public_url, name: asset.file_name });
    onPreviewChange(asset.public_url);
    onClearChange(false);
    setLibraryOpen(false);
    onActivate?.();
  }

  function editCurrent() {
    if (!currentUrl) return;
    setSource({ url: currentUrl, name: `${device}-library.webp` });
    setAssetId("");
    setCropOpen(true);
    onActivate?.();
  }

  function applyFile(file: File) {
    const data = new DataTransfer();
    data.items.add(file);
    if (fileRef.current) fileRef.current.files = data.files;
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    const next = URL.createObjectURL(file);
    setPreviewObjectUrl(next);
    setAssetId("");
    onPreviewChange(next);
    onClearChange(false);
    setCropOpen(false);
  }

  const dimensions = outputByDevice[device];

  return (
    <div className="imageEditorField">
      <input ref={fileRef} name={fileName} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) selectUpload(file);
      }} />
      <input type="hidden" name={assetFieldName} value={assetId} />
      <input type="hidden" name={`${fileName}_width`} value={dimensions.width} />
      <input type="hidden" name={`${fileName}_height`} value={dimensions.height} />

      <div className="imageEditorFieldHead">
        <div><strong>{dimensions.label}</strong><span>{dimensions.width} × {dimensions.height} WebP</span></div>
        <button type="button" className="rowAction muted" onClick={() => fileRef.current?.click()}>Загрузить и кадрировать</button>
      </div>

      <div className={`imageEditorThumb ${currentUrl && !clear ? "hasImage" : ""}`}>
        {currentUrl && !clear ? <img src={currentUrl} alt="" /> : <span>Изображение не выбрано</span>}
      </div>

      <div className="imageEditorFieldActions">
        <button type="button" className="rowAction" onClick={() => setLibraryOpen((value) => !value)}>Медиатека</button>
        {currentUrl && !clear && <button type="button" className="rowAction" onClick={editCurrent}>Кадрировать текущий кадр</button>}
        {currentUrl && <label className="imageClearCheck"><input type="checkbox" checked={clear} onChange={(e) => { onClearChange(e.target.checked); if (e.target.checked) { setAssetId(""); clearFileInput(fileRef.current); } }} /><span>Убрать</span></label>}
      </div>

      {libraryOpen && <div className="designMediaPicker">
        <div className="designMediaPickerHead"><strong>Media Library</strong><span>{assets.length ? `Последние ${assets.length} изображений` : "Пока пусто"}</span></div>
        {assets.length ? <div className="designMediaGrid">{assets.map((asset) => <button type="button" key={asset.id} className={assetId === asset.id ? "selected" : ""} onClick={() => chooseAsset(asset)} title={asset.file_name}>
          <img src={asset.public_url} alt="" />
          <span>{asset.variant || "image"}</span>
          <small>{asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.file_name}</small>
        </button>)}</div> : <div className="adminEmpty">После первой загрузки изображения будут появляться здесь автоматически.</div>}
      </div>}

      {cropOpen && source && <VisualCropModal source={source} device={device} onCancel={() => { clearFileInput(fileRef.current); setCropOpen(false); }} onConfirm={applyFile} />}
    </div>
  );
}

function VisualCropModal({ source, device, onCancel, onConfirm }: { source: { url: string; name: string }; device: VisualImageDevice; onCancel: () => void; onConfirm: (file: File) => void }) {
  const size = outputByDevice[device];
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<DesignCropPixels | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const aspect = useMemo(() => size.width / size.height, [size.width, size.height]);
  const onCropComplete = useCallback((_area: Area, cropPixels: Area) => setPixels({ x: Math.round(cropPixels.x), y: Math.round(cropPixels.y), width: Math.round(cropPixels.width), height: Math.round(cropPixels.height) }), []);

  async function confirm() {
    if (!pixels) return;
    setProcessing(true); setError("");
    try {
      const file = await createDesignCropFile(source.url, pixels, source.name, size.width, size.height);
      onConfirm(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось кадрировать изображение.");
      setProcessing(false);
    }
  }

  return <div className="cropModalBackdrop" role="dialog" aria-modal="true">
    <div className="cropModal image2CropModal">
      <div className="cropModalHeader"><div><p className="eyebrow blue">IMAGE EDITOR 2.0 • {device.toUpperCase()}</p><h2>Кадрирование {size.width} × {size.height}</h2><p>Перетаскивай изображение внутри рамки. Кадр сохраняется как оптимизированный WebP.</p></div><button type="button" onClick={onCancel} className="cropClose">✕</button></div>
      <div className={`cropStage image2CropStage ${device}`}><Cropper image={source.url} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} showGrid objectFit="cover" /></div>
      <div className="cropControls"><label><span>Масштаб</span><input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>{error && <div className="formError">{error}</div>}<div className="cropButtons"><button type="button" className="cropCancel" onClick={onCancel}>Отмена</button><button type="button" className="cropApply" onClick={confirm} disabled={processing || !pixels}>{processing ? "Создаём WebP…" : "Использовать этот кадр"}</button></div></div>
    </div>
  </div>;
}

function clearFileInput(input: HTMLInputElement | null) {
  if (input) input.value = "";
}
