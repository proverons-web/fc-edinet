"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export default function MatchCenterSubmitButton({
  children,
  pendingText,
  className = "primaryButton",
  name,
  value,
  disabled = false,
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${className}${pending ? " is-loading" : ""}`}
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? <span className="matchCenterButtonSpinner" aria-hidden="true" /> : null}
      <span>{pending ? pendingText : children}</span>
    </button>
  );
}
