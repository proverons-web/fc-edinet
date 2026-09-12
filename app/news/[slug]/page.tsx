import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NewsCard, { formatNewsDate } from "@/app/components/NewsCard";
import NewsComments from "@/app/components/NewsComments";
import PageHeroShell from "@/app/components/PageHeroShell";
import { createClient } from "@/lib/supabase/server";
import type { CommentBlock, NewsArticle, NewsComment } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { localized, publicText } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";

export const dynamic = "force-dynamic";
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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

export default async function NewsArticlePage({ params, searchParams }: PageProps) {
  const locale = await getLocale();
  const text = publicText[locale].news;
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const commentNotice = firstParam(query.comment);
  const article = await getArticle(slug);
  if (!article) {
    notFound();
    throw new Error("News article not found");
  }

  const supabase = await createClient();
  const [claimsResult, design] = await Promise.all([supabase.auth.getClaims(), getPublishedSitePageDesign(supabase, "template_news")]);
  const { data: claimsData } = claimsResult;
  const currentUserId = claimsData?.claims?.sub ?? null;

  const commentFields = currentUserId
    ? "id,news_id,user_id,body,status,author_display_name,author_avatar_url,created_at,updated_at"
    : "id,news_id,body,status,author_display_name,author_avatar_url,created_at,updated_at";

  const relatedPromise = article.category_id
    ? supabase.from("news").select(`
        id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,author_name,status,
        published_at,views,is_featured,category_id,category:news_categories(id,name,name_ro,slug)
      `).eq("category_id", article.category_id).eq("status", "published").neq("id", article.id)
      .lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(3)
    : Promise.resolve({ data: [] as unknown[] });

  const commentsPromise = supabase
    .from("comments")
    .select(commentFields, { count: "exact" })
    .eq("news_id", article.id)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(100);

  const blockPromise = currentUserId
    ? supabase.from("comment_blocks").select("user_id,reason,blocked_until,blocked_by,created_at,updated_at").eq("user_id", currentUserId).maybeSingle()
    : Promise.resolve({ data: null });

  const [relatedResult, commentsResult, blockResult] = await Promise.all([
    relatedPromise,
    commentsPromise,
    blockPromise,
  ]);

  const related = (relatedResult.data ?? []) as unknown as NewsArticle[];
  const comments = (commentsResult.data ?? []) as unknown as NewsComment[];
  const activeBlock = (blockResult.data ?? null) as CommentBlock | null;
  const title = localized(article.title, article.title_ro, locale);
  const excerpt = localized(article.excerpt, article.excerpt_ro, locale);
  const content = localized(article.content, article.content_ro, locale);
  const category = localized(article.category?.name, article.category?.name_ro, locale) || text.defaultCategory;
  const paragraphs = content.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);

  return <main><article>
    <PageHeroShell design={design} className="articleHeader" contentClassName="container articleHeaderInner" contentImageUrl={article.cover_image_url}>
      <>
        <Link className="articleBack" href="/news">{text.back}</Link>
        {design.show_eyebrow && <div className="articleMeta"><span>{category}</span><time>{formatNewsDate(article.published_at, locale)}</time></div>}
        <h1>{title}</h1>{design.show_description && excerpt && <p className="articleLead">{excerpt}</p>}
        <div className="articleAuthor">{text.author}: <strong>{article.author_name || "FC Edineț"}</strong></div>
      </>
    </PageHeroShell>
    <div className="container articleLayout"><div className="articleMain">
      {article.cover_image_url ? <img className="articleCover" src={article.cover_image_url} alt={title} /> : <div className="articleCoverFallback">FC EDINEȚ</div>}
      <div className="articleContent">{paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>{text.emptyText}</p>}</div>
    </div><aside className="articleAside"><div className="articleInfoBox">
      <small>{text.category}</small><strong>{category}</strong><small>{text.published}</small><strong>{formatNewsDate(article.published_at, locale)}</strong><small>{text.author.toUpperCase()}</small><strong>{article.author_name || "FC Edineț"}</strong>
    </div></aside></div>
  </article>

  <NewsComments
    articleId={article.id}
    slug={article.slug}
    locale={locale}
    comments={comments}
    totalCount={commentsResult.count ?? comments.length}
    currentUserId={currentUserId}
    activeBlock={activeBlock}
    notice={commentNotice}
  />

  {related.length > 0 && <section className="section relatedNewsSection"><div className="container"><div className="sectionHeading"><div><p className="eyebrow blue">{text.relatedEyebrow}</p><h2>{text.related}</h2></div><Link href="/news">{text.back.replace("← ", "")} →</Link></div><div className="newsDbGrid relatedGrid">{related.map((item) => <NewsCard key={item.id} article={item} locale={locale} />)}</div></div></section>}
  </main>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
