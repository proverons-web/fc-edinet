"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
  HeroLayerConfig,
  HomepageCanvasConfig,
  HomepageCustomBlock,
  HomepageLayoutItem,
  HomepageSectionDesignMap,
  HomepageSectionKey,
} from "@/lib/types";
import { heroLayerState } from "@/lib/hero-builder";

type ViewMode = "desktop" | "tablet" | "mobile";
type PreviewMode = "page" | "hero";
type PreviewZoom = "auto" | 25 | 33 | 50 | 67 | 100;
type CanvasObject = "text" | "match";

const VIRTUAL_VIEWPORTS: Record<ViewMode, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 1366 },
  mobile: { width: 390, height: 844 },
};

export default function HomepageCanvasPreviewFrame({
  mode,
  canvas,
  currentImage,
  backgroundVisible,
  introVisible,
  matchVisible,
  overlay,
  alignment,
  layerConfig,
  safeZoneVisible,
  selectedLayer,
  layoutOrder,
  sectionVisibility,
  sectionConfig,
  customBlocks,
  onSelectLayer,
  onObjectPositionChange,
}: {
  mode: ViewMode;
  canvas: HomepageCanvasConfig;
  currentImage: string;
  backgroundVisible: boolean;
  introVisible: boolean;
  matchVisible: boolean;
  overlay: number;
  alignment: "left" | "center" | "right";
  layerConfig: HeroLayerConfig;
  safeZoneVisible: boolean;
  selectedLayer: string;
  layoutOrder: HomepageLayoutItem[];
  sectionVisibility: Record<HomepageSectionKey, boolean>;
  sectionConfig: HomepageSectionDesignMap;
  customBlocks: HomepageCustomBlock[];
  onSelectLayer: (layer: "background" | "intro" | "match_card") => void;
  onObjectPositionChange: (object: CanvasObject, x: number, y: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const interactionCleanupRef = useRef<(() => void) | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("page");
  const [zoom, setZoom] = useState<PreviewZoom>("auto");
  const [autoScale, setAutoScale] = useState(0.5);
  const [frameVersion, setFrameVersion] = useState(0);

  const device = VIRTUAL_VIEWPORTS[mode];
  const heroVirtualHeight = Math.max(320, canvas[mode].hero_height);
  const virtualHeight = previewMode === "page" ? device.height : heroVirtualHeight;

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const update = () => {
      const availableWidth = Math.max(260, node.clientWidth - 36);
      const fit = availableWidth / device.width;
      setAutoScale(Math.max(0.12, Math.min(1, fit)));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [device.width]);

  const scale = zoom === "auto" ? autoScale : zoom / 100;
  const viewportStyle = useMemo(() => ({
    width: `${Math.round(device.width * scale)}px`,
    height: `${Math.round(virtualHeight * scale)}px`,
    "--canvas-preview-scale": String(scale),
  } as CSSProperties), [device.width, scale, virtualHeight]);

  const applyPreviewState = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;

    const hero = doc.querySelector<HTMLElement>(".canvasPublicHero");
    const content = doc.querySelector<HTMLElement>(".canvasPublicHeroContent");
    if (!hero || !content) return;

    // The iframe renders the real public page. We only override the draft values
    // currently edited in Canvas 2.0, so typography/layout stay identical to production.
    const set = (name: string, value: string | number) => hero.style.setProperty(name, String(value));
    set("--hero-desktop-x", `${canvas.desktop.background_x}%`);
    set("--hero-desktop-y", `${canvas.desktop.background_y}%`);
    set("--hero-desktop-zoom", canvas.desktop.background_zoom / 100);
    set("--hero-tablet-x", `${canvas.tablet.background_x}%`);
    set("--hero-tablet-y", `${canvas.tablet.background_y}%`);
    set("--hero-tablet-zoom", canvas.tablet.background_zoom / 100);
    set("--hero-mobile-x", `${canvas.mobile.background_x}%`);
    set("--hero-mobile-y", `${canvas.mobile.background_y}%`);
    set("--hero-mobile-zoom", canvas.mobile.background_zoom / 100);
    set("--hero-height-desktop", `${canvas.desktop.hero_height}px`);
    set("--hero-height-tablet", `${canvas.tablet.hero_height}px`);
    set("--hero-height-mobile", `${canvas.mobile.hero_height}px`);
    set("--hero-overlay", Math.max(0, Math.min(95, overlay)) / 100);
    set("--hero-text-desktop-x", `${canvas.desktop.text_x}%`);
    set("--hero-text-desktop-y", `${canvas.desktop.text_y}%`);
    set("--hero-text-tablet-x", `${canvas.tablet.text_x}%`);
    set("--hero-text-tablet-y", `${canvas.tablet.text_y}%`);
    set("--hero-text-mobile-x", `${canvas.mobile.text_x}%`);
    set("--hero-text-mobile-y", `${canvas.mobile.text_y}%`);
    set("--hero-match-desktop-x", `${canvas.desktop.match_x}%`);
    set("--hero-match-desktop-y", `${canvas.desktop.match_y}%`);
    set("--hero-match-desktop-width", `${canvas.desktop.match_width}px`);
    set("--hero-match-tablet-x", `${canvas.tablet.match_x}%`);
    set("--hero-match-tablet-y", `${canvas.tablet.match_y}%`);
    set("--hero-match-tablet-width", `${canvas.tablet.match_width}px`);
    set("--hero-match-mobile-x", `${canvas.mobile.match_x}%`);
    set("--hero-match-mobile-y", `${canvas.mobile.match_y}%`);
    set("--hero-match-mobile-width", `${canvas.mobile.match_width}px`);

    hero.classList.remove("heroTextAlign-left", "heroTextAlign-center", "heroTextAlign-right");
    hero.classList.add(`heroTextAlign-${alignment}`);
    hero.classList.remove("heroMatchDesktopOff", "heroMatchTabletOff", "heroMatchMobileOff", "heroWithoutMatch");
    if (!canvas.desktop.match_visible) hero.classList.add("heroMatchDesktopOff");
    if (!canvas.tablet.match_visible) hero.classList.add("heroMatchTabletOff");
    if (!canvas.mobile.match_visible) hero.classList.add("heroMatchMobileOff");
    if (!matchVisible) hero.classList.add("heroWithoutMatch");

    patchBackground(doc, hero, currentImage, backgroundVisible);

    const intro = doc.querySelector<HTMLElement>(".canvasPublicHeroContent .heroIntro");
    const match = doc.querySelector<HTMLElement>(".canvasPublicHeroContent .heroMatchCard");
    if (intro) {
      intro.style.display = introVisible ? "" : "none";
      intro.style.zIndex = String(heroLayerState(layerConfig, "intro").order);
      intro.classList.toggle("visualEditorFrameSelected", selectedLayer === "intro");
      intro.dataset.visualEditorLabel = "ТЕКСТ HERO";
    }
    if (match) {
      const activeMatchVisible = matchVisible && canvas[mode].match_visible;
      match.style.display = activeMatchVisible ? "" : "none";
      match.style.zIndex = String(heroLayerState(layerConfig, "match_card").order);
      match.classList.toggle("visualEditorFrameSelected", selectedLayer === "match_card");
      match.dataset.visualEditorLabel = "СЛЕДУЮЩИЙ МАТЧ";
    }

    ensureEditorStyle(doc);
    patchSafeZone(doc, content, canvas[mode], safeZoneVisible);
    patchPreviewMode(doc, previewMode);
    patchHomepageSections(doc, layoutOrder, sectionVisibility, sectionConfig, customBlocks);
  }, [
    alignment,
    backgroundVisible,
    canvas,
    currentImage,
    customBlocks,
    introVisible,
    layerConfig,
    layoutOrder,
    matchVisible,
    mode,
    overlay,
    previewMode,
    safeZoneVisible,
    sectionConfig,
    sectionVisibility,
    selectedLayer,
  ]);

  useEffect(() => {
    applyPreviewState();
  }, [applyPreviewState, frameVersion]);

  useEffect(() => {
    interactionCleanupRef.current?.();
    interactionCleanupRef.current = null;

    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return;

    const heroContent = doc.querySelector<HTMLElement>(".canvasPublicHeroContent");
    const hero = doc.querySelector<HTMLElement>(".canvasPublicHero");
    const intro = doc.querySelector<HTMLElement>(".canvasPublicHeroContent .heroIntro");
    const match = doc.querySelector<HTMLElement>(".canvasPublicHeroContent .heroMatchCard");
    if (!heroContent || !hero) return;

    const cleanups: Array<() => void> = [];

    const bindObject = (element: HTMLElement | null, object: CanvasObject, layer: "intro" | "match_card") => {
      if (!element) return;
      const onPointerDown = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectLayer(layer);
        if (heroLayerState(layerConfig, layer).locked) return;

        const move = (pointer: PointerEvent) => {
          const rect = heroContent.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = ((pointer.clientX - rect.left) / rect.width) * 100;
          const y = ((pointer.clientY - rect.top) / rect.height) * 100;
          onObjectPositionChange(object, x, y);
        };
        const up = () => {
          win.removeEventListener("pointermove", move);
          win.removeEventListener("pointerup", up);
        };
        win.addEventListener("pointermove", move);
        win.addEventListener("pointerup", up, { once: true });
      };
      element.addEventListener("pointerdown", onPointerDown);
      cleanups.push(() => element.removeEventListener("pointerdown", onPointerDown));
    };

    bindObject(intro, "text", "intro");
    bindObject(match, "match", "match_card");

    const onHeroPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(".heroIntro,.heroMatchCard")) return;
      onSelectLayer("background");
    };
    hero.addEventListener("pointerdown", onHeroPointerDown);
    cleanups.push(() => hero.removeEventListener("pointerdown", onHeroPointerDown));

    const preventNavigation = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest("a,button,form")) event.preventDefault();
    };
    doc.addEventListener("click", preventNavigation, true);
    cleanups.push(() => doc.removeEventListener("click", preventNavigation, true));

    const cleanup = () => cleanups.forEach((cleanup) => cleanup());
    interactionCleanupRef.current = cleanup;
    return cleanup;
  }, [frameVersion, layerConfig, mode, onObjectPositionChange, onSelectLayer, previewMode]);

  return (
    <>
      <div className="canvasPreviewToolbar">
        <div className="canvasPreviewModeTabs" role="tablist" aria-label="Режим предпросмотра">
          <button type="button" className={previewMode === "page" ? "active" : ""} onClick={() => setPreviewMode("page")}>Вся страница</button>
          <button type="button" className={previewMode === "hero" ? "active" : ""} onClick={() => setPreviewMode("hero")}>Только Hero</button>
        </div>
        <div className="canvasPreviewZoom">
          <span>{mode === "desktop" ? "1920×1080" : mode === "tablet" ? "1024×1366" : "390×844"}</span>
          <label>
            Масштаб
            <select value={String(zoom)} onChange={(event) => setZoom(event.target.value === "auto" ? "auto" : Number(event.target.value) as PreviewZoom)}>
              <option value="auto">Auto</option>
              <option value="25">25%</option>
              <option value="33">33%</option>
              <option value="50">50%</option>
              <option value="67">67%</option>
              <option value="100">100%</option>
            </select>
          </label>
        </div>
      </div>

      <div ref={stageRef} className={`visualPreviewStage canvas2Stage canvasFullPreviewStage ${mode} ${previewMode === "page" ? "fullPageMode" : "heroOnlyMode"}`}>
        <div className="canvasVirtualViewport canvasIframeViewport" style={viewportStyle}>
          <iframe
            ref={iframeRef}
            className="canvasSiteIframe"
            title="Предпросмотр главной страницы"
            src="/?visual-editor-preview=1"
            style={{
              width: `${device.width}px`,
              height: `${virtualHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            onLoad={() => setFrameVersion((value) => value + 1)}
          />
        </div>
      </div>
    </>
  );
}

function patchBackground(doc: Document, hero: HTMLElement, currentImage: string, visible: boolean) {
  let media = doc.querySelector<HTMLElement>(".canvasPublicHero .heroVisualMedia");
  if (!media) {
    media = doc.createElement("div");
    media.className = "heroVisualMedia visualEditorInjectedMedia";
    media.setAttribute("aria-hidden", "true");
    media.innerHTML = '<img alt=""/><span class="heroVisualOverlay"></span>';
    hero.prepend(media);
  }

  const image = media.querySelector<HTMLImageElement>("img");
  const sources = media.querySelectorAll<HTMLSourceElement>("source");
  media.style.display = visible && currentImage ? "" : "none";
  if (image && currentImage) image.src = currentImage;
  if (currentImage) sources.forEach((source) => { source.srcset = currentImage; });
}

function ensureEditorStyle(doc: Document) {
  if (doc.getElementById("canvas-live-preview-style")) return;
  const style = doc.createElement("style");
  style.id = "canvas-live-preview-style";
  style.textContent = `
    html.visualEditorIframe,html.visualEditorIframe body{scroll-behavior:auto!important}
    .visualEditorFrameSelected{outline:4px solid #5ea0ff!important;outline-offset:8px!important;box-shadow:0 0 0 4px rgba(15,99,255,.16)!important}
    .visualEditorFrameSelected:after{content:attr(data-visual-editor-label);position:absolute;left:0;top:-34px;padding:6px 9px;border-radius:7px;background:#0f63ff;color:#fff;font:900 11px/1 Arial,sans-serif;letter-spacing:.05em;white-space:nowrap;z-index:9999;pointer-events:none}
    .canvasLiveSafeZone{position:absolute;z-index:9990;border:2px dashed rgba(255,255,255,.76);border-radius:14px;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(15,99,255,.2)}
    .canvasLiveSafeZone span{position:absolute;right:8px;top:8px;padding:5px 7px;border-radius:6px;background:rgba(2,13,27,.68);color:#fff;font:900 10px/1 Arial,sans-serif;letter-spacing:.08em}
    .canvasLiveGuide{position:absolute;z-index:9989;pointer-events:none;background:rgba(255,255,255,.22)}
    .canvasLiveGuide.h{left:0;right:0;top:50%;height:1px}.canvasLiveGuide.v{top:0;bottom:0;left:50%;width:1px}
    .canvasPublicHeroContent .heroIntro,.canvasPublicHeroContent .heroMatchCard{touch-action:none}
    html.visualEditorHeroOnly .topbar,html.visualEditorHeroOnly .header,html.visualEditorHeroOnly .footer{display:none!important}
    html.visualEditorHeroOnly main>.canvasPublicHero~*{display:none!important}
    html.visualEditorHeroOnly .canvasPublicHero{margin:0!important}
  `;
  doc.head.appendChild(style);
  doc.documentElement.classList.add("visualEditorIframe");
}

function patchSafeZone(
  doc: Document,
  content: HTMLElement,
  viewport: HomepageCanvasConfig[ViewMode],
  visible: boolean,
) {
  doc.querySelectorAll(".canvasLiveSafeZone,.canvasLiveGuide").forEach((node) => node.remove());
  if (!visible) return;

  const zone = doc.createElement("div");
  zone.className = "canvasLiveSafeZone";
  zone.style.top = `${viewport.safe_top}%`;
  zone.style.right = `${viewport.safe_right}%`;
  zone.style.bottom = `${viewport.safe_bottom}%`;
  zone.style.left = `${viewport.safe_left}%`;
  zone.innerHTML = "<span>SAFE ZONE</span>";
  content.appendChild(zone);

  const horizontal = doc.createElement("div");
  horizontal.className = "canvasLiveGuide h";
  const vertical = doc.createElement("div");
  vertical.className = "canvasLiveGuide v";
  content.append(horizontal, vertical);
}

function patchPreviewMode(doc: Document, mode: PreviewMode) {
  doc.documentElement.classList.toggle("visualEditorHeroOnly", mode === "hero");
  if (mode === "hero") doc.scrollingElement?.scrollTo({ top: 0, left: 0 });
}

function patchHomepageSections(
  doc: Document,
  layoutOrder: HomepageLayoutItem[],
  visibility: Record<HomepageSectionKey, boolean>,
  sectionConfig: HomepageSectionDesignMap,
  customBlocks: HomepageCustomBlock[],
) {
  const main = doc.querySelector("main");
  if (!main) return;

  const nodes = new Map<string, HTMLElement>();
  doc.querySelectorAll<HTMLElement>("[data-home-layout-item]").forEach((node) => {
    const key = node.dataset.homeLayoutItem;
    if (key) nodes.set(key, node);
  });

  layoutOrder.forEach((item) => {
    const node = nodes.get(item);
    if (node) main.appendChild(node);
  });

  (Object.keys(sectionConfig) as HomepageSectionKey[]).forEach((key) => {
    const node = nodes.get(`section:${key}`);
    if (!node) return;
    const config = sectionConfig[key];
    node.style.display = visibility[key] ? "" : "none";
    node.style.setProperty("--section-pad-top", `${config.padding_top}px`);
    node.style.setProperty("--section-pad-bottom", `${config.padding_bottom}px`);
    node.style.setProperty("--section-cols-desktop", String(config.columns_desktop));
    node.style.setProperty("--section-cols-tablet", String(config.columns_tablet));
    node.style.setProperty("--section-cols-mobile", String(config.columns_mobile));
    [...node.classList].filter((name) => name.startsWith("sectionBg-")).forEach((name) => node.classList.remove(name));
    node.classList.add(`sectionBg-${config.background}`);

    const inner = node.firstElementChild as HTMLElement | null;
    if (inner) {
      inner.classList.remove("container", "sectionBuilderWide", "sectionBuilderFull");
      inner.classList.add(config.width === "container" ? "container" : config.width === "wide" ? "sectionBuilderWide" : "sectionBuilderFull");
    }
  });

  customBlocks.forEach((block) => {
    const node = nodes.get(`block:${block.id}`);
    if (node) node.style.display = block.enabled ? "" : "none";
  });
}
