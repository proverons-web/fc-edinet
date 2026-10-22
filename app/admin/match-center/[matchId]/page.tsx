import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import { secondYellowEventIds } from "@/lib/match-discipline";
import type {
  ClubMatch,
  MatchCenterProgress,
  MatchEvent,
  MatchEventType,
  MatchLineupEntry,
  MatchLineupSetting,
  MatchReport,
  MatchTeamStatistic,
  Player,
} from "@/lib/types";
import {
  createMatchEvent,
  deleteMatchEvent,
  publishMatchProtocol,
  saveMatchBasics,
  saveMatchReportFoundation,
  unpublishMatchProtocol,
  updateMatchEvent,
} from "./actions";
import LineupEditor from "./LineupEditor";
import ClubSquadStatsEditor from "./ClubSquadStatsEditor";
import EventFields, { type EventParticipantOption } from "./EventFields";
import SelectOnFocus from "./SelectOnFocus";
import MatchCenterFeedback from "./MatchCenterFeedback";
import MatchCenterSubmitButton from "./MatchCenterSubmitButton";
import MatchTeamStatsEditor from "./MatchTeamStatsEditor";

export const metadata = { title: "Матч-центр — Админ" };
export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: "Гол",
  own_goal: "Автогол",
  penalty_goal: "Гол с пенальти",
  penalty_miss: "Пенальти не реализован",
  yellow_card: "Жёлтая карточка",
  red_card: "Красная карточка",
  substitution: "Замена",
  var: "VAR",
  injury: "Травма",
  other: "Другое",
};

const EVENT_ICONS: Record<MatchEventType, string> = {
  goal: "⚽",
  own_goal: "⚽",
  penalty_goal: "⚽",
  penalty_miss: "✕",
  yellow_card: "▰",
  red_card: "■",
  substitution: "↔",
  var: "VAR",
  injury: "+",
  other: "•",
};

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

function stateLabel(value: string) {
  if (value === "complete") return "Готово";
  if (value === "draft") return "Черновик";
  return "Не заполнено";
}

function eventMinute(event: MatchEvent) {
  return `${event.minute}${event.stoppage_minute > 0 ? `+${event.stoppage_minute}` : ""}′`;
}

function eventParticipant(event: MatchEvent) {
  if (event.event_type === "substitution") {
    return `${event.player_name || "Игрок ушёл"} → ${event.related_player_name || "Игрок вышел"}`;
  }
  return event.player_name || event.description || "Без игрока";
}

function countsAsGoal(event: MatchEvent) {
  return event.event_type === "goal" || event.event_type === "penalty_goal" || event.event_type === "own_goal";
}

function scoringTeamId(event: MatchEvent, match: ClubMatch) {
  const eventTeamId = String(event.team_id);
  if (event.event_type !== "own_goal") return eventTeamId;
  return eventTeamId === String(match.home_team_id) ? String(match.away_team_id) : String(match.home_team_id);
}

function runningScoreByEvent(events: MatchEvent[], match: ClubMatch) {
  let home = 0;
  let away = 0;
  const result = new Map<string, { home: number; away: number }>();
  for (const event of events) {
    if (!countsAsGoal(event)) continue;
    const scoringTeam = scoringTeamId(event, match);
    if (scoringTeam === String(match.home_team_id)) home += 1;
    if (scoringTeam === String(match.away_team_id)) away += 1;
    result.set(String(event.id), { home, away });
  }
  return result;
}

export default async function MatchCenterMatchPage({
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
  const savedMessages: Record<string, string> = {
    basics: "Основные данные матча сохранены.",
    report: "Отчёт и MVP сохранены.",
    event: "Событие добавлено в таймлайн.",
    "event-updated": "Событие изменено.",
    "event-deleted": "Событие удалено.",
    "lineup-home": "Состав хозяев сохранён.",
    "lineup-away": "Состав гостей сохранён.",
    "lineup-imported": "Состав FC Edineț импортирован из статистики игроков.",
    "squad-draft": "Состав и статистика FC Edineț сохранены как черновик.",
    "squad-complete": "Состав и статистика FC Edineț сохранены. Сезонные итоги обновлены автоматически.",
    "team-stats": "Командная статистика сохранена.",
    published: "Публичный протокол матча опубликован.",
    unpublished: "Публичный протокол снят с публикации.",
  };
  const feedbackMessage = errorMessage || (saved ? savedMessages[saved] : null) || null;
  const feedbackTone = errorMessage ? "error" as const : saved === "unpublished" ? "info" as const : "success" as const;

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

  const [reportResult, progressResult, playersResult, eventsResult, lineupSettingsResult, lineupEntriesResult, playerStatsResult, teamStatsResult] = await Promise.all([
    supabase.from("match_reports").select("*").eq("match_id", matchId).maybeSingle(),
    supabase
      .from("match_center_progress")
      .select("*")
      .eq("match_id", matchId)
      .maybeSingle(),
    supabase
      .from("players")
      .select("id,first_name,last_name,slug,shirt_number,position,photo_url,is_active")
      .order("is_active", { ascending: false })
      .order("last_name"),
    supabase
      .from("match_events")
      .select("*")
      .eq("match_id", matchId)
      .order("minute", { ascending: true })
      .order("stoppage_minute", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("match_lineup_settings")
      .select("*")
      .eq("match_id", matchId)
      .order("side"),
    supabase
      .from("match_lineup_entries")
      .select("*")
      .eq("match_id", matchId)
      .order("side")
      .order("lineup_role")
      .order("slot_number"),
    supabase
      .from("player_match_stats")
      .select("player_id,appearance,position,is_captain,minutes_played,goals,assists,yellow_cards,red_cards")
      .eq("match_id", matchId),
    supabase
      .from("match_team_statistics")
      .select("*")
      .eq("match_id", matchId)
      .order("side"),
  ]);

  const loadError =
    reportResult.error || progressResult.error || playersResult.error || eventsResult.error || lineupSettingsResult.error || lineupEntriesResult.error || playerStatsResult.error || teamStatsResult.error;
  if (loadError) {
    return <MatchCenterMigrationRequired message={loadError.message} />;
  }

  const report = (reportResult.data as MatchReport | null) ?? null;
  const progress = (progressResult.data as MatchCenterProgress | null) ?? null;
  const players = (playersResult.data ?? []) as Player[];
  const events = (eventsResult.data ?? []) as MatchEvent[];
  const lineupSettings = (lineupSettingsResult.data ?? []) as MatchLineupSetting[];
  const lineupEntries = (lineupEntriesResult.data ?? []) as MatchLineupEntry[];
  const teamStats = (teamStatsResult.data ?? []) as MatchTeamStatistic[];
  const homeTeamStats = teamStats.find((row) => row.side === "home") ?? null;
  const awayTeamStats = teamStats.find((row) => row.side === "away") ?? null;
  const teamStatsFilled = teamStats.some((row) =>
    row.possession_percent != null ||
    row.shots != null ||
    row.shots_on_target != null ||
    row.corners != null ||
    row.fouls != null ||
    row.offsides != null ||
    row.passes_attempted != null ||
    row.passes_completed != null ||
    row.saves != null ||
    row.expected_goals != null
  );

  const playerStats = (playerStatsResult.data ?? []) as Array<{
    player_id: string | number;
    appearance: "starter" | "substitute";
    position: string | null;
    is_captain: boolean;
    minutes_played: number;
    goals: number;
    assists: number;
    yellow_cards: number;
    red_cards: number;
  }>;
  const clubSide: "home" | "away" | null = match.home?.is_club ? "home" : match.away?.is_club ? "away" : null;
  const opponentSide: "home" | "away" = clubSide === "home" ? "away" : "home";
  const clubLineupEntries = clubSide ? lineupEntries.filter((row) => row.side === clubSide) : [];
  const clubLineupSetting = clubSide ? lineupSettings.find((row) => row.side === clubSide) ?? null : null;
  const playerParticipants: EventParticipantOption[] = lineupEntries
    .filter((entry) => Boolean(entry.player_name))
    .map((entry) => ({
      teamId: String(entry.team_id),
      ref: entry.player_id ? `db:${entry.player_id}` : `manual:${entry.player_name}`,
      label: `${entry.shirt_number != null ? `#${entry.shirt_number} · ` : ""}${entry.player_name}${entry.lineup_role === "substitute" ? " · запас" : ""}`,
      kind: "player" as const,
    }));
  const coachParticipants: EventParticipantOption[] = lineupSettings
    .filter((setting) => Boolean(setting.coach_name?.trim()))
    .map((setting) => {
      const coachLabel = `Тренер · ${setting.coach_name!.trim()}`;
      return {
        teamId: String(setting.team_id),
        ref: `manual:${coachLabel}`,
        label: `${setting.coach_name!.trim()} · ТРЕНЕР`,
        kind: "coach" as const,
      };
    });
  const eventParticipants: EventParticipantOption[] = [...playerParticipants, ...coachParticipants]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.teamId === item.teamId && candidate.ref === item.ref) === index);
  const reportHasMetadata = Boolean(progress?.report_has_metadata);

  const homeGoalsFromTimeline = events.filter(
    (event) => countsAsGoal(event) && scoringTeamId(event, match) === String(match.home_team_id),
  ).length;
  const awayGoalsFromTimeline = events.filter(
    (event) => countsAsGoal(event) && scoringTeamId(event, match) === String(match.away_team_id),
  ).length;
  const scoreAfterEvent = runningScoreByEvent(events, match);
  const secondYellowIds = secondYellowEventIds(events);
  const scoreCanBeChecked = match.status === "finished" || match.status === "live";
  const timelineMatchesScore =
    !scoreCanBeChecked ||
    (homeGoalsFromTimeline === (match.home_score ?? 0) && awayGoalsFromTimeline === (match.away_score ?? 0));
  const firstHalfEvents = events.filter((event) => Number(event.minute ?? 0) <= 45);
  const secondHalfEvents = events.filter((event) => Number(event.minute ?? 0) > 45);

  const homeStarters = progress?.home_starters ?? lineupEntries.filter((row) => row.side === "home" && row.lineup_role === "starter").length;
  const awayStarters = progress?.away_starters ?? lineupEntries.filter((row) => row.side === "away" && row.lineup_role === "starter").length;
  const lineupsReady = homeStarters === 11 && awayStarters === 11;
  const playerStatsReady = progress?.player_stats_status === "complete";
  const reportReady = reportHasMetadata;
  const publicationReady = match.status === "finished" && timelineMatchesScore;
  const openEvents = Boolean(saved?.startsWith("event"));
  const openTeamStats = saved === "team-stats";
  const openReport = saved === "report";
  const openPublish = saved === "published" || saved === "unpublished";

  return (
    <SelectOnFocus>
      <MatchCenterFeedback matchId={String(match.id)} message={feedbackMessage} tone={feedbackTone} />
      <main className="adminPage matchCenterPage mc26Page">
        <section className="adminHero compactAdminHero matchCenterHero mc26Hero">
          <div className="container adminHeroInner">
            <div>
              <p className="eyebrow">FC EDINEȚ • MATCH CENTER 2.0</p>
              <h1>
                {match.home?.name ?? "—"}{" "}
                <b>{match.status === "finished" || match.status === "live" ? `${match.home_score ?? 0} : ${match.away_score ?? 0}` : "VS"}</b>{" "}
                {match.away?.name ?? "—"}
              </h1>
              <p>
                {formatDateTime(match.kickoff)}
                {match.competition?.name ? ` • ${match.competition.name}` : ""}
                {match.round ? ` • ${match.round}` : ""}
              </p>
            </div>
            <div className="adminHeroActions">
              <Link href="/admin/match-center" className="adminBack">← Все матчи</Link>
              <Link href={`/matches/${match.id}`} className="rowAction muted" target="_blank">Публичная страница ↗</Link>
            </div>
          </div>
        </section>

        <section className="section adminSurface mc26Surface">
          <div className="container matchCenterContainer mc26Container">
            {!timelineMatchesScore && (
              <div className="matchCenterTimelineWarning">
                <strong>Таймлайн пока не совпадает со счётом.</strong>
                <span>По событиям: {homeGoalsFromTimeline}:{awayGoalsFromTimeline}. В матче: {match.home_score ?? 0}:{match.away_score ?? 0}. Перед публикацией добавь недостающие голы или исправь счёт.</span>
              </div>
            )}

            <section className="mc26StatusBoard" aria-label="Состояние матча">
              <ProgressCard label="Матч" value={match.status === "finished" ? "Завершён" : match.status === "live" ? "Идёт" : match.status === "scheduled" ? "Запланирован" : match.status === "postponed" ? "Перенесён" : "Отменён"} tone={match.status === "finished" ? "ready" : "draft"} detail={`${match.home_score ?? "—"}:${match.away_score ?? "—"}`} />
              <ProgressCard label="Составы" value={`${homeStarters}/11 • ${awayStarters}/11`} tone={lineupsReady ? "ready" : lineupEntries.length > 0 ? "draft" : "empty"} detail="HOME • AWAY" />
              <ProgressCard label="События" value={String(events.length)} tone={events.length > 0 && timelineMatchesScore ? "ready" : events.length > 0 ? "draft" : "empty"} detail={timelineMatchesScore ? "Голы сверены" : "Проверь голы"} />
              <ProgressCard label="Игроки FC Edineț" value={stateLabel(progress?.player_stats_status ?? "empty")} tone={playerStatsReady ? "ready" : progress?.player_stats_status === "draft" ? "draft" : "empty"} detail={`${playerStats.length} записей`} />
              <ProgressCard label="Статистика команд" value={teamStatsFilled ? "Заполнена" : "Пусто"} tone={teamStatsFilled ? "ready" : "empty"} detail="Только реальные показатели" />
              <ProgressCard label="Протокол" value={report?.is_published ? "Опубликован" : reportReady ? "Черновик" : "Пусто"} tone={report?.is_published ? "ready" : reportReady ? "draft" : "empty"} detail={publicationReady ? "Можно публиковать" : "Есть незавершённые шаги"} />
            </section>

            <nav className="mc26WorkbenchNav" aria-label="Этапы матч-центра">
              <a href="#basics"><span>1</span>Основное</a>
              <a href="#lineups"><span>2</span>Составы</a>
              <a href="#events"><span>3</span>События</a>
              <a href="#team-stats"><span>4</span>Статистика</a>
              <a href="#report"><span>5</span>Отчёт и MVP</a>
              <a href="#publish"><span>6</span>Публикация</a>
            </nav>

            <details className="mc26WorkSection" id="basics" open>
              <summary><SectionSummary number="01" title="Основное" subtitle="Статус, счёт и базовые данные матча" state={match.status === "finished" ? "Готово" : "В работе"} tone={match.status === "finished" ? "ready" : "draft"} /></summary>
              <div className="mc26WorkBody">
                <form action={saveMatchBasics} className="statisticsPanel mc26BasicsForm">
                  <input type="hidden" name="match_id" value={String(match.id)} />
                  <div className="statisticsPanelHead mc26PanelHead">
                    <div>
                      <p className="eyebrow blue">КАРТОЧКА МАТЧА</p>
                      <h2>{match.home?.name ?? "—"} — {match.away?.name ?? "—"}</h2>
                      <p>{formatDateTime(match.kickoff)} • {match.competition?.name ?? "Турнир не указан"}</p>
                    </div>
                    <Link href={`/admin/matches/${match.id}/edit`} className="rowAction muted">Дата / команды / турнир →</Link>
                  </div>
                  <div className="mc26BasicsGrid">
                    <label className="fieldGroup"><span>Статус</span><select name="status" defaultValue={match.status}><option value="scheduled">Запланирован</option><option value="live">Идёт</option><option value="finished">Завершён</option><option value="postponed">Перенесён</option><option value="cancelled">Отменён</option></select></label>
                    <label className="fieldGroup"><span>Счёт хозяев</span><input name="home_score" type="number" min={0} max={99} defaultValue={match.home_score ?? ""} placeholder="—" /></label>
                    <label className="fieldGroup"><span>Счёт гостей</span><input name="away_score" type="number" min={0} max={99} defaultValue={match.away_score ?? ""} placeholder="—" /></label>
                    <label className="fieldGroup"><span>Тур / этап</span><input name="round" defaultValue={match.round ?? ""} maxLength={120} placeholder="Например, Тур 12" /></label>
                    <label className="fieldGroup mc26Span2"><span>Стадион</span><input name="stadium" defaultValue={match.stadium ?? ""} maxLength={180} /></label>
                    <label className="fieldGroup mc26Span2"><span>Внутренняя заметка</span><textarea name="notes" rows={3} maxLength={2000} defaultValue={match.notes ?? ""} placeholder="Необязательно" /></label>
                  </div>
                  <div className="mc26SectionSaveBar"><p>Дата, команды и соревнование меняются в расширенной карточке матча, чтобы случайно не нарушить уже введённый протокол.</p><MatchCenterSubmitButton className="primaryButton" pendingText="Сохранение…">Сохранить основное</MatchCenterSubmitButton></div>
                </form>
              </div>
            </details>

            <details className="mc26WorkSection" id="lineups" open>
              <summary><SectionSummary number="02" title="Составы" subtitle="Старт, запас, капитан, тренер и статистика игроков FC Edineț" state={lineupsReady ? "11 + 11" : `${homeStarters}/11 • ${awayStarters}/11`} tone={lineupsReady ? "ready" : lineupEntries.length ? "draft" : "empty"} /></summary>
              <div className="mc26WorkBody">
                <div className={`matchCenterLineupsGrid club-${clubSide ?? "none"}`}>
                  {clubSide === "home" ? (
                    <>
                      <ClubSquadStatsEditor matchId={String(match.id)} players={players} entries={clubLineupEntries} stats={playerStats} formation={clubLineupSetting?.formation ?? null} coachName={clubLineupSetting?.coach_name ?? null} currentStatus={(progress?.player_stats_status ?? "empty") as "empty" | "draft" | "complete"} teamName={match.home?.name ?? "FC Edineț"} sideLabel="ХОЗЯЕВА" />
                      <LineupEditor match={match} players={players} settings={lineupSettings} entries={lineupEntries} events={events} onlySide="away" />
                    </>
                  ) : clubSide === "away" ? (
                    <>
                      <LineupEditor match={match} players={players} settings={lineupSettings} entries={lineupEntries} events={events} onlySide="home" />
                      <ClubSquadStatsEditor matchId={String(match.id)} players={players} entries={clubLineupEntries} stats={playerStats} formation={clubLineupSetting?.formation ?? null} coachName={clubLineupSetting?.coach_name ?? null} currentStatus={(progress?.player_stats_status ?? "empty") as "empty" | "draft" | "complete"} teamName={match.away?.name ?? "FC Edineț"} sideLabel="ГОСТИ" />
                    </>
                  ) : <div className="formError matchCenterNotice">Не удалось определить сторону FC Edineț в этом матче.</div>}
                </div>
              </div>
            </details>

            <details className="mc26WorkSection" id="events" open={openEvents}>
              <summary><SectionSummary number="03" title="События" subtitle="Голы, карточки, замены и таймлайн" state={`${events.length} событий`} tone={events.length > 0 && timelineMatchesScore ? "ready" : events.length ? "draft" : "empty"} /></summary>
              <div className="mc26WorkBody mc26EventsBody">
                <section className="statisticsPanel matchEventEditor">
                  <div className="statisticsPanelHead"><div><p className="eyebrow blue">НОВОЕ СОБЫТИЕ</p><h2>Добавить эпизод</h2><p>Игроки выбираются из сохранённых составов. Голы, карточки и замены автоматически синхронизируют статистику FC Edineț.</p></div><span className="matchCenterVersionBadge">{events.length}</span></div>
                  <form action={createMatchEvent} className="matchEventForm">
                    <input type="hidden" name="match_id" value={String(match.id)} />
                    <EventFields homeTeamId={String(match.home_team_id)} awayTeamId={String(match.away_team_id)} homeTeamName={match.home?.name ?? "Хозяева"} awayTeamName={match.away?.name ?? "Гости"} participants={eventParticipants} defaults={{ event_type: "goal", minute: 0, stoppage_minute: 0, sort_order: 0 }} />
                    <div className="matchEventFormFooter"><p>Для автогола выбирай команду игрока, забившего в свои ворота. Система сама засчитает мяч сопернику.</p><MatchCenterSubmitButton className="primaryButton" pendingText="Добавление…">+ Добавить событие</MatchCenterSubmitButton></div>
                  </form>
                </section>
                <section className="statisticsPanel matchTimelinePanel">
                  <div className="statisticsPanelHead"><div><p className="eyebrow blue">ТАЙМЛАЙН</p><h2>Ход матча</h2><p>События автоматически сортируются по минуте.</p></div>{scoreCanBeChecked && <span className={`statisticsState ${timelineMatchesScore ? "complete" : "draft"}`}>Голы {homeGoalsFromTimeline}:{awayGoalsFromTimeline} / счёт {match.home_score ?? 0}:{match.away_score ?? 0}</span>}</div>
                  {events.length === 0 ? <div className="adminEmpty">Событий пока нет.</div> : <div className="matchTimelineHalves"><TimelineHalf title="1 тайм" range="0–45+" events={firstHalfEvents} match={match} clubSide={clubSide} participants={eventParticipants} scoreAfterEvent={scoreAfterEvent} secondYellowIds={secondYellowIds} /><TimelineHalf title="2 тайм" range="46–90+" events={secondHalfEvents} match={match} clubSide={clubSide} participants={eventParticipants} scoreAfterEvent={scoreAfterEvent} secondYellowIds={secondYellowIds} /></div>}
                </section>
              </div>
            </details>

            <details className="mc26WorkSection" id="team-stats" open={openTeamStats}>
              <summary><SectionSummary number="04" title="Статистика команд" subtitle="Только известные показатели хозяев и гостей" state={teamStatsFilled ? "Заполнена" : "Не заполнена"} tone={teamStatsFilled ? "ready" : "empty"} /></summary>
              <div className="mc26WorkBody"><section className="statisticsPanel"><div className="statisticsPanelHead"><div><p className="eyebrow blue">КОМАНДНАЯ СТАТИСТИКА</p><h2>Хозяева и гости</h2><p>Заполняй только показатели, которые действительно известны. Пустые поля публично не показываются.</p></div></div><MatchTeamStatsEditor match={match} home={homeTeamStats} away={awayTeamStats} /></section></div>
            </details>

            <details className="mc26WorkSection" id="report" open={openReport}>
              <summary><SectionSummary number="05" title="Отчёт и MVP" subtitle="Судья, посещаемость, условия, лучший игрок и текст отчёта" state={reportHasMetadata ? "Сохранён" : "Пусто"} tone={reportHasMetadata ? "ready" : "empty"} /></summary>
              <div className="mc26WorkBody">
                <form action={saveMatchReportFoundation} className="statisticsPanel matchCenterForm mc26ReportForm">
                  <input type="hidden" name="match_id" value={String(match.id)} />
                  <div className="statisticsPanelHead"><div><p className="eyebrow blue">ОТЧЁТ МАТЧА</p><h2>Данные для публичного протокола</h2><p>Эти поля необязательны и могут заполняться постепенно.</p></div><span className={`statisticsState ${reportHasMetadata ? "complete" : "empty"}`}>{reportHasMetadata ? "Сохранено" : "Пусто"}</span></div>
                  <div className="matchCenterFieldGrid">
                    <label className="fieldGroup"><span>Главный судья</span><input name="referee" defaultValue={report?.referee ?? ""} maxLength={160} placeholder="Имя судьи" /></label>
                    <label className="fieldGroup"><span>Посещаемость</span><input name="attendance" type="number" min={0} max={200000} step={1} defaultValue={report?.attendance ?? ""} placeholder="Например, 1250" /></label>
                    <label className="fieldGroup"><span>Погода</span><input name="weather" defaultValue={report?.weather ?? ""} maxLength={120} placeholder="Например, +18°C, облачно" /></label>
                    <label className="fieldGroup"><span>Состояние поля</span><input name="pitch_condition" defaultValue={report?.pitch_condition ?? ""} maxLength={120} placeholder="Хорошее / влажное / тяжёлое" /></label>
                    <label className="fieldGroup matchCenterWideField"><span>Лучший игрок матча</span><select name="man_of_match_player_id" defaultValue={report?.man_of_match_player_id ?? ""}><option value="">Не выбран</option>{players.map((player) => <option key={player.id} value={String(player.id)}>{player.shirt_number != null ? `#${player.shirt_number} ` : ""}{player.first_name} {player.last_name}{!player.is_active ? " · архив" : ""}</option>)}</select></label>
                    <label className="fieldGroup matchCenterWideField"><span>Краткий отчёт</span><textarea name="summary" rows={8} maxLength={5000} defaultValue={report?.summary ?? ""} placeholder="Кратко опиши ход матча." /></label>
                  </div>
                  <div className="mc26SectionSaveBar"><p>Матчи, старты, минуты, голы и карточки игроков FC Edineț считаются автоматически из состава и событий.</p><MatchCenterSubmitButton className="primaryButton" pendingText="Сохранение…">Сохранить отчёт</MatchCenterSubmitButton></div>
                </form>
              </div>
            </details>

            <details className="mc26WorkSection mc26PublishSection" id="publish" open={openPublish || Boolean(report?.is_published)}>
              <summary><SectionSummary number="06" title="Публикация" subtitle="Финальная проверка и публичный протокол" state={report?.is_published ? "Опубликован" : publicationReady ? "Готов к публикации" : "Не готов"} tone={report?.is_published ? "ready" : publicationReady ? "draft" : "empty"} /></summary>
              <div className="mc26WorkBody">
                <section className="statisticsPanel mc26PublishPanel">
                  <div className="statisticsPanelHead"><div><p className="eyebrow blue">ФИНАЛЬНЫЙ ШАГ</p><h2>{report?.is_published ? "Протокол опубликован" : "Проверка перед публикацией"}</h2><p>Публичная страница показывает только реальные заполненные данные.</p></div></div>
                  <div className="mc26ReadinessGrid">
                    <ReadinessItem label="Матч завершён" ready={match.status === "finished"} value={match.status === "finished" ? "Да" : "Нет"} />
                    <ReadinessItem label="Голы совпадают со счётом" ready={timelineMatchesScore} value={`${homeGoalsFromTimeline}:${awayGoalsFromTimeline}`} />
                    <ReadinessItem label="Составы 11 + 11" ready={lineupsReady} value={`${homeStarters} + ${awayStarters}`} />
                    <ReadinessItem label="Статистика FC Edineț" ready={playerStatsReady} value={stateLabel(progress?.player_stats_status ?? "empty")} optional />
                    <ReadinessItem label="Командная статистика" ready={teamStatsFilled} value={teamStatsFilled ? "Есть" : "Нет"} optional />
                    <ReadinessItem label="Отчёт / MVP" ready={reportReady} value={reportReady ? "Есть" : "Нет"} optional />
                  </div>
                  <div className="mc26PublishActions">
                    {report?.is_published ? <><Link className="primaryButton" href={`/matches/${match.id}`} target="_blank">Открыть протокол ↗</Link><form action={unpublishMatchProtocol}><input type="hidden" name="match_id" value={String(match.id)} /><MatchCenterSubmitButton className="rowAction muted" pendingText="Снятие…">Снять с публикации</MatchCenterSubmitButton></form></> : <form action={publishMatchProtocol}><input type="hidden" name="match_id" value={String(match.id)} /><MatchCenterSubmitButton className="primaryButton" pendingText="Публикация…" disabled={!publicationReady}>Опубликовать протокол</MatchCenterSubmitButton></form>}
                    <Link href={`/matches/${match.id}`} target="_blank" className="rowAction muted">Предпросмотр публичной страницы ↗</Link>
                  </div>
                </section>
              </div>
            </details>
          </div>
        </section>
      </main>
    </SelectOnFocus>
  );
}

function SectionSummary({ number, title, subtitle, state, tone }: { number: string; title: string; subtitle: string; state: string; tone: "ready" | "draft" | "empty" }) {
  return <div className="mc26SectionSummary"><span className="mc26SectionNumber">{number}</span><div><strong>{title}</strong><small>{subtitle}</small></div><b className={`mc26SectionState ${tone}`}>{state}</b><i aria-hidden="true">⌄</i></div>;
}

function ReadinessItem({ label, ready, value, optional = false }: { label: string; ready: boolean; value: string; optional?: boolean }) {
  return <div className={`mc26ReadinessItem ${ready ? "ready" : optional ? "optional" : "missing"}`}><span>{ready ? "✓" : optional ? "○" : "!"}</span><div><strong>{label}</strong><small>{optional ? "Необязательно" : ready ? "Готово" : "Нужно проверить"}</small></div><b>{value}</b></div>;
}

function TimelineHalf({
  title,
  range,
  events,
  match,
  clubSide,
  participants,
  scoreAfterEvent,
  secondYellowIds,
}: {
  title: string;
  range: string;
  events: MatchEvent[];
  match: ClubMatch;
  clubSide: "home" | "away" | null;
  participants: EventParticipantOption[];
  scoreAfterEvent: Map<string, { home: number; away: number }>;
  secondYellowIds: Set<string>;
}) {
  const grouped: Array<{ key: string; events: MatchEvent[] }> = [];
  for (const event of events) {
    const canGroup = event.event_type === "substitution";
    const key = canGroup
      ? `sub:${String(event.team_id)}:${event.minute}:${event.stoppage_minute}`
      : `event:${String(event.id)}`;
    const existing = grouped.find((group) => group.key === key);
    if (existing) existing.events.push(event);
    else grouped.push({ key, events: [event] });
  }

  return (
    <div className="matchTimelineHalf">
      <div className="matchTimelineHalfHead">
        <strong>{title}</strong>
        <span>{range}</span>
      </div>
      {events.length === 0 ? (
        <div className="matchTimelineEmpty">Событий нет</div>
      ) : (
        <div className="matchTimeline">
          {grouped.map((group) => {
            const first = group.events[0];
            const scoringTeam = countsAsGoal(first) ? scoringTeamId(first, match) : String(first.team_id);
            const displayIsHome = scoringTeam === String(match.home_team_id);
            const isClubEvent = clubSide === "home" ? displayIsHome : clubSide === "away" ? !displayIsHome : false;
            const teamName = displayIsHome ? match.home?.name : match.away?.name;
            const isSubGroup = first.event_type === "substitution";
            const isSecondYellow = first.event_type === "yellow_card" && secondYellowIds.has(String(first.id));
            const eventLabel = isSecondYellow ? "Вторая жёлтая / красная" : EVENT_LABELS[first.event_type];
            const eventIcon = isSecondYellow ? "▰■" : EVENT_ICONS[first.event_type];
            const goalScore = scoreAfterEvent.get(String(first.id));
            return (
              <article className={`matchTimelineEvent ${displayIsHome ? "home" : "away"} ${isClubEvent ? "club-event" : "opponent-event"} ${isSubGroup && group.events.length > 1 ? "grouped-substitutions" : ""} ${isSecondYellow ? "second-yellow" : ""}`} key={group.key}>
                <div className="matchTimelineMinute">{eventMinute(first)}</div>
                <div className="matchTimelineRail"><span>{eventIcon}</span></div>
                <div className="matchTimelineCard">
                  <div className="matchTimelineEventHead">
                    <div>
                      <small>{teamName ?? "Команда"}</small>
                      <strong>{isSubGroup && group.events.length > 1 ? `Замены · ${group.events.length}` : eventLabel}</strong>
                    </div>
                    {!isSubGroup && <span>{eventParticipant(first)}</span>}
                    {goalScore && (
                      <b className="matchTimelineRunningScore" title="Счёт после события">
                        {goalScore.home}:{goalScore.away}
                      </b>
                    )}
                  </div>

                  {isSubGroup ? (
                    <div className="matchTimelineSubstitutionList">
                      {group.events.map((event, index) => (
                        <div className="matchTimelineSubstitutionItem" key={event.id}>
                          <strong>{event.player_name || "Игрок ушёл"} <span>→</span> {event.related_player_name || "Игрок вышел"}</strong>
                          <div className="matchTimelineInlineActions">
                            <details>
                              <summary>Изменить {group.events.length > 1 ? index + 1 : ""}</summary>
                              <form action={updateMatchEvent} className="matchEventEditForm">
                                <input type="hidden" name="match_id" value={String(match.id)} />
                                <input type="hidden" name="event_id" value={String(event.id)} />
                                <EventFields
                                  homeTeamId={String(match.home_team_id)}
                                  awayTeamId={String(match.away_team_id)}
                                  homeTeamName={match.home?.name ?? "Хозяева"}
                                  awayTeamName={match.away?.name ?? "Гости"}
                                  participants={participants}
                                  defaults={event}
                                  compact
                                />
                                <MatchCenterSubmitButton className="rowAction" pendingText="Сохранение…">Сохранить изменения</MatchCenterSubmitButton>
                              </form>
                            </details>
                            <form action={deleteMatchEvent}>
                              <input type="hidden" name="match_id" value={String(match.id)} />
                              <input type="hidden" name="event_id" value={String(event.id)} />
                              <MatchCenterSubmitButton className="rowAction muted" pendingText="Удаление…">Удалить</MatchCenterSubmitButton>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {first.description && first.description !== first.player_name && <p>{first.description}</p>}
                      <div className="matchTimelineActions">
                        <details>
                          <summary>Изменить</summary>
                          <form action={updateMatchEvent} className="matchEventEditForm">
                            <input type="hidden" name="match_id" value={String(match.id)} />
                            <input type="hidden" name="event_id" value={String(first.id)} />
                            <EventFields
                              homeTeamId={String(match.home_team_id)}
                              awayTeamId={String(match.away_team_id)}
                              homeTeamName={match.home?.name ?? "Хозяева"}
                              awayTeamName={match.away?.name ?? "Гости"}
                              participants={participants}
                              defaults={first}
                              compact
                            />
                            <MatchCenterSubmitButton className="rowAction" pendingText="Сохранение…">Сохранить изменения</MatchCenterSubmitButton>
                          </form>
                        </details>
                        <form action={deleteMatchEvent}>
                          <input type="hidden" name="match_id" value={String(match.id)} />
                          <input type="hidden" name="event_id" value={String(first.id)} />
                          <MatchCenterSubmitButton className="rowAction muted" pendingText="Удаление…">Удалить</MatchCenterSubmitButton>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgressCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "ready" | "draft" | "empty";
}) {
  return (
    <div className={`matchCenterProgressCard ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function TeamFoundation({
  name,
  side,
  ready,
  logo,
}: {
  name: string;
  side: string;
  ready: boolean;
  logo: string | null;
}) {
  return (
    <div className="matchCenterTeamRow">
      <div className="matchCenterTeamLogo">
        {logo ? <img src={logo} alt="" /> : <span>FC</span>}
      </div>
      <div>
        <small>{side}</small>
        <strong>{name}</strong>
      </div>
      <span className={`matchCenterFoundationState ${ready ? "ready" : "missing"}`}>
        {ready ? "Готово" : "Нет строки"}
      </span>
    </div>
  );
}

function MatchCenterMigrationRequired({ message }: { message: string }) {
  return (
    <main className="adminPage matchCenterPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • MATCH CENTER</p>
            <h1>Нужна миграция 045</h1>
            <p>Не найден слой данных стартовых составов.</p>
          </div>
          <Link href="/admin/matches" className="adminBack">← Матчи</Link>
        </div>
      </section>
      <section className="section adminSurface">
        <div className="container">
          <div className="statisticsMigrationCard">
            <p className="eyebrow blue">DB • ОДИН РАЗ</p>
            <h2>Примени migration 045</h2>
            <p>В Supabase → SQL Editor выполни файл <code>database/045_match_lineups.sql</code>, затем обнови страницу.</p>
            <p className="formError">Ответ базы: {message}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
