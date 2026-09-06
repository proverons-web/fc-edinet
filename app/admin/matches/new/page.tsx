import Link from "next/link";
import MatchEditorForm from "@/app/components/MatchEditorForm";
import { requireEditor } from "@/lib/editorial";
import type { ClubTeam, Competition } from "@/lib/types";

export const metadata = { title: "Новый матч — Админ" };
export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  const { supabase } = await requireEditor();

  const [{ data: teamsData }, { data: competitionsData }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("*")
        .eq("is_active", true)
        .order("is_club", { ascending: false })
        .order("name"),
      supabase
        .from("competitions")
        .select("*")
        .eq("is_active", true)
        .order("name"),
    ]);

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/matches" className="adminBack">← Все матчи</Link>
            <p className="eyebrow blue">НОВЫЙ МАТЧ</p>
            <h1>Добавить матч</h1>
          </div>
          <Link href="/admin/matches/teams" className="adminPreviewLink">
            Управление командами →
          </Link>
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container">
          <MatchEditorForm
            teams={(teamsData ?? []) as ClubTeam[]}
            competitions={(competitionsData ?? []) as Competition[]}
          />
        </div>
      </section>
    </main>
  );
}
