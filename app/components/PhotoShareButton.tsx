"use client";

import { useState } from "react";

export default function PhotoShareButton({
  photoId,
  title,
  compact = false,
}: {
  photoId: string | number;
  title: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function shareUrl() {
    return `${window.location.origin}/media/photo/${photoId}`;
  }

  async function nativeShare() {
    const data = {
      title,
      text: `${title} — FC Edineț`,
      url: shareUrl(),
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    setOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function openShare(target: "telegram" | "whatsapp" | "facebook") {
    const url = encodeURIComponent(shareUrl());
    const text = encodeURIComponent(`${title} — FC Edineț`);

    const targets = {
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };

    window.open(
      targets[target],
      "_blank",
      "noopener,noreferrer,width=720,height=620"
    );
  }

  return (
    <div className={`photoShare ${compact ? "compact" : ""}`}>
      <button
        type="button"
        className="photoShareMain"
        onClick={() => {
          void nativeShare();
        }}
      >
        ↗ <span>Поделиться</span>
      </button>

      {open && (
        <div className="photoShareMenu">
          <button type="button" onClick={() => openShare("telegram")}>
            Telegram
          </button>
          <button type="button" onClick={() => openShare("whatsapp")}>
            WhatsApp
          </button>
          <button type="button" onClick={() => openShare("facebook")}>
            Facebook
          </button>
          <button
            type="button"
            onClick={() => {
              void copyLink();
            }}
          >
            {copied ? "Ссылка скопирована ✓" : "Копировать ссылку"}
          </button>
          <button
            type="button"
            className="photoShareClose"
            onClick={() => setOpen(false)}
          >
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
}
