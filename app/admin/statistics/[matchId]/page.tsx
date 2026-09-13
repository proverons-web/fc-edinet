import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type { ClubMatch, Player, PlayerMatchStat, MatchStatisticsState, Season } from "@/lib/types";
import MatchStatisticsForm from "./MatchStatisticsForm";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Chisinau",
  }).format(new Date(value));
}

export default async function MatchStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ saved?: string | string[]; error?: string | string[] }>;
}) {
  const { supabase } = await requireEditor();
  const { matchId } = await params;
  const query = await searchParams;
  const saved = one(query.saved);
  const errorMessage = one(query.error);

  if (!/^\d+$/.test(matchId)) notFound();

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select(`
      id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,
      home_score,away_score,notes,created_at,updated_at,
      home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
      away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
      competition:competitions!matches_competition_id_fkey(id,name,slug,season,season_id,is_active)
    `)
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !matchData) notFound();
  const match = matchData as unknown as ClubMatch;

  const [playersResult, statsResult, stateResult] = await Promise.all([
    supabase
      .from("players")
      .select("id,first_name,last_name,shirt_number,position,photo_url,is_active,display_order")
      .order("is_active", { ascending: false })
      .order("display_order", { ascending: true })
      .order("shirt_number", { ascending: true }),
    supabase
      .from("player_match_stats")
      .select("*")
      .eq("match_id", matchId),
    supabase
      .from("match_statistics_status")
      .select("*")
      .eq("match_id", matchId)
      .maybeSingle(),
  ]);

  if (playersResult.error || statsResult.error || stateResult.error) {
    const message = playersResult.error?.message || statsResult.error?.message || stateResult.error?.message || "Не удалось загрузить данные.";
    return <StatisticsLoadError message={message} />;
  }

  const existing = (statsResult.data ?? []) as PlayerMatchStat[];
  const existingIds = new Set(existing.map((row) => String(row.player_id)));
  const players = ((playersResult.data ?? []) as Player[])
    .filter((player) => player.is_active || existingIds.has(String(player.id)))
    .map((player) => ({
      id: String(player.id),
      first_name: player.first_name,
      last_name: player.last_name,
      shirt_number: player.shirt_number,
      position: player.position,
      photo_url: player.photo_url,
      is_active: player.is_active,
    }));

  const state = stateResult.data as MatchStatisticsState | null;
  const currentStatus = state?.status ?? (existing.length > 0 ? "draft" : "empty");
  const seasonId = match.competition?.season_id;
  let season: Season | null = null;

  if (seasonId) {
    const { data } = await supabase
      .from("seasons")
      .select("id,name,slug,starts_on,ends_on,is_current,is_active")
      .eq("id", seasonId)
      .maybeSingle();
    season = (data as Season | null) ?? null;
  }

  return (
    <main className="adminPage statisticsAdminPage statisticsMatchEditorPage">
      <section className="adminHero compactAdminHero statisticsMatchHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • СТАТИСТИКА МАТЧА</p>
            <h1>{match.home?.name ?? "—"} {match.home_score ?? 0} : {match.away_score ?? 0} {match.away?.name ?? "—"}</h1>
            <p>
              {formatDateTime(match.kickoff)}
              {match.competition?.name ? ` • ${match.competition.name}` : ""}
              {season?.name ? ` • ${season.name}` : ""}
            </p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin/statistics" className="adminBack">← Статистика</Link>
            <Link href={`/admin/matches/${match.id}/edit`} className="rowAction muted">Открыть матч</Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container statisticsEntryContainer">
          {errorMessage && <div className="formError statisticsNotice">{errorMessage}</div>}
          {saved && (
            <div className="statisticsSuccess statisticsNotice">
              {saved === "complete"
                ? "Статистика сохранена и отмечена как готовая."
                : "Черновик статистики сохранён."}
            </div>
          )}

          {match.status !== "finished" ? (
            <section className="statisticsPanel">
              <div className="adminEmpty">
                Этот матч ещё не завершён. Ввод статистики станет доступен после установки статуса «Завершён».
              </div>
            </section>
          ) : players.length === 0 ? (
            <section className="statisticsPanel"><div className="adminEmpty">В составе пока нет игроков.</div></section>
          ) : (
            <>
              <section className="statisticsPanel statisticsEntryIntro">
                <div className="statisticsPanelHead">
                  <div>
                    <p className="eyebrow blue">v2.2.4 • ВВОД ПО МАТЧУ</p>
                    <h2>Кто играл и что сделал</h2>
                    <p>
                      Включи «Играл» только у участников матча. Базовые показатели всегда на виду, а расширенный набор автоматически меняется по позиции игрока.
                    </p>
                  </div>
                  <span className={`statisticsState ${currentStatus}`}>{currentStatus === "complete" ? "Готово" : currentStatus === "draft" ? "Черновик" : "Не заполнено"}</span>
                </div>
              </section>

              <MatchStatisticsForm
                matchId={matchId}
                players={players}
                existing={existing.map((row) => ({
                  player_id: row.player_id,
                  appearance: row.appearance,
                  position: row.position,
                  is_captain: row.is_captain,
                  minutes_played: row.minutes_played,
                  goals: row.goals,
                  assists: row.assists,
                  own_goals: row.own_goals,
                  penalties_scored: row.penalties_scored,
                  penalties_missed: row.penalties_missed,
                  yellow_cards: row.yellow_cards,
                  red_cards: row.red_cards,
                  goals_conceded: row.goals_conceded,
                  saves: row.saves,
                  clean_sheet: row.clean_sheet,
                  penalties_saved: row.penalties_saved,
                  shots: row.shots,
                  shots_on_target: row.shots_on_target,
                  passes_attempted: row.passes_attempted,
                  passes_completed: row.passes_completed,
                  key_passes: row.key_passes,
                  tackles_won: row.tackles_won,
                  interceptions: row.interceptions,
                  clearances: row.clearances,
                  blocks: row.blocks,
                  fouls_committed: row.fouls_committed,
                  fouls_won: row.fouls_won,
                  notes: row.notes,
                }))}
                currentStatus={currentStatus}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function StatisticsLoadError({ message }: { message: string }) {
  return (
    <main className="adminPage statisticsAdminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div><p className="eyebrow">FC EDINEȚ • СТАТИСТИКА</p><h1>Не удалось открыть матч</h1></div>
          <Link href="/admin/statistics" className="adminBack">← Статистика</Link>
        </div>
      </section>
      <section className="section adminSurface"><div className="container"><div className="formError">{message}</div></div></section>
    </main>
  );
}
