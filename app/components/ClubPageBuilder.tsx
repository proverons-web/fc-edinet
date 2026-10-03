"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  clubSectionElements,
  clubPagePreset,
  clubPagePresetOptions,
  defaultClubPageLayout,
  type BuilderBreakpoint,
  type ClubElementFrame,
  type ClubElementKey,
  type ClubPageLayoutConfig,
  type ClubPagePresetKey,
  type ClubSectionConfig,
  type ClubSectionKey,
} from "@/lib/content-page-builder";

const labels: Record<ClubSectionKey, string> = { about:"О клубе",history:"История",stadium:"Стадион",leadership:"Руководство",achievements:"Достижения" };
const elementLabels: Record<ClubElementKey,string> = {
  "about-copy":"Текст о клубе","about-contact":"Контакты","history-copy":"Текст истории","stadium-heading":"Заголовок стадиона","stadium-image":"Фото стадиона","stadium-info":"Информация о стадионе","leadership-heading":"Заголовок руководства","leadership-grid":"Карточки руководства","achievements-heading":"Заголовок достижений","achievements-list":"Список достижений",
};
const variants: Record<ClubSectionKey,{value:string;label:string}[]> = {
  about:[{value:"contact-right",label:"Текст + контакты справа"},{value:"contact-left",label:"Контакты слева"},{value:"stacked",label:"Один под другим"}],
  history:[{value:"readable",label:"Узкая читаемая колонка"},{value:"columns",label:"Две колонки"},{value:"card",label:"Текст в карточке"}],
  stadium:[{value:"cinematic",label:"Cinematic"},{value:"split-left",label:"Фото слева 50/50"},{value:"split-right",label:"Фото справа 50/50"},{value:"full-photo",label:"Фото сверху"}],
  leadership:[{value:"cards",label:"Карточки"},{value:"compact",label:"Компактный список"}],
  achievements:[{value:"timeline",label:"Таймлайн"},{value:"cards",label:"Карточки"}],
};
const deviceSpec: Record<BuilderBreakpoint,{label:string;width:number;height:number}> = {
  desktop:{label:"Desktop 1920",width:1920,height:1080}, tablet:{label:"Tablet 1024",width:1024,height:1366}, mobile:{label:"Mobile 390",width:390,height:844},
};
type BuilderState={error?:string;success?:string};
type Selected={sectionKey:ClubSectionKey;elementKey:ClubElementKey};
type Zoom="auto"|25|33|50|67|100;

export default function ClubPageBuilder({initial,action}:{initial:ClubPageLayoutConfig;action:(state:BuilderState,formData:FormData)=>Promise<BuilderState>}) {
  const [state,formAction,pending]=useActionState(action,{} as BuilderState);
  const [layout,setLayout]=useState(initial);
  const firstSection=initial.sections[0]?.key ?? "about";
  const [selected,setSelected]=useState<Selected>({sectionKey:firstSection,elementKey:clubSectionElements(firstSection)[0]});
  const [breakpoint,setBreakpoint]=useState<BuilderBreakpoint>("desktop");
  const [zoom,setZoom]=useState<Zoom>("auto");
  const [autoScale,setAutoScale]=useState(.5);
  const previewAreaRef=useRef<HTMLDivElement|null>(null);
  const iframeRef=useRef<HTMLIFrameElement|null>(null);
  const json=useMemo(()=>JSON.stringify(layout),[layout]);
  const current=layout.sections.find((item)=>item.key===selected.sectionKey) ?? layout.sections[0];
  const currentFrame=current?.frames[breakpoint][selected.elementKey];
  const spec=deviceSpec[breakpoint];
  const scale=zoom==="auto"?autoScale:zoom/100;

  useEffect(()=>{
    const node=previewAreaRef.current; if(!node)return;
    const update=()=>setAutoScale(Math.max(.15,Math.min(1,(node.clientWidth-28)/spec.width)));
    update(); const ro=new ResizeObserver(update); ro.observe(node); return()=>ro.disconnect();
  },[spec.width]);

  const sendPreview=()=>iframeRef.current?.contentWindow?.postMessage({type:"fc-club-builder-layout",layout,breakpoint,selected},window.location.origin);
  useEffect(()=>{sendPreview();},[layout,breakpoint,selected]);

  useEffect(()=>{
    const onMessage=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin)return;
      const data=event.data as {type?:string;sectionKey?:ClubSectionKey;elementKey?:ClubElementKey;breakpoint?:BuilderBreakpoint;frame?:ClubElementFrame;focus?:{x:number;y:number}};
      if(data?.type==="fc-club-builder-ready"){sendPreview();return;}
      if(data?.type==="fc-club-builder-select"&&data.sectionKey&&data.elementKey){setSelected({sectionKey:data.sectionKey,elementKey:data.elementKey});return;}
      if(data?.type==="fc-club-builder-frame"&&data.sectionKey&&data.elementKey&&data.breakpoint&&data.frame){patchFrame(data.sectionKey,data.elementKey,data.breakpoint,data.frame);return;}
      if(data?.type==="fc-club-builder-image-focus"&&data.sectionKey==="stadium"&&data.breakpoint&&data.focus){patchImageFocus(data.breakpoint,data.focus.x,data.focus.y);}
    };
    window.addEventListener("message",onMessage);return()=>window.removeEventListener("message",onMessage);
  });

  function patchSection(key:ClubSectionKey,patch:Partial<ClubSectionConfig>){setLayout(prev=>({...prev,preset:undefined,sections:prev.sections.map(item=>item.key===key?{...item,...patch}:item)}));}
  function patchFrame(sectionKey:ClubSectionKey,elementKey:ClubElementKey,bp:BuilderBreakpoint,patch:Partial<ClubElementFrame>){setLayout(prev=>({...prev,preset:undefined,sections:prev.sections.map(section=>section.key===sectionKey?{...section,frames:{...section.frames,[bp]:{...section.frames[bp],[elementKey]:{...section.frames[bp][elementKey],...patch}}}}:section)}));}
  function patchImageFocus(bp:BuilderBreakpoint,x:number,y:number){setLayout(prev=>({...prev,preset:undefined,sections:prev.sections.map(section=>section.key==="stadium"?{...section,image_focus:{...(section.image_focus??{desktop:{x:50,y:52},tablet:{x:50,y:52},mobile:{x:50,y:52}}),[bp]:{x:Math.max(0,Math.min(100,Math.round(x))),y:Math.max(0,Math.min(100,Math.round(y)))}}}:section)}));}
  function applyPreset(key:ClubPagePresetKey){if(!window.confirm("Применить дизайн-пресет ко всей странице? Текущая несохранённая раскладка будет заменена."))return;const next=clubPagePreset(key);setLayout(next);const first=next.sections[0];setSelected({sectionKey:first.key,elementKey:clubSectionElements(first.key)[0]});}
  function moveSection(key:ClubSectionKey,delta:number){setLayout(prev=>{const list=[...prev.sections];const index=list.findIndex(x=>x.key===key);const next=index+delta;if(index<0||next<0||next>=list.length)return prev;[list[index],list[next]]=[list[next],list[index]];return{...prev,sections:list};});}
  function selectSection(key:ClubSectionKey){setSelected({sectionKey:key,elementKey:clubSectionElements(key)[0]});}
  function resetSection(key:ClubSectionKey){const base=defaultClubPageLayout().sections.find(s=>s.key===key);if(!base)return;setLayout(prev=>({...prev,sections:prev.sections.map(s=>s.key===key?base:s)}));setSelected({sectionKey:key,elementKey:clubSectionElements(key)[0]});}
  function resetElement(){const base=defaultClubPageLayout().sections.find(s=>s.key===selected.sectionKey);const value=base?.frames[breakpoint][selected.elementKey];if(value)patchFrame(selected.sectionKey,selected.elementKey,breakpoint,value);}
  function copyDesktop(){if(breakpoint==="desktop")return;const source=current?.frames.desktop[selected.elementKey];if(source)patchFrame(selected.sectionKey,selected.elementKey,breakpoint,source);}

  return <form action={formAction} className="pageBuilder2Form">
    <input type="hidden" name="layout_json" value={json}/>
    <div className="pageBuilder2Topbar">
      <div><strong>Page Builder 3.0</strong><span>Превью = реальная страница. Два дизайн-пресета, свободная раскладка и отдельное позиционирование изображения внутри рамки.</span></div>
      <div className="pageBuilder2DeviceTabs">{(Object.keys(deviceSpec) as BuilderBreakpoint[]).map(bp=><button type="button" key={bp} className={breakpoint===bp?"active":""} onClick={()=>setBreakpoint(bp)}>{deviceSpec[bp].label}</button>)}</div>
      <div className="pageBuilder2Zoom"><span>Zoom</span><select value={zoom} onChange={e=>setZoom(e.target.value==="auto"?"auto":Number(e.target.value) as Zoom)}><option value="auto">Auto</option>{[25,33,50,67,100].map(v=><option key={v} value={v}>{v}%</option>)}</select></div>
    </div>

    <div className="pageBuilderPresetBar">
      <div><span>ГОТОВЫЕ ДИЗАЙНЫ</span><strong>Стартуй с варианта, потом дорабатывай вручную</strong></div>
      <div className="pageBuilderPresetCards">{clubPagePresetOptions().map(option=><button type="button" key={option.key} className={layout.preset===option.key?"active":""} onClick={()=>applyPreset(option.key)}><b>{option.label}</b><small>{option.description}</small></button>)}</div>
    </div>

    <div className="pageBuilder2Workspace">
      <aside className="pageBuilder2Layers">
        <div className="pageBuilder2PanelTitle"><span>СЛОИ СТРАНИЦЫ</span><b>{layout.sections.length} секций</b></div>
        {layout.sections.map((section,index)=><div key={section.key} className={`pageBuilder2SectionGroup ${selected.sectionKey===section.key?"active":""}`}>
          <button type="button" className="pageBuilder2SectionButton" onClick={()=>selectSection(section.key)}><span className={section.visible?"on":"off"}>{section.visible?"●":"○"}</span><strong>{labels[section.key]}</strong><small>{index+1}</small></button>
          {selected.sectionKey===section.key&&<div className="pageBuilder2ElementList">{clubSectionElements(section.key).map(key=><button type="button" key={key} className={selected.elementKey===key?"active":""} onClick={()=>setSelected({sectionKey:section.key,elementKey:key})}><span>↳</span>{elementLabels[key]}</button>)}</div>}
        </div>)}
        <div className="pageBuilder2LayerHelp">В ручном режиме у элемента в превью есть <b>✥</b> для перемещения и <b>↘</b> для размера.</div>
      </aside>

      <section className="pageBuilder2Preview" ref={previewAreaRef}>
        <div className="pageBuilder2PreviewHead"><div><b>LIVE • REAL PAGE</b><span>/club • {spec.width}×{spec.height}</span></div><a href="/club" target="_blank" rel="noreferrer">Открыть реальную страницу ↗</a></div>
        <div className="pageBuilder2ViewportScroll">
          <div className="pageBuilder2ScaledOuter" style={{width:spec.width*scale,height:spec.height*scale}}>
            <iframe ref={iframeRef} src="/admin/page-builder/club/preview" title="Live preview /club" onLoad={sendPreview} className="pageBuilder2Iframe" style={{width:spec.width,height:spec.height,transform:`scale(${scale})`}}/>
          </div>
        </div>
      </section>

      {current&&<aside className="pageBuilder2Inspector">
        <div className="pageBuilder2InspectorHead"><span>НАСТРОЙКИ</span><h2>{labels[current.key]}</h2><p>{elementLabels[selected.elementKey]}</p></div>
        <div className="pageBuilder2QuickActions"><button type="button" onClick={()=>moveSection(current.key,-1)}>↑ Секцию выше</button><button type="button" onClick={()=>moveSection(current.key,1)}>↓ Секцию ниже</button></div>
        <Toggle label="Показывать секцию" checked={current.visible} onChange={v=>patchSection(current.key,{visible:v})}/>
        <div className="pageBuilder2Mode"><button type="button" className={current.layout_mode==="template"?"active":""} onClick={()=>patchSection(current.key,{layout_mode:"template"})}>Шаблон</button><button type="button" className={current.layout_mode==="manual"?"active":""} onClick={()=>patchSection(current.key,{layout_mode:"manual"})}>Свободно</button></div>
        <p className="pageBuilder2ModeHint">{current.layout_mode==="manual"?"Свободный режим: фото и текст можно ставить в любую точку секции.":"Шаблонный режим: адаптивная раскладка управляется выбранным вариантом."}</p>

        <div className="pageBuilder2Grid2"><Field label="Ширина секции"><select value={current.width} onChange={e=>patchSection(current.key,{width:e.target.value as ClubSectionConfig["width"]})}><option value="container">Container</option><option value="wide">Wide</option><option value="full">Full</option></select></Field><Field label="Фон"><select value={current.background} onChange={e=>patchSection(current.key,{background:e.target.value as ClubSectionConfig["background"]})}><option value="inherit">Обычный</option><option value="light">Светлый</option><option value="surface">Серый</option><option value="dark">Тёмный</option><option value="brand">Синий</option></select></Field></div>
        {current.layout_mode==="template"&&<Field label="Вариант шаблона"><select value={current.variant} onChange={e=>patchSection(current.key,{variant:e.target.value})}>{variants[current.key].map(v=><option key={v.value} value={v.value}>{v.label}</option>)}</select></Field>}
        <div className="pageBuilder2Grid2"><NumberControl label="Отступ сверху" value={current.padding_top} min={0} max={220} suffix="px" onChange={v=>patchSection(current.key,{padding_top:v})}/><NumberControl label="Отступ снизу" value={current.padding_bottom} min={0} max={220} suffix="px" onChange={v=>patchSection(current.key,{padding_bottom:v})}/></div>

        {current.layout_mode==="manual"&&<>
          <div className="pageBuilder2Divider"><span>СЕКЦИЯ • {deviceSpec[breakpoint].label}</span></div>
          <NumberControl label="Высота рабочей области" value={current.canvas_height[breakpoint]} min={260} max={1800} step={10} suffix="px" onChange={v=>patchSection(current.key,{canvas_height:{...current.canvas_height,[breakpoint]:v}})}/>
          <div className="pageBuilder2Divider"><span>ЭЛЕМЕНТ • {elementLabels[selected.elementKey]}</span></div>
          {currentFrame&&<>
            <div className="pageBuilder2Grid2"><NumberControl label="X" value={currentFrame.x} min={-50} max={150} step={.5} suffix="%" onChange={v=>patchFrame(current.key,selected.elementKey,breakpoint,{x:v})}/><NumberControl label="Y" value={currentFrame.y} min={-400} max={1800} suffix="px" onChange={v=>patchFrame(current.key,selected.elementKey,breakpoint,{y:v})}/></div>
            <div className="pageBuilder2Grid2"><NumberControl label="Ширина" value={currentFrame.width} min={5} max={180} step={.5} suffix="%" onChange={v=>patchFrame(current.key,selected.elementKey,breakpoint,{width:v})}/><NumberControl label="Высота" value={currentFrame.height} min={0} max={1400} suffix="px" onChange={v=>patchFrame(current.key,selected.elementKey,breakpoint,{height:v})}/></div>
            <div className="pageBuilder2Nudge"><span>Точно подвинуть</span><div><button type="button" onClick={()=>patchFrame(current.key,selected.elementKey,breakpoint,{x:currentFrame.x-1})}>←</button><button type="button" onClick={()=>patchFrame(current.key,selected.elementKey,breakpoint,{y:currentFrame.y-5})}>↑</button><button type="button" onClick={()=>patchFrame(current.key,selected.elementKey,breakpoint,{y:currentFrame.y+5})}>↓</button><button type="button" onClick={()=>patchFrame(current.key,selected.elementKey,breakpoint,{x:currentFrame.x+1})}>→</button></div></div>
            <div className="pageBuilder2Grid2"><NumberControl label="Внутренний отступ" value={currentFrame.padding} min={0} max={100} suffix="px" onChange={v=>patchFrame(current.key,selected.elementKey,breakpoint,{padding:v})}/><NumberControl label="Слой Z" value={currentFrame.z} min={0} max={50} onChange={v=>patchFrame(current.key,selected.elementKey,breakpoint,{z:v})}/></div>
            <div className="pageBuilder2Grid2"><NumberControl label="Масштаб текста" value={currentFrame.font_scale} min={50} max={180} suffix="%" onChange={v=>patchFrame(current.key,selected.elementKey,breakpoint,{font_scale:v})}/><Field label="Выравнивание"><select value={currentFrame.text_align} onChange={e=>patchFrame(current.key,selected.elementKey,breakpoint,{text_align:e.target.value as ClubElementFrame["text_align"]})}><option value="left">Слева</option><option value="center">По центру</option><option value="right">Справа</option></select></Field></div>
            <div className="pageBuilder2FrameActions"><button type="button" onClick={copyDesktop} disabled={breakpoint==="desktop"}>Desktop → {breakpoint}</button><button type="button" onClick={resetElement}>Сбросить элемент</button></div>
          </>}
        </>}

        {current.key==="stadium"&&selected.elementKey==="stadium-image"&&<><div className="pageBuilder2Divider"><span>ФОТО СТАДИОНА • {deviceSpec[breakpoint].label}</span></div><p className="pageBuilderImageHint">В превью потяни само фото мышью за метку <b>ФОКУС ФОТО</b>. Это двигает изображение внутри рамки, а не саму рамку.</p><div className="pageBuilder2Grid2"><NumberControl label="Фокус X" value={current.image_focus?.[breakpoint].x??50} min={0} max={100} suffix="%" onChange={v=>patchImageFocus(breakpoint,v,current.image_focus?.[breakpoint].y??52)}/><NumberControl label="Фокус Y" value={current.image_focus?.[breakpoint].y??52} min={0} max={100} suffix="%" onChange={v=>patchImageFocus(breakpoint,current.image_focus?.[breakpoint].x??50,v)}/></div><div className="pageBuilder2Grid2"><Field label="Масштаб фото"><select value={current.image_fit??"cover"} onChange={e=>patchSection(current.key,{image_fit:e.target.value as "cover"|"contain"})}><option value="cover">Cover — заполнить</option><option value="contain">Contain — показать целиком</option></select></Field><NumberControl label="Скругление" value={current.image_radius??28} min={0} max={60} suffix="px" onChange={v=>patchSection(current.key,{image_radius:v})}/></div></>}
        {current.key==="leadership"&&<Field label="Колонок на Desktop"><select value={current.columns??3} onChange={e=>patchSection(current.key,{columns:Number(e.target.value)})}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></Field>}
        <button type="button" className="pageBuilder2ResetSection" onClick={()=>resetSection(current.key)}>Сбросить всю секцию</button>
      </aside>}
    </div>

    <div className="pageBuilder2Publish"><div><strong>Сохранение Page Builder 3.0</strong><span>Черновик не меняет /club. «Опубликовать» применяет точно тот макет, который виден в Live Preview.</span></div><div><a href="/admin/club" className="secondaryAdminButton">Редактировать тексты/фото</a><button className="secondaryAdminButton" type="submit" name="intent" value="draft" disabled={pending}>{pending?"Сохраняем…":"Сохранить черновик"}</button><button className="primaryButton" type="submit" name="intent" value="publish" disabled={pending}>{pending?"Публикуем…":"Опубликовать"}</button></div></div>
    {state.error&&<div className="formError">{state.error}</div>}{state.success&&<div className="formSuccess">{state.success}</div>}
  </form>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <label className="pageBuilder2Field"><span>{label}</span>{children}</label>}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="pageBuilder2Toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>}
function NumberControl({label,value,min,max,step=1,suffix="",onChange}:{label:string;value:number;min:number;max:number;step?:number;suffix?:string;onChange:(v:number)=>void}){return <label className="pageBuilder2Number"><span>{label}</span><div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/><input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/><b>{suffix}</b></div></label>}
