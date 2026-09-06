"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/app/login/actions";

const initialState: AuthState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="authForm">
      <div className="fieldGroup">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="fieldGroup">
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      {state.error && <div className="formError">{state.error}</div>}

      <button className="authSubmit" type="submit" disabled={pending}>
        {pending ? "Входим..." : "Войти"}
      </button>

      <p className="authSwitch">
        Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
      </p>
    </form>
  );
}
