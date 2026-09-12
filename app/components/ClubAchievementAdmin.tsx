"use client";

import { useActionState } from "react";
import {
  addAchievement,
  type ClubFormState,
} from "@/app/admin/club/actions";

const initialState: ClubFormState = {};

export default function ClubAchievementAdmin() {
  const [state, action, pending] = useActionState(
    addAchievement,
    initialState
  );

  return (
    <form action={action} className="clubAddCard">
      <div>
        <p className="eyebrow blue">ДОСТИЖЕНИЯ</p>
        <h2>Добавить достижение</h2>
      </div>

      <div className="twoFields">
        <div className="fieldGroup">
          <label htmlFor="achievement_year">Год / сезон</label>
          <input
            id="achievement_year"
            name="year"
            placeholder="2026/27"
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="achievement_title">Название</label>
          <input
            id="achievement_title"
            name="title"
            placeholder="Победа в..."
            required
          />
        </div>
      </div>

      <div className="fieldGroup">
        <label htmlFor="achievement_description">Описание</label>
        <textarea
          id="achievement_description"
          name="description"
          rows={4}
        />
      </div>


      <fieldset className="i18nFieldset">
        <legend>Română / RO</legend>
        <div className="fieldGroup"><label htmlFor="achievement_title_ro">Titlu</label><input id="achievement_title_ro" name="title_ro" /></div>
        <div className="fieldGroup"><label htmlFor="achievement_description_ro">Descriere</label><textarea id="achievement_description_ro" name="description_ro" rows={3} /></div>
      </fieldset>
      <div className="fieldGroup">
        <label htmlFor="achievement_order">Порядок</label>
        <input
          id="achievement_order"
          name="display_order"
          type="number"
          min={0}
          defaultValue={100}
        />
      </div>

      <label className="checkRow">
        <input type="checkbox" name="is_active" defaultChecked />
        <span>
          <strong>Показывать на сайте</strong>
        </span>
      </label>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}

      <button className="playerSaveButton" type="submit" disabled={pending}>
        {pending ? "Добавляем..." : "+ Добавить"}
      </button>
    </form>
  );
}
