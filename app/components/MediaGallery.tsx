"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PhotoShareButton from "@/app/components/PhotoShareButton";
import type { MediaPhoto } from "@/lib/types";

export default function MediaGallery({
  photos,
  albumTitle,
}: {
  photos: MediaPhoto[];
  albumTitle: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const active =
    activeIndex === null ? null : photos[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex === null) return;

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null);

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => {
          if (current === null) return null;
          return (current + 1) % photos.length;
        });
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => {
          if (current === null) return null;
          return (current - 1 + photos.length) % photos.length;
        });
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", keydown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", keydown);
    };
  }, [activeIndex, photos.length]);

  function previous() {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current - 1 + photos.length) % photos.length;
    });
  }

  function next() {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current + 1) % photos.length;
    });
  }

  return (
    <>
      <div className="mediaMasonry">
        {photos.map((photo, index) => (
          <button
            type="button"
            className="mediaPhotoTile"
            key={photo.id}
            onClick={() => setActiveIndex(index)}
            aria-label={`Открыть фото ${index + 1}`}
          >
            <img
              src={photo.thumb_url}
              alt={photo.caption || `${albumTitle} — фото ${index + 1}`}
              loading="lazy"
            />
            <span className="mediaPhotoHover">
              <b>Открыть</b>
              <small>{index + 1} / {photos.length}</small>
            </span>
          </button>
        ))}
      </div>

      {active && activeIndex !== null && (
        <div className="mediaLightbox" role="dialog" aria-modal="true">
          <button
            type="button"
            className="mediaLightboxClose"
            onClick={() => setActiveIndex(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="mediaLightboxArrow previous"
                onClick={previous}
                aria-label="Предыдущее фото"
              >
                ‹
              </button>
              <button
                type="button"
                className="mediaLightboxArrow next"
                onClick={next}
                aria-label="Следующее фото"
              >
                ›
              </button>
            </>
          )}

          <div className="mediaLightboxContent">
            <div className="mediaLightboxImage">
              <img
                src={active.image_url}
                alt={active.caption || albumTitle}
              />
            </div>

            <aside className="mediaLightboxInfo">
              <div>
                <span className="mediaLightboxCounter">
                  {activeIndex + 1} / {photos.length}
                </span>
                <h3>{active.caption || albumTitle}</h3>
                {active.photographer && (
                  <p>Фото: {active.photographer}</p>
                )}
              </div>

              <div className="mediaLightboxActions">
                <PhotoShareButton
                  photoId={active.id}
                  title={active.caption || albumTitle}
                />
                <Link href={`/media/photo/${active.id}`}>
                  Открыть отдельную страницу →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
