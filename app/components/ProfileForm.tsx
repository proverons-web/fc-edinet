"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/account/actions";
import { accountText } from "@/lib/account-i18n";
import type { Locale } from "@/lib/i18n";

const initialState: ProfileState = {};

export default function ProfileForm({
  fullName,
  displayName,
  city,
  avatarUrl,
  locale = "ru",
}: {
  fullName: string;
  displayName: string;
  city: string;
  avatarUrl: string | null;
  locale?: Locale;
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  const text = accountText[locale];

  return (
    <form action={action} className="profileEditForm profileV2Form">
      <input type="hidden" name="locale" value={locale} />
      <div className="profileAvatarEditor">
        <div className="profileAvatarPreview">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{displayName.slice(0, 1).toUpperCase() || "F"}</span>}
        </div>
        <label>
          <span>{text.avatar}</span>
          <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" />
          <small>{text.avatarHint}</small>
        </label>
      </div>

      <div className="accountFormGrid">
        <div className="fieldGroup">
          <label htmlFor="full_name">{text.fullName}</label>
          <input id="full_name" name="full_name" defaultValue={fullName} required minLength={2} maxLength={100} />
        </div>
        <div className="fieldGroup">
          <label htmlFor="display_name">{text.displayName}</label>
          <input id="display_name" name="display_name" defaultValue={displayName} required minLength={2} maxLength={60} />
          <small>{text.displayNameHint}</small>
        </div>
        <div className="fieldGroup accountFormFull">
          <label htmlFor="city">{text.city}</label>
          <input id="city" name="city" defaultValue={city} maxLength={80} placeholder={text.cityHint} />
        </div>
      </div>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}
      <button className="authSubmit" disabled={pending} type="submit">
        {pending ? text.saving : text.save}
      </button>
    </form>
  );
}
