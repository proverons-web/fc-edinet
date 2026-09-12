import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footerGrid">
        <div>
          <Link className="brand" href="/">
            <span className="crest">FCE</span>
            <span className="brandText">
              <strong>FC EDINEȚ</strong>
              <small>MOLDOVA</small>
            </span>
          </Link>
          <p>Официальный сайт футбольного клуба FC Edineț.</p>
        </div>

        <div>
          <strong>Клуб</strong>
          <Link href="/club">История</Link>
          <Link href="/club">Стадион</Link>
          <Link href="/partners">Партнёры</Link>
        </div>

        <div>
          <strong>Команда</strong>
          <Link href="/team">Игроки</Link>
          <Link href="/matches">Матчи</Link>
        </div>

        <div>
          <strong>Медиа</strong>
          <Link href="/news">Новости</Link>
          <Link href="/media">Фото</Link>
          <Link href="/media">Видео</Link>
        </div>
      </div>

      <div className="container footerBottom">
        <span>© 2026 FC Edineț</span>
        <span>Версия 1.7</span>
      </div>
    </footer>
  );
}
