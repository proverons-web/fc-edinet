"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { saveVisualEditor, type VisualEditorState } from "@/app/admin/design/actions";
import {
  homepageSectionLabels,
  type HomepageCanvasConfig,
  type HomepageCanvasViewport,
  type HomepageDesignSnapshot,
  type HomepageHero,
  type HomepageSectionKey,
} from "@/lib/types";

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

export default function VisualPageEditor({ initial, hero, hasDraft }: { initial: HomepageDesignSnapshot; hero: HomepageHero | null; hasDraft: boolean }) {
  const [state, action, pending] = useActionState(saveVisualEditor, initialState);
  const [mode, setMode] = useState<ViewMode>("desktop");
  const [selected, setSelected] = useState<CanvasObject>("match");
  const [safeZoneVisible, setSafeZoneVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [desktopImage, setDesktopImage] = useState(initial.background_image_url ?? "");
  const [mobileImage, setMobileImage] = useState(initial.mobile_background_image_url ?? "");
  const [desktopObjectUrl, setDesktopObjectUrl] = useState<string | null>(null);
  const [mobileObjectUrl, setMobileObjectUrl] = useState<string | null>(null);
  const [clearDesktop, setClearDesktop] = useState(false);
  const [clearMobile, setClearMobile] = useState(false);
  const [overlay, setOverlay] = useState(initial.overlay_opacity);
  const [alignment, setAlignment] = useState(initial.text_alignment);
  const [canvas, setCanvas] = useState<HomepageCanvasConfig>(initial.canvas_config);

  const [sections, setSections] = useState(initial.section_order);
  const [visible, setVisible] = useState(initial.section_visibility);
  const [draggingSection, setDraggingSection] = useState<HomepageSectionKey | null>(null);

  useEffect(() => () => {
    if (desktopObjectUrl) URL.revokeObjectURL(desktopObjectUrl);
    if (mobileObjectUrl) URL.revokeObjectURL(mobileObjectUrl);
  }, [desktopObjectUrl, mobileObjectUrl]);

  const viewport = canvas[mode];
  const currentImage = mode === "mobile"
    ? (clearMobile ? "" : mobileImage) || (clearDesktop ? "" : desktopImage)
    : (clearDesktop ? "" : desktopImage);
  const previewHeight = mode === "desktop" ? Math.min(viewport.hero_height, 650) : mode === "tablet" ? Math.min(viewport.hero_height, 680) : Math.min(viewport.hero_height, 760);
  const anyMatchVisible = canvas.desktop.match_visible || canvas.tablet.match_visible || canvas.mobile.match_visible;

  const titleMain = hero?.title_main || "ВМЕСТЕ";
  const titleAccent = hero?.title_accent || "ЗА ЕДИНЕЦ";
  const eyebrow = hero?.eyebrow || "ЕДИНЕЦ • МОЛДОВА";
  const description = hero?.description || "Новости клуба, матчи, состав, история и медиаконтент — в одном официальном пространстве.";

  const safeWarning = useMemo(() => {
    const v = viewport;
    const checks: string[] = [];
    if (v.text_x < v.safe_left || v.text_x > 100 - v.safe_right || v.text_y < v.safe_top || v.text_y > 100 - v.safe_bottom) checks.push("текст");
    if (v.match_visible && (v.match_x < v.safe_left || v.match_x > 100 - v.safe_right || v.match_y < v.safe_top || v.match_y > 100 - v.safe_bottom)) checks.push("карточка матча");
    return checks;
  }, [viewport]);

  function updateViewport(patch: Partial<HomepageCanvasViewport>) {
    setCanvas((current) => ({ ...current, [mode]: { ...current[mode], ...patch } }));
  }

  function updateConfig(patch: Partial<Pick<HomepageCanvasConfig, "snap_enabled" | "lock_safe_zone">>) {
    setCanvas((current) => ({ ...current, ...patch }));
  }

  function dragObject(object: CanvasObject, event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(object);

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

  function moveSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    setSections((current) => { const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next; });
  }
  function dropSection(target: HomepageSectionKey) {
    if (!draggingSection || draggingSection === target) return;
    setSections((current) => { const next = current.filter((key) => key !== draggingSection); next.splice(next.indexOf(target), 0, draggingSection); return next; });
    setDraggingSection(null);
  }

  return (
    <form action={action} className="visualEditorForm">
      <input type="hidden" name="section_order" value={sections.join(",")} />
      <input type="hidden" name="canvas_config" value={JSON.stringify(canvas)} />
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

      <section className="visualEditorWorkspace canvas2Workspace">
        <div className="visualEditorToolbar">
          <div><p className="eyebrow blue">CANVAS 2.0</p><h2>Hero главной</h2><small>{hasDraft ? "Открыт сохранённый черновик." : "Показан опубликованный дизайн."} Выдели объект и перетащи его мышкой.</small></div>
          <div className="visualViewportTabs" role="tablist" aria-label="Размер предпросмотра">
            {(["desktop", "tablet", "mobile"] as ViewMode[]).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "desktop" ? "Desktop" : item === "tablet" ? "Tablet" : "Mobile"}</button>)}
          </div>
        </div>

        <div className={`visualPreviewStage canvas2Stage ${mode}`}>
          <div ref={stageRef} className="visualHeroPreview canvas2Preview" style={{ height: previewHeight }}>
            {currentImage ? <img className="visualHeroImage" src={currentImage} alt="" style={{ objectPosition: `${viewport.background_x}% ${viewport.background_y}%`, transform: `scale(${viewport.background_zoom / 100})`, transformOrigin: `${viewport.background_x}% ${viewport.background_y}%` }} /> : <div className="visualHeroFallback" />}
            <div className="visualHeroOverlay" style={{ opacity: overlay / 100 }} />
            {safeZoneVisible && <div className="canvasSafeZone" style={{ top: `${viewport.safe_top}%`, right: `${viewport.safe_right}%`, bottom: `${viewport.safe_bottom}%`, left: `${viewport.safe_left}%` }}><span>SAFE ZONE</span></div>}
            <div className="canvasCenterGuide horizontal"/><div className="canvasCenterGuide vertical"/>

            <div
              className={`canvasObject canvasTextObject ${selected === "text" ? "selected" : ""} align-${alignment}`}
              style={{ left: `${viewport.text_x}%`, top: `${viewport.text_y}%` }}
              onPointerDown={(event) => dragObject("text", event)}
              onClick={() => setSelected("text")}
            >
              <span className="canvasObjectLabel">ТЕКСТ</span>
              <div className="visualHeroPreviewText">
                <p className="eyebrow">{eyebrow}</p><h1>{titleMain}<span>{titleAccent}</span></h1><p>{description}</p>
                <div className="visualPreviewButtons"><span>Смотреть матчи</span><span>Последние новости</span></div>
              </div>
            </div>

            {viewport.match_visible && <div
              className={`canvasObject canvasMatchObject ${selected === "match" ? "selected" : ""}`}
              style={{ left: `${viewport.match_x}%`, top: `${viewport.match_y}%`, width: `${viewport.match_width}px`, maxWidth: "90%" }}
              onPointerDown={(event) => dragObject("match", event)}
              onClick={() => setSelected("match")}
            >
              <span className="canvasObjectLabel">СЛЕДУЮЩИЙ МАТЧ</span>
              <div className="visualMatchMock"><small>СЛЕДУЮЩИЙ МАТЧ</small><b>FC EDINEȚ</b><strong>VS</strong><b>СОПЕРНИК</b><span>Дата • Стадион</span></div>
            </div>}
          </div>
        </div>

        <div className="canvasStatusBar">
          <label><input type="checkbox" checked={safeZoneVisible} onChange={(e) => setSafeZoneVisible(e.target.checked)} /> Safe Zone</label>
          <label><input type="checkbox" checked={canvas.snap_enabled} onChange={(e) => updateConfig({ snap_enabled: e.target.checked })} /> Snap</label>
          <label><input type="checkbox" checked={canvas.lock_safe_zone} onChange={(e) => updateConfig({ lock_safe_zone: e.target.checked })} /> Не выходить за Safe Zone</label>
          <span className={safeWarning.length ? "canvasWarning bad" : "canvasWarning good"}>{safeWarning.length ? `⚠ За Safe Zone: ${safeWarning.join(", ")}` : "✓ Центры объектов внутри Safe Zone"}</span>
        </div>
      </section>

      <div className="visualEditorColumns canvas2Columns">
        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">ОБЪЕКТ</p><h2>{selected === "match" ? "Карточка следующего матча" : "Текст Hero"}</h2><p>Положение настраивается отдельно для {mode === "desktop" ? "Desktop" : mode === "tablet" ? "Tablet" : "Mobile"}.</p></div>
          <div className="canvasObjectTabs"><button type="button" className={selected === "text" ? "active" : ""} onClick={() => setSelected("text")}>Текст Hero</button><button type="button" className={selected === "match" ? "active" : ""} onClick={() => setSelected("match")}>Карточка матча</button></div>
          <div className="canvasPresetButtons"><button type="button" onClick={() => alignObject(selected, "left")}>Слева</button><button type="button" onClick={() => alignObject(selected, "center")}>По центру</button><button type="button" onClick={() => alignObject(selected, "right")}>Справа</button><button type="button" onClick={() => centerSafe(selected)}>Центр Safe Zone</button></div>
          <div className="canvasCoords"><label>X <input type="number" min="0" max="100" value={selected === "text" ? viewport.text_x : viewport.match_x} onChange={(e) => updateViewport(selected === "text" ? { text_x: clampInt(Number(e.target.value),0,100) } : { match_x: clampInt(Number(e.target.value),0,100) })}/><span>%</span></label><label>Y <input type="number" min="0" max="100" value={selected === "text" ? viewport.text_y : viewport.match_y} onChange={(e) => updateViewport(selected === "text" ? { text_y: clampInt(Number(e.target.value),0,100) } : { match_y: clampInt(Number(e.target.value),0,100) })}/><span>%</span></label></div>
          <div className="canvasNudge"><button type="button" onClick={() => nudge(selected,0,-1)}>↑</button><button type="button" onClick={() => nudge(selected,-1,0)}>←</button><button type="button" onClick={() => nudge(selected,1,0)}>→</button><button type="button" onClick={() => nudge(selected,0,1)}>↓</button></div>
          {selected === "match" && <><Range label="Ширина карточки" min={240} max={520} step={10} value={viewport.match_width} setValue={(value) => updateViewport({ match_width: value })} suffix=" px"/><label className="checkRow"><input type="checkbox" checked={viewport.match_visible} onChange={(e) => updateViewport({ match_visible: e.target.checked })}/><span><strong>Показывать на этом устройстве</strong><small>Можно скрыть только на Mobile, не затрагивая Desktop/Tablet.</small></span></label></>}
          {selected === "text" && <div className="fieldGroup"><label>Выравнивание текста</label><select value={alignment} onChange={(e) => setAlignment(e.target.value as "left"|"center"|"right")}><option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option></select></div>}
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">SAFE ZONE 2.0</p><h2>Безопасные отступы</h2><p>Границы независимы для каждого режима. При включённом Lock drag & drop не даст вынести объект наружу.</p></div>
          <div className="canvasSafeInputs">
            {(["safe_top","safe_right","safe_bottom","safe_left"] as const).map((key) => <label key={key}><span>{{safe_top:"Сверху",safe_right:"Справа",safe_bottom:"Снизу",safe_left:"Слева"}[key]}</span><input type="number" min="0" max="30" value={viewport[key]} onChange={(e) => updateViewport({ [key]: clampInt(Number(e.target.value),0,30) })}/><b>%</b></label>)}
          </div>
        </section>
      </div>

      <div className="visualEditorColumns">
        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">ФОН</p><h2>{mode === "tablet" ? "Tablet кадр" : mode === "mobile" ? "Mobile кадр" : "Desktop кадр"}</h2></div>
          {mode === "desktop" && <div className="fieldGroup"><label htmlFor="visual_desktop_image">Фоновое фото</label><input id="visual_desktop_image" name="background_image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file=event.target.files?.[0]; if(!file)return; if(desktopObjectUrl)URL.revokeObjectURL(desktopObjectUrl); const url=URL.createObjectURL(file); setDesktopObjectUrl(url); setDesktopImage(url); setClearDesktop(false); }}/><small className="fieldHint">Рекомендуется 1920×1080 или больше, до 8 МБ.</small></div>}
          {mode === "mobile" && <div className="fieldGroup"><label htmlFor="visual_mobile_image">Отдельное фото Mobile</label><input id="visual_mobile_image" name="mobile_background_image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file=event.target.files?.[0]; if(!file)return; if(mobileObjectUrl)URL.revokeObjectURL(mobileObjectUrl); const url=URL.createObjectURL(file); setMobileObjectUrl(url); setMobileImage(url); setClearMobile(false); }}/><small className="fieldHint">Если не загружать — используется Desktop-фото.</small></div>}
          {mode === "tablet" && <div className="adminNotice">Tablet пока использует Desktop-фото, но имеет собственные focus, zoom и высоту. Отдельные crop-файлы появятся в Image Editor 2.0.</div>}
          <Range label="Фокус по горизонтали" min={0} max={100} value={viewport.background_x} setValue={(value) => updateViewport({ background_x:value })} suffix="%"/>
          <Range label="Фокус по вертикали" min={0} max={100} value={viewport.background_y} setValue={(value) => updateViewport({ background_y:value })} suffix="%"/>
          <Range label="Масштаб" min={100} max={300} value={viewport.background_zoom} setValue={(value) => updateViewport({ background_zoom:value })} suffix="%"/>
          <Range label="Высота Hero" min={320} max={950} step={10} value={viewport.hero_height} setValue={(value) => updateViewport({ hero_height:value })} suffix=" px"/>
          {mode === "desktop" && desktopImage && <label className="checkRow compact"><input type="checkbox" name="clear_background_image" checked={clearDesktop} onChange={(e)=>setClearDesktop(e.target.checked)}/><span>Убрать Desktop-фото</span></label>}
          {mode === "mobile" && mobileImage && <label className="checkRow compact"><input type="checkbox" name="clear_mobile_background_image" checked={clearMobile} onChange={(e)=>setClearMobile(e.target.checked)}/><span>Удалить отдельное Mobile-фото</span></label>}
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle"><p className="eyebrow blue">ВИД</p><h2>Затемнение и быстрые настройки</h2></div>
          <Range label="Затемнение фотографии" name="overlay_opacity" min={0} max={95} value={overlay} setValue={setOverlay} suffix="%"/>
          <div className="canvasDeviceSummary">{(["desktop","tablet","mobile"] as ViewMode[]).map((key)=><button type="button" key={key} className={mode===key?"active":""} onClick={()=>setMode(key)}><strong>{key}</strong><span>Text {canvas[key].text_x}/{canvas[key].text_y}</span><span>Match {canvas[key].match_visible ? `${canvas[key].match_x}/${canvas[key].match_y}` : "off"}</span></button>)}</div>
        </section>
      </div>

      <section className="clubAdminSection visualControlCard">
        <div className="formSectionTitle"><p className="eyebrow blue">СЕКЦИИ</p><h2>Порядок главной</h2><p>Перетаскивай блоки мышкой или используй стрелки.</p></div>
        <div className="visualSectionList">{sections.map((key,index)=><div className={`visualSectionRow ${draggingSection===key?"dragging":""}`} key={key} draggable onDragStart={()=>setDraggingSection(key)} onDragEnd={()=>setDraggingSection(null)} onDragOver={(e)=>e.preventDefault()} onDrop={()=>dropSection(key)}><span className="visualDragHandle">⋮⋮</span><label><input type="checkbox" name={`section_${key}_enabled`} checked={visible[key]} onChange={(e)=>setVisible((current)=>({...current,[key]:e.target.checked}))}/><span><strong>{homepageSectionLabels[key]}</strong><small>{descriptions[key]}</small></span></label><div className="visualSectionButtons"><button type="button" onClick={()=>moveSection(index,-1)} disabled={index===0}>↑</button><button type="button" onClick={()=>moveSection(index,1)} disabled={index===sections.length-1}>↓</button></div></div>)}</div>
      </section>

      <section className="visualPublishBar"><div><p className="eyebrow blue">ПУБЛИКАЦИЯ</p><h2>Черновик или сразу на сайт</h2><p>Canvas 2.0 целиком сохраняется в версии дизайна: все три viewport, Safe Zone, позиции текста и карточки.</p></div><div className="visualPublishControls"><input name="version_label" placeholder="Название версии, например: Match card safe zone"/><div className="visualPublishButtons"><button className="secondaryAdminButton" type="submit" name="intent" value="draft" disabled={pending}>{pending?"Сохраняем…":"Сохранить черновик"}</button><button className="primaryButton homepageHeroSave" type="submit" name="intent" value="publish" disabled={pending}>{pending?"Публикуем…":"Опубликовать дизайн"}</button></div></div></section>
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
