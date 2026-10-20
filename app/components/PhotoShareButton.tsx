"use client";

import { useEffect, useId, useRef, useState } from "react";
import { publicText, type Locale } from "@/lib/i18n";

export default function PhotoShareButton({ photoId, title, compact = false, locale }: { photoId: string | number; title: string; compact?: boolean; locale: Locale; }) {
  const text = publicText[locale].media;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  function shareUrl() { return `${window.location.origin}/media/photo/${photoId}`; }

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
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
    const targets = { telegram: `https://t.me/share/url?url=${url}&text=${shareText}`, whatsapp: `https://wa.me/?text=${shareText}%20${url}`, facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}` };
    window.open(targets[target], "_blank", "noopener,noreferrer,width=720,height=620");
  }

  return <div className={`photoShare ${compact ? "compact" : ""}`} ref={wrapRef}>
    <button type="button" className="photoShareMain" onClick={() => void nativeShare()} aria-expanded={open} aria-controls={menuId} aria-haspopup="menu">↗ <span>{text.share}</span></button>
    {open && <div className="photoShareMenu" id={menuId} role="menu" aria-label={text.share}>
      <button ref={firstItemRef} role="menuitem" type="button" onClick={() => openShare("telegram")}>Telegram</button>
      <button role="menuitem" type="button" onClick={() => openShare("whatsapp")}>WhatsApp</button>
      <button role="menuitem" type="button" onClick={() => openShare("facebook")}>Facebook</button>
      <button role="menuitem" type="button" onClick={() => void copyLink()}>{copied ? text.copied : text.copyLink}</button>
      <button role="menuitem" type="button" className="photoShareClose" onClick={() => setOpen(false)}>{text.close}</button>
      <span className="srOnly" aria-live="polite">{copied ? text.copied : ""}</span>
    </div>}
  </div>;
}
