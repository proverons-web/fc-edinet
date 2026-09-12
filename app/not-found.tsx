import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
export default async function NotFound(){const locale=await getLocale();const text=publicText[locale].notFound;return <main className="notFound"><div className="container"><p className="eyebrow blue">404</p><h1>{text.title}</h1><p>{text.text}</p><Link className="primaryButton" href="/">{text.button}</Link></div></main>}
