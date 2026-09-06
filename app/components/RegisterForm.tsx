"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  register,
  type RegisterState,
} from "@/app/register/actions";

const initialState: RegisterState = {};

export default function RegisterForm() {
  const [state, action, pending] = useActionState(register, initialState);

  return (
    <form action={action} className="authForm">
      <div className="fieldGroup">
        <label htmlFor="full_name">Имя</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          placeholder="Sergiu Popescu"
          required
        />
      </div>

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
          autoComplete="new-password"
          minLength={8}
          placeholder="Минимум 8 символов"
          required
        />
      </div>

      <div className="fieldGroup">
        <label htmlFor="confirm_password">Повтори пароль</label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Повтори пароль"
          required
        />
      </div>

      {state.error && <div className="formError">{state.error}</div>}

      <button className="authSubmit" type="submit" disabled={pending}>
        {pending ? "Создаём аккаунт..." : "Создать аккаунт"}
      </button>

      <p className="authFinePrint">
        После регистрации по умолчанию назначается роль «Болельщик».
      </p>

      <p className="authSwitch">
        Уже зарегистрирован? <Link href="/login">Войти</Link>
      </p>
    </form>
  );
}
