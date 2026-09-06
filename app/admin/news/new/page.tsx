import Link from "next/link";
import NewsEditorForm from "@/app/components/NewsEditorForm";
import { requireStaff } from "@/lib/editorial";
import type { NewsCategory } from "@/lib/types";

export const metadata = { title: "Новая новость — Админ" };
export const dynamic = "force-dynamic";

export default async function NewNewsPage() {
  const { supabase, profile } = await requireStaff();

  const { data } = await supabase
    .from("news_categories")
    .select("id,name,slug,display_order,is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const categories = (data ?? []) as NewsCategory[];

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/news" className="adminBack">
              ← Все новости
            </Link>
            <p className="eyebrow blue">НОВЫЙ МАТЕРИАЛ</p>
            <h1>Создать новость</h1>
          </div>
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container">
          <NewsEditorForm
            categories={categories}
            role={profile.role}
          />
        </div>
      </section>
    </main>
  );
}
