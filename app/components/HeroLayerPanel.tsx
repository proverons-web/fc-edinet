"use client";

import type { HeroLayerConfig, HeroLayerFontFamily, HeroLayerTextTransform } from "@/lib/types";
import type { HeroLayerDefinition } from "@/lib/hero-builder";
import { heroLayerState, moveHeroLayer, updateHeroLayer } from "@/lib/hero-builder";

const fontOptions: Array<{ value: HeroLayerFontFamily; label: string }> = [
  { value: "inherit", label: "Как в теме" },
  { value: "arial", label: "Arial" },
  { value: "arial-black", label: "Arial Black" },
  { value: "verdana", label: "Verdana" },
  { value: "tahoma", label: "Tahoma" },
  { value: "trebuchet", label: "Trebuchet MS" },
  { value: "georgia", label: "Georgia" },
  { value: "times", label: "Times New Roman" },
];

export default function HeroLayerPanel({
  definitions,
  config,
  setConfig,
  selected,
  setSelected,
}: {
  definitions: HeroLayerDefinition[];
  config: HeroLayerConfig;
  setConfig: (next: HeroLayerConfig) => void;
  selected: string;
  setSelected: (key: string) => void;
}) {
  const ordered = [...definitions].sort((a, b) => heroLayerState(config, a.key).order - heroLayerState(config, b.key).order);
  const selectedState = heroLayerState(config, selected);
  const selectedDefinition = definitions.find((item) => item.key === selected);
  const textEditable = selected !== "background";

  function patch(patchValue: Parameters<typeof updateHeroLayer>[2]) {
    setConfig(updateHeroLayer(config, selected, patchValue));
  }

  return (
    <section className="clubAdminSection visualControlCard heroLayersCard">
      <div className="formSectionTitle">
        <p className="eyebrow blue">HERO BUILDER 2.1</p>
        <h2>Слои и текст</h2>
        <p>Выбери объект. Для текстовых слоёв доступны шрифт, размер, цвет, обводка, интервалы и другие параметры.</p>
      </div>
      <div className="heroLayersList">
        {ordered.map((definition, index) => {
          const state = heroLayerState(config, definition.key);
          return (
            <article key={definition.key} className={`heroLayerRow ${selected === definition.key ? "active" : ""} ${state.visible ? "" : "isHidden"} ${state.locked ? "isLocked" : ""}`} onClick={() => setSelected(definition.key)}>
              <button type="button" className="heroLayerSelect" onClick={(event) => { event.stopPropagation(); setSelected(definition.key); }}>
                <span className="heroLayerIcon">{state.locked ? "🔒" : state.visible ? "◉" : "○"}</span>
                <span><strong>{definition.label}</strong><small>{definition.description}</small></span>
              </button>
              <div className="heroLayerActions">
                <button type="button" title={state.visible ? "Скрыть" : "Показать"} disabled={state.locked} onClick={(event) => { event.stopPropagation(); setConfig(updateHeroLayer(config, definition.key, { visible: !state.visible })); }}>{state.visible ? "👁" : "🚫"}</button>
                <button type="button" title={state.locked ? "Разблокировать" : "Заблокировать"} onClick={(event) => { event.stopPropagation(); setConfig(updateHeroLayer(config, definition.key, { locked: !state.locked })); }}>{state.locked ? "🔓" : "🔒"}</button>
                <button type="button" title="Выше" disabled={state.locked || index === 0} onClick={(event) => { event.stopPropagation(); setConfig(moveHeroLayer(config, definitions, definition.key, -1)); }}>↑</button>
                <button type="button" title="Ниже" disabled={state.locked || index === ordered.length - 1} onClick={(event) => { event.stopPropagation(); setConfig(moveHeroLayer(config, definitions, definition.key, 1)); }}>↓</button>
              </div>
            </article>
          );
        })}
      </div>

      {textEditable && <div className="heroTypographyInspector">
        <div className="heroTypographyHead"><div><span>ТЕКСТОВЫЙ РЕДАКТОР</span><strong>{selectedDefinition?.label ?? selected}</strong></div><button type="button" onClick={() => patch({ font_family: undefined, font_size: undefined, font_weight: undefined, color: undefined, stroke_width: undefined, stroke_color: undefined, letter_spacing: undefined, line_height: undefined, text_transform: undefined, italic: undefined, underline: undefined, shadow_strength: undefined })}>Сбросить стиль</button></div>
        <div className="heroTypographyGrid">
          <label><span>Шрифт</span><select value={selectedState.font_family ?? "inherit"} onChange={(e) => patch({ font_family: e.target.value as HeroLayerFontFamily })}>{fontOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          <label><span>Размер</span><div className="heroTextNumber"><input type="range" min="8" max="160" value={selectedState.font_size ?? 48} onChange={(e) => patch({ font_size: Number(e.target.value) })}/><input type="number" min="8" max="220" value={selectedState.font_size ?? 48} onChange={(e) => patch({ font_size: Number(e.target.value) })}/><b>px</b></div></label>
          <label><span>Толщина</span><select value={selectedState.font_weight ?? 900} onChange={(e) => patch({ font_weight: Number(e.target.value) })}>{[300,400,500,600,700,800,900,950].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <label><span>Регистр</span><select value={selectedState.text_transform ?? "none"} onChange={(e) => patch({ text_transform: e.target.value as HeroLayerTextTransform })}><option value="none">Как введено</option><option value="uppercase">ВЕРХНИЙ</option><option value="lowercase">нижний</option><option value="capitalize">Каждое Слово</option></select></label>
          <label><span>Цвет</span><div className="heroColorControl"><input type="color" value={selectedState.color ?? "#ffffff"} onChange={(e) => patch({ color: e.target.value })}/><input value={selectedState.color ?? "#ffffff"} onChange={(e) => patch({ color: e.target.value })}/></div></label>
          <label><span>Цвет обводки</span><div className="heroColorControl"><input type="color" value={selectedState.stroke_color ?? "#000000"} onChange={(e) => patch({ stroke_color: e.target.value })}/><input value={selectedState.stroke_color ?? "#000000"} onChange={(e) => patch({ stroke_color: e.target.value })}/></div></label>
          <label><span>Обводка</span><div className="heroTextNumber"><input type="range" min="0" max="6" step="0.25" value={selectedState.stroke_width ?? 0} onChange={(e) => patch({ stroke_width: Number(e.target.value) })}/><input type="number" min="0" max="8" step="0.25" value={selectedState.stroke_width ?? 0} onChange={(e) => patch({ stroke_width: Number(e.target.value) })}/><b>px</b></div></label>
          <label><span>Межбуквенный</span><div className="heroTextNumber"><input type="range" min="-8" max="18" step="0.25" value={selectedState.letter_spacing ?? 0} onChange={(e) => patch({ letter_spacing: Number(e.target.value) })}/><input type="number" min="-12" max="24" step="0.25" value={selectedState.letter_spacing ?? 0} onChange={(e) => patch({ letter_spacing: Number(e.target.value) })}/><b>px</b></div></label>
          <label><span>Высота строки</span><div className="heroTextNumber"><input type="range" min="0.75" max="2" step="0.05" value={selectedState.line_height ?? 1.05} onChange={(e) => patch({ line_height: Number(e.target.value) })}/><input type="number" min="0.7" max="2.4" step="0.05" value={selectedState.line_height ?? 1.05} onChange={(e) => patch({ line_height: Number(e.target.value) })}/><b>x</b></div></label>
          <label><span>Тень</span><div className="heroTextNumber"><input type="range" min="0" max="100" value={selectedState.shadow_strength ?? 0} onChange={(e) => patch({ shadow_strength: Number(e.target.value) })}/><input type="number" min="0" max="100" value={selectedState.shadow_strength ?? 0} onChange={(e) => patch({ shadow_strength: Number(e.target.value) })}/><b>%</b></div></label>
        </div>
        <div className="heroTypographyToggles"><label><input type="checkbox" checked={selectedState.italic ?? false} onChange={(e) => patch({ italic: e.target.checked })}/><span>Курсив</span></label><label><input type="checkbox" checked={selectedState.underline ?? false} onChange={(e) => patch({ underline: e.target.checked })}/><span>Подчёркивание</span></label></div>
      </div>}
      <div className="heroLayerLegend"><span>◉ видим</span><span>○ скрыт</span><span>🔒 защищён</span></div>
    </section>
  );
}
