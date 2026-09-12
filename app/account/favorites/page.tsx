import Link from "next/link";
import AccountNav from "@/app/components/AccountNav";
import { toggleFavoriteMatch, toggleFavoritePlayer } from "@/app/account/actions";
import { requireAccountProfile } from "@/lib/account";
import { accountText } from "@/lib/account-i18n";
import { getLocale } from "@/lib/locale";
import { dateLocale, matchStatusLabelsI18n, positionLabelsI18n } from "@/lib/i18n";
import type { ClubMatch, Player } from "@/lib/types";

export const dynamic = "force-dynamic";

type FavoritePlayerRow = { created_at: string; player: Player | null };
type FavoriteMatchRow = { created_at: string; match: ClubMatch | null };

export default async function AccountFavoritesPage() {
  const locale = await getLocale();
  const text = accountText[locale];
  const { supabase } = await requireAccountProfile();
  const [playersResult, matchesResult] = await Promise.all([
    supabase.from("favorite_players").select(`created_at,player:players!favorite_players_player_id_fkey(id,first_name,last_name,slug,shirt_number,position,birth_date,nationality,height_cm,photo_url,bio,bio_ro,is_active,display_order,preferred_foot,hometown,previous_club,joined_at)`).order("created_at", { ascending: false }),
    supabase.from("favorite_matches").select(`created_at,match:matches!favorite_matches_match_id_fkey(id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,home_score,away_score,notes,created_at,updated_at,home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),competition:competitions!matches_competition_id_fkey(id,name,slug,season,is_active))`).order("created_at", { ascending: false }),
  ]);
  const players = (playersResult.data || []) as unknown as FavoritePlayerRow[];
  const matches = (matchesResult.data || []) as unknown as FavoriteMatchRow[];

  return <main className="accountV2Page">
    <section className="accountHero accountV2Hero"><div className="container"><p className="eyebrow">{text.eyebrow}</p><h1>{text.favoritesTitle}</h1><p>{text.favoritesDescription}</p><AccountNav locale={locale}/></div></section>
    <section className="section"><div className="container favoritesStack">
      <div><div className="sectionHeading"><div><p className="eyebrow blue">{text.players}</p><h2>{text.favoritePlayers}</h2></div><Link href="/team">{text.browsePlayers} →</Link></div>
      {players.length ? <div className="favoritePlayerGrid">{players.map(({ player }) => player ? <article className="favoritePlayerCard" key={String(player.id)}>
        <Link href={`/team/${player.slug}`} className="favoritePlayerPhoto">{player.photo_url ? <img src={player.photo_url} alt={`${player.first_name} ${player.last_name}`}/> : <span>{player.shirt_number ?? "FC"}</span>}</Link>
        <div><small>{positionLabelsI18n[locale][player.position] || player.position}</small><h3>{player.first_name} {player.last_name}</h3><form action={toggleFavoritePlayer.bind(null, String(player.id), "/account/favorites")}><button className="favoriteActiveButton" type="submit">{text.removePlayer}</button></form></div>
      </article> : null)}</div> : <div className="accountEmpty"><p>{text.noPlayers}</p><Link className="primaryButton" href="/team">{text.browsePlayers}</Link></div>}</div>

      <div><div className="sectionHeading"><div><p className="eyebrow blue">{text.matches}</p><h2>{text.favoriteMatches}</h2></div><Link href="/matches">{text.browseMatches} →</Link></div>
      {matches.length ? <div className="favoriteMatchList">{matches.map(({ match }) => match ? <FavoriteMatchCard key={String(match.id)} match={match} locale={locale}/> : null)}</div> : <div className="accountEmpty"><p>{text.noMatches}</p><Link className="primaryButton" href="/matches">{text.browseMatches}</Link></div>}</div>
    </div></section>
  </main>;
}

function FavoriteMatchCard({ match, locale }: { match: ClubMatch; locale: "ru" | "ro" }) {
  const text = accountText[locale];
  const date = new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau" }).format(new Date(match.kickoff));
  return <article className="favoriteMatchCard"><div><span>{match.competition?.name || text.matches}</span><strong>{match.home?.name || "—"} <b>{match.status === "finished" || match.status === "live" ? `${match.home_score ?? 0}:${match.away_score ?? 0}` : "VS"}</b> {match.away?.name || "—"}</strong><small>{date} · {matchStatusLabelsI18n[locale][match.status]}</small></div><form action={toggleFavoriteMatch.bind(null, String(match.id), "/account/favorites")}><button className="favoriteActiveButton" type="submit">{text.removeMatch}</button></form></article>;
}
