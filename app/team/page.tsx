import PlayerCard from "@/app/components/PlayerCard";
import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";
import { positionPluralLabels } from "@/lib/types";

export const metadata = { title: "Команда" };
export const dynamic = 'force-dynamic';

const order = ["goalkeeper", "defender", "midfielder", "forward"];

export default async function TeamPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("shirt_number", { ascending: true });

  const players = (data ?? []) as Player[];

  return (
    <main>
      <section className="pageHero teamHero">
        <div className="container">
          <p className="eyebrow">ПЕРВАЯ КОМАНДА</p>
          <h1>Состав</h1>
          <p>Игроки FC Edineț. Карточки уже загружаются напрямую из Supabase.</p>
        </div>
      </section>

      <section className="section darkSection teamPage">
        <div className="container">
          {error && (
            <div className="errorBox">
              Не удалось загрузить игроков: {error.message}
            </div>
          )}

          {!error && players.length === 0 && (
            <div className="emptyBox">
              В базе пока нет активных игроков.
            </div>
          )}

          {order.map((position) => {
            const group = players.filter((player) => player.position === position);
            if (group.length === 0) return null;

            return (
              <section className="teamGroup" key={position}>
                <div className="groupHeading">
                  <p className="eyebrow">{positionLabelsForGroup(position)}</p>
                  <h2>{positionPluralLabels[position] ?? position}</h2>
                </div>

                <div className="players">
                  {group.map((player) => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function positionLabelsForGroup(position: string) {
  const labels: Record<string, string> = {
    goalkeeper: "GOALKEEPERS",
    defender: "DEFENDERS",
    midfielder: "MIDFIELDERS",
    forward: "FORWARDS",
  };
  return labels[position] ?? "TEAM";
}
