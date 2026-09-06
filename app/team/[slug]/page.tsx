import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";
import { footLabels, positionLabels } from "@/lib/types";

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getPlayer(slug: string): Promise<Player | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Player fetch error:", error.message);
    return null;
  }

  return data as Player | null;
}

export async function generateMetadata(
  props: PageProps
): Promise<Metadata> {
  const { slug } = await props.params;
  const player = await getPlayer(slug);

  if (!player) {
    return { title: "Игрок не найден" };
  }

  const fullName = `${player.first_name} ${player.last_name}`.trim();

  return {
    title: fullName,
    description: `${fullName} — ${positionLabels[player.position] ?? player.position}, FC Edineț.`,
  };
}

export default async function PlayerPage(props: PageProps) {
  const { slug } = await props.params;
  const player = await getPlayer(slug);

  if (!player) notFound();

  const fullName = `${player.first_name} ${player.last_name}`.trim();

  return (
    <main>
      <section className="playerProfileHero">
        <div className="container playerProfileGrid">
          <div className="profilePhotoWrap">
            {player.photo_url ? (
              <img
                className="profilePhoto"
                src={player.photo_url}
                alt={fullName}
              />
            ) : (
              <div className="profilePhoto profilePhotoPlaceholder">
                ФОТО ИГРОКА
              </div>
            )}

            <span className="profileNumber">
              {player.shirt_number ?? "—"}
            </span>
          </div>

          <div className="profileIntro">
            <Link className="backLink" href="/team">← Весь состав</Link>
            <p className="eyebrow">
              {positionLabels[player.position] ?? player.position}
            </p>
            <h1>{player.first_name}<span>{player.last_name}</span></h1>

            <div className="profileFacts">
              <Fact label="Номер" value={player.shirt_number?.toString()} />
              <Fact label="Гражданство" value={player.nationality} />
              <Fact label="Рост" value={player.height_cm ? `${player.height_cm} см` : null} />
              <Fact label="Рабочая нога" value={player.preferred_foot ? footLabels[player.preferred_foot] : null} />
            </div>
          </div>
        </div>
      </section>

      <section className="section profileSection">
        <div className="container profileContentGrid">
          <article className="bioCard">
            <p className="eyebrow blue">ОБ ИГРОКЕ</p>
            <h2>Профиль</h2>
            <p className="bioText">
              {player.bio || "Официальная биография игрока пока не добавлена."}
            </p>
          </article>

          <aside className="detailsCard">
            <Detail label="Полное имя" value={fullName} />
            <Detail label="Позиция" value={positionLabels[player.position] ?? player.position} />
            <Detail label="Дата рождения" value={formatDate(player.birth_date)} />
            <Detail label="Гражданство" value={player.nationality} />
            <Detail label="Родной город" value={player.hometown} />
            <Detail label="Рост" value={player.height_cm ? `${player.height_cm} см` : null} />
            <Detail label="Рабочая нога" value={player.preferred_foot ? footLabels[player.preferred_foot] : null} />
            <Detail label="Предыдущий клуб" value={player.previous_club} />
            <Detail label="В клубе с" value={formatDate(player.joined_at)} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="detailRow">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
