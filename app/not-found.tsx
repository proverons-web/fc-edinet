import Link from "next/link";

export default function NotFound() {
  return (
    <main className="notFound">
      <div className="container">
        <p className="eyebrow blue">404</p>
        <h1>Страница не найдена</h1>
        <p>Возможно, игрок был удалён или адрес страницы указан неверно.</p>
        <Link className="primaryButton" href="/team">Вернуться к команде</Link>
      </div>
    </main>
  );
}
