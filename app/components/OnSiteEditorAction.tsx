"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";

type Props = {
  href: string;
  locale: Locale;
  kind?: "edit" | "add" | "protocol";
  label?: string;
  className?: string;
};

/** Editor opens in a same-origin modal; /admin/* actions still check the staff role server-side. */
export default function OnSiteEditorAction({ href, locale, kind = "edit", label, className = "" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const unsavedRef = useRef(false);
  const ro = locale === "ro";
  const verb = kind === "add" ? (ro ? "Adaugă" : "Добавить") : kind === "protocol" ? (ro ? "Protocol" : "Протокол") : (ro ? "Editează" : "Редактировать");
  // Only server-owned internal route paths are accepted. No external iframe URLs.
  const allowed = href.startsWith("/admin/") && !href.startsWith("//") && !/[\\\x00-\x1f]/.test(href);
  const frameUrl = (() => {
    if (!allowed) return null;
    const url = new URL(href, "https://fc-edinet.example");
    if (url.origin !== "https://fc-edinet.example") return null;
    url.searchParams.set("embedded", "1");
    return `${url.pathname}${url.search}${url.hash}`;
  })();

  const close = () => {
    if (unsavedRef.current && !window.confirm(ro ? "Închizi editorul? Modificările nesalvate se vor pierde." : "Закрыть редактор? Несохранённые изменения будут потеряны.")) return;
    unsavedRef.current = false;
    setOpen(false);
    router.refresh();
  };

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),iframe[tabindex]:not([tabindex="-1"]),iframe:not([tabindex])'
        )).filter(element => element.getClientRects().length > 0);
        if (focusable.length) {
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", handleKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  if (!frameUrl) return null;
  const title = label || verb;
  const onFrameLoad = () => {
    try {
      const child = frameRef.current?.contentWindow;
      if (!child || child.location.origin !== window.location.origin || !child.location.pathname.startsWith("/admin/")) return;
      unsavedRef.current = false;
      child.document.addEventListener("input", () => { unsavedRef.current = true; });
      child.document.addEventListener("change", () => { unsavedRef.current = true; });
      // After a successful server action Next may redirect without embedded=1.
      // Preserve the compact editor shell without changing server permissions.
      const next = new URL(child.location.href);
      if (next.searchParams.get("embedded") !== "1") {
        next.searchParams.set("embedded", "1");
        child.location.replace(next.href);
      }
    } catch { /* same-origin navigation can be temporarily unavailable */ }
  };
  return <>
    <button ref={triggerRef} type="button" className={`fcOnSiteAction fcOnSiteAction-${kind} ${className}`} onClick={() => setOpen(true)} aria-label={title} title={title}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {kind === "add" ? <path d="M12 5v14M5 12h14"/> : <><path d="M12 20H5a2 2 0 0 1-2-2v-2"/><path d="m16.3 4.3 3.4 3.4"/><path d="M4 20l4.6-1 11-11a2.4 2.4 0 0 0-3.4-3.4l-11 11L4 20Z"/></>}
      </svg>
      <span>{title}</span>
    </button>
    {open && typeof document !== "undefined" && createPortal(<div className="fcSiteEditorBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={dialogRef} className="fcSiteEditorDialog" role="dialog" aria-modal="true" aria-label={`${title} — FC Edineț`}>
        <header className="fcSiteEditorHeader">
          <div><strong>{title}</strong><small>{ro ? "Editor pe site · FC Edineț" : "Редактор прямо на сайте · FC Edineț"}</small></div>
          <div className="fcSiteEditorHeaderActions">
            <a href={frameUrl} target="_blank" rel="noopener noreferrer">{ro ? "Filă nouă" : "Открыть отдельно"}</a>
            <button ref={closeRef} type="button" onClick={close} aria-label={ro ? "Închide editorul" : "Закрыть редактор"}>×</button>
          </div>
        </header>
        <iframe ref={frameRef} src={frameUrl} onLoad={onFrameLoad} title={`${title} · FC Edineț`} className="fcSiteEditorFrame" />
        <footer className="fcSiteEditorFoot">{ro ? "Salvează modificările în formular, apoi închide editorul." : "Сохрани изменения в форме, затем закрой редактор. Сайт обновится."}</footer>
      </section>
    </div>, document.body)}
  </>;
}
