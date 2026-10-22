"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emptyClubRichContent, normalizeClubRichContent, plainTextToClubRichContent, sanitizeInlineHtml, type ClubRichAlign, type ClubRichBlock, type ClubRichContent, type ClubRichImageWrap } from "@/lib/club-rich-content";

function token() { if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID(); return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

type ImageState = { id: string; width: number; wrap: ClubRichImageWrap; radius: number; caption: string; alt: string };

export default function ClubRichEditor({ name, label, initial, fallbackText, compact = false }: { name: string; label: string; initial: unknown; fallbackText?: string | null; compact?: boolean }) {
  const start = useMemo(() => normalizeClubRichContent(initial) ?? (fallbackText ? plainTextToClubRichContent(fallbackText) : emptyClubRichContent()), [initial, fallbackText]);
  const [json, setJson] = useState(() => JSON.stringify(start));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImageState | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = contentToEditorHtml(start);
    setJson(JSON.stringify(start));
    setSelectedImage(null);
    initializedRef.current = true;
  }, [name, start]);

  function sync() { if (!editorRef.current || !initializedRef.current) return; setJson(JSON.stringify(editorToContent(editorRef.current))); }
  function command(commandName: string, value?: string) {
    editorRef.current?.focus();
    try { document.execCommand("defaultParagraphSeparator", false, "p"); document.execCommand(commandName, false, value); } catch {}
    sync();
  }
  function format(tag: "p" | "h2" | "h3" | "blockquote") { command("formatBlock", tag); }
  function insertDivider() { editorRef.current?.focus(); insertHtmlAtSelection('<hr data-club-divider="1"><p><br></p>'); sync(); }
  function createLink() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) { setError("Сначала выдели текст, который должен стать ссылкой."); return; }
    const href = window.prompt("Адрес ссылки (https://…, /страница, mailto:…)", "https://");
    if (!href) return;
    if (!/^(https?:\/\/|\/|mailto:|tel:|#)/i.test(href.trim())) { setError("Недопустимый адрес ссылки."); return; }
    setError(""); command("createLink", href.trim());
  }
  function unlink() { command("unlink"); }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Фото должно быть JPG, PNG или WEBP."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Максимальный размер фото — 8 МБ."); return; }
    setBusy(true); setError("");
    try {
      const supabase = createClient(); const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) throw new Error("Сессия истекла. Войди в админку заново.");
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${data.user.id}/rich/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("club").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const imageUrl = supabase.storage.from("club").getPublicUrl(path).data.publicUrl;
      const id = token(); const caption = file.name.replace(/\.[^.]+$/, "");
      editorRef.current?.focus();
      insertHtmlAtSelection(`<figure data-club-image="1" data-editor-image-id="${escapeAttr(id)}" data-width="100" data-wrap="none" data-radius="18" contenteditable="false" style="width:100%;border-radius:18px"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(caption)}"><figcaption>${escapeHtml(caption)}</figcaption></figure><p><br></p>`);
      sync(); selectImage(id);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фотографию."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  function getImageFigure(id = selectedImage?.id) { return id && editorRef.current ? editorRef.current.querySelector<HTMLElement>(`figure[data-editor-image-id="${cssEscape(id)}"]`) : null; }
  function selectImage(id: string) {
    const figure = getImageFigure(id); if (!figure) return;
    editorRef.current?.querySelectorAll("figure.is-selected").forEach((node) => node.classList.remove("is-selected")); figure.classList.add("is-selected");
    const img = figure.querySelector("img"); const caption = figure.querySelector("figcaption")?.textContent || "";
    setSelectedImage({ id, width: numberAttr(figure, "data-width", 100), wrap: wrapAttr(figure), radius: numberAttr(figure, "data-radius", 18), caption, alt: img?.getAttribute("alt") || "" });
  }
  function updateSelectedImage(patch: Partial<ImageState>) {
    if (!selectedImage) return; const next = { ...selectedImage, ...patch }; const figure = getImageFigure(next.id); if (!figure) return;
    figure.dataset.width = String(next.width); figure.dataset.wrap = next.wrap; figure.dataset.radius = String(next.radius);
    applyImageFigureStyle(figure, next.width, next.wrap, next.radius);
    const img = figure.querySelector("img"); if (img) img.setAttribute("alt", next.alt);
    let caption = figure.querySelector("figcaption");
    if (next.caption) { if (!caption) { caption = document.createElement("figcaption"); figure.appendChild(caption); } caption.textContent = next.caption; }
    else caption?.remove();
    setSelectedImage(next); sync();
  }
  function deleteSelectedImage() {
    const figure = getImageFigure(); if (!figure) return; figure.remove(); setSelectedImage(null); sync();
  }

  return <section className={`clubDocumentEditor ${compact ? "compact" : ""}`}>
    <input type="hidden" name={name} value={json}/>
    <input ref={fileRef} className="clubRichHiddenFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])}/>

    <header className="clubDocumentEditorHead"><div><span>ДОКУМЕНТ</span><h3>{label}</h3><p>Единый редактор страницы: форматирование текста и изображения сохраняются в документе.</p></div></header>

    <div className="clubDocumentToolbar" role="toolbar" aria-label={`Панель форматирования: ${label}`}>
      <div className="clubDocumentToolbarGroup clubDocFormats">
        <select aria-label="Стиль абзаца" defaultValue="p" onChange={(e) => format(e.target.value as "p"|"h2"|"h3"|"blockquote")}>
          <option value="p">Обычный текст</option><option value="h2">Заголовок H2</option><option value="h3">Подзаголовок H3</option><option value="blockquote">Цитата</option>
        </select>
      </div>
      <div className="clubDocumentToolbarGroup">
        <Tool title="Жирный" label="B" onClick={() => command("bold")} strong/><Tool title="Курсив" label="I" onClick={() => command("italic")} italic/><Tool title="Подчёркивание" label="U" onClick={() => command("underline")} underline/><Tool title="Зачёркивание" label="S" onClick={() => command("strikeThrough")} strike/>
      </div>
      <div className="clubDocumentToolbarGroup"><Tool title="Маркированный список" label="•≡" onClick={() => command("insertUnorderedList")}/><Tool title="Нумерованный список" label="1≡" onClick={() => command("insertOrderedList")}/><Tool title="Добавить ссылку" label="🔗" onClick={createLink}/><Tool title="Убрать ссылку" label="⛓×" onClick={unlink}/></div>
      <div className="clubDocumentToolbarGroup"><Tool title="По левому краю" label="⇤" onClick={() => command("justifyLeft")}/><Tool title="По центру" label="≡" onClick={() => command("justifyCenter")}/><Tool title="По правому краю" label="⇥" onClick={() => command("justifyRight")}/></div>
      <div className="clubDocumentToolbarGroup clubDocumentToolbarMedia"><button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? "Загрузка…" : "+ Фото"}</button><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={insertDivider}>+ Линия</button></div>
      <div className="clubDocumentToolbarGroup clubDocumentToolbarHistory"><Tool title="Отменить" label="↶" onClick={() => command("undo")}/><Tool title="Повторить" label="↷" onClick={() => command("redo")}/></div>
    </div>

    {selectedImage && <div className="clubImageInspector" role="region" aria-label="Настройки изображения">
      <div className="clubImageInspectorTitle"><b>Изображение</b><span>Настройки выбранного фото</span></div>
      <label><span>Ширина <b>{selectedImage.width}%</b></span><input type="range" min="25" max="100" step="5" value={selectedImage.width} onChange={(e) => updateSelectedImage({ width: Number(e.target.value) })}/></label>
      <div className="clubImageInspectorButtons"><button type="button" className={selectedImage.wrap === "left" ? "active" : ""} onClick={() => updateSelectedImage({ wrap: "left" })}>Обтекание слева</button><button type="button" className={selectedImage.wrap === "none" ? "active" : ""} onClick={() => updateSelectedImage({ wrap: "none" })}>Без обтекания</button><button type="button" className={selectedImage.wrap === "right" ? "active" : ""} onClick={() => updateSelectedImage({ wrap: "right" })}>Обтекание справа</button></div>
      <label><span>Скругление <b>{selectedImage.radius}px</b></span><input type="range" min="0" max="32" step="2" value={selectedImage.radius} onChange={(e) => updateSelectedImage({ radius: Number(e.target.value) })}/></label>
      <label className="clubImageTextField"><span>Подпись</span><input value={selectedImage.caption} onChange={(e) => updateSelectedImage({ caption: e.target.value })}/></label>
      <label className="clubImageTextField"><span>Alt-текст</span><input value={selectedImage.alt} onChange={(e) => updateSelectedImage({ alt: e.target.value })}/></label>
      <button type="button" className="clubImageDelete" onClick={deleteSelectedImage}>Удалить фото из документа</button>
    </div>}

    {error && <div className="formError">{error}</div>}
    <div className="clubDocumentCanvasWrap"><div ref={editorRef} className="clubDocumentCanvas" contentEditable suppressContentEditableWarning spellCheck data-placeholder="Начни писать…" onInput={sync} onBlur={sync} onClick={(event) => { const figure = (event.target as HTMLElement).closest<HTMLElement>("figure[data-editor-image-id]"); if (figure?.dataset.editorImageId) selectImage(figure.dataset.editorImageId); else { editorRef.current?.querySelectorAll("figure.is-selected").forEach((node) => node.classList.remove("is-selected")); setSelectedImage(null); } }} onPaste={(event) => { event.preventDefault(); const text = event.clipboardData.getData("text/plain"); document.execCommand("insertText", false, text); sync(); }}/></div>
    <footer className="clubDocumentEditorFoot"><span>Панель остаётся видимой при прокрутке. Нажми на фото, чтобы изменить размер, обтекание или удалить его.</span><b>Форматирование сохраняется</b></footer>
  </section>;
}

function Tool({ title, label, onClick, strong, italic, underline, strike }: { title: string; label: string; onClick: () => void; strong?: boolean; italic?: boolean; underline?: boolean; strike?: boolean }) { return <button type="button" className="clubDocIcon" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick} style={{ fontWeight: strong ? 950 : undefined, fontStyle: italic ? "italic" : undefined, textDecoration: underline ? "underline" : strike ? "line-through" : undefined }}>{label}</button>; }

function contentToEditorHtml(content: ClubRichContent): string {
  if (!content.blocks.length) return "<p><br></p>";
  return content.blocks.map((block) => {
    const align = block.align ?? "left"; const alignAttr = align !== "left" ? ` style="text-align:${align}"` : "";
    if (block.type === "divider") return '<hr data-club-divider="1">';
    if (block.type === "image") {
      const id = block.id || token(); const width = block.width ?? 100; const wrap = block.wrap ?? "none"; const radius = block.radius ?? 18;
      return `<figure data-club-image="1" data-editor-image-id="${escapeAttr(id)}" data-width="${width}" data-wrap="${wrap}" data-radius="${radius}" contenteditable="false" style="${imageFigureStyle(width, wrap, radius)}"><img src="${escapeAttr(block.image_url ?? "")}" alt="${escapeAttr(block.alt ?? "")}">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure>`;
    }
    if (block.type === "bulleted_list" || block.type === "numbered_list") { const tag = block.type === "numbered_list" ? "ol" : "ul"; const items = (block.items ?? []).map((item, i) => `<li>${sanitizeInlineHtml(block.html_items?.[i] || escapeHtml(item))}</li>`).join(""); return `<${tag}${alignAttr}>${items}</${tag}>`; }
    const html = sanitizeInlineHtml(block.html || "") || richTextToHtml(block.text ?? "");
    if (block.type === "heading") return `<h2${alignAttr}>${html}</h2>`; if (block.type === "subheading") return `<h3${alignAttr}>${html}</h3>`; if (block.type === "quote") return `<blockquote${alignAttr}>${html}</blockquote>`; return `<p${alignAttr}>${html || "<br>"}</p>`;
  }).join("");
}

function editorToContent(root: HTMLElement): ClubRichContent {
  const blocks: ClubRichBlock[] = [];
  const addText = (type: "paragraph"|"heading"|"subheading"|"quote", element: HTMLElement) => { const text = String(element.innerText ?? element.textContent ?? "").replace(/\u00a0/g," ").trim(); if (!text) return; blocks.push({ id: token(), type, text, html: sanitizeInlineHtml(element.innerHTML), align: readAlign(element) }); };
  const visit = (node: Element) => {
    const tag = node.tagName.toLowerCase();
    if (tag === "figure" && node.hasAttribute("data-club-image")) { const image = node.querySelector("img"); if (!image?.getAttribute("src")) return; blocks.push({ id: node.getAttribute("data-editor-image-id") || token(), type:"image", image_url:image.getAttribute("src")||"", alt:image.getAttribute("alt")||undefined, caption:node.querySelector("figcaption")?.textContent?.trim()||undefined, align:"center", width:numberAttr(node as HTMLElement,"data-width",100), wrap:wrapAttr(node as HTMLElement), radius:numberAttr(node as HTMLElement,"data-radius",18) }); return; }
    if (tag === "hr") { blocks.push({ id:token(), type:"divider" }); return; }
    if (tag === "ul" || tag === "ol") { const lis = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "li") as HTMLElement[]; const items = lis.map((li) => (li.innerText || li.textContent || "").trim()).filter(Boolean); if (items.length) blocks.push({ id:token(), type:tag === "ol" ? "numbered_list" : "bulleted_list", items, html_items:lis.map((li) => sanitizeInlineHtml(li.innerHTML)), align:readAlign(node as HTMLElement) }); return; }
    if (tag === "h1" || tag === "h2") return addText("heading",node as HTMLElement); if (tag === "h3" || tag === "h4") return addText("subheading",node as HTMLElement); if (tag === "blockquote") return addText("quote",node as HTMLElement);
    if (tag === "p" || tag === "div") { const hasBlock = Array.from(node.children).some((child) => ["p","div","h1","h2","h3","h4","blockquote","ul","ol","figure","hr"].includes(child.tagName.toLowerCase())); if (hasBlock) Array.from(node.children).forEach(visit); else addText("paragraph",node as HTMLElement); return; }
    Array.from(node.children).forEach(visit);
  };
  Array.from(root.children).forEach(visit); return { version:1, blocks };
}

function insertHtmlAtSelection(html: string) { const selection = window.getSelection(); if (!selection?.rangeCount) { document.execCommand("insertHTML", false, html); return; } const range = selection.getRangeAt(0); range.deleteContents(); const fragment = range.createContextualFragment(html); const last = fragment.lastChild; range.insertNode(fragment); if (last) { range.setStartAfter(last); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); } }
function readAlign(element: HTMLElement): ClubRichAlign { const align = (element.style.textAlign || getComputedStyle(element).textAlign || "left").toLowerCase(); return align === "center" || align === "right" ? align : "left"; }
function richTextToHtml(value: string) { return escapeHtml(value).replace(/\n/g,"<br>"); }
function numberAttr(el: Element, name: string, fallback: number) { const n = Number(el.getAttribute(name)); return Number.isFinite(n) ? n : fallback; }
function wrapAttr(el: Element): ClubRichImageWrap { const v = el.getAttribute("data-wrap"); return v === "left" || v === "right" ? v : "none"; }
function imageFigureStyle(width: number, wrap: ClubRichImageWrap, radius: number) { const common = `width:${width}%;border-radius:${radius}px;`; if (wrap === "left") return `${common}float:left;margin:12px 28px 20px 0;`; if (wrap === "right") return `${common}float:right;margin:12px 0 20px 28px;`; return `${common}float:none;margin:28px auto;`; }
function applyImageFigureStyle(el: HTMLElement, width: number, wrap: ClubRichImageWrap, radius: number) { el.setAttribute("style", imageFigureStyle(width,wrap,radius)); }
function cssEscape(value: string) { return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g,"\\$&"); }
function escapeHtml(value: string) { return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function escapeAttr(value: string) { return escapeHtml(value); }
