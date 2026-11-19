import Link from "next/link";
import PublicImage from "@/app/components/PublicImage";
import OnSiteEditorAction from "@/app/components/OnSiteEditorAction";
import type { NewsListArticle } from "@/lib/types";
import { dateLocale, localized, publicText, type Locale } from "@/lib/i18n";
import { newsCoverStyle } from "@/lib/news-cover";

export default function NewsCard({ article, locale = "ru", editHref }: { article: NewsListArticle; locale?: Locale; editHref?: string }) {
  const text = publicText[locale].news;
  const title = localized(article.title, article.title_ro, locale);
  const excerpt = localized(article.excerpt, article.excerpt_ro, locale);
  const category = localized(article.category?.name, article.category?.name_ro, locale) || text.defaultCategory;

  return (
    <article className="newsDbCard">
      <Link href={`/news/${article.slug}`} className="newsDbMedia">
        {article.cover_image_url ? (
          <PublicImage className="newsCoverManaged" src={article.cover_image_url} alt={title} style={newsCoverStyle(article)} width={700} height={460} sizes="(max-width: 767px) 100vw, (max-width: 1200px) 45vw, 360px" />
        ) : (
          <span>FC EDINEȚ</span>
        )}
        {article.is_featured && <b className="featuredPill">{text.featured}</b>}
      </Link>

      <div className="newsDbBody">
        <div className="newsMetaLine">
          <span>{category}</span>
          <time>{formatNewsDate(article.published_at, locale)}</time>
        </div>
        <h2><Link href={`/news/${article.slug}`}>{title}</Link></h2>
        {excerpt && <p>{excerpt}</p>}
        <Link className="readMore" href={`/news/${article.slug}`}>{text.read}</Link>
        {editHref && <OnSiteEditorAction href={editHref} locale={locale} label={locale === "ro" ? "Editează știrea" : "Редактировать новость"} className="fcSiteEditNewsAction" />}
      </div>
    </article>
  );
}

export function formatNewsDate(value: string | null, locale: Locale = "ru") {
  if (!value) return publicText[locale].news.noDate;
  return new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
