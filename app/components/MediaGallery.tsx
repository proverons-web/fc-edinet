"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PhotoShareButton from "@/app/components/PhotoShareButton";
import type { MediaPhoto } from "@/lib/types";
import "./media-viewer-v2305.css";

type MediaGalleryText = {
  openPhoto: string;
  open: string;
  close: string;
  previousPhoto: string;
  nextPhoto: string;
  photoBy: string;
  separatePage: string;
  share: string;
  copied: string;
  copyLink: string;
};

/** A dedicated, viewport-sized gallery; it does not inherit the legacy sidebar layout. */
export default function MediaGallery({ photos, albumTitle, text }: { photos: MediaPhoto[]; albumTitle: string; text: MediaGalleryText }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isOpen = activeIndex !== null;
  const lastOpener = useRef<number | null>(null);
  const openerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const active = activeIndex === null ? null : photos[activeIndex] ?? null;
  const shareText = { share: text.share, copied: text.copied, copyLink: text.copyLink, close: text.close };

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setActiveIndex(null); return; }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        if (event.target instanceof HTMLElement && event.target.closest("input,textarea,select")) return;
        event.preventDefault();
        setActiveIndex(current => current === null ? null : (current + (event.key === "ArrowRight" ? 1 : -1) + photos.length) % photos.length);
      }
      if (event.key === "Home" || event.key === "End") {
        if (event.target instanceof HTMLElement && event.target.closest("input,textarea,select")) return;
        event.preventDefault();
        setActiveIndex(event.key === "Home" ? 0 : photos.length - 1);
      }
      if (event.key === "Tab") {
        const controls = Array.from(viewerRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]") ?? []);
        if (!controls.length) return;
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1]?.focus(); }
        if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0]?.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [isOpen, photos.length]);

  useEffect(() => {
    if (activeIndex === null) {
      if (lastOpener.current !== null) openerRefs.current[lastOpener.current]?.focus();
      lastOpener.current = null;
      return;
    }
    const strip = thumbsRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-photo-index="${activeIndex}"]`);
    if (strip && thumb) {
      strip.scrollTo({ left: thumb.offsetLeft - strip.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2, behavior: "smooth" });
    }
  }, [activeIndex]);

  const previous = () => setActiveIndex(current => current === null ? null : (current - 1 + photos.length) % photos.length);
  const next = () => setActiveIndex(current => current === null ? null : (current + 1) % photos.length);
  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const t = event.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touch.current;
    touch.current = null;
    const end = event.changedTouches[0];
    if (!start || !end || photos.length < 2) return;
    const dx = end.clientX - start.x, dy = end.clientY - start.y;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.15) (dx > 0 ? previous : next)();
  };

  return <>
    <div className="mediaMasonry">
      {photos.map((photo, index) => <button
        key={photo.id}
        ref={node => { openerRefs.current[index] = node; }}
        type="button"
        className="mediaPhotoTile"
        onClick={() => { lastOpener.current = index; setActiveIndex(index); }}
        aria-label={`${text.openPhoto} ${index + 1}`}
      >
        <img src={photo.thumb_url} alt={photo.caption || `${albumTitle} — ${index + 1}`} loading="lazy" decoding="async" />
        <span className="mediaPhotoHover"><b>{text.open}</b><small>{index + 1} / {photos.length}</small></span>
      </button>)}
    </div>

    {active && activeIndex !== null && <div ref={viewerRef} className="mediaViewer2305" role="dialog" aria-modal="true" aria-label={albumTitle}>
      <header className="mediaViewer2305Bar">
        <div className="mediaViewer2305Heading"><span className="mediaViewer2305Counter" aria-live="polite">{activeIndex + 1} / {photos.length}</span><span className="mediaViewer2305Album">{albumTitle}</span></div>
        <button ref={closeRef} className="mediaViewer2305Close" type="button" aria-label={text.close} onClick={() => setActiveIndex(null)} title={text.close}>×</button>
      </header>
      <div className="mediaViewer2305Stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="mediaViewer2305Canvas">
          <img key={active.id} src={active.image_url} alt={active.caption || albumTitle} decoding="async" />
        </div>
        {photos.length > 1 && <>
          <button className="mediaViewer2305Nav isPrevious" type="button" aria-label={text.previousPhoto} onClick={previous}>‹</button>
          <button className="mediaViewer2305Nav isNext" type="button" aria-label={text.nextPhoto} onClick={next}>›</button>
        </>}
      </div>
      <footer className="mediaViewer2305Footer">
        <div className="mediaViewer2305Details">
          <div className="mediaViewer2305Caption">{active.caption || albumTitle}</div>
          {active.photographer && <small>{text.photoBy}: {active.photographer}</small>}
        </div>
        <div className="mediaViewer2305Actions">
          <PhotoShareButton photoId={active.id} title={active.caption || albumTitle} text={shareText} compact />
          <Link href={`/media/photo/${active.id}`} aria-label={text.separatePage} title={text.separatePage}>{text.separatePage}</Link>
        </div>
      </footer>
      {photos.length > 1 && <div className="mediaViewer2305Filmstrip" ref={thumbsRef} aria-label={text.openPhoto}>
        {photos.map((photo, index) => <button
          type="button" key={photo.id} data-photo-index={index}
          className={index === activeIndex ? "isActive" : ""}
          aria-current={index === activeIndex ? "true" : undefined}
          aria-label={`${text.openPhoto} ${index + 1}`}
          onClick={() => setActiveIndex(index)}
        ><img src={photo.thumb_url} alt="" loading="lazy" /></button>)}
      </div>}
    </div>}
  </>;
}
