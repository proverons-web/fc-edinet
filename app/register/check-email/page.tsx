import Link from "next/link";

export const metadata = { title: "Подтверди email" };

export default function CheckEmailPage() {
  return (
    <main className="statusPage">
      <div className="container statusCard">
        <div className="statusIcon">✉</div>
        <p className="eyebrow blue">ПОЧТИ ГОТОВО</p>
        <h1>Проверь почту</h1>
        <p>
          Supabase отправил письмо подтверждения. Открой письмо и нажми
          кнопку подтверждения — после этого сайт создаст авторизованную
          сессию и откроет личный кабинет.
        </p>
        <Link className="primaryButton" href="/login">
          Перейти ко входу
        </Link>
      </div>
    </main>
  );
}
