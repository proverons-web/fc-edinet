"use client";

import { useMemo, useState } from "react";
import {
  blockSupportsButton,
  blockSupportsGrid,
  blockSupportsImage,
  blockSupportsItemLimit,
  blockSupportsText,
  blockTypeLabel,
  createHomepageBlock,
  homepageBlockCatalog,
} from "@/lib/block-library";
import { homepageSectionLabels } from "@/lib/types";
import type {
  DesignMediaAsset,
  HomepageCustomBlock,
  HomepageLayoutItem,
  HomepageSectionKey,
} from "@/lib/types";

type Mode = "desktop" | "tablet" | "mobile";

type Props = {
  blocks: HomepageCustomBlock[];
  setBlocks: (updater: HomepageCustomBlock[] | ((current: HomepageCustomBlock[]) => HomepageCustomBlock[])) => void;
  layoutOrder: HomepageLayoutItem[];
  setLayoutOrder: (updater: HomepageLayoutItem[] | ((current: HomepageLayoutItem[]) => HomepageLayoutItem[])) => void;
  sectionVisibility: Record<HomepageSectionKey, boolean>;
  assets: DesignMediaAsset[];
  mode: Mode;
};

export default function HomepageBlockLibrary({ blocks, setBlocks, layoutOrder, setLayoutOrder, sectionVisibility, assets, mode }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [dragging, setDragging] = useState<HomepageLayoutItem | null>(null);
  const selected = blocks.find((block) => block.id === selectedId) ?? null;
  const assetsWithImages = useMemo(() => assets.filter((asset) => asset.public_url), [assets]);

  function addBlock(type: HomepageCustomBlock["type"]) {
    const id = crypto.randomUUID();
    const block = createHomepageBlock(type, id);
    setBlocks((current) => [...current, block]);
    setLayoutOrder((current) => [...current, `block:${id}`]);
    setSelectedId(id);
  }

  function updateSelected(patch: Partial<HomepageCustomBlock>) {
    if (!selected) return;
    setBlocks((current) => current.map((block) => block.id === selected.id ? { ...block, ...patch } : block));
  }

  function updateContent(patch: Partial<HomepageCustomBlock["content"]>) {
    if (!selected) return;
    updateSelected({ content: { ...selected.content, ...patch } });
  }

  function updateDesign(patch: Partial<HomepageCustomBlock["design"]>) {
    if (!selected) return;
    updateSelected({ design: { ...selected.design, ...patch } });
  }

  function removeBlock(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
    setLayoutOrder((current) => current.filter((item) => item !== `block:${id}`));
    if (selectedId === id) setSelectedId(blocks.find((block) => block.id !== id)?.id ?? null);
  }

  function duplicateBlock(block: HomepageCustomBlock) {
    const id = crypto.randomUUID();
    const duplicate: HomepageCustomBlock = {
      ...block,
      id,
      content: { ...block.content, title_ru: `${block.content.title_ru} — копия` },
      design: { ...block.design },
    };
    setBlocks((current) => [...current, duplicate]);
    setLayoutOrder((current) => {
      const index = current.indexOf(`block:${block.id}`);
      const next = [...current];
      next.splice(index >= 0 ? index + 1 : next.length, 0, `block:${id}`);
      return next;
    });
    setSelectedId(id);
  }

  function moveItem(item: HomepageLayoutItem, direction: -1 | 1) {
    setLayoutOrder((current) => {
      const index = current.indexOf(item);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function dropOn(target: HomepageLayoutItem) {
    if (!dragging || dragging === target) return;
    setLayoutOrder((current) => {
      const next = current.filter((item) => item !== dragging);
      const index = next.indexOf(target);
      next.splice(index < 0 ? next.length : index, 0, dragging);
      return next;
    });
    setDragging(null);
  }

  function layoutLabel(item: HomepageLayoutItem) {
    if (item.startsWith("section:")) return homepageSectionLabels[item.slice(8) as HomepageSectionKey];
    const block = blocks.find((entry) => `block:${entry.id}` === item);
    return block ? block.content.title_ru || blockTypeLabel(block.type) : "Удалённый блок";
  }

  const previewColumns = selected ? (mode === "desktop" ? selected.design.columns_desktop : mode === "tablet" ? selected.design.columns_tablet : selected.design.columns_mobile) : 1;

  return (
    <section className="clubAdminSection visualControlCard blockLibraryCard">
      <div className="formSectionTitle">
        <p className="eyebrow blue">BLOCK LIBRARY</p>
        <h2>Библиотека блоков</h2>
        <p>Добавляй готовые блоки и размещай их между стандартными секциями. Никакого произвольного HTML — только управляемые компоненты FC Edineț.</p>
      </div>

      <div className="blockLibraryCatalog">
        {homepageBlockCatalog.map((item) => (
          <button type="button" key={item.type} onClick={() => addBlock(item.type)}>
            <strong>+ {item.label}</strong><span>{item.description}</span>
          </button>
        ))}
      </div>

      <div className="blockLibraryWorkspace">
        <div className="blockLayoutPanel">
          <div className="blockLibraryPanelHead"><span>СТРУКТУРА ГЛАВНОЙ</span><b>{layoutOrder.length} элементов</b></div>
          <div className="blockLayoutList">
            {layoutOrder.map((item, index) => {
              const isSection = item.startsWith("section:");
              const key = isSection ? item.slice(8) as HomepageSectionKey : null;
              const block = !isSection ? blocks.find((entry) => `block:${entry.id}` === item) : null;
              if (!isSection && !block) return null;
              return <div
                className={`blockLayoutRow ${dragging === item ? "dragging" : ""} ${block && selectedId === block.id ? "selected" : ""}`}
                key={item}
                draggable
                onDragStart={() => setDragging(item)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropOn(item)}
                onClick={() => block && setSelectedId(block.id)}
              >
                <span className="visualDragHandle">⋮⋮</span>
                <div className="blockLayoutIdentity">
                  <small>{isSection ? "СИСТЕМНАЯ СЕКЦИЯ" : blockTypeLabel(block!.type).toUpperCase()}</small>
                  <strong>{layoutLabel(item)}</strong>
                  <span>{isSection ? (sectionVisibility[key!] ? "Включена" : "Скрыта") : (block!.enabled ? "Опубликована" : "Скрыта")}</span>
                </div>
                <div className="visualSectionButtons">
                  <button type="button" onClick={(e) => { e.stopPropagation(); moveItem(item, -1); }} disabled={index === 0}>↑</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); moveItem(item, 1); }} disabled={index === layoutOrder.length - 1}>↓</button>
                  {block && <button type="button" title="Дублировать" onClick={(e) => { e.stopPropagation(); duplicateBlock(block); }}>⧉</button>}
                  {block && <button type="button" className="danger" title="Удалить" onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}>×</button>}
                </div>
              </div>;
            })}
          </div>
        </div>

        <div className="blockLibraryInspector">
          {!selected ? <div className="adminEmpty">Добавь или выбери пользовательский блок.</div> : <>
            <div className="sectionBuilderInspectorHead"><div><span>ВЫБРАН БЛОК</span><h3>{blockTypeLabel(selected.type)}</h3></div><label className="blockEnabledToggle"><input type="checkbox" checked={selected.enabled} onChange={(e) => updateSelected({ enabled: e.target.checked })}/><b>{selected.enabled ? "Включён" : "Скрыт"}</b></label></div>

            <div className="blockInspectorGroup">
              <h4>Контент</h4>
              <div className="sectionBuilderFieldGrid">
                <label><span>Eyebrow RU</span><input value={selected.content.eyebrow_ru} onChange={(e) => updateContent({ eyebrow_ru: e.target.value })}/></label>
                <label><span>Eyebrow RO</span><input value={selected.content.eyebrow_ro} onChange={(e) => updateContent({ eyebrow_ro: e.target.value })}/></label>
                <label><span>Заголовок RU</span><input value={selected.content.title_ru} onChange={(e) => updateContent({ title_ru: e.target.value })}/></label>
                <label><span>Заголовок RO</span><input value={selected.content.title_ro} placeholder="Fallback на RU" onChange={(e) => updateContent({ title_ro: e.target.value })}/></label>
              </div>
              {blockSupportsText(selected.type) && <div className="blockTextareas"><label><span>Текст RU</span><textarea rows={5} value={selected.content.text_ru} onChange={(e) => updateContent({ text_ru: e.target.value })}/></label><label><span>Текст RO</span><textarea rows={5} value={selected.content.text_ro} placeholder="Fallback на RU" onChange={(e) => updateContent({ text_ro: e.target.value })}/></label></div>}
              {blockSupportsImage(selected.type) && <div className="blockAssetPicker"><label><span>Изображение из Media Library</span><select value={selected.content.image_url ?? ""} onChange={(e) => updateContent({ image_url: e.target.value || null })}><option value="">Без изображения</option>{assetsWithImages.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.file_name} • {asset.variant ?? "asset"}</option>)}</select></label>{selected.content.image_url && <img src={selected.content.image_url} alt=""/>}<div className="sectionBuilderFieldGrid"><label><span>ALT RU</span><input value={selected.content.image_alt_ru} onChange={(e)=>updateContent({image_alt_ru:e.target.value})}/></label><label><span>ALT RO</span><input value={selected.content.image_alt_ro} onChange={(e)=>updateContent({image_alt_ro:e.target.value})}/></label></div></div>}
              {blockSupportsButton(selected.type) && <div className="sectionBuilderFieldGrid"><label><span>Кнопка RU</span><input value={selected.content.button_text_ru} onChange={(e)=>updateContent({button_text_ru:e.target.value})}/></label><label><span>Кнопка RO</span><input value={selected.content.button_text_ro} onChange={(e)=>updateContent({button_text_ro:e.target.value})}/></label><label><span>Ссылка</span><input value={selected.content.button_href} onChange={(e)=>updateContent({button_href:e.target.value})}/></label></div>}
            </div>

            <div className="blockInspectorGroup">
              <h4>Дизайн</h4>
              <div className="sectionBuilderFieldGrid">
                <label><span>Ширина</span><select value={selected.design.width} onChange={(e)=>updateDesign({width:e.target.value as typeof selected.design.width})}><option value="container">Container</option><option value="wide">Wide</option><option value="full">Full width</option></select></label>
                <label><span>Фон</span><select value={selected.design.background} onChange={(e)=>updateDesign({background:e.target.value as typeof selected.design.background})}><option value="inherit">По умолчанию</option><option value="light">Светлый</option><option value="dark">Тёмный</option><option value="brand">Клубный синий</option></select></label>
                <label><span>Текст</span><select value={selected.design.text_align} onChange={(e)=>updateDesign({text_align:e.target.value as typeof selected.design.text_align})}><option value="left">Слева</option><option value="center">Центр</option><option value="right">Справа</option></select></label>
                {selected.type === "text_image" && <label><span>Изображение</span><select value={selected.design.image_position} onChange={(e)=>updateDesign({image_position:e.target.value as "left"|"right"})}><option value="left">Слева</option><option value="right">Справа</option></select></label>}
              </div>
              <div className="sectionBuilderFieldGrid"><label><span>Отступ сверху</span><input type="number" min={0} max={180} value={selected.design.padding_top} onChange={(e)=>updateDesign({padding_top:clamp(Number(e.target.value),0,180)})}/></label><label><span>Отступ снизу</span><input type="number" min={0} max={180} value={selected.design.padding_bottom} onChange={(e)=>updateDesign({padding_bottom:clamp(Number(e.target.value),0,180)})}/></label></div>
              {blockSupportsItemLimit(selected.type) && <label className="blockSingleField"><span>{selected.type === "standings" ? "Строк таблицы" : "Количество элементов"}</span><input type="number" min={1} max={selected.type === "partners" ? 24 : 12} value={selected.design.item_limit} onChange={(e)=>updateDesign({item_limit:clamp(Number(e.target.value),1,selected.type === "partners" ? 24 : 12)})}/></label>}
              {blockSupportsGrid(selected.type) && <div className="sectionBuilderColumns"><label><span>Desktop</span><select value={selected.design.columns_desktop} onChange={(e)=>updateDesign({columns_desktop:Number(e.target.value)})}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v} кол.</option>)}</select></label><label><span>Tablet</span><select value={selected.design.columns_tablet} onChange={(e)=>updateDesign({columns_tablet:Number(e.target.value)})}>{[1,2,3,4].map(v=><option key={v} value={v}>{v} кол.</option>)}</select></label><label><span>Mobile</span><select value={selected.design.columns_mobile} onChange={(e)=>updateDesign({columns_mobile:Number(e.target.value)})}>{[1,2].map(v=><option key={v} value={v}>{v} кол.</option>)}</select></label></div>}
            </div>

            <div className={`blockLibraryPreview sectionBuilderPreview-${selected.design.background}`} style={{ textAlign:selected.design.text_align, paddingTop:Math.min(selected.design.padding_top,60), paddingBottom:Math.min(selected.design.padding_bottom,60) }}>
              <span>{selected.content.eyebrow_ru}</span><h3>{selected.content.title_ru || blockTypeLabel(selected.type)}</h3>
              {blockSupportsText(selected.type) && <p>{selected.content.text_ru}</p>}
              {blockSupportsImage(selected.type) && selected.content.image_url && <img src={selected.content.image_url} alt=""/>}
              {blockSupportsGrid(selected.type) && <div className="blockPreviewGrid" style={{gridTemplateColumns:`repeat(${Math.max(1,previewColumns)},minmax(0,1fr))`}}>{Array.from({length:Math.min(selected.design.item_limit,8)},(_,i)=><i key={i}>{i+1}</i>)}</div>}
              {selected.type === "standings" && <div className="sectionBuilderPreviewTable">{Array.from({length:Math.min(selected.design.item_limit,5)},(_,i)=><span key={i}><b>{i+1}</b><i>Команда</i><strong>{18-i}</strong></span>)}</div>}
              <small>Preview: {mode} • {selected.enabled ? "видим" : "скрыт"}</small>
            </div>
          </>}
        </div>
      </div>
    </section>
  );
}

function clamp(value: number, min: number, max: number) { return Math.round(Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))); }
