"use client";

import { useActionState } from "react";
import {
  updateProfile,
  type ProfileState,
} from "@/app/account/actions";

const initialState: ProfileState = {};

export default function ProfileForm({
  fullName,
}: {
  fullName: string;
}) {
  const [state, action, pending] = useActionState(
    updateProfile,
    initialState
  );

  return (
    <form action={action} className="profileEditForm">
      <div className="fieldGroup">
        <label htmlFor="full_name">Отображаемое имя</label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          required
          minLength={2}
          maxLength={80}
        />
      </div>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && (
        <div className="formSuccess">{state.success}</div>
      )}

      <button className="authSubmit" disabled={pending} type="submit">
        {pending ? "Сохраняем..." : "Сохранить"}
      </button>
    </form>
  );
}
