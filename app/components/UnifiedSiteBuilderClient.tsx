"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";

type Item = { key: string; label: string; preview: string; design: string; content: string };
type PreviewDevice = "desktop" | "tablet" | "mobile";

type Props = {
  pages: Item[];
  selectedKey: string;
  mode: "design" | "content";
};

const previewDevices: Record<PreviewDevice, { label: string; width: number }> = {
  desktop: { label: "Desktop", width: 1440 },
  tablet: { label: "Tablet", width: 768 },
  mobile: { label: "Mobile", width: 390 },
};

function draftPreview(page: Item) {
  if (page.key === "home") return "/admin/design/preview?page=home&embedded=1";
  if (page.key === "club") return "/admin/page-builder/club/preview?embedded=1";
  if (["media", "partners", "academy"].includes(page.key)) return `/admin/page-builder/${page.key}/preview?embedded=1`;
  if (["news", "team", "matches", "standings"].includes(page.key)) return `/admin/design/preview?page=${page.key}&embedded=1`;
  return page.preview;
}

function PreviewViewport({
  iframeRef,
  title,
  src,
  device,
  zoom,
  fit,
  fullscreen,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  title: string;
  src: string;
  device: PreviewDevice;
  zoom: number;
  fit: boolean;
  fullscreen: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hostWidth, setHostWidth] = useState(0);
  const spec = previewDevices[device];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setHostWidth(host.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [fullscreen]);

  const fitScale = hostWidth ? Math.min(1, Math.max(0.2, (hostWidth - (fullscreen ? 48 : 28)) / spec.width)) : 1;
  const scale = fit ? fitScale : zoom / 100;
  const renderedWidth = Math.max(1, Math.round(spec.width * scale));

  return (
    <div ref={hostRef} className={`unifiedPreviewViewport device-${device}${fullscreen ? " isFullscreen" : ""}`}>
      <div className="unifiedPreviewCanvas" style={{ width: renderedWidth }}>
        <div
          className="unifiedPreviewScale"
          style={{ width: spec.width, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <iframe ref={iframeRef} title={title} src={src} style={{ width: spec.width }} />
        </div>
      </div>
    </div>
  );
}

export default function UnifiedSiteBuilderClient({ pages, selectedKey, mode }: Props) {
  const selected = pages.find((page) => page.key === selectedKey) ?? pages[0];
  const editorUrl = mode === "design" ? selected.design : selected.content;
  const embeddedEditorUrl = `${editorUrl}${editorUrl.includes("?") ? "&" : "?"}embedded=1`;
  const [previewVersion, setPreviewVersion] = useState(0);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [zoom, setZoom] = useState(75);
  const [fit, setFit] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [editorState, setEditorState] = useState<"saved" | "unsaved" | "saving" | "error">("saved");
  const [editorMessage, setEditorMessage] = useState("Все изменения сохранены");
  const editorRef = useRef<HTMLIFrameElement | null>(null);
  const liveRef = useRef<HTMLIFrameElement | null>(null);
  const fullscreenRef = useRef<HTMLIFrameElement | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveBase = useMemo(() => draftPreview(selected), [selected]);
  const liveSrc = `${liveBase}${liveBase.includes("?") ? "&" : "?"}v=${previewVersion}`;

  useEffect(() => {
    setFullscreen(false);
    setFit(true);
    setEditorState("saved");
    setEditorMessage("Все изменения сохранены");
  }, [selected.key, mode]);

  useEffect(() => {
    const frame = editorRef.current;
    if (!frame) return;

    const bindEditorEvents = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        const markDirty = () => { setEditorState("unsaved"); setEditorMessage("Есть несохранённые изменения"); };
        const markSaving = () => { setEditorState("saving"); setEditorMessage("Сохранение…"); };
        doc.addEventListener("input", markDirty, true);
        doc.addEventListener("change", markDirty, true);
        doc.addEventListener("submit", markSaving, true);
        return () => {
          doc.removeEventListener("input", markDirty, true);
          doc.removeEventListener("change", markDirty, true);
          doc.removeEventListener("submit", markSaving, true);
        };
      } catch {
        return;
      }
    };

    let cleanup: (() => void) | undefined;
    const onLoad = () => {
      cleanup?.();
      cleanup = bindEditorEvents();
      setEditorState((state) => state === "saving" ? "saved" : state);
    };
    frame.addEventListener("load", onLoad);
    cleanup = bindEditorEvents();
    return () => { cleanup?.(); frame.removeEventListener("load", onLoad); };
  }, [editorUrl]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (editorState !== "unsaved") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [editorState]);

  useEffect(() => {
    if (mode !== "content") return;
    const interval = window.setInterval(() => setPreviewVersion((value) => value + 1), 2200);
    return () => window.clearInterval(interval);
  }, [mode, selected.key]);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; pageKey?: string; payload?: unknown; layout?: unknown };
      if (!data?.type) return;
      if (data.type === "fc-site-builder-save-state") {
        const rawState = String((data as { state?: string }).state ?? "");
        const mapped = rawState === "dirty" ? "unsaved" : rawState === "saving" ? "saving" : rawState === "error" ? "error" : rawState === "saved" || rawState === "idle" ? "saved" : null;
        if (mapped) setEditorState(mapped);
        const message = (data as { message?: string }).message;
        if (message) setEditorMessage(message);
        return;
      }
      if (data.type === "fc-site-builder-refresh") {
        if (data.pageKey && data.pageKey !== selected.key) return;
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => setPreviewVersion((value) => value + 1), 80);
        return;
      }
      if (data.type === "fc-site-builder-club-layout") {
        const message = { type: "fc-club-builder-layout", ...((data.payload as Record<string, unknown>) ?? {}) };
        liveRef.current?.contentWindow?.postMessage(message, window.location.origin);
        fullscreenRef.current?.contentWindow?.postMessage(message, window.location.origin);
        return;
      }
      if (data.type === "fc-site-builder-pro-layout") {
        const message = { type: "fc-pro-builder-layout", pageKey: data.pageKey, layout: data.layout };
        liveRef.current?.contentWindow?.postMessage(message, window.location.origin);
        fullscreenRef.current?.contentWindow?.postMessage(message, window.location.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [selected.key]);

  const confirmNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (editorState !== "unsaved") return;
    if (!window.confirm("Есть несохранённые изменения. Покинуть страницу и потерять их?")) event.preventDefault();
  };

  const changeZoom = (value: number) => {
    setZoom(Math.min(100, Math.max(25, value)));
    setFit(false);
  };

  return (
    <main className="adminPage unifiedSiteBuilder">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • UNIFIED SITE BUILDER 2.1</p>
            <h1>Редактор всего сайта</h1>
            <p>Редактор и Preview используют существующие page renderers. Переключай устройство, масштаб и Full Screen без выхода из Site Builder.</p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">← Админка</Link>
            <a className="rowAction muted" href={selected.preview} target="_blank" rel="noreferrer">Open Live Page ↗</a>
          </div>
        </div>
      </section>

      <section className="unifiedBuilderSurface">
        <aside className="unifiedBuilderSidebar">
          <strong>СТРАНИЦЫ</strong>
          {pages.map((page) => (
            <Link key={page.key} className={page.key === selected.key ? "active" : ""} href={`/admin/site-builder?page=${page.key}&mode=${mode}`} onClick={confirmNavigation}>
              {page.label}
            </Link>
          ))}
          <hr />
          <strong>ГЛОБАЛЬНО</strong>
          <Link href="/admin/design?page=global_header">Header</Link>
          <Link href="/admin/design?page=global_footer">Footer</Link>
          <Link href="/admin/design?page=global_design_system">Шрифты и цвета</Link>
        </aside>

        <div className="unifiedBuilderMain">
          <div className="unifiedBuilderTop">
            <div><b>{selected.label}</b><span>{selected.preview}</span></div>
            <nav>
              <Link className={mode === "design" ? "active" : ""} href={`/admin/site-builder?page=${selected.key}&mode=design`} onClick={confirmNavigation}>Дизайн</Link>
              <Link className={mode === "content" ? "active" : ""} href={`/admin/site-builder?page=${selected.key}&mode=content`} onClick={confirmNavigation}>Контент</Link>
            </nav>
          </div>

          <div className="unifiedBuilderSaveStrip" aria-live="polite">
            <span className={`builderSaveState ${editorState}`}><i />{editorMessage}</span>
            <small>{editorState === "unsaved" ? "Изменения ещё не сохранены в черновик." : editorState === "saving" ? "Не закрывай редактор до завершения сохранения." : editorState === "error" ? "Сохранение не удалось. Проверь сообщение редактора и повтори попытку." : "История изменений и состояние черновика синхронизируются с текущим редактором."}</small>
          </div>

          <div className="unifiedBuilderToolbar" aria-label="Preview controls">
            <div className="unifiedBuilderDeviceGroup" aria-label="Preview device">
              {(Object.keys(previewDevices) as PreviewDevice[]).map((key) => (
                <button key={key} type="button" className={device === key ? "active" : ""} onClick={() => { setDevice(key); setFit(true); }}>
                  {previewDevices[key].label}
                </button>
              ))}
            </div>
            <div className="unifiedBuilderZoomGroup">
              <button type="button" onClick={() => changeZoom(zoom - 10)} aria-label="Уменьшить масштаб">−</button>
              <button type="button" className={fit ? "active" : ""} onClick={() => setFit(true)}>Fit</button>
              <button type="button" className={!fit ? "active zoomValue" : "zoomValue"} onClick={() => setFit(false)}>{fit ? "AUTO" : `${zoom}%`}</button>
              <button type="button" onClick={() => changeZoom(zoom + 10)} aria-label="Увеличить масштаб">+</button>
            </div>
            <div className="unifiedBuilderToolbarActions">
              <button type="button" onClick={() => setPreviewVersion((value) => value + 1)}>Обновить Preview</button>
              <button type="button" className="primary" onClick={() => { setFullscreen(true); setFit(true); }}>Full Screen Preview</button>
              <a href={selected.preview} target="_blank" rel="noreferrer">Live Page ↗</a>
            </div>
          </div>

          <div className="unifiedBuilderSplit">
            <section>
              <header><span>РЕДАКТОР</span><a href={editorUrl} target="_blank" rel="noreferrer">На весь экран ↗</a></header>
              <iframe ref={editorRef} title={`Редактор ${selected.label}`} src={embeddedEditorUrl} />
            </section>
            <section className="unifiedBuilderPreviewPanel">
              <header>
                <span>PREVIEW • {previewDevices[device].label.toUpperCase()}</span>
                <div className="unifiedLiveStatus"><i />обновляется автоматически</div>
              </header>
              <PreviewViewport iframeRef={liveRef} title={`Preview ${selected.label}`} src={liveSrc} device={device} zoom={zoom} fit={fit} fullscreen={false} />
            </section>
          </div>
        </div>
      </section>

      {fullscreen && (
        <div className="unifiedBuilderFullscreen" role="dialog" aria-modal="true" aria-label={`Full Screen Preview — ${selected.label}`}>
          <div className="unifiedBuilderFullscreenBar">
            <div><strong>{selected.label}</strong><span>{previewDevices[device].label} • {fit ? "Fit" : `${zoom}%`}</span></div>
            <div className="unifiedBuilderDeviceGroup">
              {(Object.keys(previewDevices) as PreviewDevice[]).map((key) => (
                <button key={key} type="button" className={device === key ? "active" : ""} onClick={() => { setDevice(key); setFit(true); }}>{previewDevices[key].label}</button>
              ))}
            </div>
            <div className="unifiedBuilderZoomGroup">
              <button type="button" onClick={() => changeZoom(zoom - 10)}>−</button>
              <button type="button" className={fit ? "active" : ""} onClick={() => setFit(true)}>Fit</button>
              <button type="button" className={!fit ? "active zoomValue" : "zoomValue"} onClick={() => setFit(false)}>{fit ? "AUTO" : `${zoom}%`}</button>
              <button type="button" onClick={() => changeZoom(zoom + 10)}>+</button>
            </div>
            <a href={selected.preview} target="_blank" rel="noreferrer">Live Page ↗</a>
            <button type="button" className="close" onClick={() => setFullscreen(false)}>Закрыть ✕</button>
          </div>
          <PreviewViewport iframeRef={fullscreenRef} title={`Full Screen Preview ${selected.label}`} src={liveSrc} device={device} zoom={zoom} fit={fit} fullscreen />
        </div>
      )}
    </main>
  );
}
