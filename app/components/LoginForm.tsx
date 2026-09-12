"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/app/login/actions";
import type { Locale } from "@/lib/i18n";
const initialState:AuthState={};
export default function LoginForm({locale="ru"}:{locale?:Locale}){const [state,action,pending]=useActionState(login,initialState);const ro=locale==="ro";return <form action={action} className="authForm"><div className="fieldGroup"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required/></div><div className="fieldGroup"><label htmlFor="password">{ro?"Parolă":"Пароль"}</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required/></div>{state.error&&<div className="formError">{state.error}</div>}<button className="authSubmit" type="submit" disabled={pending}>{pending?(ro?"Autentificare...":"Входим..."):(ro?"Autentificare":"Войти")}</button><p className="authSwitch">{ro?"Nu ai cont? ":"Нет аккаунта? "}<Link href="/register">{ro?"Înregistrează-te":"Зарегистрироваться"}</Link></p></form>}
