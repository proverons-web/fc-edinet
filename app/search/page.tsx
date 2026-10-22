import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { getLocale } from "@/lib/locale";
import { localized } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ro = locale === "ro";
  return {
    title: ro ? "Căutare" : "Поиск",
    description: ro ? "Căutare pe site-ul FC Edineț." : "Поиск по сайту FC Edineț.",
    robots: { index: false, follow: true },
  };
}

type SearchParams = Promise<{ q?: string | string[] }>;

type NewsResult = {
  id: string | number;
  slug: string;
  title: string;
  title_ro: string | null;
  excerpt: string | null;
  excerpt_ro: string | null;
  published_at: string | null;
};

type PlayerResult = {
  id: string | number;
  slug: string;
  first_name: string;
  last_name: string;
  shirt_number: number | null;
  position: string;
  photo_url: string | null;
};

type AlbumResult = {
  id: string | number;
  slug: string;
  title: string;
  cover_image_url: string | null;
  event_date: string | null;
};

function sanitizeQuery(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocale();
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = sanitizeQuery(raw || "");
  const ro = locale === "ro";

  let news: NewsResult[] = [];
  let players: PlayerResult[] = [];
  let albums: AlbumResult[] = [];
  let failed = false;

  if (q.length >= 2) {
    const supabase = createPublicClient();
    const pattern = `%${q}%`;
    const [newsResult, playersResult, albumsResult] = await Promise.all([
      supabase
        .from("news")
        .select("id,slug,title,title_ro,excerpt,excerpt_ro,published_at")
        .eq("status", "published")
        .or(`title.ilike.${pattern},title_ro.ilike.${pattern},excerpt.ilike.${pattern},excerpt_ro.ilike.${pattern}`)
        .order("published_at", { ascending: false })
        .limit(8),
      supabase
        .from("players")
        .select("id,slug,first_name,last_name,shirt_number,position,photo_url")
        .eq("is_active", true)
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .order("last_name", { ascending: true })
        .limit(8),
      supabase
        .from("media_albums")
        .select("id,slug,title,cover_image_url,event_date")
        .eq("is_published", true)
        .ilike("title", pattern)
        .order("event_date", { ascending: false })
        .limit(6),
    ]);
    news = (newsResult.data ?? []) as NewsResult[];
    players = (playersResult.data ?? []) as PlayerResult[];
    albums = (albumsResult.data ?? []) as AlbumResult[];
    failed = Boolean(newsResult.error || playersResult.error || albumsResult.error);
  }

  const total = news.length + players.length + albums.length;

  return (
    <main className="siteSearchPage">
      <section className="siteSearchHero">
        <div className="container">
          <p className="eyebrow">FC EDINEȚ</p>
          <h1>{ro ? "Căutare" : "Поиск"}</h1>
          <p>{ro ? "Știri, jucători și albume media într-un singur loc." : "Новости, игроки и медиаальбомы в одном месте."}</p>
          <form className="siteSearchForm" action="/search" method="get" role="search">
            <label htmlFor="site-search-input">{ro ? "Caută pe site" : "Искать по сайту"}</label>
            <div>
              <input id="site-search-input" name="q" type="search" defaultValue={q} minLength={2} maxLength={80} placeholder={ro ? "Nume, știre, album…" : "Игрок, новость, альбом…"} autoFocus />
              <button type="submit">{ro ? "Caută" : "Найти"}</button>
            </div>
          </form>
        </div>
      </section>

      <section className="siteSearchResults">
        <div className="container">
          {!q && <SearchHint ro={ro} />}
          {q && q.length < 2 && <SearchMessage title={ro ? "Introdu cel puțin 2 caractere" : "Введи минимум 2 символа"} text={ro ? "Așa vom găsi rezultate mai precise." : "Так поиск даст более точный результат."} />}
          {failed && <SearchMessage title={ro ? "Căutarea nu este disponibilă momentan" : "Поиск временно недоступен"} text={ro ? "Încearcă din nou peste câteva momente." : "Попробуй ещё раз через несколько минут."} />}
          {q.length >= 2 && !failed && total === 0 && <SearchMessage title={ro ? "Nu am găsit nimic" : "Ничего не найдено"} text={ro ? `Nu există rezultate pentru „${q}”.` : `По запросу «${q}» результатов нет.`} />}
          {q.length >= 2 && !failed && total > 0 && (
            <>
              <div className="siteSearchSummary"><span>{ro ? "Rezultate pentru" : "Результаты для"}</span><strong>“{q}”</strong><b>{total}</b></div>
              {players.length > 0 && <section className="siteSearchGroup"><header><p className="eyebrow blue">{ro ? "ECHIPĂ" : "КОМАНДА"}</p><h2>{ro ? "Jucători" : "Игроки"}</h2></header><div className="siteSearchPlayerGrid">{players.map((player) => <Link href={`/team/${player.slug}`} className="siteSearchPlayer" key={player.id}>{player.photo_url ? <img src={player.photo_url} alt="" loading="lazy" decoding="async" /> : <img src="/brand/fc-edinet-crest.png" alt="" className="fallback" />}<div><span>#{player.shirt_number ?? "—"}</span><strong>{player.first_name} {player.last_name}</strong></div><b aria-hidden="true">→</b></Link>)}</div></section>}
              {news.length > 0 && <section className="siteSearchGroup"><header><p className="eyebrow blue">{ro ? "ȘTIRI" : "НОВОСТИ"}</p><h2>{ro ? "Publicații" : "Публикации"}</h2></header><div className="siteSearchNewsList">{news.map((article) => <Link href={`/news/${article.slug}`} key={article.id}><div><strong>{localized(article.title, article.title_ro, locale)}</strong>{localized(article.excerpt, article.excerpt_ro, locale) && <p>{localized(article.excerpt, article.excerpt_ro, locale)}</p>}</div><span aria-hidden="true">→</span></Link>)}</div></section>}
              {albums.length > 0 && <section className="siteSearchGroup"><header><p className="eyebrow blue">{ro ? "MEDIA" : "МЕДИА"}</p><h2>{ro ? "Albume" : "Альбомы"}</h2></header><div className="siteSearchAlbumGrid">{albums.map((album) => <Link href={`/media/${album.slug}`} key={album.id}>{album.cover_image_url ? <img src={album.cover_image_url} alt="" loading="lazy" decoding="async" /> : <div className="siteSearchAlbumFallback"><img src="/brand/fc-edinet-crest.png" alt="" /></div>}<strong>{album.title}</strong></Link>)}</div></section>}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function SearchHint({ ro }: { ro: boolean }) {
  return <div className="siteSearchHint"><img src="/brand/fc-edinet-crest.png" alt="" /><div><strong>{ro ? "Ce vrei să găsești?" : "Что нужно найти?"}</strong><p>{ro ? "Introdu numele unui jucător, titlul unei știri sau al unui album." : "Введи имя игрока, название новости или альбома."}</p></div></div>;
}

function SearchMessage({ title, text }: { title: string; text: string }) {
  return <div className="siteSearchMessage"><img src="/brand/fc-edinet-crest.png" alt="" /><strong>{title}</strong><p>{text}</p></div>;
}
