"use client";
import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/account/actions";
import type { Locale } from "@/lib/i18n";
const initialState:ProfileState={};
export default function ProfileForm({fullName,locale="ru"}:{fullName:string;locale?:Locale}){const [state,action,pending]=useActionState(updateProfile,initialState);const ro=locale==="ro";return <form action={action} className="profileEditForm"><div className="fieldGroup"><label htmlFor="full_name">{ro?"Nume afișat":"Отображаемое имя"}</label><input id="full_name" name="full_name" defaultValue={fullName} required minLength={2} maxLength={80}/></div>{state.error&&<div className="formError">{state.error}</div>}{state.success&&<div className="formSuccess">{state.success}</div>}<button className="authSubmit" disabled={pending} type="submit">{pending?(ro?"Salvare...":"Сохраняем..."):(ro?"Salvează":"Сохранить")}</button></form>}
