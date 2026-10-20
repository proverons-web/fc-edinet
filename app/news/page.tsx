import Link from "next/link";
import NewsCard, { formatNewsDate } from "@/app/components/NewsCard";
import PageHeroShell from "@/app/components/PageHeroShell";
import { createClient } from "@/lib/supabase/server";
import type { NewsArticle, NewsCategory, SitePageDesignSnapshot } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { localized, publicText, type Locale } from "@/lib/i18n";
import { getPublishedSitePageDesign, resolvePageHeroText } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";
import { newsCoverStyle } from "@/lib/news-cover";

export const dynamic = "force-dynamic";
type PageProps = { searchParams: Promise<{ category?: string | string[] }> };

export default async function NewsPage({ searchParams }: PageProps) {
  const locale = await getLocale();
  const text = publicText[locale].news;
  const params = await searchParams;
  const selectedSlug = Array.isArray(params.category) ? params.category[0] : params.category;
  const supabase = await createClient();

  const [{ data: categoryData }, design] = await Promise.all([
    supabase.from("news_categories").select("id,name,name_ro,slug,display_order,is_active").eq("is_active", true).order("display_order", { ascending: true }),
    getPublishedSitePageDesign(supabase, "news"),
  ]);
  const categories = (categoryData ?? []) as NewsCategory[];
  const selectedCategory = categories.find((item) => item.slug === selectedSlug);

  let query = supabase.from("news").select(`
      id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,cover_position_x,cover_position_y,cover_zoom,author_name,status,
      published_at,views,is_featured,category_id,
      category:news_categories(id,name,name_ro,slug)
    `).eq("status", "published").lte("published_at", new Date().toISOString())
    .order("is_featured", { ascending: false }).order("published_at", { ascending: false });

  if (selectedSlug && !selectedCategory) return renderInvalid(categories, selectedSlug, locale, design);
  if (selectedCategory) query = query.eq("category_id", selectedCategory.id);
  const { data, error } = await query;
  const articles = (data ?? []) as unknown as NewsArticle[];
  const hero = resolvePageHeroText(design, locale, { eyebrow: "FC EDINEȚ", title: text.title, description: text.description });

  const lead = articles[0];
  const secondary = articles.slice(1, 3);
  const rest = articles.slice(3);
  const archiveLabel = locale === "ro" ? "TOATE PUBLICAȚIILE" : "ВСЕ ПУБЛИКАЦИИ";
  const latestLabel = locale === "ro" ? "ULTIMELE ȘTIRI" : "ПОСЛЕДНИЕ НОВОСТИ";

  return <main>
    <PageHeroShell design={design} className="pageHero newsPageHero"><>{design.show_eyebrow && heroLayerVisible(design.layer_config,"eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{hero.eyebrow}</p>}{heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{hero.title}</h1>}{design.show_description && heroLayerVisible(design.layer_config,"description") && <p style={heroLayerStyle(design.layer_config,"description")}>{hero.description}</p>}</></PageHeroShell>

    <section className="newsEditorialSection"><div className="container">
      <CategoryFilters categories={categories} selectedSlug={selectedSlug} locale={locale} />
      {error ? <div className="archiveMessage">{text.loadError}: {error.message}</div>
      : articles.length === 0 ? <div className="archiveMessage">{text.empty}</div>
      : <>
          <div className="newsEditorialHeading"><div><span>{selectedCategory ? localized(selectedCategory.name, selectedCategory.name_ro, locale) : latestLabel}</span><h2>{selectedCategory ? localized(selectedCategory.name, selectedCategory.name_ro, locale) : text.title}</h2></div><strong>{String(articles.length).padStart(2,"0")}</strong></div>
          <div className="newsEditorialLeadGrid">
            {lead && <LeadStory article={lead} locale={locale} />}
            <div className="newsEditorialSecondary">{secondary.map((article) => <SecondaryStory key={article.id} article={article} locale={locale} />)}</div>
          </div>
          {rest.length > 0 && <div className="newsEditorialArchive">
            <div className="newsEditorialArchiveHead"><span>{archiveLabel}</span><i></i></div>
            <div className="newsDbGrid newsEditorialGrid">{rest.map((article) => <NewsCard key={article.id} article={article} locale={locale} />)}</div>
          </div>}
        </>}
    </div></section>
  </main>;
}

function LeadStory({ article, locale }: { article: NewsArticle; locale: Locale }) {
  const text = publicText[locale].news;
  const title = localized(article.title, article.title_ro, locale);
  const excerpt = localized(article.excerpt, article.excerpt_ro, locale);
  const category = localized(article.category?.name, article.category?.name_ro, locale) || text.defaultCategory;
  return <article className="newsLeadStory">
    <Link className="newsLeadMedia" href={`/news/${article.slug}`}>
      {article.cover_image_url ? <img className="newsCoverManaged" src={article.cover_image_url} alt={title} style={newsCoverStyle(article)} /> : <span>FC EDINEȚ</span>}
      <div className="newsLeadShade"></div>
      {article.is_featured && <b className="newsLeadFlag">{text.featured}</b>}
    </Link>
    <div className="newsLeadBody">
      <div className="newsLeadMeta"><span>{category}</span><time>{formatNewsDate(article.published_at, locale)}</time></div>
      <h2><Link href={`/news/${article.slug}`}>{title}</Link></h2>
      {excerpt && <p>{excerpt}</p>}
      <Link className="newsLeadRead" href={`/news/${article.slug}`}>{text.read}</Link>
    </div>
  </article>;
}

function SecondaryStory({ article, locale }: { article: NewsArticle; locale: Locale }) {
  const text = publicText[locale].news;
  const title = localized(article.title, article.title_ro, locale);
  const category = localized(article.category?.name, article.category?.name_ro, locale) || text.defaultCategory;
  return <article className="newsSecondaryStory">
    <Link className="newsSecondaryMedia" href={`/news/${article.slug}`}>
      {article.cover_image_url ? <img className="newsCoverManaged" src={article.cover_image_url} alt={title} style={newsCoverStyle(article)} /> : <span>FC EDINEȚ</span>}
    </Link>
    <div className="newsSecondaryBody"><div className="newsSecondaryMeta"><span>{category}</span><time>{formatNewsDate(article.published_at, locale)}</time></div><h3><Link href={`/news/${article.slug}`}>{title}</Link></h3><Link className="newsSecondaryRead" href={`/news/${article.slug}`}>{text.read}</Link></div>
  </article>;
}

function CategoryFilters({ categories, selectedSlug, locale }: { categories: NewsCategory[]; selectedSlug?: string; locale: Locale }) {
  const text = publicText[locale].news;
  return <nav className="newsFilters newsEditorialFilters" aria-label={text.categoriesAria}><Link className={!selectedSlug ? "active" : ""} href="/news">{text.all}</Link>{categories.map((category) => <Link key={category.id} className={selectedSlug === category.slug ? "active" : ""} href={`/news?category=${category.slug}`}>{localized(category.name, category.name_ro, locale)}</Link>)}</nav>;
}
function renderInvalid(categories: NewsCategory[], selectedSlug: string, locale: Locale, design: SitePageDesignSnapshot) {
  const text = publicText[locale].news;
  const hero = resolvePageHeroText(design, locale, { eyebrow: "FC EDINEȚ", title: text.title, description: text.description });
  return <main><PageHeroShell design={design} className="pageHero newsPageHero"><>{design.show_eyebrow && heroLayerVisible(design.layer_config,"eyebrow") && <p className="eyebrow" style={heroLayerStyle(design.layer_config,"eyebrow")}>{hero.eyebrow}</p>}{heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{hero.title}</h1>}{design.show_description && heroLayerVisible(design.layer_config,"description") && <p style={heroLayerStyle(design.layer_config,"description")}>{hero.description}</p>}</></PageHeroShell><section className="section newsEditorialSection"><div className="container"><CategoryFilters categories={categories} selectedSlug={selectedSlug} locale={locale}/><div className="archiveMessage">{text.invalidCategory}</div></div></section></main>;
}
