"use client";

import { useMemo, useState } from "react";
import PlayerCard from "@/app/components/PlayerCard";
import type { Player, PlayerSeasonTotal } from "@/lib/types";
import { positionPluralLabelsI18n, type Locale } from "@/lib/i18n";

const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"] as const;
type PositionFilter = "all" | (typeof POSITIONS)[number];

export default function TeamRosterBrowser({ players, seasonStats, locale }: { players: Player[]; seasonStats: PlayerSeasonTotal[]; locale: Locale }) {
  const [position, setPosition] = useState<PositionFilter>("all");
  const [query, setQuery] = useState("");
  const statsByPlayer = useMemo(() => new Map(seasonStats.map((row) => [String(row.player_id), row])), [seasonStats]);
  const counts = useMemo(() => Object.fromEntries(POSITIONS.map((key) => [key, players.filter((player) => player.position === key).length])), [players]);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === "ro" ? "ro" : "ru");
  const filtered = useMemo(() => players.filter((player) => {
    if (position !== "all" && player.position !== position) return false;
    if (!normalizedQuery) return true;
    const haystack = [player.first_name, player.last_name, player.shirt_number, player.nationality, player.hometown].filter(Boolean).join(" ").toLocaleLowerCase(locale === "ro" ? "ro" : "ru");
    return haystack.includes(normalizedQuery);
  }), [players, position, normalizedQuery, locale]);

  const allLabel = locale === "ro" ? "Toți" : "Все";
  const searchPlaceholder = locale === "ro" ? "Caută jucătorul, numărul sau țara" : "Поиск по имени, номеру или стране";
  const resultLabel = locale === "ro" ? `${filtered.length} jucători` : `${filtered.length} игроков`;
  const emptyLabel = locale === "ro" ? "Nu am găsit jucători pentru acest filtru." : "По этому фильтру игроков не найдено.";

  return (
    <section className="teamRosterBrowser" aria-label={locale === "ro" ? "Lotul echipei" : "Состав команды"}>
      <div className="teamRosterToolbar">
        <div className="teamRosterFilters" role="group" aria-label={locale === "ro" ? "Filtru poziții" : "Фильтр позиций"}>
          <button type="button" className={position === "all" ? "isActive" : ""} onClick={() => setPosition("all")}>{allLabel}<span>{players.length}</span></button>
          {POSITIONS.map((key) => counts[key] ? (
            <button type="button" key={key} className={position === key ? "isActive" : ""} onClick={() => setPosition(key)}>{positionPluralLabelsI18n[locale][key] ?? key}<span>{counts[key]}</span></button>
          ) : null)}
        </div>
        <label className="teamRosterSearch">
          <span className="srOnly">{searchPlaceholder}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} type="search" />
          <b>{resultLabel}</b>
        </label>
      </div>
      {filtered.length > 0 ? (
        <div className="players teamRosterGrid">
          {filtered.map((player) => <PlayerCard key={player.id} player={player} locale={locale} seasonStats={statsByPlayer.get(String(player.id)) ?? null} />)}
        </div>
      ) : <div className="teamRosterEmpty">{emptyLabel}</div>}
    </section>
  );
}
