"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function ArticleShareButton({ slug, title, locale }: { slug: string; title: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const t = locale === "ro"
    ? { share: "Distribuie", copy: "Copiază linkul", copied: "Link copiat", close: "Închide" }
    : { share: "Поделиться", copy: "Копировать ссылку", copied: "Ссылка скопирована", close: "Закрыть" };

  function shareUrl() { return `${window.location.origin}/news/${encodeURIComponent(slug)}`; }

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    function onPointerDown(event: MouseEvent) { if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false); }
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.removeEventListener("mousedown", onPointerDown); };
  }, [open]);

  async function nativeShare() {
    const data = { title, text: `${title} — FC Edineț`, url: shareUrl() };
    if (navigator.share) {
      try { await navigator.share(data); return; }
      catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    setOpen(true);
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(shareUrl()); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }

  function openShare(target: "telegram" | "whatsapp" | "facebook") {
    const url = encodeURIComponent(shareUrl());
    const shareText = encodeURIComponent(`${title} — FC Edineț`);
    const targets = {
      telegram: `https://t.me/share/url?url=${url}&text=${shareText}`,
      whatsapp: `https://wa.me/?text=${shareText}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
    window.open(targets[target], "_blank", "noopener,noreferrer,width=720,height=620");
  }

  return <div className="articleShare" ref={wrapRef}>
    <button type="button" className="articleShareMain" onClick={() => void nativeShare()} aria-expanded={open} aria-controls={menuId} aria-haspopup="menu">↗ <span>{t.share}</span></button>
    {open && <div className="articleShareMenu" id={menuId} role="menu" aria-label={t.share}>
      <button ref={firstRef} role="menuitem" type="button" onClick={() => openShare("telegram")}>Telegram</button>
      <button role="menuitem" type="button" onClick={() => openShare("whatsapp")}>WhatsApp</button>
      <button role="menuitem" type="button" onClick={() => openShare("facebook")}>Facebook</button>
      <button role="menuitem" type="button" onClick={() => void copyLink()}>{copied ? t.copied : t.copy}</button>
      <button role="menuitem" type="button" className="articleShareClose" onClick={() => setOpen(false)}>{t.close}</button>
      <span className="srOnly" aria-live="polite">{copied ? t.copied : ""}</span>
    </div>}
  </div>;
}
