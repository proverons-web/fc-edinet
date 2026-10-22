"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { CustomSitePage, SiteMenuItem } from "@/lib/site-builder";
import { createCustomPage, createMenuItem, deleteCustomPage, deleteMenuItem, reorderMenuItems, saveCustomPage, saveMenuItem } from "@/app/admin/site-builder/actions";

type SystemPage={key:string;label:string;preview:string;design:string;content:string;kind:"system"};
type CustomPageItem={key:string;label:string;preview:string;design:string;content:string;kind:"custom";custom:CustomSitePage};
type PageItem=SystemPage|CustomPageItem;
type Device="desktop"|"tablet"|"mobile";

type Props={pages:PageItem[];selectedKey:string;customPages:CustomSitePage[];menuItems:SiteMenuItem[];notice?:string};

const widths:Record<Device,number>={desktop:1440,tablet:768,mobile:390};

export default function UnifiedSiteBuilderClient({pages,selectedKey,menuItems,notice}:Props){
 const selected=pages.find(p=>p.key===selectedKey)??pages[0];
 const [device,setDevice]=useState<Device>("desktop");
 const [panel,setPanel]=useState<"none"|"edit"|"pages"|"menu"|"global"|"new">("none");
 const [editorTab,setEditorTab]=useState<"design"|"content">("design");
 const [menu,setMenu]=useState(menuItems);
 const [dragId,setDragId]=useState<number|null>(null);
 const [pending,startTransition]=useTransition();
 const selectedCustom=selected.kind==="custom"?selected.custom:null;
 const editorUrl=selected.kind==="system"?(editorTab==="design"?selected.design:selected.content):"";
 const embeddedEditorUrl=editorUrl?`${editorUrl}${editorUrl.includes("?")?"&":"?"}embedded=1`:"";
 const previewWidth=widths[device];
 const topLevel=useMemo(()=>menu.filter(i=>!i.parent_id),[menu]);
 const orderedMenu=useMemo(()=>{
   const children=new Map<number,SiteMenuItem[]>();
   for(const item of menu){if(item.parent_id)children.set(item.parent_id,[...(children.get(item.parent_id)??[]),item]);}
   return topLevel.flatMap(parent=>[parent,...(children.get(parent.id)??[])]);
 },[menu,topLevel]);

 function moveDragged(targetId:number){
   if(!dragId||dragId===targetId)return;
   const next=[...orderedMenu]; const from=next.findIndex(x=>x.id===dragId); const to=next.findIndex(x=>x.id===targetId);
   if(from<0||to<0)return; const [item]=next.splice(from,1); next.splice(to,0,item); setMenu(next); setDragId(null);
   startTransition(()=>reorderMenuItems(next.map(x=>x.id)));
 }

 return <main className="siteBuilderV2211">
   <header className="siteBuilderTopbar">
     <div className="siteBuilderPagePicker">
       <select value={selected.key} onChange={e=>{window.location.href=`/admin/site-builder?page=${encodeURIComponent(e.target.value)}`}}>
         <optgroup label="Страницы сайта">{pages.filter(p=>p.kind==="system").map(p=><option value={p.key} key={p.key}>{p.label}</option>)}</optgroup>
         {pages.some(p=>p.kind==="custom")&&<optgroup label="Созданные страницы">{pages.filter(p=>p.kind==="custom").map(p=><option value={p.key} key={p.key}>{p.label}</option>)}</optgroup>}
       </select>
       <button type="button" onClick={()=>setPanel("new")}>+ Страница</button>
       <button type="button" onClick={()=>setPanel("pages")}>Все страницы</button>
       <button type="button" onClick={()=>setPanel("menu")}>Меню сайта</button>
       <button type="button" onClick={()=>setPanel("global")}>Глобально</button>
     </div>
     <div className="siteBuilderTopActions">
       <div className="siteBuilderDevices">{(["desktop","tablet","mobile"] as Device[]).map(d=><button type="button" key={d} className={device===d?"active":""} onClick={()=>setDevice(d)}>{d==="desktop"?"Desktop":d==="tablet"?"Tablet":"Mobile"}</button>)}</div>
       <button type="button" className="primary" onClick={()=>setPanel("edit")}>Редактировать страницу</button>
       <a href={selected.preview} target="_blank" rel="noreferrer">Открыть ↗</a>
     </div>
   </header>

   {notice&&<div className="siteBuilderNotice" role="status">{notice}</div>}

   <section className="siteBuilderCanvasShell">
     <div className={`siteBuilderCanvas device-${device}`} style={{maxWidth:previewWidth}}>
       <div className="siteBuilderCanvasBadge"><b>{selected.label}</b><span>{selected.preview}</span><button type="button" onClick={()=>setPanel("edit")}>✎ Редактировать</button></div>
       <iframe title={`Предпросмотр ${selected.label}`} src={`${selected.preview}${selected.preview.includes("?")?"&":"?"}builder_preview=1`} />
     </div>
   </section>

   {panel!=="none"&&<div className="siteBuilderOverlay" onMouseDown={e=>{if(e.target===e.currentTarget)setPanel("none")}}>
     <aside className={`siteBuilderDrawer panel-${panel}`}>
       <div className="siteBuilderDrawerHead"><div><small>FC EDINEȚ SITE BUILDER</small><h2>{panel==="new"?"Новая страница":panel==="pages"?"Страницы":panel==="menu"?"Меню сайта":panel==="global"?"Глобальные настройки":`Редактировать: ${selected.label}`}</h2></div><button type="button" onClick={()=>setPanel("none")}>✕</button></div>

       {panel==="edit"&&<div className="siteBuilderDrawerBody">
         {selectedCustom?<form action={saveCustomPage} className="simpleBuilderForm">
           <input type="hidden" name="id" value={selectedCustom.id}/>
           <label>Название RU<input name="title_ru" defaultValue={selectedCustom.title_ru}/></label>
           <label>Название RO<input name="title_ro" defaultValue={selectedCustom.title_ro}/></label>
           <label>Адрес страницы<div className="slugField"><span>/</span><input name="slug" defaultValue={selectedCustom.slug}/></div><small className="builderFieldHint">Системные адреса вроде news, team, club, admin и api зарезервированы.</small></label>
           <label>Короткое описание RU<textarea name="intro_ru" defaultValue={selectedCustom.intro_ru} rows={3}/></label>
           <label>Короткое описание RO<textarea name="intro_ro" defaultValue={selectedCustom.intro_ro} rows={3}/></label>
           <label>Текст страницы RU<textarea name="body_ru" defaultValue={selectedCustom.body_ru} rows={10}/></label>
           <label>Текст страницы RO<textarea name="body_ro" defaultValue={selectedCustom.body_ro} rows={10}/></label>
           <label>Hero изображение<input name="hero_image_url" defaultValue={selectedCustom.hero_image_url??""} placeholder="https://..."/></label>
           <label>Статус<select name="status" defaultValue={selectedCustom.status}><option value="draft">Черновик</option><option value="published">Опубликована</option></select></label>
           <div className="drawerActions"><button type="submit" className="primary">Сохранить</button></div>
         </form>:<>
           <div className="builderEditTabs"><button type="button" className={editorTab==="design"?"active":""} onClick={()=>setEditorTab("design")}>Дизайн</button><button type="button" className={editorTab==="content"?"active":""} onClick={()=>setEditorTab("content")}>Контент</button></div>
           <p className="builderHint">Основной экран остаётся предпросмотром. Настройки открываются только здесь и не занимают место постоянно.</p>
           <iframe className="siteBuilderEditorFrame" title={`Редактор ${selected.label}`} src={embeddedEditorUrl}/>
         </>}
       </div>}

       {panel==="new"&&<div className="siteBuilderDrawerBody"><form action={createCustomPage} className="simpleBuilderForm">
         <label>Название страницы RU<input name="title_ru" required placeholder="История клуба"/></label>
         <label>Название страницы RO<input name="title_ro" placeholder="Istoria clubului"/></label>
         <label>Адрес<input name="slug" placeholder="history"/><small className="builderFieldHint">Только латиница, цифры и дефис. Системные адреса зарезервированы.</small></label>
         <label className="checkRow"><input type="checkbox" name="add_to_menu" defaultChecked/> Сразу добавить в меню сайта</label>
         <p className="builderHint">После создания страница откроется в редакторе. Её можно оставить черновиком до публикации.</p>
         <button type="submit" className="primary">Создать страницу</button>
       </form></div>}

       {panel==="pages"&&<div className="siteBuilderDrawerBody pageManagerList">
         {pages.map(p=><article key={p.key} className="pageManagerRow"><div><strong>{p.label}</strong><span>{p.preview}</span><small>{p.kind==="system"?"Системная страница":p.custom.status==="published"?"Опубликована":"Черновик"}</small></div><div><Link href={`/admin/site-builder?page=${encodeURIComponent(p.key)}`}>Открыть</Link>{p.kind==="custom"&&<form action={deleteCustomPage}><input type="hidden" name="id" value={p.custom.id}/><button className="danger" type="submit">Удалить</button></form>}</div></article>)}
       </div>}

       {panel==="menu"&&<div className="siteBuilderDrawerBody">
         <p className="builderHint">Перетащи строки, чтобы изменить порядок. Системные пункты нельзя удалить, но можно переименовать или скрыть.</p>
         <div className="menuManagerList">{orderedMenu.map(item=><article key={item.id} draggable onDragStart={()=>setDragId(item.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>moveDragged(item.id)} className={`menuManagerRow${item.parent_id?" child":""}`}>
           <span className="dragHandle">⋮⋮</span><form action={saveMenuItem} className="menuItemForm"><input type="hidden" name="id" value={item.id}/><input name="label_ru" defaultValue={item.label_ru}/><input name="label_ro" defaultValue={item.label_ro}/><input name="href" defaultValue={item.href}/><select name="parent_id" defaultValue={item.parent_id??""}><option value="">Верхний уровень</option>{topLevel.filter(x=>x.id!==item.id).map(x=><option key={x.id} value={x.id}>↳ {x.label_ru}</option>)}</select><label className="miniCheck"><input type="checkbox" name="visible" defaultChecked={item.visible}/> Видим</label><button type="submit">Сохранить</button></form>{!item.system_key&&<button className="danger iconButton" type="button" onClick={()=>startTransition(()=>deleteMenuItem(item.id))}>×</button>}
         </article>)}</div>
         <form action={createMenuItem} className="newMenuItemForm"><h3>+ Новый пункт меню</h3><input name="label_ru" placeholder="Название RU"/><input name="label_ro" placeholder="Название RO"/><input name="href" placeholder="/страница или https://..."/><select name="parent_id"><option value="">Верхний уровень</option>{topLevel.map(x=><option key={x.id} value={x.id}>↳ {x.label_ru}</option>)}</select><button type="submit" className="primary">Добавить</button></form>
         {pending&&<small>Сохраняю порядок…</small>}
       </div>}

       {panel==="global"&&<div className="siteBuilderDrawerBody globalQuickLinks">
         <Link href="/admin/design?page=global_header">Шапка сайта <span>Логотип, высота, фон, аккаунт →</span></Link>
         <Link href="/admin/design?page=global_footer">Подвал <span>Колонки, соцсети, copyright →</span></Link>
         <Link href="/admin/design?page=global_design_system">Шрифты и цвета <span>Единая визуальная система →</span></Link>
         <button type="button" onClick={()=>setPanel("menu")}>Меню сайта <span>Пункты, порядок, видимость →</span></button>
       </div>}
     </aside>
   </div>}
 </main>;
}
