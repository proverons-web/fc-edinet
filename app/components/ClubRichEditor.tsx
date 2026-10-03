"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ClubRichContentView from "@/app/components/ClubRichContent";
import {
  emptyClubRichContent,
  normalizeClubRichContent,
  plainTextToClubRichContent,
  type ClubRichAlign,
  type ClubRichBlock,
  type ClubRichBlockType,
  type ClubRichContent,
  type ClubRichImageWrap,
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
  const start = normalizeClubRichContent(initial) ?? (fallbackText ? plainTextToClubRichContent(fallbackText) : emptyClubRichContent());
  const [content, setContent] = useState<ClubRichContent>(start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const insertAfterRef = useRef<string | null>(null);
  const json = useMemo(() => JSON.stringify(content), [content]);

  function insert(type: ClubRichBlockType, afterId?: string | null) {
    if (type === "image") {
      insertAfterRef.current = afterId ?? null;
      fileRef.current?.click();
      return;
    }
    const block: ClubRichBlock = type === "divider"
      ? { id: token(), type }
      : { id: token(), type, text: type === "heading" ? "Новый заголовок" : type === "quote" ? "Цитата или важный факт" : "Новый текст", align: "left" };
    setContent((prev) => ({ ...prev, blocks: insertBlock(prev.blocks, block, afterId) }));
  }

  function update(id: string, patch: Partial<ClubRichBlock>) {
    setContent((prev) => ({ ...prev, blocks: prev.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) }));
  }

  function remove(id: string) {
    setContent((prev) => ({ ...prev, blocks: prev.blocks.filter((block) => block.id !== id) }));
  }

  function move(id: string, delta: number) {
    setContent((prev) => {
      const blocks = [...prev.blocks];
      const index = blocks.findIndex((block) => block.id === id);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= blocks.length) return prev;
      [blocks[index], blocks[next]] = [blocks[next], blocks[index]];
      return { ...prev, blocks };
    });
  }

  function dropBefore(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setContent((prev) => {
      const source = prev.blocks.find((block) => block.id === draggedId);
      if (!source) return prev;
      const blocks = prev.blocks.filter((block) => block.id !== draggedId);
      const targetIndex = blocks.findIndex((block) => block.id === targetId);
      blocks.splice(Math.max(0, targetIndex), 0, source);
      return { ...prev, blocks };
    });
    setDraggedId(null);
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
      const block: ClubRichBlock = { id: token(), type: "image", image_url: imageUrl, alt: file.name.replace(/\.[^.]+$/, ""), width: 100, align: "center", wrap: "none", radius: 18 };
      setContent((prev) => ({ ...prev, blocks: insertBlock(prev.blocks, block, insertAfterRef.current) }));
      insertAfterRef.current = null;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фотографию.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return <section className={`clubRichEditor ${compact ? "compact" : ""}`}>
    <input type="hidden" name={name} value={json}/>
    <input ref={fileRef} className="clubRichHiddenFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])}/>
    <header className="clubRichEditorHead">
      <div><span>VISUAL TEXT COMPOSER</span><h3>{label}</h3><p>Текст, заголовки и фотографии можно ставить в любом порядке. Фото может быть полноширинным или обтекаться текстом.</p></div>
      <div className="clubRichAddBar">
        <button type="button" onClick={() => insert("paragraph")}>+ Текст</button>
        <button type="button" onClick={() => insert("heading")}>+ Заголовок</button>
        <button type="button" onClick={() => insert("quote")}>+ Цитата</button>
        <button type="button" onClick={() => insert("image")} disabled={busy}>{busy ? "Загрузка…" : "+ Фото"}</button>
        <button type="button" onClick={() => insert("divider")}>+ Линия</button>
      </div>
    </header>
    {error && <div className="formError">{error}</div>}
    <div className="clubRichEditorWorkspace">
      <div className="clubRichBlockList">
        {!content.blocks.length && <div className="clubRichEmpty"><strong>Пока пусто</strong><span>Добавь текст, заголовок или фотографию.</span></div>}
        {content.blocks.map((block, index) => <article
          key={block.id}
          className={`clubRichEditBlock type-${block.type}`}
          draggable
          onDragStart={() => setDraggedId(block.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => dropBefore(block.id)}
        >
          <div className="clubRichEditBlockTop">
            <div><span className="clubRichDrag">⋮⋮</span><b>{blockTitle(block.type)}</b><small>#{index + 1}</small></div>
            <div><button type="button" onClick={() => move(block.id, -1)} disabled={index === 0}>↑</button><button type="button" onClick={() => move(block.id, 1)} disabled={index === content.blocks.length - 1}>↓</button><button type="button" className="danger" onClick={() => remove(block.id)}>Удалить</button></div>
          </div>
          {block.type !== "image" && block.type !== "divider" && <>
            <textarea value={block.text ?? ""} rows={block.type === "paragraph" ? 5 : 2} onChange={(event) => update(block.id, { text: event.target.value })}/>
            <AlignButtons value={block.align ?? "left"} onChange={(align) => update(block.id, { align })}/>
          </>}
          {block.type === "image" && <div className="clubRichImageEdit">
            <div className="clubRichImageThumb"><img src={block.image_url} alt=""/></div>
            <div className="clubRichImageControls">
              <label><span>Подпись</span><input value={block.caption ?? ""} onChange={(event) => update(block.id, { caption: event.target.value })}/></label>
              <label><span>Alt</span><input value={block.alt ?? ""} onChange={(event) => update(block.id, { alt: event.target.value })}/></label>
              <label><span>Ширина</span><select value={block.width ?? 100} onChange={(event) => update(block.id, { width: Number(event.target.value) })}>{[25,33,40,50,60,66,75,100].map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
              <label><span>Обтекание</span><select value={block.wrap ?? "none"} onChange={(event) => update(block.id, { wrap: event.target.value as ClubRichImageWrap })}><option value="none">Без обтекания</option><option value="left">Фото слева, текст справа</option><option value="right">Фото справа, текст слева</option></select></label>
              <label><span>Скругление</span><input type="number" min={0} max={40} value={block.radius ?? 18} onChange={(event) => update(block.id, { radius: Number(event.target.value) })}/></label>
              <AlignButtons value={block.align ?? "center"} onChange={(align) => update(block.id, { align })}/>
            </div>
          </div>}
          <div className="clubRichInsertAfter"><button type="button" onClick={() => insert("paragraph", block.id)}>+ текст ниже</button><button type="button" onClick={() => insert("image", block.id)}>+ фото ниже</button></div>
        </article>)}
      </div>
      <aside className="clubRichLivePreview"><div className="clubRichLivePreviewHead"><span>LIVE PREVIEW</span><b>{content.blocks.length} блоков</b></div><ClubRichContentView content={content}/></aside>
    </div>
  </section>;
}

function AlignButtons({ value, onChange }: { value: ClubRichAlign; onChange: (value: ClubRichAlign) => void }) {
  return <div className="clubRichAlignButtons"><span>Выравнивание</span>{(["left", "center", "right"] as ClubRichAlign[]).map((item) => <button type="button" key={item} className={value === item ? "active" : ""} onClick={() => onChange(item)}>{item === "left" ? "≡←" : item === "center" ? "≡" : "→≡"}</button>)}</div>;
}
function blockTitle(type: ClubRichBlockType) {
  return type === "paragraph" ? "Текст" : type === "heading" ? "Заголовок" : type === "subheading" ? "Подзаголовок" : type === "quote" ? "Цитата" : type === "image" ? "Фотография" : "Разделитель";
}
function insertBlock(blocks: ClubRichBlock[], block: ClubRichBlock, afterId?: string | null) {
  if (!afterId) return [...blocks, block];
  const index = blocks.findIndex((item) => item.id === afterId);
  if (index < 0) return [...blocks, block];
  const next = [...blocks];
  next.splice(index + 1, 0, block);
  return next;
}
