import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NewsCard, { formatNewsDate } from "@/app/components/NewsCard";
import { createClient } from "@/lib/supabase/server";
import type { NewsArticle } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { localized, publicText } from "@/lib/i18n";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

async function getArticle(slug: string): Promise<NewsArticle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("news").select(`
      id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,author_name,status,
      published_at,views,is_featured,category_id,category:news_categories(id,name,name_ro,slug)
    `).eq("slug", slug).eq("status", "published").lte("published_at", new Date().toISOString()).maybeSingle();
  if (error) return null;
  return data as unknown as NewsArticle | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: publicText[locale].news.notFound };
  const title = localized(article.title, article.title_ro, locale);
  const excerpt = localized(article.excerpt, article.excerpt_ro, locale);
  return { title, description: excerpt || `${title} — FC Edineț` };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const locale = await getLocale();
  const text = publicText[locale].news;
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const supabase = await createClient();
  const { data: relatedData } = article.category_id ? await supabase.from("news").select(`
      id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,author_name,status,
      published_at,views,is_featured,category_id,category:news_categories(id,name,name_ro,slug)
    `).eq("category_id", article.category_id).eq("status", "published").neq("id", article.id)
    .lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(3) : { data: [] };
  const related = (relatedData ?? []) as unknown as NewsArticle[];
  const title = localized(article.title, article.title_ro, locale);
  const excerpt = localized(article.excerpt, article.excerpt_ro, locale);
  const content = localized(article.content, article.content_ro, locale);
  const category = localized(article.category?.name, article.category?.name_ro, locale) || text.defaultCategory;
  const paragraphs = content.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);

  return <main><article>
    <header className="articleHeader"><div className="container articleHeaderInner">
      <Link className="articleBack" href="/news">{text.back}</Link>
      <div className="articleMeta"><span>{category}</span><time>{formatNewsDate(article.published_at, locale)}</time></div>
      <h1>{title}</h1>{excerpt && <p className="articleLead">{excerpt}</p>}
      <div className="articleAuthor">{text.author}: <strong>{article.author_name || "FC Edineț"}</strong></div>
    </div></header>
    <div className="container articleLayout"><div className="articleMain">
      {article.cover_image_url ? <img className="articleCover" src={article.cover_image_url} alt={title} /> : <div className="articleCoverFallback">FC EDINEȚ</div>}
      <div className="articleContent">{paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>{text.emptyText}</p>}</div>
    </div><aside className="articleAside"><div className="articleInfoBox">
      <small>{text.category}</small><strong>{category}</strong><small>{text.published}</small><strong>{formatNewsDate(article.published_at, locale)}</strong><small>{text.author.toUpperCase()}</small><strong>{article.author_name || "FC Edineț"}</strong>
    </div></aside></div>
  </article>
  {related.length > 0 && <section className="section relatedNewsSection"><div className="container"><div className="sectionHeading"><div><p className="eyebrow blue">{text.relatedEyebrow}</p><h2>{text.related}</h2></div><Link href="/news">{text.back.replace("← ", "")} →</Link></div><div className="newsDbGrid relatedGrid">{related.map((item) => <NewsCard key={item.id} article={item} locale={locale} />)}</div></div></section>}
  </main>;
}
