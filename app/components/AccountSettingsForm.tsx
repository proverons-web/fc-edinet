"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsState } from "@/app/account/actions";
import { accountText } from "@/lib/account-i18n";
import type { Locale } from "@/lib/i18n";

const initialState: SettingsState = {};

export default function AccountSettingsForm({
  locale,
  preferredLanguage,
  notificationsEnabled,
}: {
  locale: Locale;
  preferredLanguage: Locale;
  notificationsEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(updateSettings, initialState);
  const text = accountText[locale];
  return (
    <form action={action} className="accountSettingsForm">
      <input type="hidden" name="locale" value={locale} />
      <fieldset className="accountSettingBlock">
        <legend>{text.language}</legend>
        <p>{text.languageHint}</p>
        <label className="accountRadio"><input type="radio" name="preferred_language" value="ru" defaultChecked={preferredLanguage === "ru"} /><span>{text.ru}</span></label>
        <label className="accountRadio"><input type="radio" name="preferred_language" value="ro" defaultChecked={preferredLanguage === "ro"} /><span>{text.ro}</span></label>
      </fieldset>
      <fieldset className="accountSettingBlock">
        <legend>{text.notifications}</legend>
        <p>{text.notificationsHint}</p>
        <label className="accountCheck"><input type="checkbox" name="notifications_enabled" defaultChecked={notificationsEnabled} /><span>{text.notifications}</span></label>
      </fieldset>
      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}
      <button className="authSubmit" disabled={pending} type="submit">{pending ? text.saving : text.save}</button>
    </form>
  );
}
