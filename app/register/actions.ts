"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = {
  error?: string;
};

export async function register(
  _previousState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (fullName.length < 2) {
    return { error: "Укажи имя минимум из 2 символов." };
  }

  if (!email.includes("@")) {
    return { error: "Укажи корректный email." };
  }

  if (password.length < 8) {
    return { error: "Пароль должен содержать минимум 8 символов." };
  }

  if (password !== confirmPassword) {
    return { error: "Пароли не совпадают." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: "Регистрация не выполнена. Проверь введённые данные." };
  }

  // Если email confirmation отключена, session создаётся сразу.
  if (data.session) {
    redirect("/account");
  }

  redirect("/register/check-email");
}
