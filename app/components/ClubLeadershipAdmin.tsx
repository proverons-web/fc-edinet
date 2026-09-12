"use client";

import { useActionState } from "react";
import {
  addLeader,
  type ClubFormState,
} from "@/app/admin/club/actions";

const initialState: ClubFormState = {};

export default function ClubLeadershipAdmin() {
  const [state, action, pending] = useActionState(
    addLeader,
    initialState
  );

  return (
    <form action={action} className="clubAddCard">
      <div>
        <p className="eyebrow blue">РУКОВОДСТВО</p>
        <h2>Добавить сотрудника</h2>
      </div>

      <div className="twoFields">
        <div className="fieldGroup">
          <label htmlFor="leader_name">Имя</label>
          <input id="leader_name" name="name" required />
        </div>

        <div className="fieldGroup">
          <label htmlFor="leader_role">Должность</label>
          <input
            id="leader_role"
            name="role"
            placeholder="Президент / Директор / Тренер..."
            required
          />
        </div>
      </div>

      <div className="fieldGroup">
        <label htmlFor="leader_bio">Краткая информация</label>
        <textarea id="leader_bio" name="bio" rows={4} />
      </div>


      <fieldset className="i18nFieldset">
        <legend>Română / RO</legend>
        <div className="fieldGroup"><label htmlFor="leader_role_ro">Funcție</label><input id="leader_role_ro" name="role_ro" /></div>
        <div className="fieldGroup"><label htmlFor="leader_bio_ro">Informație scurtă</label><textarea id="leader_bio_ro" name="bio_ro" rows={3} /></div>
      </fieldset>
      <div className="twoFields">
        <div className="fieldGroup">
          <label htmlFor="leader_photo">Фотография</label>
          <input
            id="leader_photo"
            name="photo_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="leader_order">Порядок</label>
          <input
            id="leader_order"
            name="display_order"
            type="number"
            min={0}
            defaultValue={100}
          />
        </div>
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
