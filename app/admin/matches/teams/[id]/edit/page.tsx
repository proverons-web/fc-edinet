import Link from "next/link";
import { notFound } from "next/navigation";
import TeamEditorForm from "@/app/components/TeamEditorForm";
import { requireEditor } from "@/lib/editorial";
import type { ClubTeam } from "@/lib/types";

export const metadata = { title: "Редактирование команды — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

export default async function EditTeamPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const teamId = id.trim();

  if (!teamId) notFound();

  const { supabase } = await requireEditor();

  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (!data) notFound();

  const team = data as ClubTeam;
  const saved = Array.isArray(queryParams.saved)
    ? queryParams.saved[0]
    : queryParams.saved;

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/matches/teams" className="adminBack">
              ← Команды
            </Link>
            <p className="eyebrow blue">РЕДАКТИРОВАНИЕ КОМАНДЫ</p>
            <h1>{team.name}</h1>
          </div>
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container">
          {saved === "1" && (
            <div className="saveNotice">Изменения сохранены.</div>
          )}

          <TeamEditorForm team={team} />
        </div>
      </section>
    </main>
  );
}
