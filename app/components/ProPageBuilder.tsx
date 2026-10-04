"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { MediaAlbum, MediaVideo, Partner, SitePageDesignSnapshot } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import ManagedPageCanvas from "@/app/components/ManagedPageCanvas";
import {
  defaultProPageLayout,
  proPageLabels,
  proPagePresetOptions,
  proPageRoutes,
  proSectionLabels,
  proSectionVariants,
  type AcademyContent,
  type ProBreakpoint,
  type ProPageKey,
  type ProPageLayoutConfig,
  type ProPagePreset,
  type ProSectionConfig,
} from "@/lib/pro-page-builder";

export type ProPageBuilderState = { error?: string; success?: string };

type Props = {
  pageKey: ProPageKey;
  initial: ProPageLayoutConfig;
  action: (state: ProPageBuilderState, formData: FormData) => Promise<ProPageBuilderState>;
  locale: Locale;
  heroDesign: SitePageDesignSnapshot;
  albums?: MediaAlbum[];
  videos?: MediaVideo[];
  partners?: Partner[];
};

type Zoom = "auto" | 25 | 33 | 50 | 67 | 100;
const devices: Record<ProBreakpoint, { label: string; width: number; height: number }> = {
  desktop: { label: "Desktop", width: 1440, height: 900 },
  tablet: { label: "Tablet", width: 900, height: 1180 },
  mobile: { label: "Mobile", width: 390, height: 844 },
};

export default function ProPageBuilder({ pageKey, initial, action, locale, heroDesign, albums = [], videos = [], partners = [] }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as ProPageBuilderState);
  const [layout, setLayout] = useState(initial);
  const [selectedKey, setSelectedKey] = useState(initial.sections[0]?.key ?? "hero");
  const [breakpoint, setBreakpoint] = useState<ProBreakpoint>("desktop");
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [zoom, setZoom] = useState<Zoom>("auto");
  const [undoStack, setUndoStack] = useState<ProPageLayoutConfig[]>([]);
  const [redoStack, setRedoStack] = useState<ProPageLayoutConfig[]>([]);
  const [autoScale, setAutoScale] = useState(.62);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const selected = layout.sections.find((section) => section.key === selectedKey) ?? layout.sections[0];
  const spec = devices[breakpoint];
  const scale = zoom === "auto" ? autoScale : zoom / 100;

  useEffect(() => {
    const node = previewWrapRef.current;
    if (!node) return;
    const update = () => setAutoScale(Math.max(.22, Math.min(1, (node.clientWidth - 34) / spec.width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [spec.width]);
  const labels = proSectionLabels(pageKey);
  const json = useMemo(() => JSON.stringify(layout), [layout]);

  function commit(next: ProPageLayoutConfig) {
    setUndoStack((stack) => [...stack.slice(-29), layout]);
    setRedoStack([]);
    setLayout(next);
  }
  function patchSection(key: string, patch: Partial<ProSectionConfig>) {
    commit({ ...layout, preset: layout.preset, sections: layout.sections.map((section) => section.key === key ? { ...section, ...patch } : section) });
  }
  function patchResponsive(field: "columns" | "offset_x" | "offset_y" | "scale", value: number) {
    if (!selected) return;
    patchSection(selected.key, { [field]: { ...selected[field], [breakpoint]: value } } as Partial<ProSectionConfig>);
  }
  function moveSection(key: string, delta: number) {
    const sections = [...layout.sections];
    const index = sections.findIndex((section) => section.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    commit({ ...layout, sections });
  }
  function applyPreset(preset: ProPagePreset) {
    if (!window.confirm("Применить готовый дизайн? Несохранённые изменения текущего макета будут заменены.")) return;
    const next = defaultProPageLayout(pageKey, preset);
    commit(next);
    setSelectedKey(next.sections[0]?.key ?? "hero");
  }
  function undo() {
    const previous = undoStack[undoStack.length - 1]; if (!previous) return;
    setUndoStack((stack) => stack.slice(0, -1)); setRedoStack((stack) => [layout, ...stack].slice(0, 30)); setLayout(previous);
  }
  function redo() {
    const next = redoStack[0]; if (!next) return;
    setRedoStack((stack) => stack.slice(1)); setUndoStack((stack) => [...stack.slice(-29), layout]); setLayout(next);
  }
  function resetPage() {
    if (!window.confirm("Сбросить макет к фирменному варианту Club Blue?")) return;
    const next = defaultProPageLayout(pageKey, "club-blue"); commit(next); setSelectedKey(next.sections[0]?.key ?? "hero");
  }
  function patchAcademy(patch: Partial<AcademyContent>) {
    if (pageKey !== "academy" || !layout.academy) return;
    commit({ ...layout, academy: { ...layout.academy, ...patch } });
  }

  return <form action={formAction} className="proBuilderForm">
    <input type="hidden" name="page_key" value={pageKey}/>
    <input type="hidden" name="layout_json" value={json}/>

    <div className="proBuilderToolbar">
      <div className="proBuilderPageSwitch">
        {(["media", "partners", "academy"] as ProPageKey[]).map((key) => <Link href={`/admin/page-builder/${key}`} className={key === pageKey ? "active" : ""} key={key}>{proPageLabels[key]}</Link>)}
      </div>
      <div className="proBuilderToolbarCenter">
        <button type="button" onClick={undo} disabled={!undoStack.length} title="Отменить">↶</button>
        <button type="button" onClick={redo} disabled={!redoStack.length} title="Повторить">↷</button>
        <span className="proBuilderToolbarDivider"/>
        {(Object.keys(devices) as ProBreakpoint[]).map((key) => <button type="button" key={key} className={breakpoint === key ? "active" : ""} onClick={() => setBreakpoint(key)}>{devices[key].label}</button>)}
      </div>
      <div className="proBuilderToolbarRight">
        <label>Zoom <select value={zoom} onChange={(event) => setZoom(event.target.value === "auto" ? "auto" : Number(event.target.value) as Zoom)}><option value="auto">Auto</option>{[25, 33, 50, 67, 100].map((value) => <option value={value} key={value}>{value}%</option>)}</select></label>
        <div className="proBuilderMode"><button type="button" className={mode === "simple" ? "active" : ""} onClick={() => setMode("simple")}>Просто</button><button type="button" className={mode === "advanced" ? "active" : ""} onClick={() => setMode("advanced")}>Расширенно</button></div>
      </div>
    </div>

    <div className="proBuilderPresetStrip">
      <div><b>Готовые дизайны</b><span>Выбери основу, затем меняй только нужное.</span></div>
      {proPagePresetOptions().map((preset) => <button type="button" className={layout.preset === preset.key ? "active" : ""} key={preset.key} onClick={() => applyPreset(preset.key)}><strong>{preset.label}</strong><small>{preset.description}</small></button>)}
    </div>

    <div className="proBuilderWorkspace">
      <aside className="proBuilderStructure">
        <div className="proBuilderPanelHead"><span>СТРУКТУРА</span><b>{layout.sections.filter((section) => section.visible).length}/{layout.sections.length}</b></div>
        <div className="proBuilderSectionList">
          {layout.sections.map((section, index) => <div className={`proBuilderSectionItem${selectedKey === section.key ? " active" : ""}`} key={section.key}>
            <button type="button" className="proBuilderSectionSelect" onClick={() => setSelectedKey(section.key)}><span className={section.visible ? "isOn" : "isOff"}>{section.visible ? "●" : "○"}</span><strong>{labels[section.key] ?? section.key}</strong><small>{section.variant}</small></button>
            <div className="proBuilderSectionActions"><button type="button" onClick={() => patchSection(section.key, { visible: !section.visible })}>{section.visible ? "Скрыть" : "Показать"}</button><button type="button" onClick={() => moveSection(section.key, -1)} disabled={index === 0}>↑</button><button type="button" onClick={() => moveSection(section.key, 1)} disabled={index === layout.sections.length - 1}>↓</button></div>
          </div>)}
        </div>
        <div className="proBuilderHelp"><b>Простой режим</b><span>90% работы — пресет, порядок секций и вариант карточек.</span><b>Расширенный</b><span>Точная адаптация по устройствам без потери возможностей.</span></div>
      </aside>

      <section className="proBuilderPreview" ref={previewWrapRef}>
        <div className="proBuilderPreviewHead"><div><b>LIVE PREVIEW</b><span>{proPageRoutes[pageKey]} • {spec.width} px</span></div><a href={proPageRoutes[pageKey]} target="_blank">Открыть страницу ↗</a></div>
        <div className="proBuilderPreviewScroll">
          <div className={`proBuilderDeviceFrame device-${breakpoint}`} style={{ width: spec.width * scale, minHeight: spec.height * scale }}>
            <div className="proBuilderScaledCanvas" style={{ width: spec.width, minHeight: spec.height, transform: `scale(${scale})` }}>
              <ManagedPageCanvas pageKey={pageKey} layout={layout} locale={locale} heroDesign={heroDesign} albums={albums} videos={videos} partners={partners} preview/>
            </div>
          </div>
        </div>
      </section>

      {selected && <aside className="proBuilderInspector">
        <div className="proBuilderInspectorHead"><span>СЕКЦИЯ</span><h2>{labels[selected.key] ?? selected.key}</h2><p>{mode === "simple" ? "Основные настройки без технического шума." : `Расширенные настройки • ${devices[breakpoint].label}`}</p></div>
        <Toggle label="Показывать секцию" checked={selected.visible} onChange={(visible) => patchSection(selected.key, { visible })}/>
        <Field label="Вариант отображения"><select value={selected.variant} onChange={(event) => patchSection(selected.key, { variant: event.target.value })}>{proSectionVariants(pageKey, selected.key).map((variant) => <option value={variant.value} key={variant.value}>{variant.label}</option>)}</select></Field>
        <div className="proBuilderGrid2"><Field label="Ширина"><select value={selected.width} onChange={(event) => patchSection(selected.key, { width: event.target.value as ProSectionConfig["width"] })}><option value="container">Обычная</option><option value="wide">Широкая</option><option value="full">На весь экран</option></select></Field><Field label="Фон"><select value={selected.background} onChange={(event) => patchSection(selected.key, { background: event.target.value as ProSectionConfig["background"] })}><option value="inherit">Обычный</option><option value="light">Светлый</option><option value="surface">Серый</option><option value="dark">Тёмный</option><option value="brand">Фирменный синий</option></select></Field></div>
        <Field label="Выравнивание"><div className="proBuilderSegmented">{(["left", "center", "right"] as const).map((align) => <button type="button" className={selected.align === align ? "active" : ""} onClick={() => patchSection(selected.key, { align })} key={align}>{align === "left" ? "Слева" : align === "center" ? "Центр" : "Справа"}</button>)}</div></Field>
        <div className="proBuilderGrid2"><NumberControl label="Отступ сверху" value={selected.padding_top} min={0} max={220} suffix="px" onChange={(value) => patchSection(selected.key, { padding_top: value })}/><NumberControl label="Отступ снизу" value={selected.padding_bottom} min={0} max={220} suffix="px" onChange={(value) => patchSection(selected.key, { padding_bottom: value })}/></div>
        {["albums","videos","partners","groups","pathway"].includes(selected.key) && <NumberControl label={`Колонки • ${devices[breakpoint].label}`} value={selected.columns[breakpoint]} min={1} max={6} onChange={(value) => patchResponsive("columns", value)}/>}
        {selected.key === "hero" && <Link className="proBuilderHeroDesignLink" href={`/admin/design?page=${pageKey}`}>Фото, кадрирование и типографика Hero → Visual Editor</Link>} 

        {mode === "advanced" && <>
          <div className="proBuilderDivider"><span>ТОЧНАЯ НАСТРОЙКА</span></div>
          <div className="proBuilderGrid2"><NumberControl label="Gap" value={selected.gap} min={0} max={64} suffix="px" onChange={(value) => patchSection(selected.key, { gap: value })}/><NumberControl label="Скругление" value={selected.radius} min={0} max={48} suffix="px" onChange={(value) => patchSection(selected.key, { radius: value })}/></div>
          <div className="proBuilderGrid2"><NumberControl label={`Сдвиг X • ${devices[breakpoint].label}`} value={selected.offset_x[breakpoint]} min={-300} max={300} suffix="px" onChange={(value) => patchResponsive("offset_x", value)}/><NumberControl label={`Сдвиг Y • ${devices[breakpoint].label}`} value={selected.offset_y[breakpoint]} min={-300} max={300} suffix="px" onChange={(value) => patchResponsive("offset_y", value)}/></div>
          <NumberControl label={`Масштаб • ${devices[breakpoint].label}`} value={selected.scale[breakpoint]} min={70} max={130} suffix="%" onChange={(value) => patchResponsive("scale", value)}/>
          <button type="button" className="proBuilderCopyDevice" onClick={() => {
            if (breakpoint === "desktop") return;
            patchSection(selected.key, { columns: { ...selected.columns, [breakpoint]: selected.columns.desktop }, offset_x: { ...selected.offset_x, [breakpoint]: selected.offset_x.desktop }, offset_y: { ...selected.offset_y, [breakpoint]: selected.offset_y.desktop }, scale: { ...selected.scale, [breakpoint]: selected.scale.desktop } });
          }} disabled={breakpoint === "desktop"}>Скопировать Desktop → {devices[breakpoint].label}</button>
        </>}

        {pageKey === "academy" && selected.key === "hero" && layout.academy && <AcademyCopyEditor content={layout.academy} patch={patchAcademy} area="hero"/>}
        {pageKey === "academy" && selected.key === "intro" && layout.academy && <AcademyCopyEditor content={layout.academy} patch={patchAcademy} area="intro"/>}
        {pageKey === "academy" && selected.key === "contact" && layout.academy && <AcademyCopyEditor content={layout.academy} patch={patchAcademy} area="contact"/>}

        <div className="proBuilderInspectorFoot"><button type="button" onClick={() => patchSection(selected.key, defaultProPageLayout(pageKey, layout.preset).sections.find((section) => section.key === selected.key) ?? selected)}>Сбросить секцию</button></div>
      </aside>}
    </div>

    <div className="proBuilderPublishBar">
      <div><strong>Page Builder Pro</strong><span>Preview и публичная страница используют один рендер. Черновик не меняет сайт.</span></div>
      <div className="proBuilderPublishActions"><button type="button" className="secondaryAdminButton" onClick={resetPage}>Сбросить страницу</button>{pageKey === "media" && <Link className="secondaryAdminButton" href="/admin/media">Контент Медиа</Link>}{pageKey === "partners" && <Link className="secondaryAdminButton" href="/admin/partners">Контент партнёров</Link>}<button className="secondaryAdminButton" type="submit" name="intent" value="draft" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить черновик"}</button><button className="primaryButton" type="submit" name="intent" value="publish" disabled={pending}>{pending ? "Публикуем…" : "Опубликовать"}</button></div>
    </div>
    {state.error && <div className="formError">{state.error}</div>}{state.success && <div className="formSuccess">{state.success}</div>}
  </form>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="proBuilderField"><span>{label}</span>{children}</label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="proBuilderToggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}/></label>; }
function NumberControl({ label, value, min, max, suffix = "", onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) { return <label className="proBuilderNumber"><span>{label}</span><div><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))}/><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))}/><b>{suffix}</b></div></label>; }

function AcademyCopyEditor({ content, patch, area }: { content: AcademyContent; patch: (value: Partial<AcademyContent>) => void; area: "hero" | "intro" | "contact" }) {
  const fields = area === "hero"
    ? [["hero_eyebrow_ru", "Eyebrow RU"], ["hero_title_ru", "Заголовок RU"], ["hero_text_ru", "Текст RU"], ["hero_eyebrow_ro", "Eyebrow RO"], ["hero_title_ro", "Заголовок RO"], ["hero_text_ro", "Текст RO"]]
    : area === "intro"
      ? [["intro_title_ru", "Заголовок RU"], ["intro_text_ru", "Текст RU"], ["intro_title_ro", "Заголовок RO"], ["intro_text_ro", "Текст RO"]]
      : [["contact_title_ru", "Заголовок RU"], ["contact_text_ru", "Текст RU"], ["contact_title_ro", "Заголовок RO"], ["contact_text_ro", "Текст RO"]];
  return <div className="proBuilderAcademyCopy"><div className="proBuilderDivider"><span>ТЕКСТ АКАДЕМИИ</span></div>{fields.map(([key, label]) => <label key={key}><span>{label}</span>{key.includes("text") ? <textarea rows={4} value={String(content[key as keyof AcademyContent])} onChange={(event) => patch({ [key]: event.target.value } as Partial<AcademyContent>)}/> : <input value={String(content[key as keyof AcademyContent])} onChange={(event) => patch({ [key]: event.target.value } as Partial<AcademyContent>)}/>}</label>)}</div>;
}
