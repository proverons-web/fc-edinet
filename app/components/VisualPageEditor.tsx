"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { saveVisualEditor, type VisualEditorState } from "@/app/admin/design/actions";
import VisualImageField from "@/app/components/VisualImageField";
import HeroLayerPanel from "@/app/components/HeroLayerPanel";
import HomepageBlockLibrary from "@/app/components/HomepageBlockLibrary";
import {
  homepageSectionLabels,
  type HomepageCanvasConfig,
  type HomepageCanvasViewport,
  type HomepageDesignSnapshot,
  type HomepageHero,
  type DesignMediaAsset,
  type HomepageSectionKey,
  type HomepageSectionDesignMap,
  type HomepageCustomBlock,
  type HomepageLayoutItem,
} from "@/lib/types";
import { heroLayerState, heroLayerVisible, homeHeroLayerDefinitions } from "@/lib/hero-builder";
import { homepageSectionCapabilities } from "@/lib/section-builder";

const initialState: VisualEditorState = {};
type ViewMode = "desktop" | "tablet" | "mobile";
type CanvasObject = "text" | "match";

const descriptions: Record<HomepageSectionKey, string> = {
  matches: "Последний и следующий матч",
  standings: "Турнирная таблица",
  news: "Новости клуба",
  players: "Игроки команды",
  media: "Фото и видео",
  partners: "Партнёры клуба",
};

export default function VisualPageEditor({ initial, hero, hasDraft, assets }: { initial: HomepageDesignSnapshot; hero: HomepageHero | null; hasDraft: boolean; assets: DesignMediaAsset[] }) {
  const [state, action, pending] = useActionState(saveVisualEditor, initialState);
  const [mode, setMode] = useState<ViewMode>("desktop");
  const [selected, setSelected] = useState<CanvasObject>("match");
  const [selectedLayer, setSelectedLayer] = useState("match_card");
  const [layerConfig, setLayerConfig] = useState(initial.hero_layer_config);
  const [safeZoneVisible, setSafeZoneVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [desktopImage, setDesktopImage] = useState(initial.background_image_url ?? "");
  const [tabletImage, setTabletImage] = useState(initial.tablet_background_image_url ?? "");
  const [mobileImage, setMobileImage] = useState(initial.mobile_background_image_url ?? "");
  const [clearDesktop, setClearDesktop] = useState(false);
  const [clearTablet, setClearTablet] = useState(false);
  const [clearMobile, setClearMobile] = useState(false);
  const [overlay, setOverlay] = useState(initial.overlay_opacity);
  const [alignment, setAlignment] = useState(initial.text_alignment);
  const [canvas, setCanvas] = useState<HomepageCanvasConfig>(initial.canvas_config);

  const [customBlocks, setCustomBlocks] = useState<HomepageCustomBlock[]>(initial.custom_blocks);
  const [layoutOrder, setLayoutOrder] = useState<HomepageLayoutItem[]>(initial.layout_order);
  const sections = layoutOrder.filter((item): item is `section:${HomepageSectionKey}` => item.startsWith("section:")).map((item) => item.slice(8) as HomepageSectionKey);
  const [visible, setVisible] = useState(initial.section_visibility);
  const [sectionConfig, setSectionConfig] = useState<HomepageSectionDesignMap>(initial.section_config);
  const [selectedSection, setSelectedSection] = useState<HomepageSectionKey>(initial.section_order[0] ?? "news");

  const viewport = canvas[mode];
  const currentImage = mode === "desktop"
    ? (clearDesktop ? "" : desktopImage)
    : mode === "tablet"
      ? (clearTablet ? "" : tabletImage) || (clearDesktop ? "" : desktopImage)
      : (clearMobile ? "" : mobileImage) || (clearTablet ? "" : tabletImage) || (clearDesktop ? "" : desktopImage);
  const backgroundVisible = heroLayerVisible(layerConfig, "background");
  const introVisible = heroLayerVisible(layerConfig, "intro");
  const matchLayerVisible = heroLayerVisible(layerConfig, "match_card");
  const previewHeight = mode === "desktop" ? Math.min(viewport.hero_height, 650) : mode === "tablet" ? Math.min(viewport.hero_height, 680) : Math.min(viewport.hero_height, 760);
  const anyMatchVisible = matchLayerVisible && (canvas.desktop.match_visible || canvas.tablet.match_visible || canvas.mobile.match_visible);
  const activeSectionConfig = sectionConfig[selectedSection];
  const activeSectionCapabilities = homepageSectionCapabilities(selectedSection);
  const activeSectionColumns = mode === "desktop" ? activeSectionConfig.columns_desktop : mode === "tablet" ? activeSectionConfig.columns_tablet : activeSectionConfig.columns_mobile;

  const titleMain = hero?.title_main || "ВМЕСТЕ";
  const titleAccent = hero?.title_accent || "ЗА ЕДИНЕЦ";
  const eyebrow = hero?.eyebrow || "ЕДИНЕЦ • МОЛДОВА";
  const description = hero?.description || "Новости клуба, матчи, состав, история и медиаконтент — в одном официальном пространстве.";

  const safeWarning = useMemo(() => {
    const v = viewport;
    const checks: string[] = [];
    if (introVisible && (v.text_x < v.safe_left || v.text_x > 100 - v.safe_right || v.text_y < v.safe_top || v.text_y > 100 - v.safe_bottom)) checks.push("текст");
    if (matchLayerVisible && v.match_visible && (v.match_x < v.safe_left || v.match_x > 100 - v.safe_right || v.match_y < v.safe_top || v.match_y > 100 - v.safe_bottom)) checks.push("карточка матча");
    return checks;
  }, [viewport, introVisible, matchLayerVisible]);

  function updateViewport(patch: Partial<HomepageCanvasViewport>) {
    setCanvas((current) => ({ ...current, [mode]: { ...current[mode], ...patch } }));
  }

  function updateConfig(patch: Partial<Pick<HomepageCanvasConfig, "snap_enabled" | "lock_safe_zone">>) {
    setCanvas((current) => ({ ...current, ...patch }));
  }

  function dragObject(object: CanvasObject, event: ReactPointerEvent<HTMLElement>) {
    const layerKey = object === "text" ? "intro" : "match_card";
    if (heroLayerState(layerConfig, layerKey).locked || !heroLayerVisible(layerConfig, layerKey)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(object);
    setSelectedLayer(object === "text" ? "intro" : "match_card");

    const move = (pointer: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      let x = ((pointer.clientX - rect.left) / rect.width) * 100;
      let y = ((pointer.clientY - rect.top) / rect.height) * 100;
      const v = canvas[mode];
      const halfWidth = object === "match" ? Math.min(24, (v.match_width / rect.width) * 50) : mode === "mobile" ? 38 : mode === "tablet" ? 34 : 27;
      const minX = canvas.lock_safe_zone ? v.safe_left + halfWidth : halfWidth;
      const maxX = canvas.lock_safe_zone ? 100 - v.safe_right - halfWidth : 100 - halfWidth;
      const minY = canvas.lock_safe_zone ? v.safe_top + 5 : 3;
      const maxY = canvas.lock_safe_zone ? 100 - v.safe_bottom - 5 : 97;
      x = clamp(x, minX, maxX);
      y = clamp(y, minY, maxY);
      if (canvas.snap_enabled) {
        x = snap(x, [50, minX, maxX]);
        y = snap(y, [50, minY, maxY]);
      }
      updateViewport(object === "text" ? { text_x: Math.round(x), text_y: Math.round(y) } : { match_x: Math.round(x), match_y: Math.round(y) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  function nudge(object: CanvasObject, dx: number, dy: number) {
    const v = canvas[mode];
    updateViewport(object === "text"
      ? { text_x: clampInt(v.text_x + dx, 0, 100), text_y: clampInt(v.text_y + dy, 0, 100) }
      : { match_x: clampInt(v.match_x + dx, 0, 100), match_y: clampInt(v.match_y + dy, 0, 100) });
  }

  function alignObject(object: CanvasObject, horizontal: "left" | "center" | "right") {
    const v = canvas[mode];
    const pad = object === "match" ? 18 : mode === "mobile" ? 32 : 24;
    const x = horizontal === "center" ? 50 : horizontal === "left" ? v.safe_left + pad : 100 - v.safe_right - pad;
    updateViewport(object === "text" ? { text_x: x } : { match_x: x });
  }

  function centerSafe(object: CanvasObject) {
    const v = canvas[mode];
    const x = Math.round((v.safe_left + (100 - v.safe_right)) / 2);
    const y = Math.round((v.safe_top + (100 - v.safe_bottom)) / 2);
    updateViewport(object === "text" ? { text_x: x, text_y: y } : { match_x: x, match_y: y });
  }

  function updateSectionConfig(patch: Partial<HomepageSectionDesignMap[HomepageSectionKey]>) {
    setSectionConfig((current) => ({
      ...current,
      [selectedSection]: { ...current[selectedSection], ...patch },
    }));
  }

  return (
    <form action={action} className="visualEditorForm">
      <input type="hidden" name="section_order" value={sections.join(",")} />
      <input type="hidden" name="section_config" value={JSON.stringify(sectionConfig)} />
      <input type="hidden" name="custom_blocks" value={JSON.stringify(customBlocks)} />
      <input type="hidden" name="layout_order" value={JSON.stringify(layoutOrder)} />
      <input type="hidden" name="canvas_config" value={JSON.stringify(canvas)} />
      <input type="hidden" name="hero_layer_config" value={JSON.stringify(layerConfig)} />
      <input type="hidden" name="desktop_position_x" value={canvas.desktop.background_x} />
      <input type="hidden" name="desktop_position_y" value={canvas.desktop.background_y} />
      <input type="hidden" name="desktop_zoom_percent" value={canvas.desktop.background_zoom} />
      <input type="hidden" name="mobile_position_x" value={canvas.mobile.background_x} />
      <input type="hidden" name="mobile_position_y" value={canvas.mobile.background_y} />
      <input type="hidden" name="mobile_zoom_percent" value={canvas.mobile.background_zoom} />
      <input type="hidden" name="hero_height_desktop" value={canvas.desktop.hero_height} />
      <input type="hidden" name="hero_height_mobile" value={canvas.mobile.hero_height} />
      <input type="hidden" name="text_alignment" value={alignment} />
      <input type="hidden" name="show_match_card" value={anyMatchVisible ? "on" : ""} />
      <input type="hidden" name="clear_background_image" value={clearDesktop ? "on" : ""} />
      <input type="hidden" name="clear_tablet_background_image" value={clearTablet ? "on" : ""} />
      <input type="hidden" name="clear_mobile_background_image" value={clearMobile ? "on" : ""} />

      <section className="visualEditorWorkspace canvas2Workspace">
        <div className="visualEditorToolbar">
          <div><p className="eyebrow blue">HERO BUILDER 2.0 • CANVAS 2.0</p><h2>Hero главной</h2><small>{hasDraft ? "Открыт сохранённый черновик." : "Показан опубликованный дизайн."} Выбери слой, разблокируй при необходимости и настрой объект прямо в preview.</small></div>
          <div className="visualViewportTabs" role="tablist" aria-label="Размер предпросмотра">
            {(["desktop", "tablet", "mobile"] as ViewMode[]).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "desktop" ? "Desktop" : item === "tablet" ? "Tablet" : "Mobile"}</button>)}
          </div>
        </div>

        <div className={`visualPreviewStage canvas2Stage ${mode}`}>
          <div ref={stageRef} className="visualHeroPreview canvas2Preview" style={{ height: previewHeight }}>
            {backgroundVisible && currentImage ? <img className={`visualHeroImage heroBuilderSelectable ${selectedLayer === "background" ? "selected" : ""}`} onClick={() => setSelectedLayer("background")} src={currentImage} alt="" style={{ objectPosition: `${viewport.background_x}% ${viewport.background_y}%`, transform: `scale(${viewport.background_zoom / 100})`, transformOrigin: `${viewport.background_x}% ${viewport.background_y}%` }} /> : <div className={`visualHeroFallback heroBuilderSelectable ${selectedLayer === "background" ? "selected" : ""}`} onClick={() => setSelectedLayer("background")} />}
            <div className="visualHeroOverlay" style={{ opacity: overlay / 100 }} />
            {safeZoneVisible && <div className="canvasSafeZone" style={{ top: `${viewport.safe_top}%`, right: `${viewport.safe_right}%`, bottom: `${viewport.safe_bottom}%`, left: `${viewport.safe_left}%` }}><span>SAFE ZONE</span></div>}
            <div className="canvasCenterGuide horizontal"/><div className="canvasCenterGuide vertical"/>

            {introVisible && <div
              className={`canvasObject canvasTextObject heroBuilderSelectable ${selectedLayer === "intro" ? "selected" : ""} ${heroLayerState(layerConfig, "intro").locked ? "locked" : ""} align-${alignment}`}
              style={{ left: `${viewport.text_x}%`, top: `${viewport.text_y}%`, zIndex: heroLayerState(layerConfig, "intro").order }}
              onPointerDown={(event) => dragObject("text", event)}
              onClick={() => { setSelected("text"); setSelectedLayer("intro"); }}
            >
              <span className="canvasObjectLabel">ТЕКСТ</span>
              <div className="visualHeroPreviewText">
                <p className="eyebrow">{eyebrow}</p><h1>{titleMain}<span>{titleAccent}</span></h1><p>{description}</p>
                <div className="visualPreviewButtons"><span>Смотреть матчи</span><span>Последние новости</span></div>
              </div>
            </div>}

            {matchLayerVisible && viewport.match_visible && <div
              className={`canvasObject canvasMatchObject heroBuilderSelectable ${selectedLayer === "match_card" ? "selected" : ""} ${heroLayerState(layerConfig, "match_card").locked ? "locked" : ""}`}
              style={{ left: `${viewport.match_x}%`, top: `${viewport.match_y}%`, width: `${viewport.match_width}px`, maxWidth: "90%", zIndex: heroLayerState(layerConfig, "match_card").order }}
              onPointerDown={(event) => dragObject("match", event)}
              onClick={() => { setSelected("match"); setSelectedLayer("match_card"); }}
            >
              <span className="canvasObjectLabel">СЛЕДУЮЩИЙ МАТЧ</span>
              <div className="visualMatchMock"><small>СЛЕДУЮЩИЙ МАТЧ</small><b>FC EDINEȚ</b><strong>VS</strong><b>СОПЕРНИК</b><span>Дата • Стадион</span></div>
            </div>}
            <div className="heroBuilderSelectedBadge">Выбран: {homeHeroLayerDefinitions.find((layer) => layer.key === selectedLayer)?.label ?? selectedLayer}{heroLayerState(layerConfig, selectedLayer).locked ? " • 🔒" : ""}</div>
          </div>
        </div>

        <div className="canvasStatusBar">
          <label><input type="checkbox" checked={safeZoneVisible} onChange={(e) => setSafeZoneVisible(e.target.checked)} /> Safe Zone</label>
          <label><input type="checkbox" checked={canvas.snap_enabled} onChange={(e) => updateConfig({ snap_enabled: e.target.checked })} /> Snap</label>
          <label><input type="checkbox" checked={canvas.lock_safe_zone} onChange={(e) => updateConfig({ lock_safe_zone: e.target.checked })} /> Не выходить за Safe Zone</label>
          <span className={safeWarning.length ? "canvasWarning bad" : "canvasWarning good"}>{safeWarning.length ? `⚠ За Safe Zone: ${safeWarning.join(", ")}` : "✓ Центры объектов внутри Safe Zone"}</span>
        </div>
      </section>

      <div className="visualEditorColumns canvas2Columns heroBuilderColumns">
        <HeroLayerPanel definitions={homeHeroLayerDefinitions} config={layerConfig} setConfig={setLayerConfig} selected={selectedLayer} setSelected={(key) => { setSelectedLayer(key); if (key === "intro") setSelected("text"); if (key === "match_card") setSelected("match"); }} />
        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">ОБЪЕКТ</p><h2>{selectedLayer === "background" ? "Фон Hero" : selected === "match" ? "Карточка следующего матча" : "Текст Hero"}</h2><p>{selectedLayer === "background" ? "Фон защищён как отдельный слой и редактируется в Image Editor 2.0 ниже." : `Положение настраивается отдельно для ${mode === "desktop" ? "Desktop" : mode === "tablet" ? "Tablet" : "Mobile"}.`}</p></div>
          {selectedLayer === "background" ? <div className="adminNotice">Разблокируй слой «Фон» только если хочешь скрыть его или изменить его положение в порядке слоёв. Crop, Focus и Zoom остаются в Image Editor 2.0.</div> : <>
          <div className={`heroLayerStatus ${heroLayerState(layerConfig, selected === "text" ? "intro" : "match_card").locked ? "locked" : "editable"}`}><strong>{heroLayerState(layerConfig, selected === "text" ? "intro" : "match_card").locked ? "🔒 Объект заблокирован" : "Объект можно перемещать"}</strong><span>{heroLayerState(layerConfig, selected === "text" ? "intro" : "match_card").locked ? "Разблокируй слой выше, чтобы drag & drop и точные настройки снова работали." : "Позиция независима для Desktop / Tablet / Mobile."}</span></div><div className="canvasObjectTabs"><button type="button" className={selected === "text" ? "active" : ""} onClick={() => { setSelected("text"); setSelectedLayer("intro"); }}>Текст Hero</button><button type="button" className={selected === "match" ? "active" : ""} onClick={() => { setSelected("match"); setSelectedLayer("match_card"); }}>Карточка матча</button></div>
          <fieldset className="heroObjectFieldset" disabled={heroLayerState(layerConfig, selected === "text" ? "intro" : "match_card").locked}>
          <div className="canvasPresetButtons"><button type="button" onClick={() => alignObject(selected, "left")}>Слева</button><button type="button" onClick={() => alignObject(selected, "center")}>По центру</button><button type="button" onClick={() => alignObject(selected, "right")}>Справа</button><button type="button" onClick={() => centerSafe(selected)}>Центр Safe Zone</button></div>
          <div className="canvasCoords"><label>X <input type="number" min="0" max="100" value={selected === "text" ? viewport.text_x : viewport.match_x} onChange={(e) => updateViewport(selected === "text" ? { text_x: clampInt(Number(e.target.value),0,100) } : { match_x: clampInt(Number(e.target.value),0,100) })}/><span>%</span></label><label>Y <input type="number" min="0" max="100" value={selected === "text" ? viewport.text_y : viewport.match_y} onChange={(e) => updateViewport(selected === "text" ? { text_y: clampInt(Number(e.target.value),0,100) } : { match_y: clampInt(Number(e.target.value),0,100) })}/><span>%</span></label></div>
          <div className="canvasNudge"><button type="button" onClick={() => nudge(selected,0,-1)}>↑</button><button type="button" onClick={() => nudge(selected,-1,0)}>←</button><button type="button" onClick={() => nudge(selected,1,0)}>→</button><button type="button" onClick={() => nudge(selected,0,1)}>↓</button></div>
          {selected === "match" && <><Range label="Ширина карточки" min={240} max={520} step={10} value={viewport.match_width} setValue={(value) => updateViewport({ match_width: value })} suffix=" px"/><label className="checkRow"><input type="checkbox" checked={viewport.match_visible} onChange={(e) => updateViewport({ match_visible: e.target.checked })}/><span><strong>Показывать на этом устройстве</strong><small>Можно скрыть только на Mobile, не затрагивая Desktop/Tablet.</small></span></label></>}
          {selected === "text" && <div className="fieldGroup"><label>Выравнивание текста</label><select value={alignment} onChange={(e) => setAlignment(e.target.value as "left"|"center"|"right")}><option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option></select></div>}
          </fieldset>
          </>}
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">SAFE ZONE 2.0</p><h2>Безопасные отступы</h2><p>Границы независимы для каждого режима. При включённом Lock drag & drop не даст вынести объект наружу.</p></div>
          <div className="canvasSafeInputs">
            {(["safe_top","safe_right","safe_bottom","safe_left"] as const).map((key) => <label key={key}><span>{{safe_top:"Сверху",safe_right:"Справа",safe_bottom:"Снизу",safe_left:"Слева"}[key]}</span><input type="number" min="0" max="30" value={viewport[key]} onChange={(e) => updateViewport({ [key]: clampInt(Number(e.target.value),0,30) })}/><b>%</b></label>)}
          </div>
        </section>
      </div>

      <div className="visualEditorColumns">
        <section className="clubAdminSection visualControlCard imageEditor2Card">
          <div className="formSectionTitle"><p className="eyebrow blue">IMAGE EDITOR 2.0</p><h2>{mode === "tablet" ? "Tablet кадр" : mode === "mobile" ? "Mobile кадр" : "Desktop кадр"}</h2><p>Загрузи фото, выбери точный crop или используй уже подготовленное изображение из Media Library.</p></div>
          {mode === "desktop" && <VisualImageField device="desktop" fileName="background_image" assetFieldName="background_image_asset_id" currentUrl={clearDesktop ? "" : desktopImage} assets={assets} onPreviewChange={setDesktopImage} onClearChange={setClearDesktop} clear={clearDesktop} onActivate={() => setMode("desktop")} />}
          {mode === "tablet" && <VisualImageField device="tablet" fileName="tablet_background_image" assetFieldName="tablet_background_image_asset_id" currentUrl={clearTablet ? "" : tabletImage} assets={assets} onPreviewChange={setTabletImage} onClearChange={setClearTablet} clear={clearTablet} onActivate={() => setMode("tablet")} />}
          {mode === "mobile" && <VisualImageField device="mobile" fileName="mobile_background_image" assetFieldName="mobile_background_image_asset_id" currentUrl={clearMobile ? "" : mobileImage} assets={assets} onPreviewChange={setMobileImage} onClearChange={setClearMobile} clear={clearMobile} onActivate={() => setMode("mobile")} />}
          <Range label="Фокус по горизонтали" min={0} max={100} value={viewport.background_x} setValue={(value) => updateViewport({ background_x:value })} suffix="%"/>
          <Range label="Фокус по вертикали" min={0} max={100} value={viewport.background_y} setValue={(value) => updateViewport({ background_y:value })} suffix="%"/>
          <Range label="Дополнительный масштаб" min={100} max={300} value={viewport.background_zoom} setValue={(value) => updateViewport({ background_zoom:value })} suffix="%"/>
          <Range label="Высота Hero" min={320} max={950} step={10} value={viewport.hero_height} setValue={(value) => updateViewport({ hero_height:value })} suffix=" px"/>
          <div className="adminNotice">Crop сохраняется как оптимизированный WebP. Focus/Zoom остаются неразрушающими настройками и позволяют чуть подправить уже готовый кадр без повторной загрузки.</div>
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">ВИД</p><h2>Затемнение и быстрые настройки</h2></div>
          <Range label="Затемнение фотографии" name="overlay_opacity" min={0} max={95} value={overlay} setValue={setOverlay} suffix="%"/>
          <div className="canvasDeviceSummary">{(["desktop","tablet","mobile"] as ViewMode[]).map((key)=><button type="button" key={key} className={mode===key?"active":""} onClick={()=>setMode(key)}><strong>{key}</strong><span>Text {canvas[key].text_x}/{canvas[key].text_y}</span><span>Match {canvas[key].match_visible ? `${canvas[key].match_x}/${canvas[key].match_y}` : "off"}</span></button>)}</div>
        </section>
      </div>

      <section className="clubAdminSection visualControlCard sectionBuilderCard">
        <div className="formSectionTitle"><p className="eyebrow blue">SECTION BUILDER</p><h2>Секции главной</h2><p>Перетаскивай блоки, выбирай секцию и настраивай её ширину, фон, отступы, количество карточек и адаптивную сетку.</p></div>
        <div className="sectionBuilderLayout">
          <div className="visualSectionList">{sections.map((key)=><div onClick={()=>setSelectedSection(key)} className={`visualSectionRow ${selectedSection===key?"selected":""}`} key={key}><span className="visualDragHandle">§</span><label onClick={(e)=>e.stopPropagation()}><input type="checkbox" name={`section_${key}_enabled`} checked={visible[key]} onChange={(e)=>setVisible((current)=>({...current,[key]:e.target.checked}))}/><span><strong>{homepageSectionLabels[key]}</strong><small>{descriptions[key]}</small></span></label><small className="sectionOrderHint">Порядок — в Block Library</small></div>)}</div>

          <div className="sectionBuilderInspector">
            <div className="sectionBuilderInspectorHead"><div><span>ВЫБРАНА СЕКЦИЯ</span><h3>{homepageSectionLabels[selectedSection]}</h3></div><b>{visible[selectedSection] ? "Включена" : "Скрыта"}</b></div>
            <div className="sectionBuilderFieldGrid">
              <label><span>Ширина контента</span><select value={activeSectionConfig.width} onChange={(e)=>updateSectionConfig({width:e.target.value as typeof activeSectionConfig.width})}><option value="container">Container</option><option value="wide">Wide</option><option value="full">Full width</option></select></label>
              <label><span>Фон секции</span><select value={activeSectionConfig.background} onChange={(e)=>updateSectionConfig({background:e.target.value as typeof activeSectionConfig.background})}><option value="inherit">По умолчанию</option><option value="light">Светлый</option><option value="dark">Тёмный</option><option value="brand">Клубный синий</option></select></label>
            </div>
            <div className="sectionBuilderRangeGrid">
              <Range label="Отступ сверху" min={0} max={180} step={4} value={activeSectionConfig.padding_top} setValue={(value)=>updateSectionConfig({padding_top:value})} suffix=" px"/>
              <Range label="Отступ снизу" min={0} max={180} step={4} value={activeSectionConfig.padding_bottom} setValue={(value)=>updateSectionConfig({padding_bottom:value})} suffix=" px"/>
            </div>
            {activeSectionCapabilities.itemLimit && <Range label={selectedSection === "standings" ? "Строк таблицы" : "Количество элементов"} min={1} max={selectedSection === "partners" ? 24 : 12} value={activeSectionConfig.item_limit} setValue={(value)=>updateSectionConfig({item_limit:value})} suffix=""/>}
            {activeSectionCapabilities.grid && <div className="sectionBuilderColumns"><label><span>Desktop</span><select value={activeSectionConfig.columns_desktop} onChange={(e)=>updateSectionConfig({columns_desktop:Number(e.target.value)})}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v} кол.</option>)}</select></label><label><span>Tablet</span><select value={activeSectionConfig.columns_tablet} onChange={(e)=>updateSectionConfig({columns_tablet:Number(e.target.value)})}>{[1,2,3,4].map(v=><option key={v} value={v}>{v} кол.</option>)}</select></label><label><span>Mobile</span><select value={activeSectionConfig.columns_mobile} onChange={(e)=>updateSectionConfig({columns_mobile:Number(e.target.value)})}>{[1,2].map(v=><option key={v} value={v}>{v} кол.</option>)}</select></label></div>}
            <div className="sectionBuilderToggles">
              {activeSectionCapabilities.heading && <label className="checkRow"><input type="checkbox" checked={activeSectionConfig.show_heading} onChange={(e)=>updateSectionConfig({show_heading:e.target.checked})}/><span><strong>Показывать заголовок секции</strong><small>Eyebrow и H2 над содержимым блока.</small></span></label>}
              {activeSectionCapabilities.action && <label className="checkRow"><input type="checkbox" checked={activeSectionConfig.show_action} onChange={(e)=>updateSectionConfig({show_action:e.target.checked})}/><span><strong>Показывать ссылку справа</strong><small>Например «Все новости» или «Вся команда».</small></span></label>}
            </div>
            <div className={`sectionBuilderPreview sectionBuilderPreview-${activeSectionConfig.background} sectionBuilderPreview-${activeSectionConfig.width}`} style={{paddingTop:Math.min(activeSectionConfig.padding_top,72),paddingBottom:Math.min(activeSectionConfig.padding_bottom,72)}}>
              {activeSectionConfig.show_heading && activeSectionCapabilities.heading && <div className="sectionBuilderPreviewHeading"><div><span>FC EDINEȚ</span><strong>{homepageSectionLabels[selectedSection]}</strong></div>{activeSectionConfig.show_action && <em>Подробнее →</em>}</div>}
              {selectedSection === "standings" ? <div className="sectionBuilderPreviewTable">{Array.from({length:Math.min(activeSectionConfig.item_limit,6)},(_,i)=><span key={i}><b>{i+1}</b><i>Команда</i><strong>{18-i}</strong></span>)}</div> : <div className="sectionBuilderPreviewGrid" style={{gridTemplateColumns:`repeat(${Math.max(1,activeSectionColumns)},minmax(0,1fr))`}}>{Array.from({length:Math.min(activeSectionConfig.item_limit,8)},(_,i)=><span key={i}><b>{i+1}</b></span>)}</div>}
              <small>Preview: {mode === "desktop" ? "Desktop" : mode === "tablet" ? "Tablet" : "Mobile"} • {activeSectionCapabilities.grid ? `${activeSectionColumns} колонок` : `${activeSectionConfig.item_limit} строк`}</small>
            </div>
          </div>
        </div>
      </section>

      <HomepageBlockLibrary
        blocks={customBlocks}
        setBlocks={setCustomBlocks}
        layoutOrder={layoutOrder}
        setLayoutOrder={setLayoutOrder}
        sectionVisibility={visible}
        assets={assets}
        mode={mode}
      />

      <section className="visualPublishBar"><div><p className="eyebrow blue">ПУБЛИКАЦИЯ</p><h2>Черновик или сразу на сайт</h2><p>Block Library и Section Builder сохраняются в одном черновике: стандартные секции, пользовательские блоки и их общий порядок публикуются только после проверки.</p></div><div className="visualPublishControls"><input name="version_label" placeholder="Название версии, например: Match card safe zone"/><div className="visualPublishButtons"><button className="secondaryAdminButton" type="submit" name="intent" value="draft" disabled={pending}>{pending?"Сохраняем…":"Сохранить черновик"}</button><button className="primaryButton homepageHeroSave" type="submit" name="intent" value="publish" disabled={pending}>{pending?"Публикуем…":"Опубликовать дизайн"}</button></div></div></section>
      {state.error && <div className="formError">{state.error}</div>}{state.success && <div className="formSuccess">{state.success}</div>}
    </form>
  );
}

function Range({ label, name, min, max, step=1, value, setValue, suffix }: { label:string; name?:string; min:number; max:number; step?:number; value:number; setValue:(value:number)=>void; suffix:string }) {
  const id = name || `range-${label.replace(/\s+/g,"-").toLowerCase()}`;
  return <div className="visualRange"><div><label htmlFor={id}>{label}</label><strong>{value}{suffix}</strong></div><input id={id} name={name} type="range" min={min} max={max} step={step} value={value} onChange={(e)=>setValue(Number(e.target.value))}/></div>;
}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function clampInt(value:number,min:number,max:number){return Math.round(clamp(Number.isFinite(value)?value:min,min,max));}
function snap(value:number,targets:number[]){for(const target of targets){if(Math.abs(value-target)<=2.5)return target;}return value;}
