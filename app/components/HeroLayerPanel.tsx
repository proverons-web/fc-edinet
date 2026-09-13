"use client";

import type { HeroLayerConfig } from "@/lib/types";
import type { HeroLayerDefinition } from "@/lib/hero-builder";
import { heroLayerState, moveHeroLayer, updateHeroLayer } from "@/lib/hero-builder";

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
  return (
    <section className="clubAdminSection visualControlCard heroLayersCard">
      <div className="formSectionTitle">
        <p className="eyebrow blue">HERO BUILDER 2.0</p>
        <h2>Слои Hero</h2>
        <p>Выбери слой в списке или прямо в Preview. Скрытые слои не попадут на сайт, заблокированные защищены от случайных изменений.</p>
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
      <div className="heroLayerLegend"><span>◉ видим</span><span>○ скрыт</span><span>🔒 защищён</span></div>
    </section>
  );
}
