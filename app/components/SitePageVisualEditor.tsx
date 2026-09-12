"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { saveSitePageVisualEditor, type VisualEditorState } from "@/app/admin/design/actions";
import type { SitePageDesignCatalogItem } from "@/lib/page-design";
import type {
  PageHeroBackgroundMode,
  PageHeroOverlayStyle,
  SitePageDesignKey,
  SitePageDesignSnapshot,
} from "@/lib/types";

const initialState: VisualEditorState = {};

export default function SitePageVisualEditor({
  pageKey,
  item,
  initial,
  hasDraft,
}: {
  pageKey: SitePageDesignKey;
  item: SitePageDesignCatalogItem;
  initial: SitePageDesignSnapshot;
  hasDraft: boolean;
}) {
  const [state, action, pending] = useActionState(saveSitePageVisualEditor, initialState);
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [safeZone, setSafeZone] = useState(true);
  const [backgroundMode, setBackgroundMode] = useState<PageHeroBackgroundMode>(initial.background_mode);

  const [desktopImage, setDesktopImage] = useState(initial.desktop_image_url ?? "");
  const [mobileImage, setMobileImage] = useState(initial.mobile_image_url ?? "");
  const [desktopObjectUrl, setDesktopObjectUrl] = useState<string | null>(null);
  const [mobileObjectUrl, setMobileObjectUrl] = useState<string | null>(null);
  const [clearDesktop, setClearDesktop] = useState(false);
  const [clearMobile, setClearMobile] = useState(false);

  const [desktopX, setDesktopX] = useState(initial.desktop_position_x);
  const [desktopY, setDesktopY] = useState(initial.desktop_position_y);
  const [desktopZoom, setDesktopZoom] = useState(initial.desktop_zoom_percent);
  const [mobileX, setMobileX] = useState(initial.mobile_position_x);
  const [mobileY, setMobileY] = useState(initial.mobile_position_y);
  const [mobileZoom, setMobileZoom] = useState(initial.mobile_zoom_percent);
  const [desktopHeight, setDesktopHeight] = useState(initial.hero_height_desktop);
  const [mobileHeight, setMobileHeight] = useState(initial.hero_height_mobile);
  const [overlay, setOverlay] = useState(initial.overlay_opacity);
  const [overlayStyle, setOverlayStyle] = useState<PageHeroOverlayStyle>(initial.overlay_style);
  const [alignment, setAlignment] = useState(initial.text_alignment);
  const [contentWidth, setContentWidth] = useState(initial.content_width);
  const [showEyebrow, setShowEyebrow] = useState(initial.show_eyebrow);
  const [showDescription, setShowDescription] = useState(initial.show_description);

  const [eyebrowRu, setEyebrowRu] = useState(initial.eyebrow_ru ?? "");
  const [eyebrowRo, setEyebrowRo] = useState(initial.eyebrow_ro ?? "");
  const [titleRu, setTitleRu] = useState(initial.title_ru ?? "");
  const [titleRo, setTitleRo] = useState(initial.title_ro ?? "");
  const [descriptionRu, setDescriptionRu] = useState(initial.description_ru ?? "");
  const [descriptionRo, setDescriptionRo] = useState(initial.description_ro ?? "");

  useEffect(() => () => {
    if (desktopObjectUrl) URL.revokeObjectURL(desktopObjectUrl);
    if (mobileObjectUrl) URL.revokeObjectURL(mobileObjectUrl);
  }, [desktopObjectUrl, mobileObjectUrl]);

  const preview = useMemo(() => mode === "desktop"
    ? { x: desktopX, y: desktopY, zoom: desktopZoom, height: desktopHeight }
    : { x: mobileX, y: mobileY, zoom: mobileZoom, height: mobileHeight },
  [mode, desktopX, desktopY, desktopZoom, desktopHeight, mobileX, mobileY, mobileZoom, mobileHeight]);

  const customDesktop = clearDesktop ? "" : desktopImage;
  const customMobile = clearMobile ? "" : mobileImage;
  const customImage = mode === "mobile" ? customMobile || customDesktop : customDesktop;
  const previewImage = backgroundMode === "custom" ? customImage : "";
  const previewEyebrow = eyebrowRu || item.preview.eyebrow;
  const previewTitle = titleRu || item.preview.title;
  const previewDescription = descriptionRu || item.preview.description;

  return (
    <form action={action} className="visualEditorForm sitewideEditorForm">
      <input type="hidden" name="page_key" value={pageKey} />

      <section className="visualEditorWorkspace">
        <div className="visualEditorToolbar">
          <div>
            <p className="eyebrow blue">LIVE PREVIEW • {item.route}</p>
            <h2>{item.label}</h2>
            <small>{hasDraft ? "Открыт неопубликованный черновик этой страницы." : "Показан опубликованный дизайн страницы."}</small>
          </div>
          <div className="visualViewportTabs" role="tablist" aria-label="Размер предпросмотра">
            <button type="button" className={mode === "desktop" ? "active" : ""} onClick={() => setMode("desktop")}>Desktop</button>
            <button type="button" className={mode === "mobile" ? "active" : ""} onClick={() => setMode("mobile")}>Mobile</button>
          </div>
        </div>

        <div className={`visualPreviewStage ${mode}`}>
          <div
            className={`visualHeroPreview sitePagePreview align-${alignment}`}
            style={{ height: mode === "desktop" ? Math.min(preview.height, 620) : Math.min(preview.height, 720) }}
          >
            {previewImage ? <img className="visualHeroImage" src={previewImage} alt="" style={{ objectPosition: `${preview.x}% ${preview.y}%`, transform: `scale(${preview.zoom / 100})`, transformOrigin: `${preview.x}% ${preview.y}%` }} />
              : <div className={`visualHeroFallback ${backgroundMode === "content" ? "contentMode" : ""}`}>{backgroundMode === "content" && <span>Динамическое фото материала</span>}</div>}
            {backgroundMode !== "default" && <div className={`visualHeroOverlay ${overlayStyle}`} style={{ opacity: overlay / 100 }} />}
            {safeZone && <div className="visualSafeZone"><span>SAFE ZONE</span></div>}
            <div className="sitePagePreviewContent" style={{ maxWidth: `${contentWidth}px` }}>
              {showEyebrow && <p className="eyebrow">{previewEyebrow}</p>}
              <h1>{previewTitle}</h1>
              {showDescription && <p>{previewDescription}</p>}
            </div>
          </div>
        </div>
        <label className="visualSafeToggle"><input type="checkbox" checked={safeZone} onChange={(event) => setSafeZone(event.target.checked)} /><span>Показывать безопасную зону</span></label>
      </section>

      <div className="visualEditorColumns">
        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">ФОН</p><h2>Источник изображения</h2><p>Системный фон сохраняет стандартный дизайн страницы. Custom использует загруженную фотографию.</p></div>
          <div className="fieldGroup">
            <label htmlFor={`${pageKey}_background_mode`}>Режим фона</label>
            <select id={`${pageKey}_background_mode`} name="background_mode" value={backgroundMode} onChange={(e) => setBackgroundMode(e.target.value as PageHeroBackgroundMode)}>
              <option value="default">Системный фон страницы</option>
              <option value="custom">Своё фото</option>
              {item.supportsContentImage && <option value="content">Фото текущего материала</option>}
            </select>
          </div>
          <div className="fieldGroup">
            <label htmlFor={`${pageKey}_desktop_image`}>Фото Desktop</label>
            <input id={`${pageKey}_desktop_image`} name="desktop_image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
              const file = event.target.files?.[0]; if (!file) return;
              if (desktopObjectUrl) URL.revokeObjectURL(desktopObjectUrl);
              const url = URL.createObjectURL(file); setDesktopObjectUrl(url); setDesktopImage(url); setClearDesktop(false); setBackgroundMode("custom");
            }} />
            <small className="fieldHint">JPG, PNG или WEBP, до 8 МБ.</small>
          </div>
          {desktopImage && <label className="checkRow compact"><input type="checkbox" name="clear_desktop_image" checked={clearDesktop} onChange={(e) => setClearDesktop(e.target.checked)} /><span>Удалить Custom Desktop-фото</span></label>}
          <Range label="Фокус X" name="desktop_position_x" min={0} max={100} value={desktopX} setValue={setDesktopX} suffix="%" />
          <Range label="Фокус Y" name="desktop_position_y" min={0} max={100} value={desktopY} setValue={setDesktopY} suffix="%" />
          <Range label="Масштаб" name="desktop_zoom_percent" min={100} max={240} value={desktopZoom} setValue={setDesktopZoom} suffix="%" />
          <Range label="Высота Hero" name="hero_height_desktop" min={200} max={950} step={10} value={desktopHeight} setValue={setDesktopHeight} suffix=" px" />
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">MOBILE</p><h2>Мобильная версия</h2><p>Отдельное вертикальное фото и отдельная точка фокуса.</p></div>
          <div className="fieldGroup">
            <label htmlFor={`${pageKey}_mobile_image`}>Фото Mobile</label>
            <input id={`${pageKey}_mobile_image`} name="mobile_image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
              const file = event.target.files?.[0]; if (!file) return;
              if (mobileObjectUrl) URL.revokeObjectURL(mobileObjectUrl);
              const url = URL.createObjectURL(file); setMobileObjectUrl(url); setMobileImage(url); setClearMobile(false); setBackgroundMode("custom"); setMode("mobile");
            }} />
            <small className="fieldHint">Если не загружать, используется Desktop-фото.</small>
          </div>
          {mobileImage && <label className="checkRow compact"><input type="checkbox" name="clear_mobile_image" checked={clearMobile} onChange={(e) => setClearMobile(e.target.checked)} /><span>Удалить отдельное Mobile-фото</span></label>}
          <Range label="Фокус X" name="mobile_position_x" min={0} max={100} value={mobileX} setValue={setMobileX} suffix="%" />
          <Range label="Фокус Y" name="mobile_position_y" min={0} max={100} value={mobileY} setValue={setMobileY} suffix="%" />
          <Range label="Масштаб" name="mobile_zoom_percent" min={100} max={300} value={mobileZoom} setValue={setMobileZoom} suffix="%" />
          <Range label="Высота Hero" name="hero_height_mobile" min={180} max={900} step={10} value={mobileHeight} setValue={setMobileHeight} suffix=" px" />
        </section>
      </div>

      <div className="visualEditorColumns">
        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">КОМПОЗИЦИЯ</p><h2>Hero и текст</h2></div>
          <Range label="Затемнение фото" name="overlay_opacity" min={0} max={95} value={overlay} setValue={setOverlay} suffix="%" />
          <Range label="Максимальная ширина текста" name="content_width" min={420} max={1200} step={10} value={contentWidth} setValue={setContentWidth} suffix=" px" />
          <div className="fieldGroup"><label htmlFor={`${pageKey}_overlay_style`}>Тип затемнения</label><select id={`${pageKey}_overlay_style`} name="overlay_style" value={overlayStyle} onChange={(e) => setOverlayStyle(e.target.value as PageHeroOverlayStyle)}><option value="solid">Равномерное</option><option value="gradient-left">Сильнее слева</option><option value="gradient-right">Сильнее справа</option></select></div>
          <div className="fieldGroup"><label htmlFor={`${pageKey}_alignment`}>Выравнивание текста</label><select id={`${pageKey}_alignment`} name="text_alignment" value={alignment} onChange={(e) => setAlignment(e.target.value as typeof alignment)}><option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option></select></div>
          <label className="checkRow"><input type="checkbox" name="show_eyebrow" checked={showEyebrow} onChange={(e) => setShowEyebrow(e.target.checked)} /><span><strong>Показывать eyebrow</strong><small>Маленькая строка над заголовком.</small></span></label>
          <label className="checkRow"><input type="checkbox" name="show_description" checked={showDescription} onChange={(e) => setShowDescription(e.target.checked)} /><span><strong>Показывать описание</strong><small>Текст под основным заголовком.</small></span></label>
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">ТЕКСТ</p><h2>{item.editableText ? "Текст страницы" : "Динамический контент"}</h2><p>{item.editableText ? "Пустое поле означает: использовать штатный текст сайта. Можно задать отдельные RU и RO варианты." : "На шаблонах имя игрока, заголовок новости и название альбома берутся из самого материала. Здесь меняется только визуальная подача."}</p></div>
          {item.editableText ? <div className="sitePageTextFields">
            <TextField label="Eyebrow RU" name="eyebrow_ru" value={eyebrowRu} setValue={setEyebrowRu} placeholder={item.preview.eyebrow} />
            <TextField label="Eyebrow RO" name="eyebrow_ro" value={eyebrowRo} setValue={setEyebrowRo} />
            <TextField label="Заголовок RU" name="title_ru" value={titleRu} setValue={setTitleRu} placeholder={item.preview.title} />
            <TextField label="Заголовок RO" name="title_ro" value={titleRo} setValue={setTitleRo} />
            <TextArea label="Описание RU" name="description_ru" value={descriptionRu} setValue={setDescriptionRu} placeholder={item.preview.description} />
            <TextArea label="Описание RO" name="description_ro" value={descriptionRo} setValue={setDescriptionRo} />
          </div> : <div className="visualDynamicHint"><strong>{item.route}</strong><span>Preview использует демонстрационные данные. На сайте будут реальные данные конкретного материала.</span></div>}
        </section>
      </div>

      <section className="visualPublishBar">
        <div><p className="eyebrow blue">ПУБЛИКАЦИЯ</p><h2>Черновик страницы</h2><p>Черновик виден только в админке. Публикация меняет только выбранную страницу/шаблон и создаёт запись в истории.</p></div>
        <div className="visualPublishControls"><input name="version_label" placeholder={`Название версии: ${item.label} сентябрь`} /><div className="visualPublishButtons"><button className="secondaryAdminButton" type="submit" name="intent" value="draft" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить черновик"}</button><button className="primaryButton homepageHeroSave" type="submit" name="intent" value="publish" disabled={pending}>{pending ? "Публикуем…" : "Опубликовать"}</button></div></div>
      </section>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}
    </form>
  );
}

function Range({ label, name, min, max, step = 1, value, setValue, suffix }: { label: string; name: string; min: number; max: number; step?: number; value: number; setValue: (value: number) => void; suffix: string }) {
  return <div className="visualRange"><div><label htmlFor={name}>{label}</label><strong>{value}{suffix}</strong></div><input id={name} name={name} type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} /></div>;
}
function TextField({ label, name, value, setValue, placeholder = "" }: { label: string; name: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return <div className="fieldGroup"><label htmlFor={name}>{label}</label><input id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} /></div>;
}
function TextArea({ label, name, value, setValue, placeholder = "" }: { label: string; name: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return <div className="fieldGroup"><label htmlFor={name}>{label}</label><textarea id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} rows={4} /></div>;
}
