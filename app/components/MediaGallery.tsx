"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PhotoShareButton from "@/app/components/PhotoShareButton";
import type { MediaPhoto } from "@/lib/types";
import { publicText, type Locale } from "@/lib/i18n";

export default function MediaGallery({ photos, albumTitle, locale }: { photos: MediaPhoto[]; albumTitle: string; locale: Locale; }) {
  const text = publicText[locale].media;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = activeIndex === null ? null : photos[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((current) => current === null ? null : (current + 1) % photos.length);
      if (event.key === "ArrowLeft") setActiveIndex((current) => current === null ? null : (current - 1 + photos.length) % photos.length);
      if (event.key === "Tab") {
        const dialog = document.querySelector<HTMLElement>(".mediaLightbox");
        if (!dialog) return;
        const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydown);
      openerRefs.current[activeIndex]?.focus();
    };
  }, [activeIndex, photos.length]);

  const previous = () => setActiveIndex((current) => current === null ? null : (current - 1 + photos.length) % photos.length);
  const next = () => setActiveIndex((current) => current === null ? null : (current + 1) % photos.length);

  return <>
    <div className="mediaMasonry">
      {photos.map((photo, index) => <button ref={(node) => { openerRefs.current[index] = node; }} type="button" className="mediaPhotoTile" key={photo.id} onClick={() => setActiveIndex(index)} aria-label={`${text.openPhoto} ${index + 1}`}>
        <img src={photo.thumb_url} alt={photo.caption || `${albumTitle} — фото ${index + 1}`} loading="lazy" decoding="async" />
        <span className="mediaPhotoHover"><b>{text.open}</b><small>{index + 1} / {photos.length}</small></span>
      </button>)}
    </div>

    {active && activeIndex !== null && <div className="mediaLightbox" role="dialog" aria-modal="true" aria-label={active.caption || albumTitle}>
      <button ref={closeRef} type="button" className="mediaLightboxClose" onClick={() => setActiveIndex(null)} aria-label={text.close}>✕</button>
      {photos.length > 1 && <><button type="button" className="mediaLightboxArrow previous" onClick={previous} aria-label={text.previousPhoto}>‹</button><button type="button" className="mediaLightboxArrow next" onClick={next} aria-label={text.nextPhoto}>›</button></>}
      <div className="mediaLightboxContent"><div className="mediaLightboxImage"><img src={active.image_url} alt={active.caption || albumTitle} /></div>
      <aside className="mediaLightboxInfo"><div><span className="mediaLightboxCounter" aria-live="polite">{activeIndex + 1} / {photos.length}</span><h3>{active.caption || albumTitle}</h3>{active.photographer && <p>{text.photoBy}: {active.photographer}</p>}</div>
      <div className="mediaLightboxActions"><PhotoShareButton photoId={active.id} title={active.caption || albumTitle} locale={locale} /><Link href={`/media/photo/${active.id}`}>{text.separatePage}</Link></div></aside></div>
    </div>}
  </>;
}
