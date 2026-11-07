import Link from "next/link";
import AccountNav from "@/app/components/AccountNav";
import { logout } from "@/app/account/actions";
import { requireAccountProfile } from "@/lib/account";
import { accountText } from "@/lib/account-i18n";
import { getLocale } from "@/lib/locale";
import { dateLocale, roleLabelsI18n } from "@/lib/i18n";
import { staffRoles } from "@/lib/types";
import { FAN_MATCH_SELECT, FAN_PLAYER_SELECT, fanDashboardText, groupFanMatches, type FanFavoritePlayer, type FanFavoriteMatch } from "@/lib/fan-favorites";
import FanMatchItem from "@/app/account/FanMatchItem";
import "./fan-dashboard-v2301.css";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const locale = await getLocale();
  const text = accountText[locale];
  const { supabase, userId, profile } = await requireAccountProfile();
  const fan = fanDashboardText[locale];
  const [playersResult, matchesResult] = await Promise.all([
    supabase.from("favorite_players").select(FAN_PLAYER_SELECT, { count: "exact" })
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
    supabase.from("favorite_matches").select(FAN_MATCH_SELECT, { count: "exact" })
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(250),
  ]);
  const players = (playersResult.data ?? []) as unknown as FanFavoritePlayer[];
  const savedMatches = (matchesResult.data ?? []) as unknown as FanFavoriteMatch[];
  const { upcoming, results } = groupFanMatches(savedMatches);
  const nextSavedMatch = upcoming[0];
  const recentResults = results.slice(0, 3);
  const playerCount = playersResult.count;
  const matchCount = matchesResult.count;
  const playersFailed = Boolean(playersResult.error);
  const matchesFailed = Boolean(matchesResult.error);
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
          <Link href="/account/favorites"><span>♥</span><strong>{playersFailed ? "—" : (playerCount ?? 0)}</strong><small>{text.favoritePlayers}</small></Link>
          <Link href="/account/favorites"><span>★</span><strong>{matchesFailed ? "—" : (matchCount ?? 0)}</strong><small>{text.favoriteMatches}</small></Link>
        </div>
        <div className="fanCallout"><p className="eyebrow blue">{text.accountActive}</p><p>{text.fanMessage}</p><Link className="primaryButton" href="/account/favorites">{text.openFavorites}</Link></div>
        {isStaff && <div className="staffCallout"><p>{text.staffMessage}</p><Link className="primaryButton" href="/admin">{text.adminPanel}</Link></div>}
        <form action={logout}><button className="logoutButton" type="submit">{text.logout}</button></form>
      </aside>
    </div></section>

    <section className="fanV2301Section"><div className="container">
      <div className="fanV2301Heading">
        <div><p>{fan.personalFeed}</p><h2>{fan.personalFeedTitle}</h2></div>
        <Link href="/account/favorites">{text.openFavorites} →</Link>
      </div>
      <div className="fanV2301Layout">
        <div className="fanV2301Column">
          <section className="fanV2301Card" aria-labelledby="fan-v2301-next"><h3 id="fan-v2301-next">{fan.nextMatch}</h3>
            {matchesFailed ? <p role="alert" className="fanV2301Error">{fan.dataError}</p> : nextSavedMatch ?
              <FanMatchItem match={nextSavedMatch} locale={locale}/> :
              <div><p className="fanV2301Empty">{fan.nextMatchEmpty}</p><Link className="fanV2301EmptyLink" href="/matches">{fan.viewMatches} →</Link></div>}
          </section>
          <section className="fanV2301Card" aria-labelledby="fan-v2301-results"><h3 id="fan-v2301-results">{fan.latestResults}</h3>
            {matchesFailed ? <p role="alert" className="fanV2301Error">{fan.dataError}</p> : recentResults.length ?
              recentResults.map((match) => <FanMatchItem key={String(match.id)} match={match} locale={locale}/>) :
              <p className="fanV2301Empty">{fan.noResults}</p>}
            {!matchesFailed && recentResults.length > 0 && <Link className="fanV2301FooterLink" href="/account/favorites?view=results">{fan.moreResults} →</Link>}
          </section>
        </div>
        <section className="fanV2301Card" aria-labelledby="fan-v2301-players"><h3 id="fan-v2301-players">{fan.myPlayers}</h3>
          {playersFailed ? <p role="alert" className="fanV2301Error">{fan.dataError}</p> : players.length ?
            <div className="fanV2301Players">{players.map(({player}) => player ? <Link className="fanV2301Player" key={String(player.id)} href={`/team/${player.slug}`}>
              <div className="fanV2301PlayerPhoto">{player.photo_url ? <img src={player.photo_url} alt="" loading="lazy"/> : <span>{player.shirt_number ?? "FC"}</span>}</div>
              <strong>{player.first_name} {player.last_name}</strong>
            </Link> : null)}</div> : <p className="fanV2301Empty">{fan.noFavoritePlayers}</p>}
          <Link className="fanV2301FooterLink" href={players.length ? "/account/favorites" : "/team"}>{players.length ? fan.allPlayers : text.browsePlayers} →</Link>
        </section>
      </div>
    </div></section>
  </main>;
}
