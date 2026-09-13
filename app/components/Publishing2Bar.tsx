"use client";

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
  const errors = checks.filter((item) => item.level === "error").length;
  const warnings = checks.filter((item) => item.level === "warning").length;
  async function openPreview() {
    const target = window.open("about:blank", "_blank");
    try { if (preparePreview) await preparePreview(); } catch { /* Preview still opens with the last saved draft. */ }
    if (target) target.location.href = previewHref;
    else window.open(previewHref, "_blank", "noopener,noreferrer");
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
