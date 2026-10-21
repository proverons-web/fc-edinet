"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export default function MatchCenterSubmitButton({
  children,
  pendingText,
  className = "primaryButton",
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${className}${pending ? " is-loading" : ""}`}
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? <span className="matchCenterButtonSpinner" aria-hidden="true" /> : null}
      <span>{pending ? pendingText : children}</span>
    </button>
  );
}
