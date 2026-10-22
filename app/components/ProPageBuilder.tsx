"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
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
  embedded?: boolean;
};

type SpacingPreset = "compact" | "normal" | "air";
const devices: Record<ProBreakpoint, { label: string; short: string; width: number; height: number }> = {
  desktop: { label: "Компьютер", short: "Desktop", width: 1440, height: 900 },
  tablet: { label: "Планшет", short: "Tablet", width: 900, height: 1180 },
  mobile: { label: "Телефон", short: "Mobile", width: 390, height: 844 },
};
const gridSections = new Set(["albums", "videos", "partners", "groups", "pathway"]);

export default function ProPageBuilder({ pageKey, initial, action, locale, heroDesign, albums = [], videos = [], partners = [], embedded = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as ProPageBuilderState);
  const [layout, setLayout] = useState(initial);
  const [selectedKey, setSelectedKey] = useState(initial.sections[0]?.key ?? "hero");
  const [breakpoint, setBreakpoint] = useState<ProBreakpoint>("desktop");
  const [undoStack, setUndoStack] = useState<ProPageLayoutConfig[]>([]);
  const [redoStack, setRedoStack] = useState<ProPageLayoutConfig[]>([]);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [autoScale, setAutoScale] = useState(.62);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const labels = proSectionLabels(pageKey);
  const selected = layout.sections.find((section) => section.key === selectedKey) ?? layout.sections[0];
  const spec = devices[breakpoint];
  const json = useMemo(() => JSON.stringify(layout), [layout]);

  useEffect(() => {
    if (embedded) return;
    const node = previewWrapRef.current;
    if (!node) return;
    const update = () => setAutoScale(Math.max(.22, Math.min(1, (node.clientWidth - 28) / spec.width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [embedded, spec.width]);

  useEffect(() => {
    if (window.parent !== window) window.parent.postMessage({ type: "fc-site-builder-pro-layout", pageKey, layout }, window.location.origin);
  }, [pageKey, layout]);

  function commit(next: ProPageLayoutConfig) {
    setUndoStack((stack) => [...stack.slice(-29), layout]);
    setRedoStack([]);
    setLayout(next);
  }
  function patchSection(key: string, patch: Partial<ProSectionConfig>) {
    commit({ ...layout, sections: layout.sections.map((section) => section.key === key ? { ...section, ...patch } : section) });
  }
  function patchResponsive(field: "columns" | "offset_x" | "offset_y" | "scale", value: number) {
    if (!selected) return;
    patchSection(selected.key, { [field]: { ...selected[field], [breakpoint]: value } } as Partial<ProSectionConfig>);
  }
  function reorder(dragKey: string, targetKey: string) {
    if (dragKey === targetKey) return;
    const sections = [...layout.sections];
    const from = sections.findIndex((item) => item.key === dragKey);
    const to = sections.findIndex((item) => item.key === targetKey);
    if (from < 0 || to < 0) return;
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
    commit({ ...layout, sections });
    setSelectedKey(dragKey);
  }
  function applyPreset(preset: ProPagePreset) {
    if (preset === layout.preset) return;
    if (!window.confirm("Применить готовый стиль ко всей странице? Текущая раскладка секций будет заменена.")) return;
    const next = defaultProPageLayout(pageKey, preset);
    commit(next);
    setSelectedKey(next.sections[0]?.key ?? "hero");
  }
  function undo() {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [layout, ...stack].slice(0, 30));
    setLayout(previous);
  }
  function redo() {
    const next = redoStack[0];
    if (!next) return;
    setRedoStack((stack) => stack.slice(1));
    setUndoStack((stack) => [...stack.slice(-29), layout]);
    setLayout(next);
  }
  function resetSection() {
    if (!selected) return;
    const fresh = defaultProPageLayout(pageKey, layout.preset).sections.find((section) => section.key === selected.key);
    if (fresh) patchSection(selected.key, fresh);
  }
  function resetPage() {
    if (!window.confirm("Вернуть страницу к фирменному стилю Club Blue?")) return;
    const next = defaultProPageLayout(pageKey, "club-blue");
    commit(next);
    setSelectedKey(next.sections[0]?.key ?? "hero");
  }
  function patchAcademy(patch: Partial<AcademyContent>) {
    if (pageKey !== "academy" || !layout.academy) return;
    commit({ ...layout, academy: { ...layout.academy, ...patch } });
  }
  function setSpacing(value: SpacingPreset) {
    if (!selected) return;
    const spacing = value === "compact" ? [44, 44] : value === "air" ? [104, 104] : [76, 76];
    patchSection(selected.key, { padding_top: spacing[0], padding_bottom: spacing[1] });
  }
  function currentSpacing(): SpacingPreset | "custom" {
    if (!selected) return "normal";
    const average = (selected.padding_top + selected.padding_bottom) / 2;
    if (Math.abs(average - 44) <= 6) return "compact";
    if (Math.abs(average - 76) <= 8) return "normal";
    if (Math.abs(average - 104) <= 10) return "air";
    return "custom";
  }
  function onDragStart(event: DragEvent<HTMLDivElement>, key: string) {
    setDraggedKey(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
  }
  function onDrop(event: DragEvent<HTMLDivElement>, targetKey: string) {
    event.preventDefault();
    const source = draggedKey || event.dataTransfer.getData("text/plain");
    if (source) reorder(source, targetKey);
    setDraggedKey(null);
  }

  const contentLink = pageKey === "media" ? "/admin/media" : pageKey === "partners" ? "/admin/partners" : null;
  const visibleCount = layout.sections.filter((section) => section.visible).length;

  return <form action={formAction} className={`pb2Form${embedded ? " isEmbedded" : ""}`}>
    <input type="hidden" name="page_key" value={pageKey}/>
    <input type="hidden" name="layout_json" value={json}/>

    <header className="pb2Topbar">
      {!embedded && <div className="pb2PageTabs">
        {(["media", "partners", "academy"] as ProPageKey[]).map((key) => <Link href={`/admin/page-builder/${key}`} className={key === pageKey ? "active" : ""} key={key}>{proPageLabels[key]}</Link>)}
      </div>}
      <div className="pb2History" aria-label="История изменений">
        <button type="button" onClick={undo} disabled={!undoStack.length} title="Отменить">↶ <span>Отменить</span></button>
        <button type="button" onClick={redo} disabled={!redoStack.length} title="Повторить">↷ <span>Повторить</span></button>
      </div>
      {!embedded && <div className="pb2Devices" aria-label="Предпросмотр устройства">
        {(Object.keys(devices) as ProBreakpoint[]).map((key) => <button type="button" key={key} className={breakpoint === key ? "active" : ""} onClick={() => setBreakpoint(key)}><span>{key === "desktop" ? "▱" : key === "tablet" ? "▯" : "▯"}</span>{devices[key].label}</button>)}
      </div>}
      <div className="pb2TopActions">
        {contentLink && <Link href={contentLink}>Контент</Link>}
        <a href={proPageRoutes[pageKey]} target="_blank" rel="noreferrer">Открыть страницу ↗</a>
      </div>
    </header>

    <div className={`pb2Workspace${embedded ? " noPreview" : ""}`}>
      <aside className="pb2Structure">
        <div className="pb2PanelTitle">
          <div><span>СТРУКТУРА</span><strong>Секции страницы</strong></div>
          <b>{visibleCount}/{layout.sections.length}</b>
        </div>

        <div className="pb2PresetBox">
          <label htmlFor="pb2-preset">Стиль страницы</label>
          <select id="pb2-preset" value={layout.preset} onChange={(event) => applyPreset(event.target.value as ProPagePreset)}>
            {proPagePresetOptions().map((preset) => <option key={preset.key} value={preset.key}>{preset.label}</option>)}
          </select>
          <p>{proPagePresetOptions().find((item) => item.key === layout.preset)?.description}</p>
        </div>

        <div className="pb2SectionList">
          {layout.sections.map((section) => <div
            key={section.key}
            className={`pb2SectionRow${selectedKey === section.key ? " active" : ""}${draggedKey === section.key ? " dragging" : ""}`}
            draggable
            onDragStart={(event) => onDragStart(event, section.key)}
            onDragEnd={() => setDraggedKey(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, section.key)}
          >
            <button className="pb2Drag" type="button" title="Перетащи секцию">⋮⋮</button>
            <button className="pb2SectionMain" type="button" onClick={() => setSelectedKey(section.key)}>
              <strong>{labels[section.key] ?? section.key}</strong>
              <small>{proSectionVariants(pageKey, section.key).find((item) => item.value === section.variant)?.label ?? section.variant}</small>
            </button>
            <button type="button" className={`pb2Visibility${section.visible ? " on" : ""}`} onClick={() => patchSection(section.key, { visible: !section.visible })} aria-label={section.visible ? "Скрыть секцию" : "Показать секцию"} title={section.visible ? "Скрыть" : "Показать"}><i/></button>
          </div>)}
        </div>
        <div className="pb2StructureHint">Перетаскивай секции мышью. Выключенная секция остаётся в редакторе, но не показывается на сайте.</div>
      </aside>

      {!embedded && <section className="pb2Preview" ref={previewWrapRef}>
        <div className="pb2PreviewHead">
          <div><strong>Предпросмотр</strong><span>{devices[breakpoint].short} · {spec.width}px</span></div>
          <span>Изменения видны сразу</span>
        </div>
        <div className="pb2PreviewStage">
          <div className={`pb2Device device-${breakpoint}`} style={{ width: spec.width * autoScale, minHeight: spec.height * autoScale }}>
            <div className="pb2Canvas" style={{ width: spec.width, minHeight: spec.height, transform: `scale(${autoScale})` }}>
              <ManagedPageCanvas pageKey={pageKey} layout={layout} locale={locale} heroDesign={heroDesign} albums={albums} videos={videos} partners={partners} preview/>
            </div>
          </div>
        </div>
      </section>}

      {selected && <aside className="pb2Inspector">
        <div className="pb2InspectorHead">
          <span>НАСТРОЙКИ СЕКЦИИ</span>
          <h2>{labels[selected.key] ?? selected.key}</h2>
          <p>Меняй только то, что действительно влияет на внешний вид.</p>
        </div>

        <SettingBlock title="Внешний вид">
          <ChoiceCards
            value={selected.variant}
            options={proSectionVariants(pageKey, selected.key).map((item) => ({ value: item.value, label: item.label }))}
            onChange={(variant) => patchSection(selected.key, { variant })}
          />
        </SettingBlock>

        {selected.key !== "hero" && <SettingBlock title="Расположение">
          <div className="pb2TwoCols">
            <SelectField label="Ширина" value={selected.width} onChange={(value) => patchSection(selected.key, { width: value as ProSectionConfig["width"] })} options={[{value:"container",label:"Обычная"},{value:"wide",label:"Широкая"},{value:"full",label:"На весь экран"}]}/>
            <SelectField label="Фон" value={selected.background} onChange={(value) => patchSection(selected.key, { background: value as ProSectionConfig["background"] })} options={[{value:"inherit",label:"По умолчанию"},{value:"light",label:"Светлый"},{value:"surface",label:"Серый"},{value:"dark",label:"Тёмный"},{value:"brand",label:"Фирменный"}]}/>
          </div>
          <Segmented label="Выравнивание" value={selected.align} items={[{value:"left",label:"Слева"},{value:"center",label:"Центр"},{value:"right",label:"Справа"}]} onChange={(align) => patchSection(selected.key, { align: align as ProSectionConfig["align"] })}/>
          <Segmented label="Воздух" value={currentSpacing()} items={[{value:"compact",label:"Компактно"},{value:"normal",label:"Обычно"},{value:"air",label:"Свободно"}]} onChange={(value) => setSpacing(value as SpacingPreset)}/>
        </SettingBlock>}

        {gridSections.has(selected.key) && <SettingBlock title="Сетка карточек">
          <p className="pb2BlockHelp">Количество колонок на текущем устройстве: <strong>{devices[breakpoint].label}</strong>.</p>
          <div className="pb2ColumnPicker">{[1,2,3,4,5,6].map((count) => <button type="button" key={count} className={selected.columns[breakpoint] === count ? "active" : ""} onClick={() => patchResponsive("columns", count)}>{count}</button>)}</div>
          <div className="pb2InspectorDevices">{(Object.keys(devices) as ProBreakpoint[]).map((key) => <button type="button" key={key} className={breakpoint === key ? "active" : ""} onClick={() => setBreakpoint(key)}>{devices[key].short}</button>)}</div>
        </SettingBlock>}

        {selected.key === "hero" && <SettingBlock title="Hero">
          <p className="pb2BlockHelp">Фон, фото, позицию изображения и крупную типографику Hero редактируй в визуальном редакторе.</p>
          <Link className="pb2PrimaryLink" href={`/admin/design?page=${pageKey}`}>Открыть настройки Hero →</Link>
        </SettingBlock>}

        {pageKey === "academy" && layout.academy && ["hero","intro","contact"].includes(selected.key) && <SettingBlock title="Текст">
          <AcademyCopyEditor content={layout.academy} patch={patchAcademy} area={selected.key as "hero" | "intro" | "contact"}/>
        </SettingBlock>}

        <details className="pb2Advanced">
          <summary><span>Дополнительно</span><small>Точные размеры и типографика</small></summary>
          <div className="pb2AdvancedBody">
            <div className="pb2TwoCols"><NumberField label="Отступ сверху" value={selected.padding_top} min={0} max={220} suffix="px" onChange={(padding_top) => patchSection(selected.key, { padding_top })}/><NumberField label="Отступ снизу" value={selected.padding_bottom} min={0} max={220} suffix="px" onChange={(padding_bottom) => patchSection(selected.key, { padding_bottom })}/></div>
            <div className="pb2TwoCols"><NumberField label="Gap" value={selected.gap} min={0} max={64} suffix="px" onChange={(gap) => patchSection(selected.key, { gap })}/><NumberField label="Скругление" value={selected.radius} min={0} max={48} suffix="px" onChange={(radius) => patchSection(selected.key, { radius })}/></div>
            <SelectField label="Шрифт" value={selected.text_font} onChange={(text_font) => patchSection(selected.key, { text_font: text_font as ProSectionConfig["text_font"] })} options={[{value:"inherit",label:"Как в теме"},{value:"arial",label:"Inter / FCE Body"},{value:"arial-black",label:"Roboto Condensed / FCE Display"},{value:"georgia",label:"Georgia"},{value:"times",label:"Times New Roman"}]}/>
            <div className="pb2TwoCols"><NumberField label="Заголовок" value={selected.heading_size} min={0} max={120} suffix="px" onChange={(heading_size) => patchSection(selected.key, { heading_size })}/><NumberField label="Основной текст" value={selected.body_size} min={0} max={48} suffix="px" onChange={(body_size) => patchSection(selected.key, { body_size })}/></div>
            <div className="pb2TwoCols"><ColorField label="Цвет текста" value={selected.text_color || "#162033"} onChange={(text_color) => patchSection(selected.key, { text_color })}/><NumberField label="Толщина" value={selected.font_weight} min={0} max={950} onChange={(font_weight) => patchSection(selected.key, { font_weight })}/></div>
            <div className="pb2Divider">Текущее устройство · {devices[breakpoint].label}</div>
            <div className="pb2TwoCols"><NumberField label="Сдвиг X" value={selected.offset_x[breakpoint]} min={-300} max={300} suffix="px" onChange={(value) => patchResponsive("offset_x", value)}/><NumberField label="Сдвиг Y" value={selected.offset_y[breakpoint]} min={-300} max={300} suffix="px" onChange={(value) => patchResponsive("offset_y", value)}/></div>
            <NumberField label="Масштаб" value={selected.scale[breakpoint]} min={70} max={130} suffix="%" onChange={(value) => patchResponsive("scale", value)}/>
            <button type="button" className="pb2ResetSection" onClick={resetSection}>Сбросить только эту секцию</button>
          </div>
        </details>
      </aside>}
    </div>

    <footer className="pb2Savebar">
      <div className="pb2SaveMessage" aria-live="polite">
        <strong>{state.error ? "Ошибка сохранения" : state.success ? state.success : "Черновик страницы"}</strong>
        <span>{state.error || "Сохрани черновик для продолжения работы или опубликуй готовые изменения на сайте."}</span>
      </div>
      <div className="pb2SaveActions">
        <button type="button" className="pb2ResetPage" onClick={resetPage}>Сбросить страницу</button>
        <button type="submit" name="intent" value="draft" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить черновик"}</button>
        <button className="primaryButton" type="submit" name="intent" value="publish" disabled={pending}>{pending ? "Публикуем…" : "Опубликовать"}</button>
      </div>
    </footer>
  </form>;
}

function SettingBlock({ title, children }: { title: string; children: ReactNode }) {
  return <section className="pb2SettingBlock"><h3>{title}</h3>{children}</section>;
}
function ChoiceCards({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div className="pb2ChoiceCards">{options.map((option) => <button type="button" key={option.value} className={value === option.value ? "active" : ""} onClick={() => onChange(option.value)}><i/><span>{option.label}</span></button>)}</div>;
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="pb2Field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>;
}
function Segmented({ label, value, items, onChange }: { label: string; value: string; items: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div className="pb2Field"><span>{label}</span><div className="pb2Segmented">{items.map((item) => <button type="button" key={item.value} className={value === item.value ? "active" : ""} onClick={() => onChange(item.value)}>{item.label}</button>)}</div></div>;
}
function NumberField({ label, value, min, max, suffix = "", onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="pb2Field"><span>{label}</span><div className="pb2Number"><input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))}/><b>{suffix}</b></div></label>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="pb2Field"><span>{label}</span><div className="pb2Color"><input type="color" value={value} onChange={(event) => onChange(event.target.value)}/><code>{value}</code></div></label>;
}
function AcademyCopyEditor({ content, patch, area }: { content: AcademyContent; patch: (value: Partial<AcademyContent>) => void; area: "hero" | "intro" | "contact" }) {
  const fields = area === "hero"
    ? [["hero_eyebrow_ru", "Надзаголовок RU"], ["hero_title_ru", "Заголовок RU"], ["hero_text_ru", "Текст RU"], ["hero_eyebrow_ro", "Надзаголовок RO"], ["hero_title_ro", "Заголовок RO"], ["hero_text_ro", "Текст RO"]]
    : area === "intro"
      ? [["intro_title_ru", "Заголовок RU"], ["intro_text_ru", "Текст RU"], ["intro_title_ro", "Заголовок RO"], ["intro_text_ro", "Текст RO"]]
      : [["contact_title_ru", "Заголовок RU"], ["contact_text_ru", "Текст RU"], ["contact_title_ro", "Заголовок RO"], ["contact_text_ro", "Текст RO"]];
  return <div className="pb2CopyEditor">{fields.map(([key, label]) => <label key={key}><span>{label}</span>{key.includes("text") ? <textarea rows={4} value={String(content[key as keyof AcademyContent])} onChange={(event) => patch({ [key]: event.target.value } as Partial<AcademyContent>)}/> : <input value={String(content[key as keyof AcademyContent])} onChange={(event) => patch({ [key]: event.target.value } as Partial<AcademyContent>)}/>}</label>)}</div>;
}
