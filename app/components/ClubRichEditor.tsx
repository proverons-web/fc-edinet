"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  emptyClubRichContent,
  normalizeClubRichContent,
  plainTextToClubRichContent,
  type ClubRichAlign,
  type ClubRichBlock,
  type ClubRichContent,
} from "@/lib/club-rich-content";

function token() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ClubRichEditor({
  name,
  label,
  initial,
  fallbackText,
  compact = false,
}: {
  name: string;
  label: string;
  initial: unknown;
  fallbackText?: string | null;
  compact?: boolean;
}) {
  const start = useMemo(
    () => normalizeClubRichContent(initial) ?? (fallbackText ? plainTextToClubRichContent(fallbackText) : emptyClubRichContent()),
    [initial, fallbackText],
  );
  const [json, setJson] = useState(() => JSON.stringify(start));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = contentToEditorHtml(start);
    setJson(JSON.stringify(start));
    initializedRef.current = true;
  }, [name, start]);

  function sync() {
    if (!editorRef.current || !initializedRef.current) return;
    setJson(JSON.stringify(editorToContent(editorRef.current)));
  }

  function command(commandName: string, value?: string) {
    editorRef.current?.focus();
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand(commandName, false, value);
    } catch {
      // execCommand is still the widest cross-browser bridge for a small CMS toolbar.
    }
    sync();
  }

  function format(tag: "p" | "h2" | "h3" | "blockquote") {
    command("formatBlock", tag);
  }

  function insertDivider() {
    editorRef.current?.focus();
    insertHtmlAtSelection('<hr data-club-divider="1"><p><br></p>');
    sync();
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Фото должно быть JPG, PNG или WEBP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Максимальный размер фото — 8 МБ.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) throw new Error("Сессия истекла. Войди в админку заново.");
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${data.user.id}/rich/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("club").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const imageUrl = supabase.storage.from("club").getPublicUrl(path).data.publicUrl;
      editorRef.current?.focus();
      insertHtmlAtSelection(`<figure data-club-image="1" contenteditable="false"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(file.name.replace(/\.[^.]+$/, ""))}"><figcaption>${escapeHtml(file.name.replace(/\.[^.]+$/, ""))}</figcaption></figure><p><br></p>`);
      sync();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фотографию.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return <section className={`clubDocumentEditor ${compact ? "compact" : ""}`}>
    <input type="hidden" name={name} value={json}/>
    <input ref={fileRef} className="clubRichHiddenFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])}/>

    <header className="clubDocumentEditorHead">
      <div>
        <span>ДОКУМЕНТ</span>
        <h3>{label}</h3>
        <p>Редактируй страницу как обычный текстовый документ. Все изменения сохраняются в структурированном виде.</p>
      </div>
    </header>

    <div className="clubDocumentToolbar" role="toolbar" aria-label={`Панель форматирования: ${label}`}>
      <div className="clubDocumentToolbarGroup">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("p")}>Абзац</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("h2")}>H2</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("h3")}>H3</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("blockquote")}>Цитата</button>
      </div>
      <div className="clubDocumentToolbarGroup">
        <button type="button" title="По левому краю" onMouseDown={(e) => e.preventDefault()} onClick={() => command("justifyLeft")}>←</button>
        <button type="button" title="По центру" onMouseDown={(e) => e.preventDefault()} onClick={() => command("justifyCenter")}>≡</button>
        <button type="button" title="По правому краю" onMouseDown={(e) => e.preventDefault()} onClick={() => command("justifyRight")}>→</button>
      </div>
      <div className="clubDocumentToolbarGroup clubDocumentToolbarMedia">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? "Загрузка…" : "+ Фото"}</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={insertDivider}>+ Разделитель</button>
      </div>
      <div className="clubDocumentToolbarGroup clubDocumentToolbarHistory">
        <button type="button" title="Отменить" onMouseDown={(e) => e.preventDefault()} onClick={() => command("undo")}>↶</button>
        <button type="button" title="Повторить" onMouseDown={(e) => e.preventDefault()} onClick={() => command("redo")}>↷</button>
      </div>
    </div>

    {error && <div className="formError">{error}</div>}

    <div className="clubDocumentCanvasWrap">
      <div
        ref={editorRef}
        className="clubDocumentCanvas"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-placeholder="Начни писать историю клуба…"
        onInput={sync}
        onBlur={sync}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          sync();
        }}
      />
    </div>

    <footer className="clubDocumentEditorFoot">
      <span>Совет: выдели абзац и выбери H2, H3, цитату или выравнивание.</span>
      <b>Автосохранение в форму</b>
    </footer>
  </section>;
}

function contentToEditorHtml(content: ClubRichContent): string {
  if (!content.blocks.length) return "<p><br></p>";
  return content.blocks.map((block) => {
    const align = block.align ?? "left";
    const alignAttr = align !== "left" ? ` style="text-align:${align}"` : "";
    if (block.type === "divider") return '<hr data-club-divider="1">';
    if (block.type === "image") {
      return `<figure data-club-image="1" data-width="${block.width ?? 100}" data-align="${escapeAttr(align)}" contenteditable="false"><img src="${escapeAttr(block.image_url ?? "")}" alt="${escapeAttr(block.alt ?? "")}">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure>`;
    }
    const text = richTextToHtml(block.text ?? "");
    if (block.type === "heading") return `<h2${alignAttr}>${text}</h2>`;
    if (block.type === "subheading") return `<h3${alignAttr}>${text}</h3>`;
    if (block.type === "quote") return `<blockquote${alignAttr}>${text}</blockquote>`;
    return `<p${alignAttr}>${text || "<br>"}</p>`;
  }).join("");
}

function editorToContent(root: HTMLElement): ClubRichContent {
  const blocks: ClubRichBlock[] = [];
  const addText = (type: "paragraph" | "heading" | "subheading" | "quote", element: HTMLElement, textOverride?: string) => {
    const text = String(textOverride ?? element.innerText ?? element.textContent ?? "").replace(/\u00a0/g, " ").trim();
    if (!text) return;
    blocks.push({ id: token(), type, text, align: readAlign(element) });
  };

  const visit = (node: Element) => {
    const tag = node.tagName.toLowerCase();
    if (tag === "figure" && node.hasAttribute("data-club-image")) {
      const image = node.querySelector("img");
      if (!image?.getAttribute("src")) return;
      const caption = node.querySelector("figcaption")?.textContent?.trim() || undefined;
      blocks.push({
        id: token(),
        type: "image",
        image_url: image.getAttribute("src") || "",
        alt: image.getAttribute("alt") || undefined,
        caption,
        align: readAlign(node as HTMLElement),
        width: Number(node.getAttribute("data-width") || 100),
        wrap: "none",
        radius: 18,
      });
      return;
    }
    if (tag === "hr") {
      blocks.push({ id: token(), type: "divider" });
      return;
    }
    if (tag === "h1" || tag === "h2") return addText("heading", node as HTMLElement);
    if (tag === "h3" || tag === "h4") return addText("subheading", node as HTMLElement);
    if (tag === "blockquote") return addText("quote", node as HTMLElement);
    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      const items = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "li");
      items.forEach((li, index) => addText("paragraph", li as HTMLElement, `${ordered ? `${index + 1}.` : "•"} ${(li.textContent || "").trim()}`));
      return;
    }
    if (tag === "p" || tag === "div") {
      const hasBlockChildren = Array.from(node.children).some((child) => ["p","div","h1","h2","h3","h4","blockquote","ul","ol","figure","hr"].includes(child.tagName.toLowerCase()));
      if (hasBlockChildren) Array.from(node.children).forEach(visit);
      else addText("paragraph", node as HTMLElement);
      return;
    }
    Array.from(node.children).forEach(visit);
  };

  Array.from(root.children).forEach(visit);
  return { version: 1, blocks };
}

function readAlign(element: HTMLElement): ClubRichAlign {
  const align = element.style.textAlign || window.getComputedStyle(element).textAlign;
  return align === "center" || align === "right" ? align : "left";
}

function insertHtmlAtSelection(html: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) {
    document.execCommand("insertHTML", false, html);
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function richTextToHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}
function escapeHtml(value: string): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
