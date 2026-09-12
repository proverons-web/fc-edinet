import Link from "next/link";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { notFound } from "next/navigation";
import MatchEditorForm from "@/app/components/MatchEditorForm";
import { deleteMatch } from "@/app/admin/matches/actions";
import { requireEditor } from "@/lib/editorial";
import type { ClubMatch, ClubTeam, Competition } from "@/lib/types";

export const metadata = { title: "Редактирование матча — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

export default async function EditMatchPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const matchId = id.trim();
  if (!matchId) notFound();

  const { supabase, profile } = await requireEditor();

  const [
    { data: matchData },
    { data: teamsData },
    { data: competitionsData },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(`
        id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
        home_score,away_score,notes,created_at,updated_at,
        home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
        away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
        competition:competitions!matches_competition_id_fkey(id,name,slug,season,is_active)
      `)
      .eq("id", matchId)
      .maybeSingle(),
    supabase.from("teams").select("*").order("is_club", { ascending: false }).order("name"),
    supabase.from("competitions").select("*").order("name"),
  ]);

  if (!matchData) notFound();

  const saved = Array.isArray(queryParams.saved)
    ? queryParams.saved[0]
    : queryParams.saved;

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/matches" className="adminBack">← Все матчи</Link>
            <p className="eyebrow blue">РЕДАКТИРОВАНИЕ</p>
            <h1>
              {(matchData as any).home?.name ?? "Матч"} —{" "}
              {(matchData as any).away?.name ?? ""}
            </h1>
          </div>
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container">
          {saved === "1" && (
            <div className="saveNotice">Изменения сохранены.</div>
          )}

          <MatchEditorForm
            match={matchData as unknown as ClubMatch}
            teams={(teamsData ?? []) as ClubTeam[]}
            competitions={(competitionsData ?? []) as Competition[]}
          />

          {profile.role === "admin" && (
            <form action={deleteMatch} className="dangerZone">
              <input type="hidden" name="match_id" value={String(matchData.id)} />
              <div>
                <strong>Удаление матча</strong>
                <p>
                  Используй только для ошибочно созданных записей.
                  Завершённые матчи лучше сохранять для истории.
                </p>
              </div>
              <ConfirmSubmitButton confirmMessage="Удалить матч? Это действие нельзя отменить.">Удалить матч</ConfirmSubmitButton>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
