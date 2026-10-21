"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
  previousLabel: string;
  nextLabel: string;
};

export default function RecentMatchesCarousel({ children, previousLabel, nextLabel }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateButtons = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateButtons();
    track.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    const frame = window.requestAnimationFrame(updateButtons);
    return () => {
      window.cancelAnimationFrame(frame);
      track.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [updateButtons]);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>(".fcRefRecentMatchCard");
    if (!firstCard) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0") || 0;
    track.scrollBy({ left: direction * (firstCard.getBoundingClientRect().width + gap), behavior: "smooth" });
  };

  return (
    <div className="fcRefRecentMatchesRail">
      <button
        type="button"
        className="fcRefRecentMatchesArrow is-prev"
        aria-label={previousLabel}
        onClick={() => move(-1)}
        disabled={!canPrev}
      >
        ←
      </button>
      <div ref={trackRef} className="fcRefRecentMatchesGrid">
        {children}
      </div>
      <button
        type="button"
        className="fcRefRecentMatchesArrow is-next"
        aria-label={nextLabel}
        onClick={() => move(1)}
        disabled={!canNext}
      >
        →
      </button>
    </div>
  );
}
