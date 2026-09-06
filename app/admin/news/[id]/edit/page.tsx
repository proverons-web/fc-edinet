import Link from "next/link";
import { notFound } from "next/navigation";
import NewsEditorForm from "@/app/components/NewsEditorForm";
import { deleteDraft } from "@/app/admin/news/actions";
import { requireStaff, isEditor } from "@/lib/editorial";
import type { NewsArticle, NewsCategory } from "@/lib/types";

export const metadata = { title: "Редактирование новости — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

export default async function EditNewsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const articleId = Number(id);

  if (!Number.isFinite(articleId)) notFound();

  const { supabase, profile, userId } = await requireStaff();

  const [{ data: articleData }, { data: categoryData }] =
    await Promise.all([
      supabase
        .from("news")
        .select(`
          id,title,slug,excerpt,content,cover_image_url,author_name,status,
          published_at,views,is_featured,category_id,created_by,submitted_at,
          published_by,editor_note,created_at,updated_at,
          category:news_categories(id,name,slug)
        `)
        .eq("id", articleId)
        .maybeSingle(),
      supabase
        .from("news_categories")
        .select("id,name,slug,display_order,is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
    ]);

  if (!articleData) notFound();

  const article = articleData as unknown as NewsArticle;
  const categories = (categoryData ?? []) as NewsCategory[];
  const editor = isEditor(profile);

  const canDelete =
    editor ||
    (
      profile.role === "author" &&
      article.created_by === userId &&
      article.status === "draft"
    );

  const saved = Array.isArray(queryParams.saved)
    ? queryParams.saved[0]
    : queryParams.saved;

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/news" className="adminBack">
              ← Все новости
            </Link>
            <p className="eyebrow blue">РЕДАКТОР НОВОСТИ</p>
            <h1>{article.title}</h1>
          </div>

          {article.status === "published" && (
            <Link
              href={`/news/${article.slug}`}
              className="adminPreviewLink"
            >
              Открыть на сайте ↗
            </Link>
          )}
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container">
          {saved === "1" && (
            <div className="saveNotice">Изменения сохранены.</div>
          )}

          <NewsEditorForm
            article={article}
            categories={categories}
            role={profile.role}
          />

          {canDelete && (
            <form action={deleteDraft} className="dangerZone">
              <input
                type="hidden"
                name="article_id"
                value={String(article.id)}
              />
              <div>
                <strong>Удаление материала</strong>
                <p>
                  Автор может удалить только собственный черновик.
                  Редактор и администратор — любой материал.
                </p>
              </div>
              <button type="submit">Удалить</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
