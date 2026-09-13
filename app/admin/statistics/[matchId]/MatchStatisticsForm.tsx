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
  goals_conceded: number;
  saves: number;
  clean_sheet: boolean;
  penalties_saved: number;
  shots: number;
  shots_on_target: number;
  passes_attempted: number;
  passes_completed: number;
  key_passes: number;
  tackles_won: number;
  interceptions: number;
  clearances: number;
  blocks: number;
  fouls_committed: number;
  fouls_won: number;
  notes: string | null;
};

type LocalState = {
  played: boolean;
  appearance: "starter" | "substitute";
  position: string;
  captain: boolean;
  cleanSheet: boolean;
};

const POSITION_HINTS: Record<string, string> = {
  goalkeeper: "Вратарские действия + передачи",
  defender: "Оборона + передачи + удары",
  midfielder: "Передачи + создание + оборона + удары",
  forward: "Удары + создание + передачи",
};

export default function MatchStatisticsForm({
  matchId,
  players,
  existing,
  currentStatus,
}: {
  matchId: string;
  players: PlayerRow[];
  existing: ExistingRow[];
  currentStatus: "draft" | "complete" | "empty";
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
            cleanSheet: row?.clean_sheet ?? false,
          },
        ];
      })
    )
  );

  const playedCount = Object.values(state).filter((item) => item.played).length;
  const startersCount = Object.values(state).filter(
    (item) => item.played && item.appearance === "starter"
  ).length;

  function patch(playerId: string, changes: Partial<LocalState>) {
    setState((current) => ({
      ...current,
      [playerId]: { ...current[playerId], ...changes },
    }));
  }

  return (
    <form action={saveMatchStatistics} className="statisticsEntryForm">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="player_ids" value={JSON.stringify(players.map((player) => player.id))} />

      <div className="statisticsEntrySummary">
        <div><strong>{playedCount}</strong><span>играли</span></div>
        <div><strong>{startersCount}</strong><span>в старте</span></div>
        <div><strong>{Math.max(playedCount - startersCount, 0)}</strong><span>на замену</span></div>
        <span className={`statisticsState ${currentStatus}`}>
          {currentStatus === "complete" ? "Статистика готова" : currentStatus === "draft" ? "Черновик" : "Не заполнено"}
        </span>
      </div>

      <div className="statisticsPlayerEntryList">
        {players.map((player) => {
          const id = player.id;
          const row = existingByPlayer.get(id);
          const local = state[id];
          const played = local?.played ?? false;
          const position = local?.position || player.position;

          return (
            <article className={`statisticsPlayerEntry ${played ? "isPlayed" : "isNotPlayed"}`} key={id}>
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
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={`${player.first_name} ${player.last_name}`} />
                  ) : (
                    <span>FCE</span>
                  )}
                </div>
                <div className="statisticsPlayerNumber">{player.shirt_number ?? "—"}</div>
                <div className="statisticsPlayerName">
                  <strong>{player.first_name} {player.last_name}</strong>
                  <span>
                    {positionLabels[player.position] ?? player.position}
                    {!player.is_active ? " · архив" : ""}
                  </span>
                </div>
              </div>

              <div className="statisticsCoreFields">
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
                <NumberField label="Асс." name={`assists_${id}`} value={row?.assists ?? 0} max={20} disabled={!played} />
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

              <details className="statisticsPlayerExtra">
                <summary>
                  Расширенная статистика
                  <span className="statisticsPositionHint">{POSITION_HINTS[position] ?? "Показатели игрока"}</span>
                </summary>

                <div className="statisticsExtraSections">
                  <section className="statisticsMetricGroup">
                    <h4>События матча</h4>
                    <div className="statisticsExtraGrid">
                      <NumberField label="Автоголы" name={`own_goals_${id}`} value={row?.own_goals ?? 0} max={10} disabled={!played} />
                      <NumberField label="Пенальти забито" name={`penalties_scored_${id}`} value={row?.penalties_scored ?? 0} max={20} disabled={!played} />
                      <NumberField label="Пенальти мимо" name={`penalties_missed_${id}`} value={row?.penalties_missed ?? 0} max={20} disabled={!played} />
                    </div>
                  </section>

                  <PositionMetrics
                    playerId={id}
                    position={position}
                    row={row}
                    played={played}
                    cleanSheet={local?.cleanSheet ?? false}
                    onCleanSheet={(checked) => patch(id, { cleanSheet: checked })}
                  />

                  <section className="statisticsMetricGroup statisticsNotesGroup">
                    <h4>Заметка</h4>
                    <label className="statisticsNotesField">
                      <span>Комментарий по игроку</span>
                      <input
                        name={`notes_${id}`}
                        defaultValue={row?.notes ?? ""}
                        disabled={!played}
                        maxLength={1000}
                        placeholder="Например: вышел после перерыва"
                      />
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
          <span>Черновик можно менять сколько угодно. «Завершить» включает матч в сезонные итоги.</span>
        </div>
        <div className="statisticsSaveActions">
          <button className="rowAction muted statisticsDraftButton" type="submit" name="intent" value="draft">
            Сохранить черновик
          </button>
          <button className="primaryButton" type="submit" name="intent" value="complete" disabled={playedCount === 0}>
            ✓ Сохранить и завершить
          </button>
        </div>
      </div>
    </form>
  );
}

function PositionMetrics({
  playerId,
  position,
  row,
  played,
  cleanSheet,
  onCleanSheet,
}: {
  playerId: string;
  position: string;
  row: ExistingRow | undefined;
  played: boolean;
  cleanSheet: boolean;
  onCleanSheet: (checked: boolean) => void;
}) {
  const passFields = (
    <>
      <NumberField label="Передачи всего" name={`passes_attempted_${playerId}`} value={row?.passes_attempted ?? 0} max={400} disabled={!played} />
      <NumberField label="Передачи точно" name={`passes_completed_${playerId}`} value={row?.passes_completed ?? 0} max={400} disabled={!played} />
    </>
  );

  if (position === "goalkeeper") {
    return (
      <>
        <section className="statisticsMetricGroup position-goalkeeper">
          <h4>Вратарь</h4>
          <div className="statisticsExtraGrid">
            <NumberField label="Пропущено" name={`goals_conceded_${playerId}`} value={row?.goals_conceded ?? 0} max={30} disabled={!played} />
            <NumberField label="Сейвы" name={`saves_${playerId}`} value={row?.saves ?? 0} max={50} disabled={!played} />
            <NumberField label="Пенальти отражено" name={`penalties_saved_${playerId}`} value={row?.penalties_saved ?? 0} max={10} disabled={!played} />
            <label className="statisticsCleanSheet">
              <span>Сухой матч</span>
              <input
                type="checkbox"
                name={`clean_sheet_${playerId}`}
                checked={cleanSheet}
                disabled={!played}
                onChange={(event) => onCleanSheet(event.target.checked)}
              />
            </label>
          </div>
        </section>
        <section className="statisticsMetricGroup">
          <h4>Игра ногами</h4>
          <div className="statisticsExtraGrid">{passFields}</div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="statisticsMetricGroup">
        <h4>Атака и создание</h4>
        <div className="statisticsExtraGrid">
          <NumberField label="Удары" name={`shots_${playerId}`} value={row?.shots ?? 0} max={40} disabled={!played} />
          <NumberField label="В створ" name={`shots_on_target_${playerId}`} value={row?.shots_on_target ?? 0} max={40} disabled={!played} />
          <NumberField label="Ключевые передачи" name={`key_passes_${playerId}`} value={row?.key_passes ?? 0} max={60} disabled={!played} />
          <NumberField label="Фолы заработано" name={`fouls_won_${playerId}`} value={row?.fouls_won ?? 0} max={30} disabled={!played} />
        </div>
      </section>

      <section className="statisticsMetricGroup">
        <h4>Передачи</h4>
        <div className="statisticsExtraGrid">{passFields}</div>
      </section>

      {(position === "defender" || position === "midfielder") && (
        <section className="statisticsMetricGroup position-defence">
          <h4>{position === "defender" ? "Оборона" : "Работа без мяча"}</h4>
          <div className="statisticsExtraGrid">
            <NumberField label="Отборы выиграно" name={`tackles_won_${playerId}`} value={row?.tackles_won ?? 0} max={60} disabled={!played} />
            <NumberField label="Перехваты" name={`interceptions_${playerId}`} value={row?.interceptions ?? 0} max={60} disabled={!played} />
            {position === "defender" && (
              <>
                <NumberField label="Выносы" name={`clearances_${playerId}`} value={row?.clearances ?? 0} max={50} disabled={!played} />
                <NumberField label="Блоки" name={`blocks_${playerId}`} value={row?.blocks ?? 0} max={60} disabled={!played} />
              </>
            )}
          </div>
        </section>
      )}

      <section className="statisticsMetricGroup">
        <h4>Дисциплина</h4>
        <div className="statisticsExtraGrid">
          <NumberField label="Фолы" name={`fouls_committed_${playerId}`} value={row?.fouls_committed ?? 0} max={30} disabled={!played} />
        </div>
      </section>
    </>
  );
}

function NumberField({
  label,
  name,
  value,
  max,
  disabled,
}: {
  label: string;
  name: string;
  value: number;
  max: number;
  disabled: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" name={name} min={0} max={max} step={1} defaultValue={value} disabled={disabled} />
    </label>
  );
}
