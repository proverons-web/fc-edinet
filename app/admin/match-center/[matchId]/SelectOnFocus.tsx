"use client";

import type { MouseEvent, ReactNode } from "react";

export default function SelectOnFocus({ children }: { children: ReactNode }) {
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;

    // Select existing text only after an actual pointer click. Keyboard navigation
    // (Tab / Shift+Tab) must keep the browser's native focus behaviour.
    if (target instanceof HTMLInputElement) {
      const type = (target.type || "text").toLowerCase();
      // Number fields are intentionally excluded: users often append a digit
      // (e.g. shirt number 2 -> 21), which select-all would otherwise replace.
      if (["text", "search", "email", "tel", "url"].includes(type)) {
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
