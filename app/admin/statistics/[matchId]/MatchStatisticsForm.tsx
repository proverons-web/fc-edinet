"use client";

import { useMemo, useState } from "react";
import { positionLabels } from "@/lib/types";
import { saveMatchStatistics } from "./actions";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  shirt_number: number | null;
  position: string;
  photo_url: string | null;
  is_active: boolean;
};

type ExistingRow = {
  player_id: string | number;
  appearance: "starter" | "substitute";
  position: string | null;
  is_captain: boolean;
  minutes_played: number;
  goals: number;
  assists: number;
  own_goals: number;
  penalties_scored: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  notes: string | null;
};

type LocalState = {
  played: boolean;
  appearance: "starter" | "substitute";
  position: string;
  captain: boolean;
};

export default function MatchStatisticsForm({
  matchId,
  players,
  existing,
  currentStatus,
  canCompleteContext,
}: {
  matchId: string;
  players: PlayerRow[];
  existing: ExistingRow[];
  currentStatus: "draft" | "complete" | "empty";
  canCompleteContext: boolean;
}) {
  const existingByPlayer = useMemo(
    () => new Map(existing.map((row) => [String(row.player_id), row])),
    [existing]
  );

  const [state, setState] = useState<Record<string, LocalState>>(() =>
    Object.fromEntries(
      players.map((player) => {
        const row = existingByPlayer.get(player.id);
        return [
          player.id,
          {
            played: Boolean(row),
            appearance: row?.appearance ?? "starter",
            position: row?.position || player.position || "midfielder",
            captain: row?.is_captain ?? false,
          },
        ];
      })
    )
  );

  const playedCount = Object.values(state).filter((item) => item.played).length;
  const startersCount = Object.values(state).filter(
    (item) => item.played && item.appearance === "starter"
  ).length;
  const goalkeepersCount = Object.values(state).filter(
    (item) => item.played && item.position === "goalkeeper"
  ).length;
  const captainsCount = Object.values(state).filter(
    (item) => item.played && item.captain
  ).length;
  const readyToComplete = canCompleteContext && playedCount > 0 && startersCount > 0 && goalkeepersCount > 0 && captainsCount <= 1;

  function patch(playerId: string, changes: Partial<LocalState>) {
    setState((current) => {
      const next = { ...current };
      if (changes.captain === true) {
        for (const id of Object.keys(next)) next[id] = { ...next[id], captain: false };
      }
      next[playerId] = { ...next[playerId], ...changes };
      if (changes.played === false) next[playerId] = { ...next[playerId], captain: false };
      return next;
    });
  }

  return (
    <form action={saveMatchStatistics} className="statisticsEntryForm practicalStatsForm">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="player_ids" value={JSON.stringify(players.map((player) => player.id))} />

      <div className="practicalStatsBanner">
        <div>
          <strong>Практический режим</strong>
          <span>Заполняем только то, что реально известно после матча. Удары, xG, передачи, отборы и другие профессиональные метрики не требуются. Ассисты и минуты заполняй только если они известны.</span>
        </div>
        <span className={`statisticsState ${currentStatus}`}>
          {currentStatus === "complete" ? "Готово" : currentStatus === "draft" ? "Черновик" : "Не заполнено"}
        </span>
      </div>

      <div className="statisticsEntrySummary practicalStatsSummary">
        <div><strong>{playedCount}</strong><span>играли</span></div>
        <div><strong>{startersCount}</strong><span>в старте</span></div>
        <div><strong>{Math.max(playedCount - startersCount, 0)}</strong><span>вышли на замену</span></div>
        <div><strong>{captainsCount}</strong><span>капитан</span></div>
      </div>

      {playedCount > 0 && !readyToComplete && (
        <div className="statisticsQaHint warning" role="status">
          <strong>Перед завершением проверь состав:</strong>
          <span>
            {startersCount === 0 ? " нет игрока в старте;" : ""}
            {goalkeepersCount === 0 ? " не отмечен вратарь;" : ""}
            {captainsCount > 1 ? " отмечено больше одного капитана;" : ""}
          </span>
        </div>
      )}

      <div className="statisticsPlayerEntryList practicalPlayerList">
        {players.map((player) => {
          const id = player.id;
          const row = existingByPlayer.get(id);
          const local = state[id];
          const played = local?.played ?? false;
          const position = local?.position || player.position;

          return (
            <article className={`statisticsPlayerEntry practicalPlayerEntry ${played ? "isPlayed" : "isNotPlayed"}`} key={id}>
              <div className="statisticsPlayerIdentity">
                <label className="statisticsPlayedToggle">
                  <input
                    type="checkbox"
                    name={`played_${id}`}
                    checked={played}
                    onChange={(event) => patch(id, { played: event.target.checked })}
                  />
                  <span>{played ? "Играл" : "Не играл"}</span>
                </label>

                <div className="statisticsPlayerPhoto">
                  {player.photo_url ? <img src={player.photo_url} alt="" /> : <span>FCE</span>}
                </div>
                <div className="statisticsPlayerNumber">{player.shirt_number ?? "—"}</div>
                <div className="statisticsPlayerName">
                  <strong>{player.first_name} {player.last_name}</strong>
                  <span>{positionLabels[player.position] ?? player.position}{!player.is_active ? " · архив" : ""}</span>
                </div>
              </div>

              <div className="statisticsCoreFields practicalCoreFields">
                <label>
                  <span>Выход</span>
                  <select
                    name={`appearance_${id}`}
                    value={local?.appearance ?? "starter"}
                    disabled={!played}
                    onChange={(event) => patch(id, { appearance: event.target.value as "starter" | "substitute" })}
                  >
                    <option value="starter">Старт</option>
                    <option value="substitute">Замена</option>
                  </select>
                </label>
                <label>
                  <span>Позиция</span>
                  <select
                    name={`position_${id}`}
                    value={position}
                    disabled={!played}
                    onChange={(event) => patch(id, { position: event.target.value })}
                  >
                    <option value="goalkeeper">Вратарь</option>
                    <option value="defender">Защитник</option>
                    <option value="midfielder">Полузащитник</option>
                    <option value="forward">Нападающий</option>
                  </select>
                </label>
                <NumberField label="Мин" name={`minutes_${id}`} value={row?.minutes_played ?? 0} max={130} disabled={!played} />
                <NumberField label="Голы" name={`goals_${id}`} value={row?.goals ?? 0} max={20} disabled={!played} />
                <NumberField label="Асс.*" name={`assists_${id}`} value={row?.assists ?? 0} max={20} disabled={!played} />
                <NumberField label="ЖК" name={`yellow_${id}`} value={row?.yellow_cards ?? 0} max={2} disabled={!played} />
                <NumberField label="КК" name={`red_${id}`} value={row?.red_cards ?? 0} max={1} disabled={!played} />
                <label className="statisticsCaptainField">
                  <span>Капитан</span>
                  <input
                    type="checkbox"
                    name={`captain_${id}`}
                    checked={local?.captain ?? false}
                    disabled={!played}
                    onChange={(event) => patch(id, { captain: event.target.checked })}
                  />
                </label>
              </div>

              <details className="statisticsPlayerExtra practicalRareDetails">
                <summary>Редкие события / заметка <span>заполняй только если это действительно было</span></summary>
                <div className="statisticsExtraSections">
                  <section className="statisticsMetricGroup">
                    <div className="statisticsExtraGrid">
                      <NumberField label="Автоголы" name={`own_goals_${id}`} value={row?.own_goals ?? 0} max={10} disabled={!played} />
                      <NumberField label="Пенальти забито" name={`penalties_scored_${id}`} value={row?.penalties_scored ?? 0} max={20} disabled={!played} />
                      <NumberField label="Пенальти мимо" name={`penalties_missed_${id}`} value={row?.penalties_missed ?? 0} max={20} disabled={!played} />
                    </div>
                  </section>
                  <section className="statisticsMetricGroup statisticsNotesGroup">
                    <label className="statisticsNotesField">
                      <span>Комментарий по игроку</span>
                      <input name={`notes_${id}`} defaultValue={row?.notes ?? ""} disabled={!played} maxLength={1000} placeholder="Например: вышел после перерыва" />
                    </label>
                  </section>
                </div>
              </details>
            </article>
          );
        })}
      </div>

      <div className="statisticsSaveBar">
        <div>
          <strong>{playedCount} игроков выбрано</strong>
          <span>Для сезонной статистики достаточно состава, минут, голов, ассистов и карточек.</span>
        </div>
        <div className="statisticsSaveActions">
          <button className="rowAction muted statisticsDraftButton" type="submit" name="intent" value="draft">Сохранить черновик</button>
          <button className="primaryButton" type="submit" name="intent" value="complete" disabled={!readyToComplete}>✓ Сохранить и завершить</button>
        </div>
      </div>
    </form>
  );
}

function NumberField({ label, name, value, max, disabled }: { label: string; name: string; value: number; max: number; disabled: boolean }) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" name={name} min={0} max={max} step={1} defaultValue={value} disabled={disabled} />
    </label>
  );
}
