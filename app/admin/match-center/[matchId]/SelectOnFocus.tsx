"use client";

import type { FocusEvent, ReactNode } from "react";

export default function SelectOnFocus({ children }: { children: ReactNode }) {
  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      const type = (target.type || "text").toLowerCase();
      if (["text", "number", "search", "email", "tel", "url"].includes(type)) {
        requestAnimationFrame(() => target.select());
      }
      return;
    }
    if (target instanceof HTMLTextAreaElement) {
      requestAnimationFrame(() => target.select());
    }
  }

  return <div className="matchCenterSelectOnFocus" onFocusCapture={handleFocus}>{children}</div>;
}
