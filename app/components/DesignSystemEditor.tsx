"use client";

import { useActionState, useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { autosaveGlobalDesign, saveGlobalDesign } from "@/app/admin/design/global-actions";
import Publishing2Bar from "@/app/components/Publishing2Bar";
import { useDraftAutosave, useEditorHistory } from "@/app/components/usePublishing2";
import { globalPublishingChecks } from "@/lib/publishing";
import { fontStack, shadowValue, type DesignSystemConfig, type SiteFontPreset, type SiteShadowPreset } from "@/lib/design-system";

const initialState: { success?: string; error?: string } = {};

export default function DesignSystemEditor({ initial }: { initial: DesignSystemConfig }) {
  const [state, action, pending] = useActionState(saveGlobalDesign, initialState);
  const [config, setConfig] = useState(initial);
  const update = (patch: Partial<DesignSystemConfig>) => setConfig((current) => ({ ...current, ...patch }));
  const history = useEditorHistory(config, (value) => setConfig(value));
  const autosaveAction = useCallback((value: DesignSystemConfig) => autosaveGlobalDesign("design_system", value), []);
  const autosave = useDraftAutosave(config, autosaveAction);
  const checks = useMemo(() => globalPublishingChecks("design_system", config), [config]);
  const hasBlockingChecks = checks.some((check) => check.level === "error");

  const previewStyle = {
    "--preview-primary": config.primary,
    "--preview-navy": config.navy,
    "--preview-accent": config.accent,
    "--preview-text": config.text,
    "--preview-muted": config.muted,
    "--preview-surface": config.surface,
    "--preview-line": config.line,
    "--preview-body-font": fontStack(config.font_body),
    "--preview-heading-font": fontStack(config.font_heading),
    "--preview-radius-sm": `${config.radius_small}px`,
    "--preview-radius-md": `${config.radius_medium}px`,
    "--preview-radius-lg": `${config.radius_large}px`,
    "--preview-shadow": shadowValue(config.card_shadow),
    "--preview-button-height": `${config.button_height}px`,
  } as CSSProperties;

  return (
    <form action={action} className="designSystemForm">
      <input type="hidden" name="component_key" value="design_system" />
      <input type="hidden" name="config_json" value={JSON.stringify(config)} />
      <Publishing2Bar autosave={autosave} canUndo={history.canUndo} canRedo={history.canRedo} onUndo={history.undo} onRedo={history.redo} previewHref="/admin/design/preview?page=global_design_system" checks={checks} preparePreview={() => autosaveAction(config)} />

      <div className="globalBuilderToolbar">
        <div><strong>Design Tokens</strong><span className="designSystemHint">Все значения применяются ко всему сайту после публикации.</span></div>
        <div className="globalBuilderActions">
          <input name="version_label" placeholder="Комментарий к версии" />
          <button type="submit" name="intent" value="draft" className="rowAction" disabled={pending}>Сохранить черновик</button>
          <button type="submit" name="intent" value="publish" className="primaryButton" disabled={pending || hasBlockingChecks} title={hasBlockingChecks ? "Исправь ошибки Preflight перед публикацией" : undefined}>Опубликовать</button>
        </div>
      </div>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}

      <div className="designSystemGrid">
        <div className="designSystemControls">
          <TokenSection title="Цвета бренда">
            <Color label="Primary / клубный синий" value={config.primary} onChange={(primary) => update({ primary })} />
            <Color label="Navy / основной тёмный" value={config.navy} onChange={(navy) => update({ navy })} />
            <Color label="Navy 2 / дополнительный" value={config.navy_alt} onChange={(navy_alt) => update({ navy_alt })} />
            <Color label="Accent / акцент" value={config.accent} onChange={(accent) => update({ accent })} />
          </TokenSection>

          <TokenSection title="Нейтральные цвета">
            <Color label="Основной текст" value={config.text} onChange={(text) => update({ text })} />
            <Color label="Вторичный текст" value={config.muted} onChange={(muted) => update({ muted })} />
            <Color label="Surface" value={config.surface} onChange={(surface) => update({ surface })} />
            <Color label="Линии / Borders" value={config.line} onChange={(line) => update({ line })} />
            <Color label="Белый" value={config.white} onChange={(white) => update({ white })} />
          </TokenSection>

          <TokenSection title="Типографика">
            <Select label="Основной шрифт" value={config.font_body} onChange={(value) => update({ font_body: value as SiteFontPreset })} options={fontOptions} />
            <Select label="Шрифт заголовков" value={config.font_heading} onChange={(value) => update({ font_heading: value as SiteFontPreset })} options={fontOptions} />
            <Range label={`Базовый размер — ${config.body_size}px`} min={14} max={20} value={config.body_size} onChange={(body_size) => update({ body_size })} />
            <Range label={`Line-height — ${config.body_line_height.toFixed(1)}`} min={13} max={20} value={Math.round(config.body_line_height * 10)} onChange={(value) => update({ body_line_height: value / 10 })} />
            <Range label={`Вес заголовков — ${config.heading_weight}`} min={600} max={950} step={50} value={config.heading_weight} onChange={(heading_weight) => update({ heading_weight })} />
            <Range label={`Letter spacing — ${(config.heading_letter_spacing / 100).toFixed(2)}em`} min={-6} max={2} value={config.heading_letter_spacing} onChange={(heading_letter_spacing) => update({ heading_letter_spacing })} />
            <Range label={`H1 масштаб — ${config.h1_scale}%`} min={80} max={125} value={config.h1_scale} onChange={(h1_scale) => update({ h1_scale })} />
            <Range label={`H2 масштаб — ${config.h2_scale}%`} min={80} max={125} value={config.h2_scale} onChange={(h2_scale) => update({ h2_scale })} />
            <Range label={`H3 масштаб — ${config.h3_scale}%`} min={80} max={125} value={config.h3_scale} onChange={(h3_scale) => update({ h3_scale })} />
          </TokenSection>

          <TokenSection title="Контейнер и геометрия">
            <Range label={`Максимальная ширина — ${config.container_max}px`} min={960} max={1600} step={20} value={config.container_max} onChange={(container_max) => update({ container_max })} />
            <Range label={`Gutter Desktop — ${config.page_gutter_desktop}px`} min={20} max={96} step={2} value={config.page_gutter_desktop} onChange={(page_gutter_desktop) => update({ page_gutter_desktop })} />
            <Range label={`Gutter Mobile — ${config.page_gutter_mobile}px`} min={16} max={48} step={2} value={config.page_gutter_mobile} onChange={(page_gutter_mobile) => update({ page_gutter_mobile })} />
            <Range label={`Radius S — ${config.radius_small}px`} min={0} max={24} value={config.radius_small} onChange={(radius_small) => update({ radius_small })} />
            <Range label={`Radius M — ${config.radius_medium}px`} min={0} max={36} value={config.radius_medium} onChange={(radius_medium) => update({ radius_medium })} />
            <Range label={`Radius L — ${config.radius_large}px`} min={0} max={56} value={config.radius_large} onChange={(radius_large) => update({ radius_large })} />
          </TokenSection>

          <TokenSection title="Карточки, кнопки и ритм">
            <Select label="Тень карточек" value={config.card_shadow} onChange={(value) => update({ card_shadow: value as SiteShadowPreset })} options={shadowOptions} />
            <Range label={`Высота основных кнопок — ${config.button_height}px`} min={36} max={58} value={config.button_height} onChange={(button_height) => update({ button_height })} />
            <Range label={`Базовый шаг отступов — ${config.spacing_unit}px`} min={4} max={12} value={config.spacing_unit} onChange={(spacing_unit) => update({ spacing_unit })} />
          </TokenSection>

          <button type="button" className="rowAction muted designSystemReset" onClick={() => setConfig({ ...initial })}>Вернуть значения при открытии</button>
        </div>

        <div className="designSystemPreview" style={previewStyle}>
          <div className="designSystemPreviewSticky">
            <div className="dsPreviewHeader"><span className="dsPreviewLogo">FCE</span><strong>FC EDINEȚ</strong><span>Новости &nbsp; Команда &nbsp; Матчи</span></div>
            <div className="dsPreviewHero">
              <span>FC EDINEȚ • DESIGN SYSTEM</span>
              <h2>Один стиль для всего сайта</h2>
              <p>Цвета, шрифты, контейнеры, радиусы, тени и кнопки обновляются из одной дизайн-системы.</p>
              <button type="button">Основная кнопка</button>
            </div>
            <div className="dsPreviewSurface">
              <h3>Карточки интерфейса</h3>
              <div className="dsPreviewCards">
                <article><b>Следующий матч</b><p>Пример карточки с глобальным radius и shadow.</p></article>
                <article><b>Последние новости</b><p>Все секции сохраняют одинаковую визуальную логику.</p></article>
              </div>
              <div className="dsTokenStrip"><span style={{ background: config.primary }} /><span style={{ background: config.navy }} /><span style={{ background: config.accent }} /><span style={{ background: config.surface }} /><span style={{ background: config.line }} /></div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function TokenSection({ title, children }: { title: string; children: ReactNode }) { return <section className="designTokenSection"><h3>{title}</h3>{children}</section>; }
function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="designColorRow"><span>{label}</span><div><input type="color" value={value} onChange={(e) => onChange(e.target.value)} /><input value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} /></div></label>; }
function Range({ label, min, max, step = 1, value, onChange }: { label: string; min: number; max: number; step?: number; value: number; onChange: (value: number) => void }) { return <label className="designRangeRow"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) { return <label className="designSelectRow"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }

const fontOptions: [string, string][] = [["arial", "Arial / Helvetica"], ["system", "System UI"], ["trebuchet", "Trebuchet MS"], ["georgia", "Georgia"]];
const shadowOptions: [string, string][] = [["none", "Без тени"], ["soft", "Мягкая"], ["medium", "Средняя"], ["strong", "Выраженная"]];
