import Link from "next/link";
import AccountNav from "@/app/components/AccountNav";
import { toggleFavoritePlayer } from "@/app/account/actions";
import FanMatchItem from "@/app/account/FanMatchItem";
import { requireAccountProfile } from "@/lib/account";
import { accountText } from "@/lib/account-i18n";
import { getLocale } from "@/lib/locale";
import { positionLabelsI18n } from "@/lib/i18n";
import {
  FAN_MATCH_SELECT, FAN_PLAYER_SELECT, fanDashboardText, fanMatchView, groupFanMatches,
  type FanFavoriteMatch, type FanFavoritePlayer,
} from "@/lib/fan-favorites";
import "../fan-dashboard-v2301.css";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ view?: string }>;

export default async function AccountFavoritesPage({searchParams}: {searchParams:SearchParams}) {
  const locale = await getLocale();
  const text = accountText[locale];
  const fan = fanDashboardText[locale];
  const { supabase, userId } = await requireAccountProfile();
  const view = fanMatchView((await searchParams)?.view);
  const [playersResult, matchesResult] = await Promise.all([
    supabase.from("favorite_players").select(FAN_PLAYER_SELECT)
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("favorite_matches").select(FAN_MATCH_SELECT)
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
  ]);
  const players = (playersResult.data ?? []) as unknown as FanFavoritePlayer[];
  const matches = (matchesResult.data ?? []) as unknown as FanFavoriteMatch[];
  const grouped = groupFanMatches(matches);
  const selected = view === "upcoming" ? grouped.upcoming : view === "results" ? grouped.results : grouped.all;
  const message = view === "upcoming" ? fan.noUpcoming : view === "results" ? fan.noFinished : text.noMatches;

  return <main className="accountV2Page">
    <section className="accountHero accountV2Hero"><div className="container"><p className="eyebrow">{text.eyebrow}</p><h1>{text.favoritesTitle}</h1><p>{text.favoritesDescription}</p><AccountNav locale={locale}/></div></section>
    <section className="section"><div className="container favoritesStack">
      <div><div className="sectionHeading"><div><p className="eyebrow blue">{text.players}</p><h2>{text.favoritePlayers}</h2></div><Link href="/team">{text.browsePlayers} →</Link></div>
        {playersResult.error ? <p role="alert" className="fanV2301Error">{fan.dataError}</p> : players.length ?
          <div className="favoritePlayerGrid">{players.map(({player}) => player ? <article className="favoritePlayerCard" key={String(player.id)}>
            <Link href={`/team/${player.slug}`} className="favoritePlayerPhoto">{player.photo_url ? <img src={player.photo_url} alt={`${player.first_name} ${player.last_name}`} loading="lazy"/> : <span>{player.shirt_number ?? "FC"}</span>}</Link>
            <div><small>{positionLabelsI18n[locale][player.position] || player.position}</small><h3>{player.first_name} {player.last_name}</h3><form action={toggleFavoritePlayer.bind(null, String(player.id), "/account/favorites")}><button className="favoriteActiveButton" type="submit">{text.removePlayer}</button></form></div>
          </article> : null)}</div> : <div className="accountEmpty"><p>{text.noPlayers}</p><Link className="primaryButton" href="/team">{text.browsePlayers}</Link></div>}
      </div>

      <div><div className="sectionHeading fanV2301FavoriteHeading"><div><p className="eyebrow blue">{text.matches}</p><h2>{text.favoriteMatches}</h2></div><Link href="/matches">{text.browseMatches} →</Link></div>
        <nav className="fanV2301Filters" aria-label={fan.matchList}>
          {(["all", "upcoming", "results"] as const).map((item) =>
            <Link key={item} href={item === "all" ? "/account/favorites" : `/account/favorites?view=${item}`}
              className="fanV2301Filter" aria-current={item === view ? "page" : undefined}>{fan[item]}{!matchesResult.error ? ` (${item === "all" ? grouped.all.length : grouped[item].length})` : ""}</Link>)}
        </nav>
        {matchesResult.error ? <p role="alert" className="fanV2301Error">{fan.dataError}</p> : selected.length ?
          <div className="fanV2301FavoriteList">{selected.map((match) => <FanMatchItem key={String(match.id)} match={match} locale={locale} removable/>)}</div> :
          <div className="accountEmpty"><p>{message}</p><Link className="primaryButton" href="/matches">{text.browseMatches}</Link></div>}
      </div>
    </div></section>
  </main>;
}
