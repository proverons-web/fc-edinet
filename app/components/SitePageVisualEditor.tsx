"use client";

import { useActionState, useMemo, useState } from "react";
import { saveSitePageVisualEditor, type VisualEditorState } from "@/app/admin/design/actions";
import VisualImageField, { type VisualImageDevice } from "@/app/components/VisualImageField";
import type { SitePageDesignCatalogItem } from "@/lib/page-design";
import type {
  DesignMediaAsset,
  PageHeroBackgroundMode,
  PageHeroOverlayStyle,
  SitePageDesignKey,
  SitePageDesignSnapshot,
} from "@/lib/types";

const initialState: VisualEditorState = {};
type ViewMode = VisualImageDevice;

export default function SitePageVisualEditor({
  pageKey,
  item,
  initial,
  hasDraft,
  assets,
}: {
  pageKey: SitePageDesignKey;
  item: SitePageDesignCatalogItem;
  initial: SitePageDesignSnapshot;
  hasDraft: boolean;
  assets: DesignMediaAsset[];
}) {
  const [state, action, pending] = useActionState(saveSitePageVisualEditor, initialState);
  const [mode, setMode] = useState<ViewMode>("desktop");
  const [safeZone, setSafeZone] = useState(true);
  const [backgroundMode, setBackgroundMode] = useState<PageHeroBackgroundMode>(initial.background_mode);

  const [desktopImage, setDesktopImage] = useState(initial.desktop_image_url ?? "");
  const [tabletImage, setTabletImage] = useState(initial.tablet_image_url ?? "");
  const [mobileImage, setMobileImage] = useState(initial.mobile_image_url ?? "");
  const [clearDesktop, setClearDesktop] = useState(false);
  const [clearTablet, setClearTablet] = useState(false);
  const [clearMobile, setClearMobile] = useState(false);

  const [desktopX, setDesktopX] = useState(initial.desktop_position_x);
  const [desktopY, setDesktopY] = useState(initial.desktop_position_y);
  const [desktopZoom, setDesktopZoom] = useState(initial.desktop_zoom_percent);
  const [tabletX, setTabletX] = useState(initial.tablet_position_x);
  const [tabletY, setTabletY] = useState(initial.tablet_position_y);
  const [tabletZoom, setTabletZoom] = useState(initial.tablet_zoom_percent);
  const [mobileX, setMobileX] = useState(initial.mobile_position_x);
  const [mobileY, setMobileY] = useState(initial.mobile_position_y);
  const [mobileZoom, setMobileZoom] = useState(initial.mobile_zoom_percent);
  const [desktopHeight, setDesktopHeight] = useState(initial.hero_height_desktop);
  const [tabletHeight, setTabletHeight] = useState(initial.hero_height_tablet);
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

  const preview = useMemo(() => {
    if (mode === "desktop") return { x: desktopX, y: desktopY, zoom: desktopZoom, height: desktopHeight };
    if (mode === "tablet") return { x: tabletX, y: tabletY, zoom: tabletZoom, height: tabletHeight };
    return { x: mobileX, y: mobileY, zoom: mobileZoom, height: mobileHeight };
  }, [mode, desktopX, desktopY, desktopZoom, desktopHeight, tabletX, tabletY, tabletZoom, tabletHeight, mobileX, mobileY, mobileZoom, mobileHeight]);

  const customDesktop = clearDesktop ? "" : desktopImage;
  const customTablet = clearTablet ? "" : tabletImage;
  const customMobile = clearMobile ? "" : mobileImage;
  const customImage = mode === "desktop"
    ? customDesktop
    : mode === "tablet"
      ? customTablet || customDesktop
      : customMobile || customTablet || customDesktop;
  const previewImage = backgroundMode === "custom" ? customImage : "";
  const previewEyebrow = eyebrowRu || item.preview.eyebrow;
  const previewTitle = titleRu || item.preview.title;
  const previewDescription = descriptionRu || item.preview.description;

  function setFocusX(value: number) { mode === "desktop" ? setDesktopX(value) : mode === "tablet" ? setTabletX(value) : setMobileX(value); }
  function setFocusY(value: number) { mode === "desktop" ? setDesktopY(value) : mode === "tablet" ? setTabletY(value) : setMobileY(value); }
  function setZoom(value: number) { mode === "desktop" ? setDesktopZoom(value) : mode === "tablet" ? setTabletZoom(value) : setMobileZoom(value); }
  function setHeight(value: number) { mode === "desktop" ? setDesktopHeight(value) : mode === "tablet" ? setTabletHeight(value) : setMobileHeight(value); }

  return (
    <form action={action} className="visualEditorForm sitewideEditorForm">
      <input type="hidden" name="page_key" value={pageKey} />
      <input type="hidden" name="clear_desktop_image" value={clearDesktop ? "on" : ""} />
      <input type="hidden" name="clear_tablet_image" value={clearTablet ? "on" : ""} />
      <input type="hidden" name="clear_mobile_image" value={clearMobile ? "on" : ""} />
      <input type="hidden" name="desktop_position_x" value={desktopX} /><input type="hidden" name="desktop_position_y" value={desktopY} /><input type="hidden" name="desktop_zoom_percent" value={desktopZoom} /><input type="hidden" name="hero_height_desktop" value={desktopHeight} />
      <input type="hidden" name="tablet_position_x" value={tabletX} /><input type="hidden" name="tablet_position_y" value={tabletY} /><input type="hidden" name="tablet_zoom_percent" value={tabletZoom} /><input type="hidden" name="hero_height_tablet" value={tabletHeight} />
      <input type="hidden" name="mobile_position_x" value={mobileX} /><input type="hidden" name="mobile_position_y" value={mobileY} /><input type="hidden" name="mobile_zoom_percent" value={mobileZoom} /><input type="hidden" name="hero_height_mobile" value={mobileHeight} />

      <section className="visualEditorWorkspace">
        <div className="visualEditorToolbar">
          <div>
            <p className="eyebrow blue">IMAGE EDITOR 2.0 • {item.route}</p>
            <h2>{item.label}</h2>
            <small>{hasDraft ? "Открыт неопубликованный черновик этой страницы." : "Показан опубликованный дизайн страницы."} Каждый viewport теперь имеет независимый кадр.</small>
          </div>
          <div className="visualViewportTabs" role="tablist" aria-label="Размер предпросмотра">
            {(["desktop","tablet","mobile"] as ViewMode[]).map((key) => <button type="button" key={key} className={mode === key ? "active" : ""} onClick={() => setMode(key)}>{key === "desktop" ? "Desktop" : key === "tablet" ? "Tablet" : "Mobile"}</button>)}
          </div>
        </div>

        <div className={`visualPreviewStage ${mode}`}>
          <div className={`visualHeroPreview sitePagePreview align-${alignment}`} style={{ height: Math.min(preview.height, mode === "mobile" ? 720 : 620) }}>
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
        <section className="clubAdminSection visualControlCard imageEditor2Card">
          <div className="formSectionTitle"><p className="eyebrow blue">КАДР • {mode.toUpperCase()}</p><h2>Изображение устройства</h2><p>Можно загрузить новое фото, физически обрезать его в WebP или повторно использовать кадр из Media Library.</p></div>
          <div className="fieldGroup"><label htmlFor={`${pageKey}_background_mode`}>Режим фона</label><select id={`${pageKey}_background_mode`} name="background_mode" value={backgroundMode} onChange={(e) => setBackgroundMode(e.target.value as PageHeroBackgroundMode)}><option value="default">Системный фон страницы</option><option value="custom">Своё фото</option>{item.supportsContentImage && <option value="content">Фото текущего материала</option>}</select></div>
          {mode === "desktop" && <VisualImageField device="desktop" fileName="desktop_image" assetFieldName="desktop_image_asset_id" currentUrl={customDesktop} assets={assets} onPreviewChange={(url) => { setDesktopImage(url); setBackgroundMode("custom"); }} onClearChange={setClearDesktop} clear={clearDesktop} onActivate={() => { setMode("desktop"); setBackgroundMode("custom"); }} />}
          {mode === "tablet" && <VisualImageField device="tablet" fileName="tablet_image" assetFieldName="tablet_image_asset_id" currentUrl={customTablet} assets={assets} onPreviewChange={(url) => { setTabletImage(url); setBackgroundMode("custom"); }} onClearChange={setClearTablet} clear={clearTablet} onActivate={() => { setMode("tablet"); setBackgroundMode("custom"); }} />}
          {mode === "mobile" && <VisualImageField device="mobile" fileName="mobile_image" assetFieldName="mobile_image_asset_id" currentUrl={customMobile} assets={assets} onPreviewChange={(url) => { setMobileImage(url); setBackgroundMode("custom"); }} onClearChange={setClearMobile} clear={clearMobile} onActivate={() => { setMode("mobile"); setBackgroundMode("custom"); }} />}
          <Range label="Фокус X" min={0} max={100} value={preview.x} setValue={setFocusX} suffix="%" />
          <Range label="Фокус Y" min={0} max={100} value={preview.y} setValue={setFocusY} suffix="%" />
          <Range label="Дополнительный масштаб" min={100} max={300} value={preview.zoom} setValue={setZoom} suffix="%" />
          <Range label="Высота Hero" min={180} max={950} step={10} value={preview.height} setValue={setHeight} suffix=" px" />
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">КОМПОЗИЦИЯ</p><h2>Hero и текст</h2><p>Эти параметры общие для страницы, а изображение и кадрирование независимы для Desktop / Tablet / Mobile.</p></div>
          <Range label="Затемнение фото" name="overlay_opacity" min={0} max={95} value={overlay} setValue={setOverlay} suffix="%" />
          <Range label="Максимальная ширина текста" name="content_width" min={420} max={1200} step={10} value={contentWidth} setValue={setContentWidth} suffix=" px" />
          <div className="fieldGroup"><label htmlFor={`${pageKey}_overlay_style`}>Тип затемнения</label><select id={`${pageKey}_overlay_style`} name="overlay_style" value={overlayStyle} onChange={(e) => setOverlayStyle(e.target.value as PageHeroOverlayStyle)}><option value="solid">Равномерное</option><option value="gradient-left">Сильнее слева</option><option value="gradient-right">Сильнее справа</option></select></div>
          <div className="fieldGroup"><label htmlFor={`${pageKey}_alignment`}>Выравнивание текста</label><select id={`${pageKey}_alignment`} name="text_alignment" value={alignment} onChange={(e) => setAlignment(e.target.value as typeof alignment)}><option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option></select></div>
          <label className="checkRow"><input type="checkbox" name="show_eyebrow" checked={showEyebrow} onChange={(e) => setShowEyebrow(e.target.checked)} /><span><strong>Показывать eyebrow</strong><small>Маленькая строка над заголовком.</small></span></label>
          <label className="checkRow"><input type="checkbox" name="show_description" checked={showDescription} onChange={(e) => setShowDescription(e.target.checked)} /><span><strong>Показывать описание</strong><small>Текст под основным заголовком.</small></span></label>
          <div className="canvasDeviceSummary">{(["desktop","tablet","mobile"] as ViewMode[]).map((key) => <button type="button" key={key} className={mode === key ? "active" : ""} onClick={() => setMode(key)}><strong>{key}</strong><span>{key === "desktop" ? `${desktopX}/${desktopY} • ${desktopZoom}%` : key === "tablet" ? `${tabletX}/${tabletY} • ${tabletZoom}%` : `${mobileX}/${mobileY} • ${mobileZoom}%`}</span></button>)}</div>
        </section>
      </div>

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

      <section className="visualPublishBar">
        <div><p className="eyebrow blue">ПУБЛИКАЦИЯ</p><h2>Черновик страницы</h2><p>В версии сохраняются три независимых изображения, focus/zoom каждого устройства и остальные настройки Hero.</p></div>
        <div className="visualPublishControls"><input name="version_label" placeholder={`Название версии: ${item.label} Image Editor`} /><div className="visualPublishButtons"><button className="secondaryAdminButton" type="submit" name="intent" value="draft" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить черновик"}</button><button className="primaryButton homepageHeroSave" type="submit" name="intent" value="publish" disabled={pending}>{pending ? "Публикуем…" : "Опубликовать"}</button></div></div>
      </section>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}
    </form>
  );
}

function Range({ label, name, min, max, step = 1, value, setValue, suffix }: { label: string; name?: string; min: number; max: number; step?: number; value: number; setValue: (value: number) => void; suffix: string }) {
  const id = name || `range-${label.replace(/\s+/g,"-").toLowerCase()}`;
  return <div className="visualRange"><div><label htmlFor={id}>{label}</label><strong>{value}{suffix}</strong></div><input id={id} name={name} type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} /></div>;
}
function TextField({ label, name, value, setValue, placeholder = "" }: { label: string; name: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return <div className="fieldGroup"><label htmlFor={name}>{label}</label><input id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} /></div>;
}
function TextArea({ label, name, value, setValue, placeholder = "" }: { label: string; name: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return <div className="fieldGroup"><label htmlFor={name}>{label}</label><textarea id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} rows={4} /></div>;
}
