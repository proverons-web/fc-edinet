"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CustomSitePage, SiteMenuItem } from "@/lib/site-builder";
import { organizeMenu, reorderSibling, dropSibling } from "@/lib/admin-builder-menu";
import {
  createCustomPage, createMenuItem, deleteCustomPage, deleteMenuItem,
  reorderMenuItems, saveCustomPage, saveMenuItem,
} from "@/app/admin/site-builder/actions";

type SystemPage = { key: string; label: string; preview: string; design: string; content: string; kind: "system" };
type CustomPageItem = { key: string; label: string; preview: string; design: string; content: string; kind: "custom"; custom: CustomSitePage };
type PageItem = SystemPage | CustomPageItem;
type Device = "desktop" | "tablet" | "mobile";
type Panel = "none" | "edit" | "pages" | "menu" | "global" | "new";
type Tab = "design" | "content";
type Props = { pages: PageItem[]; selectedKey: string; customPages: CustomSitePage[]; menuItems: SiteMenuItem[]; notice?: string };

const widths: Record<Device, number> = { desktop: 1440, tablet: 768, mobile: 390 };
const deviceLabels: Record<Device, string> = { desktop: "Компьютер", tablet: "Планшет", mobile: "Телефон" };
const panelLabels: Record<Panel, string> = {
  none: "", edit: "Редактирование страницы", pages: "Все страницы", menu: "Меню сайта",
  global: "Общие настройки", new: "Новая страница",
};

export default function UnifiedSiteBuilderClient({ pages, selectedKey, menuItems, notice }: Props) {
  const router = useRouter();
  const selected = pages.find((page) => page.key === selectedKey) ?? pages[0];
  const [device, setDevice] = useState<Device>("desktop");
  const [previewRevision, setPreviewRevision] = useState(0);
  const [panel, setPanel] = useState<Panel>("none");
  const [editorTab, setEditorTab] = useState<Tab>("design");
  const [pageQuery, setPageQuery] = useState("");
  const [customDirty, setCustomDirty] = useState(false);
  const [menu, setMenu] = useState(menuItems);
  const [dragId, setDragId] = useState<number | null>(null);
  const [orderState, setOrderState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const selectedCustom = selected.kind === "custom" ? selected.custom : null;
  const hasSeparateEditors = selected.kind === "system" && selected.design !== selected.content;
  const editorUrl = selected.kind === "system" ? (editorTab === "design" ? selected.design : selected.content) : "";
  const embeddedEditorUrl = editorUrl ? `${editorUrl}${editorUrl.includes("?") ? "&" : "?"}embedded=1` : "";
  const isUnpublishedCustom = selectedCustom?.status === "draft";
  const orderedMenu = useMemo(() => organizeMenu(menu), [menu]);
  const topLevel = useMemo(() => menu.filter((item) => !item.parent_id), [menu]);
  const filteredPages = useMemo(() => {
    const query = pageQuery.trim().toLocaleLowerCase("ru");
    return pages.filter((page) => `${page.label} ${page.preview}`.toLocaleLowerCase("ru").includes(query));
  }, [pageQuery, pages]);

  const openPanel = (next: Panel, tab: Tab = "design") => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditorTab(tab);
    setCustomDirty(false);
    setPanel(next);
  };
  const closePanel = () => {
    if (customDirty && !window.confirm("Есть несохранённые изменения. Закрыть редактор без сохранения?")) return;
    setCustomDirty(false);
    setPanel("none");
    const trigger = triggerRef.current;
    requestAnimationFrame(() => trigger?.focus());
  };

  useEffect(() => {
    if (window.innerWidth <= 600) setDevice("mobile");
    else if (window.innerWidth <= 960) setDevice("tablet");
  }, []);

  useEffect(() => {
    if (panel === "none") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closePanel(); }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary'
      )).filter((node) => node.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
    // closePanel is intentionally bound to the current open panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel]);

  const changePage = (key: string) => {
    if (customDirty && !window.confirm("Есть несохранённые изменения. Перейти на другую страницу?")) return;
    setCustomDirty(false);
    setPanel("none");
    setEditorTab("design");
    router.push(`/admin/site-builder?page=${encodeURIComponent(key)}`);
  };

  function saveOrder(next: SiteMenuItem[]) {
    setMenu(next);
    setOrderState("idle");
    startTransition(async () => {
      try { await reorderMenuItems(next.map((item) => item.id)); setOrderState("saved"); router.refresh(); }
      catch { setOrderState("error"); router.refresh(); }
    });
  }

  function moveMenuItem(id: number, direction: -1 | 1) {
    saveOrder(reorderSibling(orderedMenu, id, direction));
  }

  function dropMenuItem(id: number) {
    const next = dropSibling(orderedMenu, dragId, id);
    setDragId(null);
    if (next.map((item) => item.id).join(",") !== orderedMenu.map((item) => item.id).join(",")) saveOrder(next);
  }

  return <main className="siteBuilderV2211 siteBuilderUnifiedV23021">
    <div className="siteBuilderWelcome">
      <div>
        <p className="siteBuilderEyebrow">FC EDINEȚ / УПРАВЛЕНИЕ САЙТОМ</p>
        <h1>Редактор сайта</h1>
        <p>Выбери страницу, отредактируй содержимое или оформление, затем проверь результат.</p>
      </div>
      <Link href="/admin" className="siteBuilderReturn">← Панель управления</Link>
    </div>

    <header className="siteBuilderTopbar" aria-label="Инструменты редактора">
      <div className="siteBuilderPagePicker">
        <label className="siteBuilderPickerLabel" htmlFor="builder-page-select">Страница</label>
        <select id="builder-page-select" value={selected.key} onChange={(event) => changePage(event.target.value)}>
          <optgroup label="Разделы сайта">{pages.filter((p) => p.kind === "system").map((page) => <option value={page.key} key={page.key}>{page.label}</option>)}</optgroup>
          {pages.some((p) => p.kind === "custom") && <optgroup label="Созданные страницы">{pages.filter((p) => p.kind === "custom").map((page) => <option value={page.key} key={page.key}>{page.label}</option>)}</optgroup>}
        </select>
        <button type="button" onClick={() => openPanel("pages")}>Все страницы</button>
        <button type="button" onClick={() => openPanel("menu")}>Меню</button>
        <button type="button" onClick={() => openPanel("global")}>Настройки</button>
      </div>
      <div className="siteBuilderTopActions">
        <div className="siteBuilderDevices" role="group" aria-label="Размер предпросмотра">
          {(["desktop", "tablet", "mobile"] as Device[]).map((value) => <button key={value} type="button" className={device === value ? "active" : ""} aria-pressed={device === value} onClick={() => setDevice(value)}>{deviceLabels[value]}</button>)}
        </div>
        <button type="button" className="primary siteBuilderEditPrimary" onClick={() => openPanel("edit")}>Изменить страницу</button>
      </div>
    </header>

    {notice && <div className="siteBuilderNotice" role="status">{notice}</div>}

    <div className="siteBuilderWorkflow" aria-label="Порядок работы">
      <span><b>1</b> Выбери страницу</span><span><b>2</b> Измени</span><span><b>3</b> Сохрани и проверь</span>
    </div>

    <section className="siteBuilderCanvasShell" aria-label="Предпросмотр страницы">
      <div className="siteBuilderPreviewMeta">
        <div><strong>{selected.label}</strong><span>{selected.preview} · {deviceLabels[device].toLowerCase()}</span></div>
        <div>
          {isUnpublishedCustom && <span className="builderDraftFlag">Черновик — не виден посетителям</span>}
          {!isUnpublishedCustom && <button type="button" className="siteBuilderRefreshPreview" onClick={() => setPreviewRevision((value) => value + 1)}>Обновить предпросмотр</button>}
          <a href={selected.preview} target="_blank" rel="noreferrer">Открыть сайт ↗</a>
        </div>
      </div>
      <div className={`siteBuilderCanvas device-${device}`} style={{ maxWidth: widths[device] }}>
        <div className="siteBuilderCanvasBadge">
          <b>{selected.label}</b>
          <span>Предпросмотр · {deviceLabels[device]}</span>
          <button type="button" onClick={() => openPanel("edit")}>Редактировать</button>
        </div>
        {isUnpublishedCustom ? <div className="siteBuilderDraftPreview">
          <span>ПРЕДПРОСМОТР ЧЕРНОВИКА</span>
          <h2>{selectedCustom?.title_ru || "Новая страница"}</h2>
          <p>{selectedCustom?.intro_ru || "Страница пока не опубликована. Отредактируй текст и оформление, затем выбери статус «Опубликована»."}</p>
          <button type="button" onClick={() => openPanel("edit")}>Редактировать черновик</button>
        </div> : <iframe key={`${selected.key}-${previewRevision}`} title={`Предпросмотр ${selected.label}`} loading="lazy" src={`${selected.preview}${selected.preview.includes("?") ? "&" : "?"}builder_preview=1`} />}
      </div>
      <p className="siteBuilderPreviewFootnote">Размер окна меняется для проверки адаптивности. Изменения отображаются после сохранения и обновления страницы.</p>
    </section>

    {panel !== "none" && <div className="siteBuilderOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
      <aside ref={drawerRef} role="dialog" aria-modal="true" aria-label={panelLabels[panel]} className={`siteBuilderDrawer panel-${panel}`}>
        <div className="siteBuilderDrawerHead">
          <div><small>FC EDINEȚ · РЕДАКТОР САЙТА</small><h2>{panel === "edit" ? `Страница: ${selected.label}` : panelLabels[panel]}</h2></div>
          <button ref={closeRef} type="button" onClick={closePanel} aria-label="Закрыть панель">✕</button>
        </div>

        {panel === "edit" && <div className="siteBuilderDrawerBody">
          {selectedCustom ? <>
            <p className="builderHint">Заполни данные на обоих языках. Статус «Черновик» оставит страницу скрытой до публикации.</p>
            <form action={saveCustomPage} className="simpleBuilderForm" onChange={() => setCustomDirty(true)}>
              <input type="hidden" name="id" value={selectedCustom.id}/>
              <fieldset className="siteBuilderFieldset"><legend>Название и адрес</legend>
                <label>Название RU<input name="title_ru" required defaultValue={selectedCustom.title_ru}/></label>
                <label>Название RO<input name="title_ro" defaultValue={selectedCustom.title_ro}/></label>
                <label>Адрес страницы<div className="slugField"><span>/</span><input name="slug" required defaultValue={selectedCustom.slug}/></div><small className="builderFieldHint">Только латинские буквы, цифры и дефис.</small></label>
              </fieldset>
              <fieldset className="siteBuilderFieldset"><legend>Содержимое страницы</legend>
                <label>Короткое описание RU<textarea name="intro_ru" defaultValue={selectedCustom.intro_ru} rows={3}/></label>
                <label>Короткое описание RO<textarea name="intro_ro" defaultValue={selectedCustom.intro_ro} rows={3}/></label>
                <label>Текст страницы RU<textarea name="body_ru" defaultValue={selectedCustom.body_ru} rows={7}/></label>
                <label>Текст страницы RO<textarea name="body_ro" defaultValue={selectedCustom.body_ro} rows={7}/></label>
              </fieldset>
              <fieldset className="siteBuilderFieldset"><legend>Оформление и публикация</legend>
                <label>Фоновое изображение Hero (ссылка)<input name="hero_image_url" defaultValue={selectedCustom.hero_image_url ?? ""} placeholder="https://..."/></label>
                <label>Статус<select name="status" defaultValue={selectedCustom.status}><option value="draft">Черновик</option><option value="published">Опубликована</option></select></label>
              </fieldset>
              <div className="drawerActions"><button type="submit" className="primary">Сохранить страницу</button></div>
            </form>
          </> : <>
            {hasSeparateEditors && <div className="builderEditTabs" role="group" aria-label="Режим редактирования">
              <button type="button" className={editorTab === "design" ? "active" : ""} aria-pressed={editorTab === "design"} onClick={() => setEditorTab("design")}>Дизайн</button>
              <button type="button" className={editorTab === "content" ? "active" : ""} aria-pressed={editorTab === "content"} onClick={() => setEditorTab("content")}>Контент</button>
            </div>}
            <p className="builderHint">{editorTab === "design" ? "Фон, положение изображения, Hero и блоки страницы. Сохраняй черновик и публикуй изменения в редакторе ниже." : "Тексты, фотографии и записи раздела. Сохраняй изменения внутри формы ниже."} Не переключай вкладку с несохранёнными изменениями.</p>
            <div className="siteBuilderEditorTools"><a href={editorUrl} target="_blank" rel="noreferrer">Открыть редактор в отдельной вкладке ↗</a></div>
            <iframe key={embeddedEditorUrl} className="siteBuilderEditorFrame" title={`Редактор ${selected.label}, ${editorTab === "design" ? "дизайн" : "контент"}`} src={embeddedEditorUrl}/>
          </>}
        </div>}

        {panel === "new" && <div className="siteBuilderDrawerBody"><p className="builderHint">Создадим отдельную страницу. Сначала она будет черновиком и не появится публично.</p><form action={createCustomPage} className="simpleBuilderForm">
          <label>Название страницы RU<input name="title_ru" required placeholder="История клуба"/></label>
          <label>Название страницы RO<input name="title_ro" placeholder="Istoria clubului"/></label>
          <label>Адрес<input name="slug" required placeholder="history"/><small className="builderFieldHint">Латиница, цифры, дефис. Системные адреса зарезервированы.</small></label>
          <label className="checkRow"><input type="checkbox" name="add_to_menu" defaultChecked/> Добавить в меню сайта</label>
          <button type="submit" className="primary">Создать черновик</button>
        </form></div>}

        {panel === "pages" && <div className="siteBuilderDrawerBody pageManagerList">
          <div className="siteBuilderDrawerToolbar"><input type="search" aria-label="Найти страницу" placeholder="Поиск по названию или адресу…" value={pageQuery} onChange={(event) => setPageQuery(event.target.value)}/><button type="button" className="primary" onClick={() => openPanel("new")}>+ Новая страница</button></div>
          {filteredPages.length === 0 && <p className="builderHint">Страницы по запросу не найдены.</p>}
          {filteredPages.map((page) => <article key={page.key} className="pageManagerRow">
            <div><strong>{page.label}</strong><span>{page.preview}</span><small>{page.kind === "system" ? "Раздел сайта" : page.custom.status === "published" ? "Опубликована" : "Черновик"}</small></div>
            <div><button type="button" onClick={() => changePage(page.key)}>Выбрать</button>
              {page.kind === "custom" && <form action={deleteCustomPage} onSubmit={(event) => { if (!window.confirm(`Удалить страницу «${page.label}»? Это действие нельзя отменить.`)) event.preventDefault(); }}><input type="hidden" name="id" value={page.custom.id}/><button className="danger" type="submit">Удалить</button></form>}
            </div>
          </article>)}
        </div>}

        {panel === "menu" && <div className="siteBuilderDrawerBody">
          <p className="builderHint">Разверни пункт для редактирования. Стрелками можно менять порядок внутри одного уровня меню. У каждого пункта есть отдельная кнопка сохранения.</p>
          <div className="menuManagerList">{orderedMenu.map((item) => {
            const siblingIds = orderedMenu.filter((entry) => (entry.parent_id ?? null) === (item.parent_id ?? null)).map((entry) => entry.id);
            const siblingIndex = siblingIds.indexOf(item.id);
            return <div key={item.id} className={`menuManagerRow${item.parent_id ? " child" : ""}`} draggable={!pending} onDragStart={() => setDragId(item.id)} onDragEnd={() => setDragId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropMenuItem(item.id)}>
              <div className="siteBuilderReorder"><button type="button" aria-label={`Переместить ${item.label_ru} вверх`} disabled={pending || siblingIndex <= 0} onClick={() => moveMenuItem(item.id, -1)}>↑</button><button type="button" aria-label={`Переместить ${item.label_ru} вниз`} disabled={pending || siblingIndex === siblingIds.length - 1} onClick={() => moveMenuItem(item.id, 1)}>↓</button></div>
              <details className="siteBuilderMenuDetails"><summary><strong>{item.label_ru || "Без названия"}</strong><span>{item.href}</span><em>{item.visible ? "Виден" : "Скрыт"}</em></summary>
                <form action={saveMenuItem} className="menuItemForm"><input type="hidden" name="id" value={item.id}/>
                  <label>Название RU<input name="label_ru" aria-label="Название RU" defaultValue={item.label_ru}/></label>
                  <label>Название RO<input name="label_ro" aria-label="Название RO" defaultValue={item.label_ro}/></label>
                  <label>Ссылка<input name="href" aria-label="Ссылка" defaultValue={item.href}/></label>
                  <label>Расположение<select name="parent_id" defaultValue={item.parent_id ?? ""}><option value="">Главное меню</option>{topLevel.filter((parent) => parent.id !== item.id).map((parent) => <option key={parent.id} value={parent.id}>Подраздел: {parent.label_ru}</option>)}</select></label>
                  <label className="miniCheck"><input type="checkbox" name="visible" defaultChecked={item.visible}/> Показывать в меню</label>
                  <div className="siteBuilderMenuActions"><button type="submit" className="primary">Сохранить пункт</button>
                    {!item.system_key && <button className="danger" type="button" onClick={() => { if (!window.confirm(`Удалить пункт меню «${item.label_ru}»?`)) return; startTransition(async () => { await deleteMenuItem(item.id); setMenu((items) => items.filter((entry) => entry.id !== item.id)); router.refresh(); }); }}>Удалить пункт</button>}
                  </div>
                </form>
              </details>
            </div>;
          })}</div>
          {pending && <p role="status" className="siteBuilderOrderStatus">Сохраняем порядок…</p>}
          {!pending && orderState === "saved" && <p role="status" className="siteBuilderOrderStatus">Порядок обновлён.</p>}
          {!pending && orderState === "error" && <p role="alert" className="siteBuilderOrderError">Не удалось сохранить порядок. Обнови страницу и повтори.</p>}
          <form action={createMenuItem} className="newMenuItemForm"><h3>Добавить пункт меню</h3>
            <label>Название RU<input name="label_ru" required placeholder="О клубе"/></label>
            <label>Название RO<input name="label_ro" placeholder="Despre club"/></label>
            <label>Ссылка<input name="href" required placeholder="/club/about"/></label>
            <label>Расположение<select name="parent_id"><option value="">Главное меню</option>{topLevel.map((parent) => <option key={parent.id} value={parent.id}>Подраздел: {parent.label_ru}</option>)}</select></label>
            <button type="submit" className="primary">Добавить</button>
          </form>
        </div>}

        {panel === "global" && <div className="siteBuilderDrawerBody globalQuickLinks">
          <p className="builderHint">Эти настройки действуют на всём сайте. Изменения дизайна сначала сохраняются как черновик и публикуются отдельно.</p>
          <Link href="/admin/design?page=global_header">Шапка сайта <span>Логотип, высота, фон и элементы навигации ↗</span></Link>
          <Link href="/admin/design?page=global_footer">Подвал сайта <span>Ссылки, контакты и социальные сети ↗</span></Link>
          <Link href="/admin/design?page=global_design_system">Цвета и шрифты <span>Общие параметры оформления ↗</span></Link>
          <button type="button" onClick={() => openPanel("menu")}>Меню сайта <span>Пункты, порядок и видимость →</span></button>
        </div>}
      </aside>
    </div>}
  </main>;
}
