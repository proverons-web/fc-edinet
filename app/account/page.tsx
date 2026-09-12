import Link from "next/link";
import AccountNav from "@/app/components/AccountNav";
import { logout } from "@/app/account/actions";
import { requireAccountProfile } from "@/lib/account";
import { accountText } from "@/lib/account-i18n";
import { getLocale } from "@/lib/locale";
import { dateLocale, roleLabelsI18n } from "@/lib/i18n";
import { staffRoles } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const locale = await getLocale();
  const text = accountText[locale];
  const { supabase, profile } = await requireAccountProfile();
  const [{ count: playerCount }, { count: matchCount }] = await Promise.all([
    supabase.from("favorite_players").select("player_id", { count: "exact", head: true }),
    supabase.from("favorite_matches").select("match_id", { count: "exact", head: true }),
  ]);
  const isStaff = staffRoles.includes(profile.role);
  const name = profile.display_name || profile.full_name || profile.email || text.title;
  const joined = new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric" }).format(new Date(profile.created_at));

  return <main className="accountV2Page">
    <section className="accountHero accountV2Hero"><div className="container">
      <div className="accountHeroProfile">
        <div className="accountHeroAvatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{name.slice(0,1).toUpperCase()}</span>}</div>
        <div><p className="eyebrow">{text.eyebrow}</p><h1>{name}</h1><div className="roleBadge">{roleLabelsI18n[locale][profile.role]}</div></div>
      </div>
      <AccountNav locale={locale} />
    </div></section>

    <section className="section"><div className="container accountDashboardGrid">
      <article className="accountPanel accountDashboardMain">
        <p className="eyebrow blue">{text.dashboard}</p><h2>{text.title}</h2>
        <div className="accountDetails accountDetailsV2">
          <div><span>Email</span><strong>{profile.email || "—"}</strong></div>
          <div><span>{text.role}</span><strong>{roleLabelsI18n[locale][profile.role]}</strong></div>
          <div><span>{text.city}</span><strong>{profile.city || text.notSet}</strong></div>
          <div><span>{text.memberSince}</span><strong>{joined}</strong></div>
        </div>
        <div className="accountQuickActions">
          <Link className="secondaryButton" href="/account/profile">{text.editProfile}</Link>
          <Link className="secondaryButton" href="/account/settings">{text.manageSettings}</Link>
        </div>
      </article>

      <aside className="accountDashboardSide">
        <div className="accountFavoriteStats">
          <Link href="/account/favorites"><span>♥</span><strong>{playerCount || 0}</strong><small>{text.favoritePlayers}</small></Link>
          <Link href="/account/favorites"><span>★</span><strong>{matchCount || 0}</strong><small>{text.favoriteMatches}</small></Link>
        </div>
        <div className="fanCallout"><p className="eyebrow blue">{text.accountActive}</p><p>{text.fanMessage}</p><Link className="primaryButton" href="/account/favorites">{text.openFavorites}</Link></div>
        {isStaff && <div className="staffCallout"><p>{text.staffMessage}</p><Link className="primaryButton" href="/admin">{text.adminPanel}</Link></div>}
        <form action={logout}><button className="logoutButton" type="submit">{text.logout}</button></form>
      </aside>
    </div></section>
  </main>;
}
