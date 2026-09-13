"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  homepageSectionLabels,
  type HomepageCustomBlock,
  type HomepageLayoutItem,
  type HomepageSectionDesignMap,
  type HomepageSectionKey,
} from "@/lib/types";

type ViewMode = "desktop" | "tablet" | "mobile";
type PreviewMode = "page" | "hero";
type PreviewZoom = "auto" | 25 | 33 | 50 | 67 | 100;

const VIRTUAL_VIEWPORTS: Record<ViewMode, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 1366 },
  mobile: { width: 390, height: 844 },
};

const sectionPreviewCount: Record<HomepageSectionKey, number> = {
  matches: 3,
  standings: 6,
  news: 6,
  players: 8,
  media: 6,
  partners: 8,
};

export default function HomepageCanvasPreviewFrame({
  mode,
  layoutOrder,
  sectionVisibility,
  sectionConfig,
  customBlocks,
  children,
}: {
  mode: ViewMode;
  layoutOrder: HomepageLayoutItem[];
  sectionVisibility: Record<HomepageSectionKey, boolean>;
  sectionConfig: HomepageSectionDesignMap;
  customBlocks: HomepageCustomBlock[];
  children: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("page");
  const [zoom, setZoom] = useState<PreviewZoom>("auto");
  const [autoScale, setAutoScale] = useState(0.5);
  const device = VIRTUAL_VIEWPORTS[mode];

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const update = () => {
      const width = Math.max(260, node.clientWidth - 36);
      const fit = width / device.width;
      setAutoScale(Math.max(0.12, Math.min(1, fit)));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [device.width]);

  const scale = zoom === "auto" ? autoScale : zoom / 100;
  const viewportStyle = useMemo(
    () => ({
      width: `${Math.round(device.width * scale)}px`,
      height: `${Math.round(device.height * scale)}px`,
      "--canvas-preview-scale": String(scale),
      "--canvas-virtual-width": `${device.width}px`,
      "--canvas-virtual-height": `${device.height}px`,
    } as CSSProperties),
    [device.height, device.width, scale]
  );

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
        <div className="canvasVirtualViewport" style={viewportStyle}>
          <div
            className={`canvasVirtualDevice ${mode}`}
            style={{
              width: device.width,
              height: device.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="canvasVirtualScroll">
              {previewMode === "page" ? (
                <div className="canvasPreviewSite">
                  <PreviewHeader mode={mode} />
                  {children}
                  <div className="canvasPreviewPageBody">
                    {layoutOrder.map((item) => {
                      if (item.startsWith("section:")) {
                        const key = item.slice(8) as HomepageSectionKey;
                        if (!sectionVisibility[key]) return null;
                        return <SectionPreview key={item} mode={mode} sectionKey={key} config={sectionConfig[key]} />;
                      }

                      const blockId = item.slice(6);
                      const block = customBlocks.find((entry) => entry.id === blockId);
                      if (!block?.enabled) return null;
                      return <BlockPreview key={item} mode={mode} block={block} />;
                    })}
                  </div>
                  <PreviewFooter />
                </div>
              ) : (
                <div className="canvasHeroOnlySurface">{children}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PreviewHeader({ mode }: { mode: ViewMode }) {
  return (
    <header className={`canvasPreviewHeader ${mode}`}>
      <div className="canvasPreviewTopbar"><span>FC EDINEȚ • MOLDOVA</span><span>RU / RO</span></div>
      <div className="canvasPreviewNav">
        <div className="canvasPreviewBrand"><span>FCE</span><strong>FC EDINEȚ</strong></div>
        <nav>{mode === "mobile" ? <b>☰</b> : <><span>Новости</span><span>Матчи</span><span>Команда</span><span>Клуб</span><span>Медиа</span></>}</nav>
      </div>
    </header>
  );
}

function PreviewFooter() {
  return (
    <footer className="canvasPreviewFooter">
      <div><strong>FC EDINEȚ</strong><span>Официальный сайт футбольного клуба</span></div>
      <div><b>Клуб</b><span>О клубе</span><span>История</span><span>Контакты</span></div>
      <div><b>Команда</b><span>Игроки</span><span>Матчи</span><span>Таблица</span></div>
      <div><b>Медиа</b><span>Новости</span><span>Фото и видео</span></div>
    </footer>
  );
}

function SectionPreview({
  mode,
  sectionKey,
  config,
}: {
  mode: ViewMode;
  sectionKey: HomepageSectionKey;
  config: HomepageSectionDesignMap[HomepageSectionKey];
}) {
  const columns = mode === "desktop" ? config.columns_desktop : mode === "tablet" ? config.columns_tablet : config.columns_mobile;
  const count = Math.min(config.item_limit, sectionPreviewCount[sectionKey]);
  const dark = config.background === "dark" || config.background === "brand";
  const widthClass = config.width === "container" ? "containerWidth" : config.width === "wide" ? "wideWidth" : "fullWidth";

  return (
    <section
      className={`canvasPageSection canvasPageSection-${config.background} ${dark ? "dark" : ""}`}
      style={{ paddingTop: config.padding_top, paddingBottom: config.padding_bottom }}
    >
      <div className={`canvasPageSectionInner ${widthClass}`}>
        {(config.show_heading || config.show_action) && (
          <div className="canvasPageSectionHeading">
            {config.show_heading && <div><span>FC EDINEȚ</span><h2>{homepageSectionLabels[sectionKey]}</h2></div>}
            {config.show_action && <b>Подробнее →</b>}
          </div>
        )}
        {sectionKey === "standings" ? (
          <div className="canvasStandingsPreview">
            {Array.from({ length: count }, (_, index) => <div key={index}><b>{index + 1}</b><span>Команда {index + 1}</span><strong>{24 - index}</strong></div>)}
          </div>
        ) : (
          <div className="canvasPageCards" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0,1fr))` }}>
            {Array.from({ length: Math.max(1, count) }, (_, index) => <PreviewCard key={index} sectionKey={sectionKey} index={index} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function PreviewCard({ sectionKey, index }: { sectionKey: HomepageSectionKey; index: number }) {
  if (sectionKey === "partners") return <div className="canvasPartnerPreview"><span>LOGO</span></div>;
  if (sectionKey === "matches") return <div className="canvasMatchStripPreview"><small>{index === 0 ? "ПОСЛЕДНИЙ МАТЧ" : index === 1 ? "СЛЕДУЮЩИЙ МАТЧ" : "ТУРНИР"}</small><strong>FC EDINEȚ</strong><span>{index === 0 ? "2 — 1" : "VS"}</span></div>;
  return <article className={`canvasContentCard canvasContentCard-${sectionKey}`}><div className="canvasContentMedia"/><small>FC EDINEȚ</small><strong>{sectionKey === "players" ? `Игрок ${index + 1}` : sectionKey === "media" ? `Медиа ${index + 1}` : `Новость ${index + 1}`}</strong><span>Краткий текст для оценки сетки и вертикального ритма.</span></article>;
}

function BlockPreview({ mode, block }: { mode: ViewMode; block: HomepageCustomBlock }) {
  const design = block.design;
  const columns = mode === "desktop" ? design.columns_desktop : mode === "tablet" ? design.columns_tablet : design.columns_mobile;
  const title = block.content.title_ru || block.content.title_ro || `Блок: ${block.type}`;
  const text = block.content.text_ru || block.content.text_ro;
  const widthClass = design.width === "container" ? "containerWidth" : design.width === "wide" ? "wideWidth" : "fullWidth";
  const dark = design.background === "dark" || design.background === "brand";

  return (
    <section
      className={`canvasPageSection canvasPageSection-${design.background} ${dark ? "dark" : ""}`}
      style={{ paddingTop: design.padding_top, paddingBottom: design.padding_bottom, textAlign: design.text_align }}
    >
      <div className={`canvasPageSectionInner ${widthClass}`}>
        <div className="canvasCustomBlockPreview">
          <small>{block.type.toUpperCase()}</small>
          <h2>{title}</h2>
          {text && <p>{text}</p>}
          {block.content.image_url && <img src={block.content.image_url} alt="" />}
          {["news", "players", "media", "partners", "standings"].includes(block.type) && (
            <div className="canvasPageCards" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0,1fr))` }}>
              {Array.from({ length: Math.min(design.item_limit, 6) }, (_, index) => <div className="canvasGenericSkeleton" key={index}><span>{index + 1}</span></div>)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
