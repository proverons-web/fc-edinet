"use client";

import { useEffect, useState } from "react";

/**
 * Only observes the match-center's existing forms. No automatic saves or data
 * mutations: server actions remain the single source of truth.
 */
export default function MatchCenterWorkflowGuard() {
  const [dirtyCount, setDirtyCount] = useState(0);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".matchCenterPage");
    if (!root) return;
    const forms = Array.from(root.querySelectorAll<HTMLFormElement>("form"));
    const baseline = new Map<HTMLFormElement, string>();
    const dirty = new Set<HTMLFormElement>();
    let submitting: HTMLFormElement | null = null;

    function serialize(form: HTMLFormElement): string {
      // FormData includes input/select/textarea values and checked checkboxes,
      // but deliberately excludes non-submitted disabled controls.
      return JSON.stringify(Array.from(new FormData(form).entries()).map(([key, value]) =>
        [key, typeof value === "string" ? value : `${value.name}:${value.size}`],
      ));
    }

    function publishDirtyState() {
      setDirtyCount(dirty.size);
      for (const form of forms) {
        form.classList.toggle("mc29UnsavedForm", dirty.has(form));
      }
      for (const section of root!.querySelectorAll<HTMLElement>("details.mc26WorkSection")) {
        section.classList.toggle("mc29UnsavedSection", Array.from(dirty).some((form) => section.contains(form)));
      }
    }

    for (const form of forms) baseline.set(form, serialize(form));

    function track(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const form = target.closest<HTMLFormElement>("form");
      if (target.closest("[data-mc-confirmation]")) return;
      if (!form || !baseline.has(form)) return;
      if (serialize(form) === baseline.get(form)) dirty.delete(form);
      else dirty.add(form);
      publishDirtyState();
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty.size || (submitting && dirty.size === 1 && dirty.has(submitting))) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function beforeSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !baseline.has(form)) return;
      const otherUnsavedForms = [...dirty].filter((entry) => entry !== form);
      if (otherUnsavedForms.length > 0 && !window.confirm(
        `В ${otherUnsavedForms.length} других формах есть несохранённые изменения. При сохранении текущей формы они могут потеряться. Продолжить?`,
      )) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      submitting = form;
      // Keep dirty indicators until the new server state arrives. We only
      // suppress beforeunload for the single form currently being saved.
    }

    function onDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      const isSameDocument = destination.origin === current.origin && destination.pathname === current.pathname && destination.search === current.search;
      if (isSameDocument) {
        if (destination.hash && destination.hash !== "#") {
          const section = document.getElementById(decodeURIComponent(destination.hash.substring(1)));
          if (section instanceof HTMLDetailsElement) section.open = true;
          else section?.closest<HTMLDetailsElement>("details")?.setAttribute("open", "");
        }
        return;
      }
      if (dirty.size && !window.confirm("В матч-центре есть несохранённые изменения. Покинуть страницу и потерять их?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    root.addEventListener("input", track);
    root.addEventListener("change", track);
    root.addEventListener("submit", beforeSubmit, true);
    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      root.removeEventListener("input", track);
      root.removeEventListener("change", track);
      root.removeEventListener("submit", beforeSubmit, true);
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, []);

  return dirtyCount > 0 ? (
    <div role="status" aria-live="polite" className="mc29UnsavedNotice">
      <strong>Несохранённые изменения: {dirtyCount} {dirtyCount === 1 ? "форма" : dirtyCount < 5 ? "формы" : "форм"}</strong>
      <span>Сохрани изменённые разделы перед уходом. Несохранённые формы отмечены слева.</span>
    </div>
  ) : null;
}
