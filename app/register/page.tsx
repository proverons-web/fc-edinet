import { redirect } from "next/navigation";
import RegisterForm from "@/app/components/RegisterForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Регистрация" };

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect("/account");
  }

  return (
    <main className="authPage">
      <div className="container authLayout">
        <section className="authIntro">
          <p className="eyebrow">БОЛЕЛЬЩИКИ FC EDINEȚ</p>
          <h1>Создай аккаунт</h1>
          <p>
            Аккаунт станет основой для комментариев, профиля и будущих
            возможностей для болельщиков.
          </p>
        </section>

        <section className="authCard">
          <p className="eyebrow blue">РЕГИСТРАЦИЯ</p>
          <h2>Новый пользователь</h2>
          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
