"use client";

import { useActionState, useMemo, useState } from "react";
import {
  saveMatch,
  type MatchFormState,
} from "@/app/admin/matches/actions";
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

  const [homeTeamId, setHomeTeamId] = useState(initialHomeId);
  const [stadium, setStadium] = useState(initialStadium);

  const kickoffValue = useMemo(() => {
    if (!match?.kickoff) return "";
    const date = new Date(match.kickoff);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-") +
      `T${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`;
  }, [match?.kickoff]);

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
                defaultValue={
                  match?.competition_id
                    ? String(match.competition_id)
                    : competitions[0]
                      ? String(competitions[0].id)
                      : ""
                }
              >
                <option value="">Без турнира</option>

                {competitions.map((competition) => (
                  <option
                    key={competition.id}
                    value={String(competition.id)}
                  >
                    {competition.name}
                    {competition.season
                      ? ` · ${competition.season}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="fieldGroup">
              <label htmlFor="round">Тур / стадия</label>
              <input
                id="round"
                name="round"
                defaultValue={match?.round ?? ""}
                placeholder="Тур 5"
              />
            </div>
          </div>

          <div className="twoFields">
            <div className="fieldGroup">
              <label htmlFor="kickoff">Дата и время</label>
              <input
                id="kickoff"
                name="kickoff"
                type="datetime-local"
                defaultValue={kickoffValue}
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
                defaultValue={match?.status ?? "scheduled"}
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
