import AccountNav from "@/app/components/AccountNav";
import ProfileForm from "@/app/components/ProfileForm";
import { removeAvatar } from "@/app/account/actions";
import { requireAccountProfile } from "@/lib/account";
import { accountText } from "@/lib/account-i18n";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const locale = await getLocale();
  const text = accountText[locale];
  const { profile } = await requireAccountProfile();
  const displayName = profile.display_name || profile.full_name || "FC Edineț";
  const removeAction = removeAvatar.bind(null, locale);
  return <main className="accountV2Page">
    <section className="accountHero accountV2Hero"><div className="container"><p className="eyebrow">{text.eyebrow}</p><h1>{text.profileTitle}</h1><AccountNav locale={locale}/></div></section>
    <section className="section"><div className="container accountSingleColumn">
      <article className="accountPanel"><p className="eyebrow blue">{text.profile}</p><h2>{text.profileTitle}</h2><p className="accountLead">{text.profileDescription}</p>
        <ProfileForm fullName={profile.full_name || ""} displayName={displayName} city={profile.city || ""} avatarUrl={profile.avatar_url} locale={locale}/>
        {profile.avatar_url && <form action={removeAction} className="removeAvatarForm"><button className="dangerOutlineButton" type="submit">{text.removeAvatar}</button></form>}
      </article>
    </div></section>
  </main>;
}
