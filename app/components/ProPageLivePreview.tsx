"use client";

import { useEffect, useState } from "react";
import ManagedPageCanvas from "@/app/components/ManagedPageCanvas";
import type { MediaAlbum, MediaVideo, Partner, SitePageDesignSnapshot } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { ProPageKey, ProPageLayoutConfig } from "@/lib/pro-page-builder";

export default function ProPageLivePreview({ pageKey, initialLayout, locale, heroDesign, albums = [], videos = [], partners = [] }: { pageKey: ProPageKey; initialLayout: ProPageLayoutConfig; locale: Locale; heroDesign: SitePageDesignSnapshot; albums?: MediaAlbum[]; videos?: MediaVideo[]; partners?: Partner[] }) {
  const [layout, setLayout] = useState(initialLayout);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; pageKey?: string; layout?: ProPageLayoutConfig };
      if (data?.type === "fc-pro-builder-layout" && data.pageKey === pageKey && data.layout) setLayout(data.layout);
    };
    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ type: "fc-pro-builder-ready", pageKey }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [pageKey]);
  return <ManagedPageCanvas pageKey={pageKey} layout={layout} locale={locale} heroDesign={heroDesign} albums={albums} videos={videos} partners={partners} preview/>;
}
