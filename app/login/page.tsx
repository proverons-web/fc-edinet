import { redirect } from "next/navigation";
import LoginForm from "@/app/components/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
export default async function LoginPage(){const locale=await getLocale();const text=publicText[locale].auth;const supabase=await createClient();const {data}=await supabase.auth.getClaims();if(data?.claims?.sub)redirect("/account");return <main className="authPage"><div className="container authLayout"><section className="authIntro"><p className="eyebrow">FC EDINEȚ</p><h1>{text.loginTitle}</h1><p>{text.loginDescription}</p></section><section className="authCard"><p className="eyebrow blue">{text.loginEyebrow}</p><h2>{text.welcome}</h2><LoginForm locale={locale}/></section></div></main>}
