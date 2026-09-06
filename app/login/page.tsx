import { redirect } from "next/navigation";
import LoginForm from "@/app/components/LoginForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Вход" };

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect("/account");
  }

  return (
    <main className="authPage">
      <div className="container authLayout">
        <section className="authIntro">
          <p className="eyebrow">FC EDINEȚ</p>
          <h1>Личный кабинет</h1>
          <p>
            Вход для болельщиков и сотрудников клуба. Права доступа
            определяются ролью пользователя.
          </p>
        </section>

        <section className="authCard">
          <p className="eyebrow blue">ВХОД</p>
          <h2>С возвращением</h2>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
