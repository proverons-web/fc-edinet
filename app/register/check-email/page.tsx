import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
export default async function CheckEmailPage(){const locale=await getLocale();const text=publicText[locale].auth;return <main className="statusPage"><div className="container statusCard"><div className="statusIcon">✉</div><p className="eyebrow blue">{text.almost}</p><h1>{text.checkEmail}</h1><p>{text.checkEmailText}</p><Link className="primaryButton" href="/login">{text.goLogin}</Link></div></main>}
