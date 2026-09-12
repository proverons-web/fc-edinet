import AccountNav from "@/app/components/AccountNav";
import AccountSettingsForm from "@/app/components/AccountSettingsForm";
import { requireAccountProfile } from "@/lib/account";
import { accountText } from "@/lib/account-i18n";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const locale = await getLocale();
  const text = accountText[locale];
  const { profile } = await requireAccountProfile();
  return <main className="accountV2Page">
    <section className="accountHero accountV2Hero"><div className="container"><p className="eyebrow">{text.eyebrow}</p><h1>{text.settingsTitle}</h1><AccountNav locale={locale}/></div></section>
    <section className="section"><div className="container accountSingleColumn"><article className="accountPanel"><p className="eyebrow blue">{text.settings}</p><h2>{text.settingsTitle}</h2><p className="accountLead">{text.settingsDescription}</p>
      <AccountSettingsForm locale={locale} preferredLanguage={profile.preferred_language || locale} notificationsEnabled={profile.notifications_enabled !== false}/>
    </article></div></section>
  </main>;
}
