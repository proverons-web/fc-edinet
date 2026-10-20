"use client";

import { useEffect } from "react";
import type { PublishingCheck } from "@/lib/publishing";
import type { AutosaveStatus } from "@/app/components/usePublishing2";

export default function Publishing2Bar({
  autosave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  previewHref,
  checks,
  pendingMedia = false,
  preparePreview,
}: {
  autosave: AutosaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  previewHref: string;
  checks: PublishingCheck[];
  pendingMedia?: boolean;
  preparePreview?: () => Promise<unknown>;
}) {
  useEffect(() => {
    const dirty = autosave.state === "dirty" || autosave.state === "saving" || autosave.state === "error";
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
      if (typing || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey && canUndo) { event.preventDefault(); onUndo(); }
      else if ((event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) && canRedo) { event.preventDefault(); onRedo(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("keydown", onKeyDown); };
  }, [autosave.state, canUndo, canRedo, onUndo, onRedo]);

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "fc-site-builder-save-state", state: autosave.state, message: autosave.message, savedAt: autosave.savedAt }, window.location.origin);
  }, [autosave.state, autosave.message, autosave.savedAt]);

  const errors = checks.filter((item) => item.level === "error").length;
  const warnings = checks.filter((item) => item.level === "warning").length;
  async function openPreview() {
    // Open the actual preview immediately. The old about:blank flow could leave
    // the user staring at an empty tab while a server autosave was slow.
    const target = window.open(previewHref, "_blank");
    if (!target) {
      // If the browser blocks the new tab, never leave the user with no feedback:
      // fall back to the same tab and show the preview immediately.
      window.location.assign(previewHref);
      return;
    }
    target.opener = null;

    if (!preparePreview) return;
    try {
      await preparePreview();
      if (target && !target.closed) {
        const separator = previewHref.includes("?") ? "&" : "?";
        target.location.replace(`${previewHref}${separator}refresh=${Date.now()}`);
      }
    } catch {
      // The preview is already open with the latest saved draft. Keep it visible
      // instead of replacing it with a blank/error tab.
    }
  }
  return <section className="publishing2Bar">
    <div className="publishing2Tools">
      <div className={`autosaveBadge ${autosave.state}`}><span className="autosaveDot" />{autosave.message}</div>
      <div className="publishing2Undo">
        <button type="button" onClick={onUndo} disabled={!canUndo} title="Отменить последнее изменение">↶ Undo</button>
        <button type="button" onClick={onRedo} disabled={!canRedo} title="Вернуть отменённое изменение">↷ Redo</button>
      </div>
      <button type="button" className="publishingPreviewButton" onClick={openPreview}>Full Screen Preview ↗</button>
    </div>
    {pendingMedia && <p className="publishingMediaNotice">Новый кадр изображения пока существует только в браузере. Autosave сохраняет остальные настройки, а сам WebP загрузится при «Сохранить черновик» или «Опубликовать».</p>}
    <details className={`publishingChecklist ${errors ? "hasErrors" : warnings ? "hasWarnings" : "allGood"}`}>
      <summary><strong>Preflight</strong><span>{errors ? `${errors} ошибок` : warnings ? `${warnings} предупреждений` : "Готово к публикации"}</span></summary>
      <div className="publishingCheckList">{checks.map((check) => <div className={`publishingCheck ${check.level}`} key={check.key}><b>{check.level === "pass" ? "✓" : check.level === "warning" ? "⚠" : "✕"}</b><span><strong>{check.label}</strong><small>{check.detail}</small></span></div>)}</div>
    </details>
  </section>;
}
