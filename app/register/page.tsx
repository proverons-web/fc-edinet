import { redirect } from "next/navigation";
import RegisterForm from "@/app/components/RegisterForm";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { publicText } from "@/lib/i18n";
export default async function RegisterPage(){const locale=await getLocale();const text=publicText[locale].auth;const supabase=await createClient();const {data}=await supabase.auth.getClaims();if(data?.claims?.sub)redirect("/account");return <main className="authPage"><div className="container authLayout"><section className="authIntro"><p className="eyebrow">{text.registerEyebrow}</p><h1>{text.registerTitle}</h1><p>{text.registerDescription}</p></section><section className="authCard"><p className="eyebrow blue">{text.registerCardEyebrow}</p><h2>{text.newUser}</h2><RegisterForm locale={locale}/></section></div></main>}
