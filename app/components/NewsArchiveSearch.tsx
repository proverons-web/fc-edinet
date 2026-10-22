"use client";

import { useMemo, useState } from "react";
import NewsCard from "@/app/components/NewsCard";
import type { NewsArticle } from "@/lib/types";
import { localized, type Locale } from "@/lib/i18n";

export default function NewsArchiveSearch({ articles, locale }: { articles: NewsArticle[]; locale: Locale }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase(locale === "ro" ? "ro" : "ru");
  const filtered = useMemo(() => {
    if (!normalized) return [];
    return articles.filter((article) => {
      const haystack = [
        localized(article.title, article.title_ro, locale),
        localized(article.excerpt, article.excerpt_ro, locale),
        localized(article.category?.name, article.category?.name_ro, locale),
        article.author_name || "",
      ].join(" ").toLocaleLowerCase(locale === "ro" ? "ro" : "ru");
      return haystack.includes(normalized);
    });
  }, [articles, locale, normalized]);

  const t = locale === "ro"
    ? { placeholder: "Caută în arhiva de știri…", label: "Căutare în știri", found: "Rezultate", empty: "Nu am găsit nicio publicație.", clear: "Șterge căutarea" }
    : { placeholder: "Поиск по архиву новостей…", label: "Поиск по новостям", found: "Результаты", empty: "Публикаций по этому запросу не найдено.", clear: "Очистить поиск" };

  return <>
    <div className="newsArchiveSearchBar">
      <label>
        <span className="srOnly">{t.label}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.placeholder} autoComplete="off" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label={t.clear}>×</button>}
      </label>
      <span aria-live="polite">{normalized ? <>{t.found}: <b>{filtered.length}</b></> : null}</span>
    </div>
    {normalized && <section className="newsLiveSearchResults" aria-label={t.found}>
      {filtered.length > 0 ? <div className="newsDbGrid newsEditorialGrid">{filtered.map((article) => <NewsCard key={article.id} article={article} locale={locale} />)}</div> : <div className="archiveMessage">{t.empty}</div>}
    </section>}
  </>;
}
