"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default function PublicBackLink({
  fallbackHref,
  locale,
  label,
  className = "",
}: {
  fallbackHref: string;
  locale: Locale;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const text = label || (locale === "ro" ? "Înapoi" : "Назад");

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      // Never send visitors back to an unrelated external site from a public back button.
      try {
        if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
          router.back();
          return;
        }
      } catch { /* Invalid referrer: use the canonical route. */ }
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      className={`publicBackLink ${className}`.trim()}
      onClick={goBack}
      aria-label={text}
    >
      <span aria-hidden="true">←</span>
      <span>{text}</span>
    </button>
  );
}
