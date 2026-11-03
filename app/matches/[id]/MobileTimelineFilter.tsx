"use client";

import { useState, type ReactNode } from "react";

type Category = "all" | "goals" | "cards" | "substitutions";

export default function MobileTimelineFilter({ locale, counts, children }: {
  locale: "ru" | "ro";
  counts: { goals: number; cards: number; substitutions: number };
  children: ReactNode;
}) {
  const [category, setCategory] = useState<Category>("all");
  const names = locale === "ro"
    ? { all: "Toate", goals: "Goluri", cards: "Cartonașe", substitutions: "Schimbări" }
    : { all: "Все", goals: "Голы", cards: "Карточки", substitutions: "Замены" };
  const filters: Category[] = ["all", "goals", "cards", "substitutions"];
  const noMatches = category !== "all" && counts[category] === 0;
  return (
    <div className="mobileTimelineFilterWrap" data-filter={category}>
      <div className="mobileTimelineFilters" role="group" aria-label={locale === "ro" ? "Filtrarea evenimentelor" : "Фильтр событий матча"}>
        {filters.map((filter) => (
          <button key={filter} type="button" aria-pressed={category === filter}
            className={category === filter ? "is-active" : ""}
            onClick={() => setCategory(filter)}>
            {names[filter]}{filter !== "all" ? ` · ${counts[filter]}` : ""}
          </button>
        ))}
      </div>
      {noMatches ? <p className="mobileTimelineFilterEmpty" role="status">{locale === "ro" ? "Nu există evenimente de acest tip." : "Событий этого типа нет."}</p> : null}
      {!noMatches ? children : null}
    </div>
  );
}
