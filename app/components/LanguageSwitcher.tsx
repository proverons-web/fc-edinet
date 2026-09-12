"use client";

import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div className="languageSwitch" aria-label="Language / Limbă">
      <button
        type="button"
        className={locale === "ru" ? "active" : ""}
        onClick={() => change("ru")}
        aria-pressed={locale === "ru"}
      >
        RU
      </button>
      <span>/</span>
      <button
        type="button"
        className={locale === "ro" ? "active" : ""}
        onClick={() => change("ro")}
        aria-pressed={locale === "ro"}
      >
        RO
      </button>
    </div>
  );
}
