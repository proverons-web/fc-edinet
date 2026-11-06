"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HALL_CATEGORIES, HALL_COPY, hallHref, type HallCategory } from "@/lib/hall-of-fame";

type HallLocale = "ru" | "ro";

/** Keeps catalogue filtering accessible without displaying a permanent toolbar. */
export default function HallSearchLauncher({
  locale, category, q,
}: { locale: HallLocale; category: HallCategory; q: string }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copy = HALL_COPY[locale];
  const hasFilters = Boolean(q || category !== "all");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab" && dialogRef.current) {
        const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled)')];
        if (controls.length) {
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      (triggerRef.current ?? previousFocus)?.focus();
    };
  }, [open]);

  return <>
    <button type="button" ref={triggerRef} className={`hallV2SearchTrigger${hasFilters ? " hasFilters" : ""}`}
      onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
      aria-label={locale === "ro" ? "Deschide căutarea și filtrele" : "Открыть поиск и категории"}
      title={locale === "ro" ? "Căutare și filtre" : "Поиск и категории"}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4.8 4.8" /></svg>
      {hasFilters && <span className="hallV2SearchStatus" aria-hidden="true" />}
    </button>
    {open && <div className="hallV2DialogBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" ref={dialogRef} aria-modal="true" aria-labelledby="hall-search-heading" className="hallV2Dialog">
        <div className="hallV2DialogHeading">
          <div><small>FC EDINEȚ · {copy.heading}</small><h2 id="hall-search-heading">{locale === "ro" ? "Căutare în galerie" : "Поиск в Зале славы"}</h2></div>
          <button type="button" className="hallV2DialogClose" aria-label={locale === "ro" ? "Închide" : "Закрыть"} onClick={() => setOpen(false)}>×</button>
        </div>
        <form action="/club/hall-of-fame" method="get" role="search" onSubmit={() => setOpen(false)} className="hallV2DialogForm">
          <label htmlFor="hall-v2-dialog-query">{copy.search}</label>
          <div className="hallV2DialogSearchRow">
            <input id="hall-v2-dialog-query" ref={inputRef} name="q" type="search" maxLength={80}
              defaultValue={q} placeholder={copy.search} />
            {category !== "all" && <input type="hidden" name="category" value={category} />}
            <button type="submit">{copy.searchButton}</button>
          </div>
        </form>
        <div className="hallV2DialogCategories">
          <h3>{locale === "ro" ? "Categorii" : "Категории"}</h3>
          <nav aria-label={locale === "ro" ? "Categorii" : "Категории"}>
            {HALL_CATEGORIES.map((item) => <Link href={hallHref({ category:item, q })}
              onClick={() => setOpen(false)} aria-current={category === item ? "page" : undefined}
              className={category === item ? "isActive" : ""} key={item}>{copy[item]}</Link>)}
          </nav>
        </div>
        {hasFilters && <Link href="/club/hall-of-fame" onClick={() => setOpen(false)} className="hallV2DialogReset">{copy.reset}</Link>}
      </section>
    </div>}
  </>;
}
