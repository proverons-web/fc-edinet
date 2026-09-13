"use client";

import { useActionState, useCallback, useMemo, useState, type ReactNode } from "react";
import { autosaveGlobalDesign, saveGlobalDesign } from "@/app/admin/design/global-actions";
import Publishing2Bar from "@/app/components/Publishing2Bar";
import { useDraftAutosave, useEditorHistory } from "@/app/components/usePublishing2";
import { globalPublishingChecks } from "@/lib/publishing";
import {
  headerNavKeys,
  type FooterColumnConfig,
  type FooterDesignConfig,
  type HeaderDesignConfig,
  type HeaderNavKey,
} from "@/lib/global-design";
import type { DesignMediaAsset } from "@/lib/types";

const initialState: { success?: string; error?: string } = {};
const navLabels: Record<HeaderNavKey, string> = { news: "Новости", team: "Команда", statistics: "Статистика", matches: "Матчи", standings: "Таблица", club: "Клуб", media: "Медиа" };

export default function GlobalDesignEditor({
  componentKey,
  initial,
  assets,
}: {
  componentKey: "header" | "footer";
  initial: HeaderDesignConfig | FooterDesignConfig;
  assets: DesignMediaAsset[];
}) {
  const [state, action, pending] = useActionState(saveGlobalDesign, initialState);
  const [config, setConfig] = useState(initial);
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const imageAssets = useMemo(() => assets.filter((asset) => Boolean(asset.public_url)), [assets]);
  const isHeader = componentKey === "header";
  const history = useEditorHistory(config, (value) => setConfig(value));
  const autosaveAction = useCallback((value: HeaderDesignConfig | FooterDesignConfig) => autosaveGlobalDesign(componentKey, value), [componentKey]);
  const autosave = useDraftAutosave(config, autosaveAction);
  const checks = useMemo(() => globalPublishingChecks(componentKey, config), [componentKey, config]);
  const hasBlockingChecks = checks.some((check) => check.level === "error");

  return <form action={action} className="globalBuilderForm">
    <input type="hidden" name="component_key" value={componentKey} />
    <input type="hidden" name="config_json" value={JSON.stringify(config)} />
    <Publishing2Bar autosave={autosave} canUndo={history.canUndo} canRedo={history.canRedo} onUndo={history.undo} onRedo={history.redo} previewHref={`/admin/design/preview?page=global_${componentKey}`} checks={checks} preparePreview={() => autosaveAction(config)} />
    <div className="globalBuilderToolbar">
      <div className="deviceToggle"><button type="button" className={mode === "desktop" ? "active" : ""} onClick={() => setMode("desktop")}>Desktop</button><button type="button" className={mode === "mobile" ? "active" : ""} onClick={() => setMode("mobile")}>Mobile</button></div>
      <div className="globalBuilderActions"><input name="version_label" placeholder="Комментарий к версии"/><button type="submit" name="intent" value="draft" className="rowAction" disabled={pending}>Сохранить черновик</button><button type="submit" name="intent" value="publish" className="primaryButton" disabled={pending || hasBlockingChecks} title={hasBlockingChecks ? "Исправь ошибки Preflight перед публикацией" : undefined}>Опубликовать</button></div>
    </div>
    {state.error && <div className="formError">{state.error}</div>}
    {state.success && <div className="formSuccess">{state.success}</div>}
    <div className="globalBuilderGrid">
      <div className="globalBuilderControls">
        {isHeader ? <HeaderControls config={config as HeaderDesignConfig} setConfig={(next) => setConfig(next)} assets={imageAssets} /> : <FooterControls config={config as FooterDesignConfig} setConfig={(next) => setConfig(next)} assets={imageAssets} />}
      </div>
      <div className="globalBuilderPreviewWrap">
        <div className={`globalBuilderPreview ${mode}`}>
          {isHeader ? <HeaderPreview config={config as HeaderDesignConfig} mode={mode} /> : <FooterPreview config={config as FooterDesignConfig} />}
          <div className="globalPreviewPage"><span>LIVE PREVIEW</span><strong>FC Edineț</strong><p>Содержимое страницы</p></div>
        </div>
      </div>
    </div>
  </form>;
}

function HeaderControls({ config, setConfig, assets }: { config: HeaderDesignConfig; setConfig: (next: HeaderDesignConfig) => void; assets: DesignMediaAsset[] }) {
  const update = (patch: Partial<HeaderDesignConfig>) => setConfig({ ...config, ...patch });
  function move(key: HeaderNavKey, direction: -1 | 1) {
    const index = config.nav_order.indexOf(key); const nextIndex = index + direction; if (index < 0 || nextIndex < 0 || nextIndex >= config.nav_order.length) return;
    const next = [...config.nav_order]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; update({ nav_order: next });
  }
  return <>
    <ControlSection title="Topbar и поведение">
      <Check label="Показывать верхнюю строку" checked={config.topbar_enabled} onChange={(value) => update({ topbar_enabled: value })}/>
      <Check label="Sticky Header" checked={config.sticky} onChange={(value) => update({ sticky: value })}/>
      <Select label="Фон Header" value={config.background} onChange={(value) => update({ background: value as HeaderDesignConfig["background"] })} options={[['solid','Сплошной'],['glass','Glass / blur'],['transparent','Прозрачный']]}/>
      <Range label={`Высота Desktop — ${config.height_desktop}px`} min={56} max={120} value={config.height_desktop} onChange={(value) => update({ height_desktop: value })}/>
      <Range label={`Высота Mobile — ${config.height_mobile}px`} min={52} max={96} value={config.height_mobile} onChange={(value) => update({ height_mobile: value })}/>
      <Text label="Topbar RU" value={config.topbar_text_ru} onChange={(value) => update({ topbar_text_ru: value })}/>
      <Text label="Topbar RO" value={config.topbar_text_ro} onChange={(value) => update({ topbar_text_ro: value })}/>
    </ControlSection>
    <ControlSection title="Логотип и бренд">
      <Select label="Тип логотипа" value={config.logo_mode} onChange={(value) => update({ logo_mode: value as "crest" | "image" })} options={[['crest','Стандартный FCE'],['image','Изображение']]}/>
      {config.logo_mode === "image" && <><Text label="URL логотипа" value={config.logo_url ?? ''} onChange={(value) => update({ logo_url: value || null })}/><AssetSelect assets={assets} onSelect={(url) => update({ logo_url: url, logo_mode: 'image' })}/></>}
      <Range label={`Ширина логотипа — ${config.logo_width}px`} min={28} max={120} value={config.logo_width} onChange={(value) => update({ logo_width: value })}/>
      <Text label="Название" value={config.brand_name} onChange={(value) => update({ brand_name: value })}/>
      <Text label="Подзаголовок" value={config.brand_subtitle} onChange={(value) => update({ brand_subtitle: value })}/>
      <Check label="Показывать текст бренда" checked={config.show_brand_text} onChange={(value) => update({ show_brand_text: value })}/>
    </ControlSection>
    <ControlSection title="Действия Header">
      <Check label="RU / RO" checked={config.show_language} onChange={(value) => update({ show_language: value })}/>
      <Check label="Поиск" checked={config.show_search} onChange={(value) => update({ show_search: value })}/>
      <Check label="Аккаунт / Войти" checked={config.show_account} onChange={(value) => update({ show_account: value })}/>
      <Check label="Ссылка Админка для staff" checked={config.show_admin_link} onChange={(value) => update({ show_admin_link: value })}/>
    </ControlSection>
    <ControlSection title="Меню и порядок">
      <div className="globalNavEditor">{config.nav_order.map((key, index) => <div className="globalNavRow" key={key}><input type="checkbox" checked={config.nav_visibility[key]} onChange={(event) => update({ nav_visibility: { ...config.nav_visibility, [key]: event.target.checked } })}/><strong>{navLabels[key]}</strong><div><button type="button" onClick={() => move(key, -1)} disabled={index === 0}>↑</button><button type="button" onClick={() => move(key, 1)} disabled={index === config.nav_order.length - 1}>↓</button></div></div>)}</div>
    </ControlSection>
  </>;
}

function FooterControls({ config, setConfig, assets }: { config: FooterDesignConfig; setConfig: (next: FooterDesignConfig) => void; assets: DesignMediaAsset[] }) {
  const update = (patch: Partial<FooterDesignConfig>) => setConfig({ ...config, ...patch });
  function updateColumn(index: number, patch: Partial<FooterColumnConfig>) { update({ columns: config.columns.map((column, i) => i === index ? { ...column, ...patch } : column) }); }
  function moveColumn(index: number, direction: -1 | 1) { const nextIndex = index + direction; if (nextIndex < 0 || nextIndex >= config.columns.length) return; const next = [...config.columns]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; update({ columns: next }); }
  function addColumn() { if (config.columns.length >= 6) return; const id = `column-${crypto.randomUUID().slice(0,8)}`; update({ columns: [...config.columns, { id, title_ru: "Новая колонка", title_ro: "Coloană nouă", visible: true, links: [] }] }); }
  function removeColumn(index: number) { update({ columns: config.columns.filter((_, i) => i !== index) }); }
  function addLink(index: number) { const column = config.columns[index]; if (!column || column.links.length >= 10) return; updateColumn(index, { links: [...column.links, { id: `link-${crypto.randomUUID().slice(0,8)}`, label_ru: "Новая ссылка", label_ro: "Link nou", href: "/" }] }); }
  function removeLink(columnIndex: number, linkIndex: number) { const column = config.columns[columnIndex]; if (!column) return; updateColumn(columnIndex, { links: column.links.filter((_, i) => i !== linkIndex) }); }
  return <>
    <ControlSection title="Внешний вид Footer">
      <Select label="Фон" value={config.background} onChange={(value) => update({ background: value as FooterDesignConfig['background'] })} options={[['dark','Тёмный'],['blue','Клубный синий'],['light','Светлый']]}/>
      <Range label={`Отступ сверху — ${config.padding_top}px`} min={20} max={140} value={config.padding_top} onChange={(value) => update({ padding_top: value })}/>
      <Range label={`Отступ снизу — ${config.padding_bottom}px`} min={12} max={100} value={config.padding_bottom} onChange={(value) => update({ padding_bottom: value })}/>
    </ControlSection>
    <ControlSection title="Логотип и описание">
      <Select label="Тип логотипа" value={config.logo_mode} onChange={(value) => update({ logo_mode: value as 'crest'|'image' })} options={[['crest','Стандартный FCE'],['image','Изображение']]}/>
      {config.logo_mode === 'image' && <><Text label="URL логотипа" value={config.logo_url ?? ''} onChange={(value) => update({ logo_url: value || null })}/><AssetSelect assets={assets} onSelect={(url) => update({ logo_url: url, logo_mode: 'image' })}/></>}
      <Range label={`Ширина логотипа — ${config.logo_width}px`} min={28} max={120} value={config.logo_width} onChange={(value) => update({ logo_width: value })}/>
      <Text label="Название" value={config.brand_name} onChange={(value) => update({ brand_name: value })}/><Text label="Подзаголовок" value={config.brand_subtitle} onChange={(value) => update({ brand_subtitle: value })}/>
      <Check label="Показывать описание" checked={config.show_about} onChange={(value) => update({ show_about: value })}/><TextArea label="Описание RU" value={config.about_ru} onChange={(value) => update({ about_ru: value })}/><TextArea label="Описание RO" value={config.about_ro} onChange={(value) => update({ about_ro: value })}/>
    </ControlSection>
    <ControlSection title="Колонки Footer">
      <div className="footerColumnsEditor">{config.columns.map((column, index) => <details key={column.id} open={index === 0}><summary><span>{column.title_ru || `Колонка ${index+1}`}</span><span>{column.visible ? '●' : '○'}</span></summary><div className="footerColumnControls"><Check label="Показывать колонку" checked={column.visible} onChange={(value) => updateColumn(index, { visible: value })}/><Text label="Заголовок RU" value={column.title_ru} onChange={(value) => updateColumn(index, { title_ru: value })}/><Text label="Заголовок RO" value={column.title_ro} onChange={(value) => updateColumn(index, { title_ro: value })}/><div className="miniMoveButtons"><button type="button" onClick={() => moveColumn(index,-1)} disabled={index===0}>↑ Выше</button><button type="button" onClick={() => moveColumn(index,1)} disabled={index===config.columns.length-1}>↓ Ниже</button><button type="button" className="dangerMini" onClick={() => removeColumn(index)}>Удалить колонку</button></div>{column.links.map((link, linkIndex) => <div className="footerLinkEditor" key={link.id}><div className="footerLinkTitle"><strong>Ссылка {linkIndex+1}</strong><button type="button" onClick={() => removeLink(index,linkIndex)}>Удалить</button></div><Text label="RU" value={link.label_ru} onChange={(value) => updateColumn(index,{links:column.links.map((item,i)=>i===linkIndex?{...item,label_ru:value}:item)})}/><Text label="RO" value={link.label_ro} onChange={(value) => updateColumn(index,{links:column.links.map((item,i)=>i===linkIndex?{...item,label_ro:value}:item)})}/><Text label="URL" value={link.href} onChange={(value) => updateColumn(index,{links:column.links.map((item,i)=>i===linkIndex?{...item,href:value}:item)})}/></div>)}<button type="button" className="rowAction muted footerAddLink" onClick={() => addLink(index)} disabled={column.links.length>=10}>+ Добавить ссылку</button></div></details>)}</div>
      <button type="button" className="rowAction footerAddColumn" onClick={addColumn} disabled={config.columns.length>=6}>+ Добавить колонку</button>
    </ControlSection>
    <ControlSection title="Соцсети и нижняя строка">
      <Check label="Показывать соцсети" checked={config.social_enabled} onChange={(value) => update({ social_enabled: value })}/>
      {config.social_enabled && <><Text label="Facebook" value={config.facebook_url} onChange={(value) => update({ facebook_url: value })}/><Text label="Instagram" value={config.instagram_url} onChange={(value) => update({ instagram_url: value })}/><Text label="YouTube" value={config.youtube_url} onChange={(value) => update({ youtube_url: value })}/><Text label="TikTok" value={config.tiktok_url} onChange={(value) => update({ tiktok_url: value })}/></>}
      <Check label="Показывать copyright" checked={config.show_copyright} onChange={(value) => update({ show_copyright: value })}/><Text label="Copyright" value={config.copyright_text} onChange={(value) => update({ copyright_text: value })}/><Check label="Показывать версию сайта" checked={config.show_version} onChange={(value) => update({ show_version: value })}/>
    </ControlSection>
  </>;
}

function HeaderPreview({ config, mode }: { config: HeaderDesignConfig; mode: "desktop"|"mobile" }) {
  const visibleNav = config.nav_order.filter((key) => config.nav_visibility[key]);
  return <div className={`headerPreview ${config.background}`}>
    {config.topbar_enabled && <div className="headerPreviewTop">{config.topbar_text_ru}<span>{config.show_language ? 'RU / RO' : ''}</span></div>}
    <div className="headerPreviewMain" style={{ minHeight: mode === 'desktop' ? config.height_desktop : config.height_mobile }}><PreviewBrand mode={config.logo_mode} logoUrl={config.logo_url} width={config.logo_width} brand={config.brand_name} subtitle={config.brand_subtitle} showText={config.show_brand_text}/>{mode==='desktop' ? <div className="headerPreviewNav">{visibleNav.map((key)=><span key={key}>{navLabels[key]}</span>)}</div> : <span className="previewBurger">☰</span>}<div className="headerPreviewActions">{config.show_search && <span>⌕</span>}{config.show_account && <span>●</span>}</div></div>
  </div>;
}
function FooterPreview({ config }: { config: FooterDesignConfig }) { return <div className={`footerPreview ${config.background}`} style={{ paddingTop: Math.max(24, config.padding_top/2), paddingBottom: Math.max(16, config.padding_bottom/2) }}><div className="footerPreviewGrid"><div><PreviewBrand mode={config.logo_mode} logoUrl={config.logo_url} width={config.logo_width} brand={config.brand_name} subtitle={config.brand_subtitle} showText/><p>{config.show_about ? config.about_ru : ''}</p></div>{config.columns.filter(c=>c.visible).map(column=><div key={column.id}><strong>{column.title_ru}</strong>{column.links.map(link=><span key={link.id}>{link.label_ru}</span>)}</div>)}</div>{config.social_enabled && <div className="footerPreviewSocial">{['Facebook','Instagram','YouTube','TikTok'].filter((_,i)=>[config.facebook_url,config.instagram_url,config.youtube_url,config.tiktok_url][i]).join(' • ')}</div>}<div className="footerPreviewBottom">{config.show_copyright && <span>{config.copyright_text}</span>}{config.show_version && <span>Версия 2.2.0</span>}</div></div>; }
function PreviewBrand({mode,logoUrl,width,brand,subtitle,showText}:{mode:'crest'|'image';logoUrl:string|null;width:number;brand:string;subtitle:string;showText:boolean}) { return <div className="previewBrand">{mode==='image'&&logoUrl?<img src={logoUrl} alt="" style={{width}}/>:<span className="previewCrest" style={{width,height:Math.round(width*1.17)}}>FCE</span>}{showText&&<span><strong>{brand}</strong><small>{subtitle}</small></span>}</div>; }

function ControlSection({ title, children }: { title: string; children: ReactNode }) { return <section className="globalControlSection"><h3>{title}</h3>{children}</section>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value:boolean)=>void }) { return <label className="globalCheck"><input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)}/><span>{label}</span></label>; }
function Text({ label, value, onChange }: { label:string;value:string;onChange:(value:string)=>void }) { return <label className="globalField"><span>{label}</span><input value={value} onChange={(e)=>onChange(e.target.value)}/></label>; }
function TextArea({ label, value, onChange }: { label:string;value:string;onChange:(value:string)=>void }) { return <label className="globalField"><span>{label}</span><textarea rows={3} value={value} onChange={(e)=>onChange(e.target.value)}/></label>; }
function Range({label,min,max,value,onChange}:{label:string;min:number;max:number;value:number;onChange:(value:number)=>void}) { return <label className="globalField"><span>{label}</span><input type="range" min={min} max={max} value={value} onChange={(e)=>onChange(Number(e.target.value))}/></label>; }
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:[string,string][]}) { return <label className="globalField"><span>{label}</span><select value={value} onChange={(e)=>onChange(e.target.value)}>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>; }
function AssetSelect({assets,onSelect}:{assets:DesignMediaAsset[];onSelect:(url:string)=>void}) { return <label className="globalField"><span>Выбрать из Media Library</span><select defaultValue="" onChange={(e)=>{if(e.target.value)onSelect(e.target.value)}}><option value="">— Выбрать изображение —</option>{assets.slice(0,60).map(asset=><option key={asset.id} value={asset.public_url}>{asset.file_name}</option>)}</select></label>; }
