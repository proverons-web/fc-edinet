import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";

export const metadata: Metadata = { title: "404", robots: { index: false, follow: true } };

export default async function NotFound(){
  const locale=await getLocale();
  const text=publicText[locale].notFound;
  return <main className="notFound notFoundEditorial">
    <div className="notFoundWatermark" aria-hidden="true">404</div>
    <div className="container notFoundInner">
      <div className="notFoundCrest"><img src="/brand/fc-edinet-crest.png" alt="" aria-hidden="true"/></div>
      <div className="notFoundCopy">
        <p className="eyebrow blue">FC EDINEȚ · 404</p>
        <h1>{text.title}</h1>
        <p>{text.text}</p>
        <Link className="primaryButton" href="/">{text.button} <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  </main>;
}
