"use client";

import { useState } from "react";
import { publicText, type Locale } from "@/lib/i18n";

export default function PhotoShareButton({
  photoId,
  title,
  compact = false,
  locale,
}: {
  photoId: string | number;
  title: string;
  compact?: boolean;
  locale: Locale;
}) {
  const text = publicText[locale].media;
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
        ↗ <span>{text.share}</span>
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
            {copied ? text.copied : text.copyLink}
          </button>
          <button
            type="button"
            className="photoShareClose"
            onClick={() => setOpen(false)}
          >
            {text.close}
          </button>
        </div>
      )}
    </div>
  );
}
