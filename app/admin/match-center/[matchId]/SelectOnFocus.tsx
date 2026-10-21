"use client";

import type { MouseEvent, ReactNode } from "react";

export default function SelectOnFocus({ children }: { children: ReactNode }) {
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;

    // Select existing text only after an actual pointer click. Keyboard navigation
    // (Tab / Shift+Tab) must keep the browser's native focus behaviour.
    if (target instanceof HTMLInputElement) {
      const type = (target.type || "text").toLowerCase();
      // Number fields stay untouched by default because shirt numbers and similar
      // values are often extended digit-by-digit. Specific number fields can opt in.
      const explicitSelect = target.dataset.selectOnClick === "true";
      if (["text", "search", "email", "tel", "url"].includes(type) || explicitSelect) {
        target.select();
      }
      return;
    }

    if (target instanceof HTMLTextAreaElement) {
      target.select();
    }
  }

  return <div className="matchCenterSelectOnFocus" onClickCapture={handleClick}>{children}</div>;
}
