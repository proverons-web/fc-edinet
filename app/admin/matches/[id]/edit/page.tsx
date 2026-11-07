import Link from "next/link";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { notFound } from "next/navigation";
import MatchEditorForm from "@/app/components/MatchEditorForm";
import { deleteMatch } from "@/app/admin/matches/actions";
import { requireEditor } from "@/lib/editorial";
import type { ClubMatch, ClubTeam, Competition } from "@/lib/types";
import { scheduleHistorySelect, type ScheduleHistoryItem } from "@/lib/match-schedule";
import "./match-schedule-editor.css";

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
    { data: scheduleHistoryData },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(`
        id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
        home_score,away_score,extra_time_played,home_penalties,away_penalties,notes,original_kickoff,schedule_reason_ru,schedule_reason_ro,created_at,updated_at,
        home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
        away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
        competition:competitions!matches_competition_id_fkey(id,name,slug,season,is_active)
      `)
      .eq("id", matchId)
      .maybeSingle(),
    supabase.from("teams").select("*").order("is_club", { ascending: false }).order("name"),
    supabase.from("competitions").select("*").order("name"),
    supabase.from("match_schedule_history").select(scheduleHistorySelect)
      .eq("match_id",matchId).order("changed_at",{ascending:false}).limit(20),
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

          {(scheduleHistoryData?.length ?? 0) > 0 && (
            <section className="scheduleHistoryAdmin" aria-label="История изменений расписания">
              <h2>История переносов и изменений даты</h2>
              <p>Записи создаются автоматически при сохранении матча и не редактируются вручную.</p>
              <ol>
                {(scheduleHistoryData as ScheduleHistoryItem[]).map((entry) => (
                  <li key={String(entry.id)}>
                    <strong>{entry.previous_status || "Создан"} → {entry.new_status}</strong>
                    <span>{entry.previous_kickoff ? new Date(entry.previous_kickoff).toLocaleString("ru-RU",{timeZone:"Europe/Chisinau"}) : "—"} → {new Date(entry.new_kickoff).toLocaleString("ru-RU",{timeZone:"Europe/Chisinau"})}</span>
                    {entry.reason_ru || entry.reason_ro ? <p>{entry.reason_ru || entry.reason_ro}</p> : null}
                    <small>{new Date(entry.changed_at).toLocaleString("ru-RU",{timeZone:"Europe/Chisinau"})}</small>
                  </li>
                ))}
              </ol>
            </section>
          )}

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
