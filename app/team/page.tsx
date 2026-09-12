import PlayerCard from "@/app/components/PlayerCard";
import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { positionPluralLabelsI18n, publicText } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const order = ["goalkeeper", "defender", "midfielder", "forward"];

export default async function TeamPage() {
  const locale = await getLocale();
  const text = publicText[locale].team;
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").select("*").eq("is_active", true)
    .order("display_order", { ascending: true }).order("shirt_number", { ascending: true });
  const players = (data ?? []) as Player[];

  return <main>
    <section className="pageHero teamHero"><div className="container"><p className="eyebrow">{text.eyebrow}</p><h1>{text.title}</h1><p>{text.description}</p></div></section>
    <section className="section darkSection teamPage"><div className="container">
      {error && <div className="errorBox">{text.loadError}: {error.message}</div>}
      {!error && players.length === 0 && <div className="emptyBox">{text.empty}</div>}
      {order.map((position) => {
        const group = players.filter((player) => player.position === position);
        if (!group.length) return null;
        return <section className="teamGroup" key={position}><div className="groupHeading"><p className="eyebrow">{position.toUpperCase()}</p><h2>{positionPluralLabelsI18n[locale][position] ?? position}</h2></div><div className="players">{group.map((player) => <PlayerCard key={player.id} player={player} locale={locale} />)}</div></section>;
      })}
    </div></section>
  </main>;
}
