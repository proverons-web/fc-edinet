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
  played: boolean;
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
}: {
  matchId: string;
  players: Player[];
  entries: MatchLineupEntry[];
  stats: ExistingStat[];
  formation: string | null;
  coachName: string | null;
  currentStatus: "empty" | "draft" | "complete";
}) {
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
          played: role === "starter" ? Boolean(playerId) : Boolean(stat),
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
  const playedSubs = Object.entries(state).filter(([key, row]) => key.startsWith("substitute-") && row.playerId && row.played).length;

  function patch(key: string, changes: Partial<RowState>) {
    setState((current) => {
      const next = { ...current };
      if (changes.captain === true) {
        for (const id of Object.keys(next)) next[id] = { ...next[id], captain: false };
      }
      const merged = { ...next[key], ...changes };
      if (!merged.playerId) {
        merged.played = false;
        merged.captain = false;
        merged.position = "";
      }
      if (key.startsWith("starter-") && merged.playerId) merged.played = true;
      next[key] = merged;
      return next;
    });
  }

  return (
    <section className="statisticsPanel matchCenterUnifiedSquad" id="squad-stats">
      <div className="statisticsPanelHead matchCenterSectionHead">
        <div>
          <p className="eyebrow blue">FC EDINEȚ</p>
          <h2>Состав и статистика игроков</h2>
          <p>Один экран для стартового состава, запасных и сезонной статистики. После сохранения цифры автоматически участвуют в статистике сезона и соревнования.</p>
        </div>
        <span className={`statisticsState ${currentStatus}`}>{currentStatus === "complete" ? "Готово" : currentStatus === "draft" ? "Черновик" : "Не заполнено"}</span>
      </div>

      <form action={saveClubSquadAndStats}>
        <input type="hidden" name="match_id" value={matchId} />
        <div className="matchCenterSquadMeta">
          <label className="fieldGroup">
            <span>Схема FC Edineț</span>
            <input name="formation" defaultValue={formation ?? ""} placeholder="4-3-3" maxLength={40} />
          </label>
          <label className="fieldGroup">
            <span>Тренер</span>
            <input name="coach_name" defaultValue={coachName ?? ""} placeholder="Имя тренера" maxLength={160} />
          </label>
          <div className="matchCenterSquadSummary">
            <span><b>{startersCount}</b>/11 старт</span>
            <span><b>{benchCount}</b> запасных</span>
            <span><b>{playedSubs}</b> вышли</span>
          </div>
        </div>

        <SquadTable
          title="Стартовый состав"
          role="starter"
          slots={11}
          players={players}
          entries={starterMap}
          statByPlayer={statByPlayer}
          state={state}
          selectedIds={selectedIds}
          patch={patch}
        />

        <details className="matchCenterBenchDetails" open={benchCount > 0}>
          <summary>
            <span>Запасные</span>
            <small>{benchCount} выбрано • {playedSubs} вышли на поле</small>
          </summary>
          <SquadTable
            title=""
            role="substitute"
            slots={12}
            players={players}
            entries={substituteMap}
            statByPlayer={statByPlayer}
            state={state}
            selectedIds={selectedIds}
            patch={patch}
          />
        </details>

        <div className="matchCenterUnifiedSaveBar">
          <div>
            <strong>Сохраняется сразу в состав и статистику игроков</strong>
            <span>Матчи, старты, минуты, голы, ассисты и карточки затем агрегируются по сезону и соревнованию.</span>
          </div>
          <div>
            <button className="rowAction muted" type="submit" name="intent" value="draft">Сохранить черновик</button>
            <button className="primaryButton" type="submit" name="intent" value="complete">Сохранить и завершить</button>
          </div>
        </div>
      </form>
    </section>
  );
}

function SquadTable({
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
    <div className="matchCenterSquadTableWrap">
      {title && <h3>{title}</h3>}
      <div className="matchCenterSquadTable">
        <div className={`matchCenterSquadTableHead ${role}`} aria-hidden="true">
          <span>#</span><span>Игрок</span><span>Поз.</span>{role === "substitute" && <span>Играл</span>}<span>Мин</span><span>Г</span><span>А</span><span>ЖК</span><span>КК</span><span>Кап.</span>
        </div>
        {Array.from({ length: slots }, (_, index) => index + 1).map((slot) => {
          const key = `${role}-${slot}`;
          const local = state[key];
          const entry = entries.get(slot);
          const stat = local?.playerId ? statByPlayer.get(local.playerId) : undefined;
          const player = local?.playerId ? players.find((item) => String(item.id) === local.playerId) : undefined;
          const disabledStats = !local?.playerId || (role === "substitute" && !local.played);
          return (
            <div className={`matchCenterSquadRow ${role} ${local?.playerId ? "filled" : "empty"}`} key={key}>
              <span className="matchCenterSquadSlot">{slot}</span>
              <select
                name={`${role}_${slot}_player_id`}
                value={local?.playerId ?? ""}
                onChange={(event) => {
                  const selected = players.find((item) => String(item.id) === event.target.value);
                  patch(key, { playerId: event.target.value, position: selected?.position ?? "", played: role === "starter" ? Boolean(event.target.value) : false });
                }}
              >
                <option value="">— выбрать —</option>
                {players.map((option) => {
                  const id = String(option.id);
                  const usedElsewhere = selectedIds.has(id) && id !== local?.playerId;
                  return <option value={id} disabled={usedElsewhere} key={id}>{option.shirt_number != null ? `#${option.shirt_number} ` : ""}{option.first_name} {option.last_name}{!option.is_active ? " · архив" : ""}</option>;
                })}
              </select>
              <select name={`${role}_${slot}_position`} value={local?.position ?? ""} disabled={!local?.playerId} onChange={(event) => patch(key, { position: event.target.value })}>
                <option value="">—</option>
                {POSITION_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              {role === "substitute" && (
                <label className="matchCenterPlayedToggle" title="Игрок вышел на поле">
                  <input type="checkbox" name={`${role}_${slot}_played`} checked={Boolean(local?.played)} disabled={!local?.playerId} onChange={(event) => patch(key, { played: event.target.checked })} />
                  <span>{local?.played ? "Да" : "Нет"}</span>
                </label>
              )}
              <CompactNumber name={`${role}_${slot}_minutes`} value={stat?.minutes_played ?? (role === "starter" && local?.playerId ? 90 : 0)} max={130} disabled={disabledStats} />
              <CompactNumber name={`${role}_${slot}_goals`} value={stat?.goals ?? 0} max={20} disabled={disabledStats} />
              <CompactNumber name={`${role}_${slot}_assists`} value={stat?.assists ?? 0} max={20} disabled={disabledStats} />
              <CompactNumber name={`${role}_${slot}_yellow`} value={stat?.yellow_cards ?? 0} max={2} disabled={disabledStats} />
              <CompactNumber name={`${role}_${slot}_red`} value={stat?.red_cards ?? 0} max={1} disabled={disabledStats} />
              <label className="matchCenterCaptainToggle" title="Капитан">
                <input type="checkbox" name={`${role}_${slot}_captain`} checked={Boolean(local?.captain)} disabled={!local?.playerId} onChange={(event) => patch(key, { captain: event.target.checked })} />
                <span>C</span>
              </label>
              <input type="hidden" name={`${role}_${slot}_shirt_number`} value={player?.shirt_number ?? entry?.shirt_number ?? ""} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompactNumber({ name, value, max, disabled }: { name: string; value: number; max: number; disabled: boolean }) {
  return <input className="matchCenterStatInput" name={name} type="number" min={0} max={max} step={1} defaultValue={value} disabled={disabled} />;
}
