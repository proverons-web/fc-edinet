"use client";

import { useMemo, useState } from "react";
import type { MatchLineupEntry, Player } from "@/lib/types";
import { saveClubSquadAndStats } from "./actions";

type ExistingStat = {
  player_id: string | number;
  appearance: "starter" | "substitute";
  position: string | null;
  is_captain: boolean;
  minutes_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

type RowState = {
  playerId: string;
  position: string;
  captain: boolean;
};

const POSITION_OPTIONS = [
  ["goalkeeper", "Вратарь"],
  ["defender", "Защитник"],
  ["midfielder", "Полузащитник"],
  ["forward", "Нападающий"],
] as const;

function bySlot(entries: MatchLineupEntry[], role: "starter" | "substitute") {
  return new Map(
    entries
      .filter((entry) => entry.lineup_role === role)
      .map((entry) => [entry.slot_number, entry]),
  );
}

export default function ClubSquadStatsEditor({
  matchId,
  players,
  entries,
  stats,
  formation,
  coachName,
  currentStatus,
  teamName,
  sideLabel,
}: {
  matchId: string;
  players: Player[];
  entries: MatchLineupEntry[];
  stats: ExistingStat[];
  formation: string | null;
  coachName: string | null;
  currentStatus: "empty" | "draft" | "complete";
  teamName: string;
  sideLabel: "ХОЗЯЕВА" | "ГОСТИ";
}) {
  const sortedPlayers = useMemo(() => {
    const collator = new Intl.Collator("ru", { sensitivity: "base" });
    return [...players].sort((a, b) => {
      const last = collator.compare(a.last_name || "", b.last_name || "");
      if (last !== 0) return last;
      return collator.compare(a.first_name || "", b.first_name || "");
    });
  }, [players]);

  const statByPlayer = useMemo(() => new Map(stats.map((row) => [String(row.player_id), row])), [stats]);
  const starterMap = useMemo(() => bySlot(entries, "starter"), [entries]);
  const substituteMap = useMemo(() => bySlot(entries, "substitute"), [entries]);

  const [state, setState] = useState<Record<string, RowState>>(() => {
    const next: Record<string, RowState> = {};
    for (const role of ["starter", "substitute"] as const) {
      const map = role === "starter" ? starterMap : substituteMap;
      const max = role === "starter" ? 11 : 12;
      for (let slot = 1; slot <= max; slot += 1) {
        const entry = map.get(slot);
        const playerId = entry?.player_id ? String(entry.player_id) : "";
        const stat = playerId ? statByPlayer.get(playerId) : undefined;
        next[`${role}-${slot}`] = {
          playerId,
          position: stat?.position || entry?.position || "",
          captain: Boolean(stat?.is_captain ?? entry?.is_captain),
        };
      }
    }
    return next;
  });

  const selectedIds = new Set(Object.values(state).map((row) => row.playerId).filter(Boolean));
  const startersCount = Object.entries(state).filter(([key, row]) => key.startsWith("starter-") && row.playerId).length;
  const benchCount = Object.entries(state).filter(([key, row]) => key.startsWith("substitute-") && row.playerId).length;

  function patch(key: string, changes: Partial<RowState>) {
    setState((current) => {
      const next = { ...current };
      if (changes.captain === true) {
        for (const id of Object.keys(next)) next[id] = { ...next[id], captain: false };
      }
      const merged = { ...next[key], ...changes };
      if (!merged.playerId) {
        merged.captain = false;
        merged.position = "";
      }
      next[key] = merged;
      return next;
    });
  }

  return (
    <section className="statisticsPanel matchCenterUnifiedSquad matchCenterTeamColumn club" id="squad-stats">
      <div className="statisticsPanelHead matchCenterSectionHead">
        <div>
          <p className="eyebrow blue">{sideLabel} • FC EDINEȚ</p>
          <h2>{teamName}</h2>
          <p>Выбери состав из базы клуба. Позиция подставится автоматически из карточки игрока, а статистика посчитается из событий матча.</p>
        </div>
        <span className={`statisticsState ${currentStatus}`}>{currentStatus === "complete" ? "Готово" : currentStatus === "draft" ? "Черновик" : "Не заполнено"}</span>
      </div>

      <form action={saveClubSquadAndStats}>
        <input type="hidden" name="match_id" value={matchId} />
        <div className="matchCenterSquadSummary standalone">
          <span><b>{startersCount}</b>/11 старт</span>
          <span><b>{benchCount}</b> запасных</span>
        </div>

        <SquadList
          title="Стартовый состав"
          role="starter"
          slots={11}
          players={sortedPlayers}
          entries={starterMap}
          statByPlayer={statByPlayer}
          state={state}
          selectedIds={selectedIds}
          patch={patch}
        />

        <details className="matchCenterBenchDetails" open={benchCount > 0}>
          <summary>
            <span>Запасные</span>
            <small>{benchCount} выбрано</small>
          </summary>
          <SquadList
            title=""
            role="substitute"
            slots={12}
            players={sortedPlayers}
            entries={substituteMap}
            statByPlayer={statByPlayer}
            state={state}
            selectedIds={selectedIds}
            patch={patch}
          />
        </details>

        <div className="matchCenterSquadMeta compact afterLineups">
          <label className="fieldGroup">
            <span>Схема</span>
            <input name="formation" defaultValue={formation ?? ""} placeholder="4-3-3" maxLength={40} />
          </label>
          <label className="fieldGroup">
            <span>Тренер</span>
            <input name="coach_name" defaultValue={coachName ?? ""} placeholder="Имя тренера" maxLength={160} />
          </label>
        </div>

        <div className="matchCenterUnifiedSaveBar compact">
          <div>
            <strong>Статистика считается из событий</strong>
            <span>Замена задаёт минуты, гол/ассист и карточки попадают в сезон автоматически.</span>
          </div>
          <div>
            <button className="primaryButton" type="submit" name="intent" value="draft">Сохранить</button>
          </div>
        </div>
      </form>
    </section>
  );
}

function SquadList({
  title,
  role,
  slots,
  players,
  entries,
  statByPlayer,
  state,
  selectedIds,
  patch,
}: {
  title: string;
  role: "starter" | "substitute";
  slots: number;
  players: Player[];
  entries: Map<number, MatchLineupEntry>;
  statByPlayer: Map<string, ExistingStat>;
  state: Record<string, RowState>;
  selectedIds: Set<string>;
  patch: (key: string, changes: Partial<RowState>) => void;
}) {
  return (
    <div className="matchCenterSquadTableWrap compact">
      {title && <h3>{title}</h3>}
      <div className="matchCenterSquadList">
        {Array.from({ length: slots }, (_, index) => index + 1).map((slot) => {
          const key = `${role}-${slot}`;
          const local = state[key];
          const entry = entries.get(slot);
          const stat = local?.playerId ? statByPlayer.get(local.playerId) : undefined;
          const player = local?.playerId ? players.find((item) => String(item.id) === local.playerId) : undefined;
          const hasPlayer = Boolean(local?.playerId);
          const positionClass = local?.position ? `position-${local.position}` : "position-empty";
          return (
            <div className={`matchCenterSquadCompactRow ${role} ${hasPlayer ? "filled" : "empty"} ${positionClass}`} key={key}>
              <span className="matchCenterSquadSlot">{slot}</span>
              <div className="matchCenterPlayerPick">
                <select
                  name={`${role}_${slot}_player_id`}
                  value={local?.playerId ?? ""}
                  onChange={(event) => {
                    const selected = players.find((item) => String(item.id) === event.target.value);
                    patch(key, {
                      playerId: event.target.value,
                      position: selected?.position ?? (event.target.value ? "" : local?.position ?? ""),
                    });
                  }}
                >
                  <option value="">— выбрать по фамилии —</option>
                  {players
                    .filter((option) => {
                      const id = String(option.id);
                      return !selectedIds.has(id) || id === local?.playerId;
                    })
                    .map((option) => {
                      const id = String(option.id);
                      return (
                        <option value={id} key={id}>
                          {option.last_name} {option.first_name}{option.shirt_number != null ? ` · #${option.shirt_number}` : ""}{!option.is_active ? " · архив" : ""}
                        </option>
                      );
                    })}
                </select>
              </div>
              <select
                className="matchCenterCompactPosition"
                name={`${role}_${slot}_position`}
                value={local?.position ?? ""}
                disabled={!hasPlayer}
                onChange={(event) => patch(key, { position: event.target.value })}
              >
                <option value="">Позиция</option>
                {POSITION_OPTIONS.map(([value, label]) => {
                  return <option value={value} key={value}>{label}</option>;
                })}
              </select>
              <label className="matchCenterCaptainToggle" title="Капитан">
                <input type="checkbox" name={`${role}_${slot}_captain`} checked={Boolean(local?.captain)} disabled={!hasPlayer} onChange={(event) => patch(key, { captain: event.target.checked })} />
                <span>C</span>
              </label>
              <div className="matchCenterAutoStats" aria-label="Автоматическая статистика">
                {local?.playerId && stat ? (
                  <>
                    <span title="Минуты">{stat.minutes_played}′</span>
                    {stat.goals > 0 && <span title="Голы">⚽ {stat.goals}</span>}
                    {stat.assists > 0 && <span title="Ассисты">A {stat.assists}</span>}
                    {stat.yellow_cards > 0 && <span className="yellow" title="Жёлтые карточки">ЖК {stat.yellow_cards}</span>}
                    {stat.red_cards > 0 && <span className="red" title="Красные карточки">КК {stat.red_cards}</span>}
                  </>
                ) : hasPlayer ? <span className="muted">из событий</span> : null}
              </div>
              <input type="hidden" name={`${role}_${slot}_shirt_number`} value={player?.shirt_number ?? entry?.shirt_number ?? ""} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
