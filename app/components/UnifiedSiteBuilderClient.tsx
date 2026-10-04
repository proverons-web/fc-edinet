"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = { key: string; label: string; preview: string; design: string; content: string };

type Props = {
  pages: Item[];
  selectedKey: string;
  mode: "design" | "content";
};

function draftPreview(page: Item) {
  if (page.key === "home") return "/admin/design/preview?page=home&embedded=1";
  if (page.key === "club") return "/admin/page-builder/club/preview?embedded=1";
  if (["media", "partners", "academy"].includes(page.key)) return `/admin/page-builder/${page.key}/preview?embedded=1`;
  if (["news", "team", "matches", "standings"].includes(page.key)) return `/admin/design/preview?page=${page.key}&embedded=1`;
  return page.preview;
}

export default function UnifiedSiteBuilderClient({ pages, selectedKey, mode }: Props) {
  const selected = pages.find((page) => page.key === selectedKey) ?? pages[0];
  const editorUrl = mode === "design" ? selected.design : selected.content;
  const [previewVersion, setPreviewVersion] = useState(0);
  const liveRef = useRef<HTMLIFrameElement | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveBase = useMemo(() => draftPreview(selected), [selected]);
  const liveSrc = `${liveBase}${liveBase.includes("?") ? "&" : "?"}v=${previewVersion}`;

  useEffect(() => {
    if (mode !== "content") return;
    const interval = window.setInterval(() => setPreviewVersion((value) => value + 1), 2200);
    return () => window.clearInterval(interval);
  }, [mode, selected.key]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; pageKey?: string; payload?: unknown; layout?: unknown; breakpoint?: unknown; selected?: unknown };
      if (!data?.type) return;
      if (data.type === "fc-site-builder-refresh") {
        if (data.pageKey && data.pageKey !== selected.key) return;
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => setPreviewVersion((value) => value + 1), 80);
        return;
      }
      if (data.type === "fc-site-builder-club-layout") {
        liveRef.current?.contentWindow?.postMessage({ type: "fc-club-builder-layout", ...(data.payload as Record<string, unknown> ?? {}) }, window.location.origin);
        return;
      }
      if (data.type === "fc-site-builder-pro-layout") {
        liveRef.current?.contentWindow?.postMessage({ type: "fc-pro-builder-layout", pageKey: data.pageKey, layout: data.layout }, window.location.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [selected.key]);

  return <main className="adminPage unifiedSiteBuilder">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">FC EDINEȚ • UNIFIED SITE BUILDER 2.0</p><h1>Редактор всего сайта</h1><p>Дизайн, контент и Live Page находятся в одном месте. Изменения дизайна автоматически отправляются в правое окно без ручного обновления.</p></div><div className="adminHeroActions"><Link href="/admin" className="adminBack">← Админка</Link><a className="rowAction muted" href={selected.preview} target="_blank">Открыть страницу ↗</a></div></div></section>
    <section className="unifiedBuilderSurface"><aside className="unifiedBuilderSidebar"><strong>СТРАНИЦЫ</strong>{pages.map((page) => <Link key={page.key} className={page.key === selected.key ? "active" : ""} href={`/admin/site-builder?page=${page.key}&mode=${mode}`}>{page.label}</Link>)}<hr/><strong>ГЛОБАЛЬНО</strong><Link href="/admin/design?page=global_header">Header</Link><Link href="/admin/design?page=global_footer">Footer</Link><Link href="/admin/design?page=global_design_system">Шрифты и цвета</Link></aside>
      <div className="unifiedBuilderMain"><div className="unifiedBuilderTop"><div><b>{selected.label}</b><span>{selected.preview}</span></div><nav><Link className={mode === "design" ? "active" : ""} href={`/admin/site-builder?page=${selected.key}&mode=design`}>Дизайн</Link><Link className={mode === "content" ? "active" : ""} href={`/admin/site-builder?page=${selected.key}&mode=content`}>Контент</Link></nav></div>
        <div className="unifiedBuilderSplit"><section><header><span>РЕДАКТОР</span><a href={editorUrl} target="_blank">На весь экран ↗</a></header><iframe title={`Редактор ${selected.label}`} src={editorUrl}/></section><section><header><span>LIVE PAGE • REAL TIME</span><div className="unifiedLiveStatus"><i/>обновляется автоматически</div><a href={selected.preview} target="_blank">Открыть ↗</a></header><iframe ref={liveRef} title={`Live ${selected.label}`} src={liveSrc}/></section></div>
      </div></section>
  </main>;
}
