import type { Metadata } from "next";
import Link from "next/link";
import PageHeroShell from "@/app/components/PageHeroShell";
import { notFound } from "next/navigation";
import { toggleFavoritePlayer } from "@/app/account/actions";
import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { accountText } from "@/lib/account-i18n";
import { dateLocale, footLabelsI18n, localized, positionLabelsI18n, publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };
async function getPlayer(slug: string): Promise<Player | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("players").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  return data as Player | null;
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getLocale(); const { slug } = await params; const player = await getPlayer(slug);
  if (!player) return { title: publicText[locale].team.notFound };
  const fullName = `${player.first_name} ${player.last_name}`.trim();
  return { title: fullName, description: `${fullName} — ${positionLabelsI18n[locale][player.position] ?? player.position}, FC Edineț.` };
}
export default async function PlayerPage({ params }: PageProps) {
  const locale = await getLocale(); const text = publicText[locale].team; const account = accountText[locale]; const { slug } = await params; const player = await getPlayer(slug); if (!player) notFound();
  const supabase = await createClient();
  const [claimsResult, design] = await Promise.all([supabase.auth.getClaims(), getPublishedSitePageDesign(supabase, "template_player")]);
  const { data: claimsData } = claimsResult;
  const userId = claimsData?.claims?.sub;
  let isFavorite = false;
  if (userId) {
    const { data } = await supabase.from("favorite_players").select("player_id").eq("user_id", userId).eq("player_id", player.id).maybeSingle();
    isFavorite = Boolean(data);
  }
  const fullName = `${player.first_name} ${player.last_name}`.trim();
  const pos = positionLabelsI18n[locale][player.position] ?? player.position;
  const foot = player.preferred_foot ? footLabelsI18n[locale][player.preferred_foot] : null;
  return <main>
    <PageHeroShell design={design} className="playerProfileHero" contentClassName="container playerProfileGrid" contentImageUrl={player.photo_url}>
      <>
        <div className="profilePhotoWrap">{player.photo_url ? <img className="profilePhoto" src={player.photo_url} alt={fullName} /> : <div className="profilePhoto profilePhotoPlaceholder">{text.photo}</div>}<span className="profileNumber">{player.shirt_number ?? "—"}</span></div>
        <div className="profileIntro"><Link className="backLink" href="/team">{text.back}</Link>{design.show_eyebrow && <p className="eyebrow">{pos}</p>}<h1>{player.first_name}<span>{player.last_name}</span></h1>
          {design.show_description && <div className="profileFacts"><Fact label={text.number} value={player.shirt_number?.toString()} /><Fact label={text.nationality} value={player.nationality} /><Fact label={text.height} value={player.height_cm ? `${player.height_cm} cm` : null} /><Fact label={text.foot} value={foot} /></div>}
          <div className="playerFavoriteAction">{userId ? <form action={toggleFavoritePlayer.bind(null, String(player.id), `/team/${slug}`)}><button className={isFavorite ? "favoriteActiveButton" : "favoriteButton"} type="submit">{isFavorite ? account.removePlayer : account.addPlayer}</button></form> : <Link className="favoriteButton" href="/login">{account.loginToFavorite}</Link>}</div>
        </div>
      </>
    </PageHeroShell>
    <section className="section profileSection"><div className="container profileContentGrid"><article className="bioCard"><p className="eyebrow blue">{text.aboutEyebrow}</p><h2>{text.profile}</h2><p className="bioText">{localized(player.bio, player.bio_ro, locale) || text.bioEmpty}</p></article>
      <aside className="detailsCard"><Detail label={text.fullName} value={fullName}/><Detail label={text.position} value={pos}/><Detail label={text.birthDate} value={formatDate(player.birth_date, locale)}/><Detail label={text.nationality} value={player.nationality}/><Detail label={text.hometown} value={player.hometown}/><Detail label={text.height} value={player.height_cm ? `${player.height_cm} cm` : null}/><Detail label={text.foot} value={foot}/><Detail label={text.previousClub} value={player.previous_club}/><Detail label={text.joinedAt} value={formatDate(player.joined_at, locale)}/></aside>
    </div></section>
  </main>;
}
function Fact({label,value}:{label:string;value?:string|null}){return <div><small>{label}</small><strong>{value||"—"}</strong></div>}
function Detail({label,value}:{label:string;value?:string|null}){return <div className="detailRow"><span>{label}</span><strong>{value||"—"}</strong></div>}
function formatDate(value:string|null,locale:"ru"|"ro"){if(!value)return null;return new Intl.DateTimeFormat(dateLocale(locale),{day:"2-digit",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`))}
