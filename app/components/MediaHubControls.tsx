"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";

type Filter = "all" | "albums" | "videos";

export default function MediaHubControls({ locale, albumCount, videoCount }: { locale: Locale; albumCount: number; videoCount: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(albumCount + videoCount);
  const t = useMemo(() => locale === "ro" ? {
    all: "Toate", albums: "Albume foto", videos: "Video", search: "Caută în arhiva media…", showing: "Afișate", of: "din", empty: "Nu am găsit materiale pentru această căutare.", archive: "Arhivă media",
  } : {
    all: "Все", albums: "Фотоальбомы", videos: "Видео", search: "Поиск по медиаархиву…", showing: "Показано", of: "из", empty: "По этому запросу материалы не найдены.", archive: "Медиаархив",
  }, [locale]);

  useEffect(() => {
    const normalized = query.trim().toLocaleLowerCase(locale === "ro" ? "ro" : "ru");
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-media-card]"));
    let visible = 0;
    cards.forEach((card) => {
      const kind = card.dataset.mediaKind as "albums" | "videos" | undefined;
      const search = (card.dataset.mediaSearch || "").toLocaleLowerCase(locale === "ro" ? "ro" : "ru");
      const matchesKind = filter === "all" || kind === filter;
      const matchesQuery = !normalized || search.includes(normalized);
      const show = matchesKind && matchesQuery;
      card.hidden = !show;
      if (show) visible += 1;
    });
    document.querySelectorAll<HTMLElement>("[data-media-section]").forEach((section) => {
      const kind = section.dataset.mediaSection as "albums" | "videos" | undefined;
      const sectionCards = Array.from(section.querySelectorAll<HTMLElement>("[data-media-card]"));
      const hasVisible = sectionCards.some((card) => !card.hidden);
      const filterAllows = filter === "all" || filter === kind;
      section.hidden = !(filterAllows && hasVisible);
    });
    setVisibleCount(visible);
  }, [filter, query, locale]);

  const total = albumCount + videoCount;
  return <section className="mediaHubBar" aria-label={t.archive}>
    <div className="mediaHubBarInner">
      <div className="mediaHubSummary">
        <span>{t.archive}</span>
        <strong>{String(total).padStart(2, "0")}</strong>
      </div>
      <div className="mediaHubFilters" role="tablist" aria-label={t.archive}>
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} role="tab" aria-selected={filter === "all"}>{t.all}<small>{total}</small></button>
        <button type="button" className={filter === "albums" ? "active" : ""} onClick={() => setFilter("albums")} role="tab" aria-selected={filter === "albums"}>{t.albums}<small>{albumCount}</small></button>
        <button type="button" className={filter === "videos" ? "active" : ""} onClick={() => setFilter("videos")} role="tab" aria-selected={filter === "videos"}>{t.videos}<small>{videoCount}</small></button>
      </div>
      <label className="mediaHubSearch">
        <span className="srOnly">{t.search}</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} type="search" autoComplete="off" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear">×</button>}
      </label>
      <div className="mediaHubResult" aria-live="polite">
        {visibleCount ? <>{t.showing} <b>{visibleCount}</b> {t.of} {total}</> : <>{t.empty}</>}
      </div>
    </div>
  </section>;
}
