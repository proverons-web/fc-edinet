"use client";

import { useEffect, useState } from "react";

type Tone = "success" | "error" | "info";

export default function MatchCenterFeedback({
  matchId,
  message,
  tone = "success",
}: {
  matchId: string;
  message?: string | null;
  tone?: Tone;
}) {
  const [visible, setVisible] = useState(Boolean(message));
  const storageKey = `fc-match-center-scroll:${matchId}`;

  useEffect(() => {
    const rememberScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (!target.closest(".matchCenterPage")) return;
      try {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      } catch {}
    };

    document.addEventListener("submit", rememberScroll, true);
    return () => document.removeEventListener("submit", rememberScroll, true);
  }, [storageKey]);

  useEffect(() => {
    if (!message) return;
    setVisible(true);

    try {
      const savedScroll = sessionStorage.getItem(storageKey);
      if (savedScroll != null) {
        const y = Number(savedScroll);
        if (Number.isFinite(y)) {
          requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: "auto" })));
        }
        sessionStorage.removeItem(storageKey);
      }
    } catch {}

    const timer = window.setTimeout(() => {
      setVisible(false);
      cleanQuery();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [message, storageKey]);

  function cleanQuery() {
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (!message || !visible) return null;

  return (
    <button
      type="button"
      className={`matchCenterToast ${tone}`}
      onClick={() => {
        setVisible(false);
        cleanQuery();
      }}
      aria-label="Закрыть уведомление"
    >
      <span className="matchCenterToastMark" aria-hidden="true">{tone === "error" ? "!" : tone === "success" ? "✓" : "i"}</span>
      <span>{message}</span>
      <small>Нажми, чтобы закрыть</small>
    </button>
  );
}
