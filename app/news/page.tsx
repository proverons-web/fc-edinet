import Link from 'next/link';
import NewsCard from '@/app/components/NewsCard';
import { createClient } from '@/lib/supabase/server';
import type { NewsArticle, NewsCategory } from '@/lib/types';

export const metadata = { title: 'Новости' };
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function NewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedSlug = Array.isArray(params.category)
    ? params.category[0]
    : params.category;

  const supabase = await createClient();

  const { data: categoryData } = await supabase
    .from('news_categories')
    .select('id,name,slug,display_order,is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const categories = (categoryData ?? []) as NewsCategory[];
  const selectedCategory = categories.find((item) => item.slug === selectedSlug);

  let query = supabase
    .from('news')
    .select(`
      id,title,slug,excerpt,content,cover_image_url,author_name,status,
      published_at,views,is_featured,category_id,
      category:news_categories(id,name,slug)
    `)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (selectedSlug && !selectedCategory) {
    return renderPage(categories, [], selectedSlug);
  }

  if (selectedCategory) {
    query = query.eq('category_id', selectedCategory.id);
  }

  const { data, error } = await query;
  const articles = (data ?? []) as unknown as NewsArticle[];

  return (
    <main>
      <section className="pageHero newsPageHero">
        <div className="container">
          <p className="eyebrow">FC EDINEȚ</p>
          <h1>Новости</h1>
          <p>Официальные публикации клуба, матчи, интервью и жизнь команды.</p>
        </div>
      </section>

      <section className="section newsArchiveSection">
        <div className="container">
          <CategoryFilters categories={categories} selectedSlug={selectedSlug} />

          {error ? (
            <div className="archiveMessage">Не удалось загрузить новости: {error.message}</div>
          ) : articles.length === 0 ? (
            <div className="archiveMessage">В этой категории пока нет опубликованных новостей.</div>
          ) : (
            <div className="newsDbGrid">
              {articles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function CategoryFilters({
  categories,
  selectedSlug,
}: {
  categories: NewsCategory[];
  selectedSlug?: string;
}) {
  return (
    <nav className="newsFilters" aria-label="Категории новостей">
      <Link className={!selectedSlug ? 'active' : ''} href="/news">Все</Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          className={selectedSlug === category.slug ? 'active' : ''}
          href={`/news?category=${category.slug}`}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}

function renderPage(categories: NewsCategory[], articles: NewsArticle[], selectedSlug: string) {
  return (
    <main>
      <section className="pageHero newsPageHero"><div className="container"><p className="eyebrow">FC EDINEȚ</p><h1>Новости</h1><p>Официальные публикации клуба.</p></div></section>
      <section className="section"><div className="container"><CategoryFilters categories={categories} selectedSlug={selectedSlug}/><div className="archiveMessage">Такой категории нет.</div></div></section>
    </main>
  );
}
