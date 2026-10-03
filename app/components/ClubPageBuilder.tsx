"use client";

import { useActionState, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ClubPageLayoutConfig, ClubSectionConfig, ClubSectionKey } from "@/lib/content-page-builder";

const labels: Record<ClubSectionKey, string> = { about: "О клубе", history: "История", stadium: "Стадион", leadership: "Руководство", achievements: "Достижения" };
const variants: Record<ClubSectionKey, {value:string; label:string}[]> = {
  about: [{value:"contact-right",label:"Текст + контакты справа"},{value:"contact-left",label:"Контакты слева"},{value:"stacked",label:"Один под другим"}],
  history: [{value:"readable",label:"Узкая читаемая колонка"},{value:"columns",label:"Две колонки"},{value:"card",label:"Текст в карточке"}],
  stadium: [{value:"cinematic",label:"Cinematic — широкое фото + карточка"},{value:"split-left",label:"Фото слева 50/50"},{value:"split-right",label:"Фото справа 50/50"},{value:"full-photo",label:"Полноширинное фото сверху"}],
  leadership: [{value:"cards",label:"Карточки"},{value:"compact",label:"Компактный список"}],
  achievements: [{value:"timeline",label:"Таймлайн"},{value:"cards",label:"Карточки"}],
};

type BuilderState = { error?: string; success?: string };

export default function ClubPageBuilder({ initial, action, stadiumImageUrl }: { initial: ClubPageLayoutConfig; action: (state: BuilderState, formData: FormData) => Promise<BuilderState>; stadiumImageUrl?: string | null }) {
  const [state, formAction, pending] = useActionState(action, {} as BuilderState);
  const [layout, setLayout] = useState(initial);
  const [selected, setSelected] = useState<ClubSectionKey>(initial.sections[0]?.key ?? "stadium");
  const current = (layout.sections.find((item) => item.key === selected) ?? layout.sections[0] ?? initial.sections[0]) as ClubSectionConfig;
  const json = useMemo(() => JSON.stringify(layout), [layout]);

  function patch(key: ClubSectionKey, patch: Partial<ClubSectionConfig>) { setLayout((prev) => ({ ...prev, sections: prev.sections.map((item) => item.key === key ? { ...item, ...patch } : item) })); }
  function move(key: ClubSectionKey, delta: number) { setLayout((prev) => { const list=[...prev.sections]; const index=list.findIndex((x)=>x.key===key); const next=index+delta; if(index<0||next<0||next>=list.length)return prev; [list[index],list[next]]=[list[next],list[index]]; return {...prev,sections:list}; }); }

  return <form action={formAction} className="pageBuilderForm">
    <input type="hidden" name="layout_json" value={json}/>
    <div className="pageBuilderTopNote"><strong>Page Builder 1.0</strong><span>Выбирай секцию слева, меняй настройки справа. Публикация применяется к /club.</span></div>
    <div className="pageBuilderWorkspace">
      <aside className="pageBuilderLayers"><div className="pageBuilderPanelHead"><span>СЕКЦИИ</span><b>{layout.sections.length}</b></div>{layout.sections.map((section,index)=><button type="button" key={section.key} onClick={()=>setSelected(section.key)} className={`pageBuilderLayer ${selected===section.key?"active":""}`}><span className={`pageBuilderVisibility ${section.visible?"on":"off"}`}>{section.visible?"●":"○"}</span><strong>{labels[section.key]}</strong><small>{index+1}</small></button>)}</aside>

      <section className="pageBuilderPreview"><div className="pageBuilderPreviewBrowser"><div className="pageBuilderBrowserBar"><i/><i/><i/><span>fc-edinet.vercel.app/club</span></div><div className="pageBuilderPreviewPage"><div className="pageBuilderHeroMock"><b>FC EDINEȚ</b><span>Hero управляется Visual Editor</span></div>{layout.sections.filter((s)=>s.visible).map((section)=><div key={section.key} onClick={()=>setSelected(section.key)} className={`pageBuilderMockSection mock-${section.key} mock-${section.variant} mock-bg-${section.background} ${selected===section.key?"selected":""}`} style={{paddingTop:Math.max(12,section.padding_top/4),paddingBottom:Math.max(12,section.padding_bottom/4)}}><div><small>{labels[section.key]}</small><strong>{section.key==="stadium"?"Stadionul Edineț":labels[section.key]}</strong></div>{section.key==="stadium"&&<div className="pageBuilderStadiumMock" style={{height:Math.max(90,(section.image_height??520)/4),backgroundPosition:`${section.image_position_x??50}% ${section.image_position_y??50}%`,backgroundImage:stadiumImageUrl?`linear-gradient(rgba(7,26,54,.12),rgba(7,26,54,.30)), url(${stadiumImageUrl})`:undefined}}><span>{stadiumImageUrl?"LIVE ФОТО СТАДИОНА":"ФОТО СТАДИОНА"}</span></div>}{section.key!=="stadium"&&<div className="pageBuilderTextMock"><i/><i/><i/></div>}</div>)}</div></div></section>

      <aside className="pageBuilderInspector"><div className="pageBuilderInspectorTitle"><span>АКТИВНАЯ СЕКЦИЯ</span><h2>{labels[current.key]}</h2></div>
        <div className="pageBuilderOrder"><button type="button" onClick={()=>move(current.key,-1)}>↑ Выше</button><button type="button" onClick={()=>move(current.key,1)}>↓ Ниже</button><label><input type="checkbox" checked={current.visible} onChange={(e)=>patch(current.key,{visible:e.target.checked})}/> Показывать</label></div>
        <Field label="Вариант"><select value={current.variant} onChange={(e)=>patch(current.key,{variant:e.target.value})}>{variants[current.key].map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <div className="pageBuilderTwo"><Field label="Ширина"><select value={current.width} onChange={(e)=>patch(current.key,{width:e.target.value as ClubSectionConfig["width"]})}><option value="container">Container</option><option value="wide">Wide</option><option value="full">Full</option></select></Field><Field label="Фон"><select value={current.background} onChange={(e)=>patch(current.key,{background:e.target.value as ClubSectionConfig["background"]})}><option value="inherit">Обычный</option><option value="light">Светлый</option><option value="surface">Серый</option><option value="dark">Тёмный</option><option value="brand">Синий</option></select></Field></div>
        <Range label="Отступ сверху" value={current.padding_top} min={0} max={180} onChange={(value)=>patch(current.key,{padding_top:value})}/><Range label="Отступ снизу" value={current.padding_bottom} min={0} max={180} onChange={(value)=>patch(current.key,{padding_bottom:value})}/>
        {current.key==="stadium"&&<><div className="pageBuilderInspectorDivider">ФОТО СТАДИОНА</div><Range label="Высота фото" value={current.image_height??520} min={280} max={760} step={10} suffix=" px" onChange={(value)=>patch(current.key,{image_height:value})}/><Range label="Фокус X" value={current.image_position_x??50} min={0} max={100} suffix="%" onChange={(value)=>patch(current.key,{image_position_x:value})}/><Range label="Фокус Y" value={current.image_position_y??50} min={0} max={100} suffix="%" onChange={(value)=>patch(current.key,{image_position_y:value})}/><div className="adminNotice">Для текущего фото рекомендую начать с <b>Cinematic</b>, высота 500–560 px и Focus Y около 50–60%.</div></>}
        {current.key==="leadership"&&<Field label="Колонок на Desktop"><select value={current.columns??3} onChange={(e)=>patch(current.key,{columns:Number(e.target.value)})}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></Field>}
      </aside>
    </div>
    <div className="pageBuilderPublish"><div><strong>Черновик и публикация</strong><span>Черновик можно сохранить без изменения публичной страницы.</span></div><div><button className="secondaryAdminButton" type="submit" name="intent" value="draft" disabled={pending}>{pending?"Сохраняем…":"Сохранить черновик"}</button><button className="primaryButton" type="submit" name="intent" value="publish" disabled={pending}>{pending?"Публикуем…":"Опубликовать"}</button></div></div>
    {state.error&&<div className="formError">{state.error}</div>}{state.success&&<div className="formSuccess">{state.success}</div>}
  </form>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <label className="pageBuilderField"><span>{label}</span>{children}</label>}
function Range({label,value,min,max,step=1,suffix=" px",onChange}:{label:string;value:number;min:number;max:number;step?:number;suffix?:string;onChange:(v:number)=>void}){return <div className="pageBuilderRange"><div><span>{label}</span><b>{value}{suffix}</b></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(Number(e.target.value))}/></div>}
