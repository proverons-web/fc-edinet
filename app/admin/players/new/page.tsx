import Link from "next/link";
import PlayerEditorForm from "@/app/components/PlayerEditorForm";
import { requireEditor } from "@/lib/editorial";

export const metadata = { title: "Новый игрок — Админ" };
export const dynamic = "force-dynamic";

export default async function NewPlayerPage() {
  await requireEditor();

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/players" className="adminBack">
              ← Все игроки
            </Link>
            <p className="eyebrow blue">НОВЫЙ ИГРОК</p>
            <h1>Добавить футболиста</h1>
          </div>
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container">
          <PlayerEditorForm />
        </div>
      </section>
    </main>
  );
}
