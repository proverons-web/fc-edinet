"use client";

import { useEffect, useState } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = useState<"ru" | "ro">("ru");

  useEffect(() => {
    setLocale(document.documentElement.lang === "ro" ? "ro" : "ru");
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  const ro = locale === "ro";
  return (
    <main className="publicErrorPage">
      <div className="container publicErrorInner">
        <img src="/brand/fc-edinet-crest.png" alt="" aria-hidden="true" />
        <p className="eyebrow blue">FC EDINEȚ · {ro ? "EROARE" : "ОШИБКА"}</p>
        <h1>{ro ? "Pagina nu a putut fi încărcată" : "Не удалось загрузить страницу"}</h1>
        <p>{ro ? "Încearcă din nou. Dacă problema persistă, revino la pagina principală." : "Попробуй ещё раз. Если проблема повторится, вернись на главную страницу."}</p>
        <div className="publicErrorActions">
          <button className="primaryButton" type="button" onClick={reset}>{ro ? "Încearcă din nou" : "Попробовать снова"}</button>
          <a className="secondaryButton" href="/">{ro ? "Pagina principală" : "На главную"}</a>
        </div>
      </div>
    </main>
  );
}
