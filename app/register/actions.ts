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
  const locale = String(formData.get("locale") ?? "ru") === "ro" ? "ro" : "ru";

  if (fullName.length < 2) {
    return { error: locale === "ro" ? "Introdu un nume de cel puțin 2 caractere." : "Укажи имя минимум из 2 символов." };
  }

  if (!email.includes("@")) {
    return { error: locale === "ro" ? "Introdu o adresă de email validă." : "Укажи корректный email." };
  }

  if (password.length < 8) {
    return { error: locale === "ro" ? "Parola trebuie să conțină cel puțin 8 caractere." : "Пароль должен содержать минимум 8 символов." };
  }

  if (password !== confirmPassword) {
    return { error: locale === "ro" ? "Parolele nu coincid." : "Пароли не совпадают." };
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
    return { error: locale === "ro" ? "Înregistrarea nu a reușit. Verifică datele introduse." : "Регистрация не выполнена. Проверь введённые данные." };
  }

  // Если email confirmation отключена, session создаётся сразу.
  if (data.session) {
    redirect("/account");
  }

  redirect("/register/check-email");
}
