import Link from 'next/link';
import type { NewsArticle } from '@/lib/types';

export default function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <article className="newsDbCard">
      <Link href={`/news/${article.slug}`} className="newsDbMedia">
        {article.cover_image_url ? (
          <img src={article.cover_image_url} alt={article.title} />
        ) : (
          <span>FC EDINEȚ</span>
        )}
        {article.is_featured && <b className="featuredPill">ГЛАВНОЕ</b>}
      </Link>

      <div className="newsDbBody">
        <div className="newsMetaLine">
          <span>{article.category?.name ?? 'Новости'}</span>
          <time>{formatNewsDate(article.published_at)}</time>
        </div>
        <h2><Link href={`/news/${article.slug}`}>{article.title}</Link></h2>
        {article.excerpt && <p>{article.excerpt}</p>}
        <Link className="readMore" href={`/news/${article.slug}`}>Читать →</Link>
      </div>
    </article>
  );
}

export function formatNewsDate(value: string | null) {
  if (!value) return 'Без даты';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
