import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaff, isEditor } from "@/lib/editorial";
import type { NewsArticle } from "@/lib/types";

export const metadata = { title: "Новости — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

const validStatuses = new Set([
  "draft",
  "review",
  "published",
]);

export default async function AdminNewsPage({
  searchParams,
}: PageProps) {
  const { supabase, profile, userId } = await requireStaff();
  const params = await searchParams;
  const rawStatus = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const status = rawStatus && validStatuses.has(rawStatus)
    ? rawStatus
    : undefined;

  let query = supabase
    .from("news")
    .select(`
      id,title,slug,excerpt,content,cover_image_url,author_name,status,
      published_at,views,is_featured,category_id,created_by,submitted_at,
      published_by,editor_note,created_at,updated_at,
      category:news_categories(id,name,slug)
    `)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  const articles = (data ?? []) as unknown as NewsArticle[];
  const editor = isEditor(profile);

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • РЕДАКЦИЯ</p>
            <h1>Новости</h1>
            <p>
              {editor
                ? "Проверка, публикация и управление материалами."
                : "Твои черновики и материалы, отправленные редактору."}
            </p>
          </div>

          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">
              ← Админка
            </Link>
            <Link href="/admin/news/new" className="primaryButton">
              + Создать новость
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <nav className="adminFilters">
            <Filter href="/admin/news" active={!status}>
              Все
            </Filter>
            <Filter
              href="/admin/news?status=draft"
              active={status === "draft"}
            >
              Черновики
            </Filter>
            <Filter
              href="/admin/news?status=review"
              active={status === "review"}
            >
              На проверке
            </Filter>
            <Filter
              href="/admin/news?status=published"
              active={status === "published"}
            >
              Опубликованные
            </Filter>
          </nav>

          {error ? (
            <div className="adminEmpty">
              Ошибка загрузки: {error.message}
            </div>
          ) : articles.length === 0 ? (
            <div className="adminEmpty">
              В этом разделе пока нет материалов.
            </div>
          ) : (
            <div className="adminNewsList">
              {articles.map((article) => {
                const canEdit =
                  editor ||
                  (
                    profile.role === "author" &&
                    article.created_by === userId &&
                    article.status === "draft"
                  );

                return (
                  <article className="adminNewsRow" key={article.id}>
                    <div className="adminNewsThumb">
                      {article.cover_image_url ? (
                        <img src={article.cover_image_url} alt="" />
                      ) : (
                        <span>FCE</span>
                      )}
                    </div>

                    <div className="adminNewsMain">
                      <div className="adminNewsMeta">
                        <StatusBadge status={article.status} />
                        <span>
                          {article.category?.name ?? "Без категории"}
                        </span>
                        {article.is_featured && <span>★ Главная</span>}
                      </div>

                      <h2>{article.title}</h2>

                      <p>
                        Автор: {article.author_name || "FC Edineț"} ·{" "}
                        {article.updated_at
                          ? new Date(article.updated_at).toLocaleString("ru-RU")
                          : "—"}
                      </p>
                    </div>

                    <div className="adminNewsActions">
                      <Link
                        href={`/admin/news/${article.id}/edit`}
                        className="rowAction"
                      >
                        {canEdit ? "Редактировать" : "Открыть"}
                      </Link>

                      {article.status === "published" && (
                        <Link
                          href={`/news/${article.slug}`}
                          className="rowAction muted"
                        >
                          На сайте ↗
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Filter({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={active ? "active" : ""}>
      {children}
    </Link>
  );
}

function StatusBadge({
  status,
}: {
  status: NewsArticle["status"];
}) {
  const labels = {
    draft: "Черновик",
    review: "На проверке",
    published: "Опубликовано",
  };

  return (
    <span className={`statusPill status-${status}`}>
      {labels[status]}
    </span>
  );
}
