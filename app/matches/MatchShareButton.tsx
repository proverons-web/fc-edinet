"use client";

import { useState } from "react";

type Props = {
  matchId: number | string;
  homeName: string;
  awayName: string;
  locale: "ru" | "ro";
};

export default function MatchShareButton({ matchId, homeName, awayName, locale }: Props) {
  const [feedback, setFeedback] = useState<"copied" | "failed" | null>(null);
  const label = locale === "ro" ? "Distribuie meciul" : "Поделиться матчем";
  async function share() {
    const url = `${window.location.origin}/matches/${encodeURIComponent(String(matchId))}`;
    const title = `${homeName} — ${awayName} | FC Edineț`;
    setFeedback(null);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("copied");
    } catch {
      // Clipboard may be blocked by the browser. Use a selectable text fallback.
      const text = locale === "ro" ? "Copiați linkul meciului:" : "Скопируйте ссылку на матч:";
      window.prompt(text, url);
      setFeedback("failed");
    }
  }
  return (
    <span className="fanShareWrap">
      <button type="button" className="fanMatchAction fanMatchShare" onClick={share} aria-label={label}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.7-4.2M8.7 13.4l6.7 4.2"/></svg>
        <span>{label}</span>
      </button>
      <span className="fanShareFeedback" role="status" aria-live="polite">
        {feedback === "copied" ? (locale === "ro" ? "Link copiat" : "Ссылка скопирована") : null}
      </span>
    </span>
  );
}
