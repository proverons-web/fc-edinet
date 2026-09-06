import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NewsCard, { formatNewsDate } from '@/app/components/NewsCard';
import { createClient } from '@/lib/supabase/server';
import type { NewsArticle } from '@/lib/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getArticle(slug: string): Promise<NewsArticle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('news')
    .select(`
      id,title,slug,excerpt,content,cover_image_url,author_name,status,
      published_at,views,is_featured,category_id,
      category:news_categories(id,name,slug)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('News fetch error:', error.message);
    return null;
  }
  return data as unknown as NewsArticle | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Новость не найдена' };
  return {
    title: article.title,
    description: article.excerpt ?? `Новость FC Edineț: ${article.title}`,
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const supabase = await createClient();
  const { data: relatedData } = article.category_id
    ? await supabase
        .from('news')
        .select(`
          id,title,slug,excerpt,content,cover_image_url,author_name,status,
          published_at,views,is_featured,category_id,
          category:news_categories(id,name,slug)
        `)
        .eq('category_id', article.category_id)
        .eq('status', 'published')
        .neq('id', article.id)
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false })
        .limit(3)
    : { data: [] };

  const related = (relatedData ?? []) as unknown as NewsArticle[];
  const paragraphs = article.content
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <main>
      <article>
        <header className="articleHeader">
          <div className="container articleHeaderInner">
            <Link className="articleBack" href="/news">← Все новости</Link>
            <div className="articleMeta">
              <span>{article.category?.name ?? 'Новости'}</span>
              <time>{formatNewsDate(article.published_at)}</time>
            </div>
            <h1>{article.title}</h1>
            {article.excerpt && <p className="articleLead">{article.excerpt}</p>}
            <div className="articleAuthor">Автор: <strong>{article.author_name || 'FC Edineț'}</strong></div>
          </div>
        </header>

        <div className="container articleLayout">
          <div className="articleMain">
            {article.cover_image_url ? (
              <img className="articleCover" src={article.cover_image_url} alt={article.title} />
            ) : (
              <div className="articleCoverFallback">FC EDINEȚ</div>
            )}

            <div className="articleContent">
              {paragraphs.length > 0 ? paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              )) : <p>Текст новости пока не добавлен.</p>}
            </div>
          </div>

          <aside className="articleAside">
            <div className="articleInfoBox">
              <small>КАТЕГОРИЯ</small>
              <strong>{article.category?.name ?? 'Новости'}</strong>
              <small>ОПУБЛИКОВАНО</small>
              <strong>{formatNewsDate(article.published_at)}</strong>
              <small>АВТОР</small>
              <strong>{article.author_name || 'FC Edineț'}</strong>
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section relatedNewsSection">
          <div className="container">
            <div className="sectionHeading">
              <div><p className="eyebrow blue">ЕЩЁ ПО ТЕМЕ</p><h2>Другие новости</h2></div>
              <Link href="/news">Все новости →</Link>
            </div>
            <div className="newsDbGrid relatedGrid">
              {related.map((item) => <NewsCard key={item.id} article={item} />)}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
