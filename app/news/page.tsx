import Link from "next/link";
import NewsCard from "@/app/components/NewsCard";
import { createClient } from "@/lib/supabase/server";
import type { NewsArticle, NewsCategory } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { localized, publicText } from "@/lib/i18n";

export const dynamic = "force-dynamic";
type PageProps = { searchParams: Promise<{ category?: string | string[] }> };

export default async function NewsPage({ searchParams }: PageProps) {
  const locale = await getLocale();
  const text = publicText[locale].news;
  const params = await searchParams;
  const selectedSlug = Array.isArray(params.category) ? params.category[0] : params.category;
  const supabase = await createClient();

  const { data: categoryData } = await supabase.from("news_categories")
    .select("id,name,name_ro,slug,display_order,is_active").eq("is_active", true)
    .order("display_order", { ascending: true });
  const categories = (categoryData ?? []) as NewsCategory[];
  const selectedCategory = categories.find((item) => item.slug === selectedSlug);

  let query = supabase.from("news").select(`
      id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,author_name,status,
      published_at,views,is_featured,category_id,
      category:news_categories(id,name,name_ro,slug)
    `).eq("status", "published").lte("published_at", new Date().toISOString())
    .order("is_featured", { ascending: false }).order("published_at", { ascending: false });

  if (selectedSlug && !selectedCategory) return renderInvalid(categories, selectedSlug, locale);
  if (selectedCategory) query = query.eq("category_id", selectedCategory.id);
  const { data, error } = await query;
  const articles = (data ?? []) as unknown as NewsArticle[];

  return <main>
    <section className="pageHero newsPageHero"><div className="container"><p className="eyebrow">FC EDINEȚ</p><h1>{text.title}</h1><p>{text.description}</p></div></section>
    <section className="section newsArchiveSection"><div className="container">
      <CategoryFilters categories={categories} selectedSlug={selectedSlug} locale={locale} />
      {error ? <div className="archiveMessage">{text.loadError}: {error.message}</div>
      : articles.length === 0 ? <div className="archiveMessage">{text.empty}</div>
      : <div className="newsDbGrid">{articles.map((article) => <NewsCard key={article.id} article={article} locale={locale} />)}</div>}
    </div></section>
  </main>;
}

function CategoryFilters({ categories, selectedSlug, locale }: { categories: NewsCategory[]; selectedSlug?: string; locale: "ru" | "ro" }) {
  const text = publicText[locale].news;
  return <nav className="newsFilters" aria-label={text.categoriesAria}>
    <Link className={!selectedSlug ? "active" : ""} href="/news">{text.all}</Link>
    {categories.map((category) => <Link key={category.id} className={selectedSlug === category.slug ? "active" : ""} href={`/news?category=${category.slug}`}>
      {localized(category.name, category.name_ro, locale)}
    </Link>)}
  </nav>;
}

function renderInvalid(categories: NewsCategory[], selectedSlug: string, locale: "ru" | "ro") {
  const text = publicText[locale].news;
  return <main><section className="pageHero newsPageHero"><div className="container"><p className="eyebrow">FC EDINEȚ</p><h1>{text.title}</h1><p>{text.description}</p></div></section>
    <section className="section"><div className="container"><CategoryFilters categories={categories} selectedSlug={selectedSlug} locale={locale}/><div className="archiveMessage">{text.invalidCategory}</div></div></section></main>;
}
