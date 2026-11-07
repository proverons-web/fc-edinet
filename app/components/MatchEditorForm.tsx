"use client";

import { useActionState, useState } from "react";
import {
  saveMatch,
  type MatchFormState,
} from "@/app/admin/matches/actions";
import {competitionTypes,competitionTypeLabel} from "@/lib/competition";
import type {
  ClubMatch,
  ClubTeam,
  Competition,
} from "@/lib/types";

const initialState: MatchFormState = {};

export default function MatchEditorForm({
  match,
  teams,
  competitions,
}: {
  match?: ClubMatch | null;
  teams: ClubTeam[];
  competitions: Competition[];
}) {
  const [state, action, pending] = useActionState(saveMatch, initialState);

  const initialHomeId = match ? String(match.home_team_id) : "";
  const initialStadium =
    match?.stadium ??
    teams.find((team) => String(team.id) === initialHomeId)?.home_stadium ??
    "";

  const defaultCompetition = competitions.find(c => (c.competition_type || "league") === "league") || competitions[0];
  const [homeTeamId, setHomeTeamId] = useState(initialHomeId);
  const [stadium, setStadium] = useState(initialStadium);
  const [matchStatus, setMatchStatus] = useState(match?.status ?? "scheduled");
  const [competitionId, setCompetitionId] = useState(String(match?.competition_id ?? defaultCompetition?.id ?? ""));
  const competitionType = competitions.find(c => String(c.id) === competitionId)?.competition_type ?? "league";
  const cupMatch = competitionType === "cup";

  // datetime-local uses the browser's local time; do not format in UTC here.
  const toLocalInput = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")].join("-") +
      `T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  const originalKickoffLocal = toLocalInput(match?.original_kickoff);
  const currentKickoffLocal = toLocalInput(match?.kickoff);
  const [kickoffValue, setKickoffValue] = useState(currentKickoffLocal);
  const [originalDraftKickoff, setOriginalDraftKickoff] = useState(originalKickoffLocal || currentKickoffLocal);
  const [replacementKickoff, setReplacementKickoff] = useState(() =>
    originalKickoffLocal && currentKickoffLocal !== originalKickoffLocal
      ? currentKickoffLocal : ""
  );

  function handleStatusChange(next: ClubMatch["status"]) {
    // When confirming the new date, keep it in the ordinary kickoff field.
    if (matchStatus === "postponed" && next === "scheduled") {
      // Clearing the replacement must not silently resurrect an obsolete date.
      setKickoffValue(replacementKickoff || originalDraftKickoff || kickoffValue);
    }
    if (next === "postponed" && match && !replacementKickoff) {
      // Treat a date edited immediately before choosing postponement as the new date.
      if (kickoffValue !== originalDraftKickoff) setReplacementKickoff(kickoffValue);
    }
    setMatchStatus(next);
  }

  function handleHomeTeamChange(teamId: string) {
    setHomeTeamId(teamId);

    const selected = teams.find(
      (team) => String(team.id) === teamId
    );

    setStadium(selected?.home_stadium ?? "");
  }

  return (
    <form action={action} className="matchEditorForm">
      {match && (
        <input type="hidden" name="match_id" value={String(match.id)} />
      )}

      <input
        type="hidden"
        name="timezone_offset"
        value={String(new Date().getTimezoneOffset())}
      />

      <div className="matchEditorGrid">
        <section className="matchEditorMain">
          <div className="formSectionTitle">
            <p className="eyebrow blue">МАТЧ</p>
            <h2>Участники</h2>
          </div>

          <div className="twoFields">
            <div className="fieldGroup">
              <label htmlFor="home_team_id">Хозяева</label>
              <select
                id="home_team_id"
                name="home_team_id"
                value={homeTeamId}
                onChange={(event) =>
                  handleHomeTeamChange(event.target.value)
                }
                required
              >
                <option value="" disabled>
                  Выбери команду
                </option>

                {teams.map((team) => (
                  <option key={team.id} value={String(team.id)}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="fieldGroup">
              <label htmlFor="away_team_id">Гости</label>
              <select
                id="away_team_id"
                name="away_team_id"
                defaultValue={match ? String(match.away_team_id) : ""}
                required
              >
                <option value="" disabled>
                  Выбери команду
                </option>

                {teams.map((team) => (
                  <option key={team.id} value={String(team.id)}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="twoFields">
            <div className="fieldGroup">
              <label htmlFor="competition_id">Турнир</label>
              <select
                id="competition_id"
                name="competition_id"
                value={competitionId}
                onChange={(event) => setCompetitionId(event.target.value)}
              >
                <option value="">Без турнира</option>

                {competitionTypes.map(type => {
                  const group = competitions.filter(c => (c.competition_type || "league") === type);
                  return group.length ? <optgroup key={type} label={competitionTypeLabel(type,"ru")}>
                    {group.map(c => <option key={c.id} value={String(c.id)}>{c.name}{c.season ? ` · ${c.season}` : ""}</option>)}
                  </optgroup> : null;
                })}
              </select>
            </div>

            <div className="fieldGroup">
              <label htmlFor="round">Тур / стадия</label>
              <input
                id="round"
                name="round"
                defaultValue={match?.round ?? ""}
                placeholder={cupMatch ? "Например: 1/8 финала" : "Тур 5"}
                list={cupMatch ? "cup-stage-options" : undefined}
              />
              {cupMatch && <datalist id="cup-stage-options">
                <option value="Предварительный раунд" />
                <option value="1/32 финала" />
                <option value="1/16 финала" />
                <option value="1/8 финала" />
                <option value="1/4 финала" />
                <option value="1/2 финала" />
                <option value="Финал" />
              </datalist>}
            </div>
          </div>

          <div className="twoFields">
            <div className="fieldGroup">
              <label htmlFor="kickoff">{matchStatus === "postponed" ? "Первоначальная дата и время" : "Дата и время матча"}</label>
              <input
                id="kickoff"
                name="kickoff"
                type="datetime-local"
                value={matchStatus === "postponed" ? originalDraftKickoff : kickoffValue}
                onChange={(event) => {
                  setKickoffValue(event.target.value);
                  if (!match && !replacementKickoff) setOriginalDraftKickoff(event.target.value);
                }}
                readOnly={matchStatus === "postponed"}
                required
              />
            </div>

            <div className="fieldGroup">
              <label htmlFor="stadium">Стадион</label>
              <input
                id="stadium"
                name="stadium"
                value={stadium}
                onChange={(event) => setStadium(event.target.value)}
                placeholder="Выбери команду хозяев"
              />
              <small className="fieldHint">
                По умолчанию берётся из профиля команды-хозяина.
                Для нейтрального поля или другого стадиона значение можно изменить вручную.
              </small>
            </div>
          </div>

          <div className="formSectionDivider" />

          <div className="formSectionTitle">
            <p className="eyebrow blue">РЕЗУЛЬТАТ</p>
            <h2>Статус и счёт</h2>
          </div>

          <div className="threeFields">
            <div className="fieldGroup">
              <label htmlFor="status">Статус</label>
              <select
                id="status"
                name="status"
                value={matchStatus}
                onChange={(event) => handleStatusChange(event.target.value as ClubMatch["status"])}
              >
                <option value="scheduled">Предстоящий</option>
                <option value="live">Идёт матч</option>
                <option value="finished">Завершён</option>
                <option value="postponed">Перенесён</option>
                <option value="cancelled">Отменён</option>
              </select>
            </div>

            <div className="fieldGroup">
              <label htmlFor="home_score">Голы хозяев</label>
              <input
                id="home_score"
                name="home_score"
                type="number"
                min={0}
                max={99}
                defaultValue={match?.home_score ?? ""}
                placeholder="0"
              />
            </div>

            <div className="fieldGroup">
              <label htmlFor="away_score">Голы гостей</label>
              <input
                id="away_score"
                name="away_score"
                type="number"
                min={0}
                max={99}
                defaultValue={match?.away_score ?? ""}
                placeholder="0"
              />
            </div>
          </div>

          {cupMatch && matchStatus === "finished" && <section className="cupResultEditor" aria-label="Итог кубковой встречи">
            <div className="formSectionTitle"><p className="eyebrow blue">КУБКОВЫЙ МАТЧ</p><h2>Дополнительное время и серия пенальти</h2></div>
            <label className="cupExtraTimeField"><input type="checkbox" name="extra_time_played" defaultChecked={Boolean(match?.extra_time_played)} /> Играли дополнительное время (2 × 15 минут)</label>
            <p className="fieldHint">В основных полях счёта указывай все голы за матч, включая дополнительное время. Удары послематчевой серии пенальти в этот счёт не входят.</p>
            <div className="twoFields">
              <div className="fieldGroup"><label htmlFor="home_penalties">Серия пенальти — хозяева</label><input id="home_penalties" name="home_penalties" type="number" min={0} max={99} defaultValue={match?.home_penalties ?? ""} placeholder="—" /></div>
              <div className="fieldGroup"><label htmlFor="away_penalties">Серия пенальти — гости</label><input id="away_penalties" name="away_penalties" type="number" min={0} max={99} defaultValue={match?.away_penalties ?? ""} placeholder="—" /></div>
            </div>
            <small className="fieldHint">Заполни оба поля серии или оставь оба пустыми. Если серия была, основной счёт должен быть ничейным, а счёт серии — определять победителя.</small>
          </section>}

          {(matchStatus === "postponed" || matchStatus === "cancelled" || Boolean(match?.original_kickoff)) && (
            <section className="scheduleEditorSection">
              <div className="formSectionTitle">
                <p className="eyebrow blue">ИЗМЕНЕНИЯ РАСПИСАНИЯ</p>
                <h2>{matchStatus === "postponed" ? "Причина переноса" : matchStatus === "cancelled" ? "Причина отмены" : "История переноса"}</h2>
              </div>
              <p className="fieldHint">
                Если новая дата известна, укажи её в отдельном поле ниже. Если неизвестна — оставь его пустым.
                Изначальная дата сохранится в истории. Пока статус «Перенесён», матч не считается подтверждённым
                в календаре ближайших игр. После окончательного подтверждения переключи статус на «Предстоящий».
              </p>
              {match?.original_kickoff ? <p className="fieldHint">Первоначальная дата: {new Intl.DateTimeFormat("ru-RU", {dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Chisinau"}).format(new Date(match.original_kickoff))}</p> : null}
              {matchStatus === "postponed" && (
                <div className="fieldGroup scheduleNewDateField">
                  <label htmlFor="rescheduled_kickoff">Новая дата и время матча (если известны)</label>
                  <input id="rescheduled_kickoff" name="rescheduled_kickoff" type="datetime-local"
                    value={replacementKickoff} onChange={(event) => setReplacementKickoff(event.target.value)} />
                  <small className="fieldHint">Можно указать новую дату сразу, не меняя статус «Перенесён».
                    Болельщики увидят обе даты и причину. Если новая дата окончательно утверждена,
                    выбери статус «Предстоящий» — дата автоматически перенесётся в основное поле.</small>
                  {replacementKickoff && <button type="button" className="scheduleClearNewDate"
                    onClick={() => setReplacementKickoff("")}>Очистить новую дату</button>}
                </div>
              )}
              <div className="twoFields">
                <div className="fieldGroup">
                  <label htmlFor="schedule_reason_ru">Причина (RU)</label>
                  <textarea id="schedule_reason_ru" name="schedule_reason_ru" maxLength={600} rows={3} defaultValue={match?.schedule_reason_ru ?? ""} placeholder="Например: неблагоприятные погодные условия" />
                </div>
                <div className="fieldGroup">
                  <label htmlFor="schedule_reason_ro">Motivul (RO)</label>
                  <textarea id="schedule_reason_ro" name="schedule_reason_ro" maxLength={600} rows={3} defaultValue={match?.schedule_reason_ro ?? ""} placeholder="De exemplu: condiții meteorologice nefavorabile" />
                </div>
              </div>
            </section>
          )}

          <div className="fieldGroup">
            <label htmlFor="notes">Заметка</label>
            <textarea
              id="notes"
              name="notes"
              rows={5}
              defaultValue={match?.notes ?? ""}
              placeholder="Необязательная внутренняя заметка..."
            />
          </div>
        </section>

        <aside className="matchEditorSidebar">
          <div className="playerPhotoAdminCard">
            <h3>Как это работает</h3>
            <p className="adminSideText">
              Выбираешь команду-хозяина — её домашний стадион автоматически
              подставляется в матч. При необходимости поле можно изменить
              только для этой конкретной игры.
            </p>
          </div>

          <div className="playerPhotoAdminCard">
            {state.error && (
              <div className="formError">{state.error}</div>
            )}

            <button
              className="playerSaveButton"
              type="submit"
              disabled={pending}
            >
              {pending ? "Сохраняем..." : "Сохранить матч"}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
