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
  Player,
} from "@/lib/types";
import {
  createMatchEvent,
  deleteMatchEvent,
  publishMatchProtocol,
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
    report: "Основа матч-центра сохранена.",
    event: "Событие добавлено в таймлайн.",
    "event-updated": "Событие изменено.",
    "event-deleted": "Событие удалено.",
    "lineup-home": "Состав хозяев сохранён.",
    "lineup-away": "Состав гостей сохранён.",
    "lineup-imported": "Состав FC Edineț импортирован из статистики игроков.",
    "squad-draft": "Состав и статистика FC Edineț сохранены как черновик.",
    "squad-complete": "Состав и статистика FC Edineț сохранены. Сезонные итоги обновлены автоматически.",
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

  const [reportResult, progressResult, playersResult, eventsResult, lineupSettingsResult, lineupEntriesResult, playerStatsResult] = await Promise.all([
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
  ]);

  const loadError =
    reportResult.error || progressResult.error || playersResult.error || eventsResult.error || lineupSettingsResult.error || lineupEntriesResult.error || playerStatsResult.error;
  if (loadError) {
    return <MatchCenterMigrationRequired message={loadError.message} />;
  }

  const report = (reportResult.data as MatchReport | null) ?? null;
  const progress = (progressResult.data as MatchCenterProgress | null) ?? null;
  const players = (playersResult.data ?? []) as Player[];
  const events = (eventsResult.data ?? []) as MatchEvent[];
  const lineupSettings = (lineupSettingsResult.data ?? []) as MatchLineupSetting[];
  const lineupEntries = (lineupEntriesResult.data ?? []) as MatchLineupEntry[];

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

  return (
    <SelectOnFocus>
    <MatchCenterFeedback matchId={String(match.id)} message={feedbackMessage} tone={feedbackTone} />
    <main className="adminPage matchCenterPage">
      <section className="adminHero compactAdminHero matchCenterHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • MATCH CENTER</p>
            <h1>
              {match.home?.name ?? "—"}{" "}
              <b>
                {match.status === "finished" || match.status === "live"
                  ? `${match.home_score ?? 0} : ${match.away_score ?? 0}`
                  : "VS"}
              </b>{" "}
              {match.away?.name ?? "—"}
            </h1>
            <p>
              {formatDateTime(match.kickoff)}
              {match.competition?.name ? ` • ${match.competition.name}` : ""}
              {match.round ? ` • ${match.round}` : ""}
            </p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin/match-center" className="adminBack">← Матч-центр</Link>
            <Link href={`/admin/matches/${match.id}/edit`} className="rowAction muted">Редактировать матч</Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container matchCenterContainer">

          {!timelineMatchesScore && (
            <div className="matchCenterTimelineWarning">
              <strong>Таймлайн пока не совпадает со счётом.</strong>
              <span>
                По событиям: {homeGoalsFromTimeline}:{awayGoalsFromTimeline}. В матче: {match.home_score ?? 0}:{match.away_score ?? 0}.
                Это нормально, пока события вводятся — перед публикацией таймлайн нужно довести до итогового счёта.
              </span>
            </div>
          )}

          <section className="matchCenterProgressGrid">
            <ProgressCard
              label="Отчёт матча"
              value={reportHasMetadata ? "Основа есть" : "Пусто"}
              tone={reportHasMetadata ? "ready" : "empty"}
              detail={report?.status === "complete" ? "Статус: готово" : "Статус: черновик"}
            />
            <ProgressCard
              label="FC Edineț"
              value={stateLabel(progress?.player_stats_status ?? "empty")}
              tone={progress?.player_stats_status === "complete" ? "ready" : progress?.player_stats_status === "draft" ? "draft" : "empty"}
              detail={`${playerStats.length} игроков со статистикой`}
            />
            <ProgressCard
              label="События"
              value={String(events.length)}
              tone={events.length > 0 ? "draft" : "empty"}
              detail={timelineMatchesScore ? "Таймлайн активен" : "Проверь голы"}
            />
            <ProgressCard
              label="Составы"
              value={`${progress?.home_starters ?? lineupEntries.filter((row) => row.side === "home" && row.lineup_role === "starter").length}/11 • ${progress?.away_starters ?? lineupEntries.filter((row) => row.side === "away" && row.lineup_role === "starter").length}/11`}
              tone={(progress?.home_starters ?? 0) === 11 && (progress?.away_starters ?? 0) === 11 ? "ready" : lineupEntries.length > 0 ? "draft" : "empty"}
              detail="HOME • AWAY"
            />
          </section>

          <section className="matchCenterLineupsStage" id="lineups">
            <div className="statisticsPanelHead matchCenterLineupsStageHead">
              <div>
                <p className="eyebrow blue">СОСТАВЫ</p>
                <h2>Хозяева и гости</h2>
                <p>Сначала сохрани оба состава. После этого все сохранённые игроки — в том числе введённые вручную — доступны в событиях матча.</p>
              </div>
            </div>
            <div className={`matchCenterLineupsGrid club-${clubSide ?? "none"}`}>
              {clubSide === "home" ? (
                <>
                  <ClubSquadStatsEditor
                    matchId={String(match.id)}
                    players={players}
                    entries={clubLineupEntries}
                    stats={playerStats}
                    formation={clubLineupSetting?.formation ?? null}
                    coachName={clubLineupSetting?.coach_name ?? null}
                    currentStatus={(progress?.player_stats_status ?? "empty") as "empty" | "draft" | "complete"}
                    teamName={match.home?.name ?? "FC Edineț"}
                    sideLabel="ХОЗЯЕВА"
                  />
                  <LineupEditor match={match} players={players} settings={lineupSettings} entries={lineupEntries} events={events} onlySide="away" />
                </>
              ) : clubSide === "away" ? (
                <>
                  <LineupEditor match={match} players={players} settings={lineupSettings} entries={lineupEntries} events={events} onlySide="home" />
                  <ClubSquadStatsEditor
                    matchId={String(match.id)}
                    players={players}
                    entries={clubLineupEntries}
                    stats={playerStats}
                    formation={clubLineupSetting?.formation ?? null}
                    coachName={clubLineupSetting?.coach_name ?? null}
                    currentStatus={(progress?.player_stats_status ?? "empty") as "empty" | "draft" | "complete"}
                    teamName={match.away?.name ?? "FC Edineț"}
                    sideLabel="ГОСТИ"
                  />
                </>
              ) : (
                <div className="formError matchCenterNotice">Не удалось определить сторону FC Edineț в этом матче.</div>
              )}
            </div>
          </section>

          <div className="matchCenterLayout">
            <form action={saveMatchReportFoundation} className="statisticsPanel matchCenterForm">
              <input type="hidden" name="match_id" value={String(match.id)} />
              <div className="statisticsPanelHead">
                <div>
                  <p className="eyebrow blue">ОСНОВА ОТЧЁТА</p>
                  <h2>Данные матча</h2>
                  <p>Сохрани основные данные матча. Судья, посещаемость, погода и MVP необязательны.</p>
                </div>
                <span className={`statisticsState ${reportHasMetadata ? "draft" : "empty"}`}>
                  {reportHasMetadata ? "Основа сохранена" : "Не заполнено"}
                </span>
              </div>

              <div className="matchCenterFieldGrid">
                <label className="fieldGroup">
                  <span>Главный судья</span>
                  <input name="referee" defaultValue={report?.referee ?? ""} maxLength={160} placeholder="Имя судьи" />
                </label>
                <label className="fieldGroup">
                  <span>Посещаемость</span>
                  <input name="attendance" type="number" min={0} max={200000} step={1} defaultValue={report?.attendance ?? ""} placeholder="Например, 1250" />
                </label>
                <label className="fieldGroup">
                  <span>Погода</span>
                  <input name="weather" defaultValue={report?.weather ?? ""} maxLength={120} placeholder="Например, +18°C, облачно" />
                </label>
                <label className="fieldGroup">
                  <span>Состояние поля</span>
                  <input name="pitch_condition" defaultValue={report?.pitch_condition ?? ""} maxLength={120} placeholder="Хорошее / влажное / тяжёлое" />
                </label>
                <label className="fieldGroup matchCenterWideField">
                  <span>Лучший игрок матча</span>
                  <select name="man_of_match_player_id" defaultValue={report?.man_of_match_player_id ?? ""}>
                    <option value="">Не выбран</option>
                    {players.map((player) => (
                      <option key={player.id} value={String(player.id)}>
                        {player.shirt_number != null ? `#${player.shirt_number} ` : ""}
                        {player.first_name} {player.last_name}{!player.is_active ? " · архив" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fieldGroup matchCenterWideField">
                  <span>Краткий отчёт / заметка</span>
                  <textarea name="summary" rows={7} maxLength={5000} defaultValue={report?.summary ?? ""} placeholder="Кратко опиши ход матча." />
                </label>
              </div>

              <div className="matchCenterFormFooter">
                <p>Основу можно сохранять постепенно. Для публикации достаточно завершённого матча и корректного таймлайна голов.</p>
                <MatchCenterSubmitButton className="primaryButton" pendingText="Сохранение…">Сохранить основу</MatchCenterSubmitButton>
              </div>
            </form>

            <aside className="matchCenterSidebar">
              <section className="statisticsPanel practicalProtocolPublish">
                <p className="eyebrow blue">ПУБЛИЧНЫЙ ПРОТОКОЛ</p>
                <h3>{report?.is_published ? "Опубликован" : "Не опубликован"}</h3>
                <p className="matchCenterHelp">
                  На публичной странице показываем только реальные данные: счёт, составы, голы, карточки, замены, отчёт и MVP. Профессиональные метрики не нужны.
                </p>
                {report?.is_published ? (
                  <>
                    <Link className="rowAction" href={`/matches/${match.id}`} target="_blank">Открыть страницу ↗</Link>
                    <form action={unpublishMatchProtocol}>
                      <input type="hidden" name="match_id" value={String(match.id)} />
                      <MatchCenterSubmitButton className="rowAction muted" pendingText="Снятие…">Снять с публикации</MatchCenterSubmitButton>
                    </form>
                  </>
                ) : (
                  <form action={publishMatchProtocol}>
                    <input type="hidden" name="match_id" value={String(match.id)} />
                    <MatchCenterSubmitButton className="primaryButton" pendingText="Публикация…" disabled={match.status !== "finished" || !timelineMatchesScore}>Опубликовать протокол</MatchCenterSubmitButton>
                  </form>
                )}
              </section>

              <section className="statisticsPanel matchCenterSeasonSyncCard">
                <p className="eyebrow blue">СЕЗОННАЯ СТАТИСТИКА</p>
                <h3>Считается автоматически</h3>
                <p className="matchCenterHelp">Матчи, старты, минуты, голы, ассисты и карточки FC Edineț записываются по этому матчу и затем суммируются отдельно по сезону и соревнованию.</p>
                <Link className="rowAction" href="/admin/statistics">Открыть сводную статистику →</Link>
              </section>
            </aside>
          </div>

          <section className="statisticsPanel matchEventEditor">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">СОБЫТИЯ МАТЧА</p>
                <h2>Добавить событие</h2>
                <p>
                  Голы, карточки, замены и другие эпизоды. Игроки выбираются из сохранённых составов обеих команд.
                  Замены автоматически пересчитывают игровое время, а голы и карточки — статистику сезона.
                </p>
              </div>
              <span className="matchCenterVersionBadge">{events.length} событий</span>
            </div>

            <form action={createMatchEvent} className="matchEventForm">
              <input type="hidden" name="match_id" value={String(match.id)} />
              <EventFields
                homeTeamId={String(match.home_team_id)}
                awayTeamId={String(match.away_team_id)}
                homeTeamName={match.home?.name ?? "Хозяева"}
                awayTeamName={match.away?.name ?? "Гости"}
                participants={eventParticipants}
                defaults={{ event_type: "goal", minute: 0, stoppage_minute: 0, sort_order: 0 }}
              />
              <div className="matchEventFormFooter">
                <p>
                  Для автогола выбирай <b>команду игрока, забившего в свои ворота</b>. Система сама засчитает мяч сопернику. Для обычного гола вторым игроком можно указать ассистента.
                </p>
                <MatchCenterSubmitButton className="primaryButton" pendingText="Добавление…">+ Добавить событие</MatchCenterSubmitButton>
              </div>
            </form>
          </section>

          <section className="statisticsPanel matchTimelinePanel">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">ТАЙМЛАЙН</p>
                <h2>Ход матча</h2>
                <p>События автоматически располагаются по минуте и добавленному времени.</p>
              </div>
              {scoreCanBeChecked && (
                <span className={`statisticsState ${timelineMatchesScore ? "complete" : "draft"}`}>
                  Голы {homeGoalsFromTimeline}:{awayGoalsFromTimeline} / счёт {match.home_score ?? 0}:{match.away_score ?? 0}
                </span>
              )}
            </div>

            {events.length === 0 ? (
              <div className="adminEmpty">Событий пока нет. Добавь первый эпизод выше.</div>
            ) : (
              <div className="matchTimelineHalves">
                <TimelineHalf
                  title="1 тайм"
                  range="0–45+"
                  events={firstHalfEvents}
                  match={match}
                  clubSide={clubSide}
                  participants={eventParticipants}
                  scoreAfterEvent={scoreAfterEvent}
                  secondYellowIds={secondYellowIds}
                />
                <TimelineHalf
                  title="2 тайм"
                  range="46–90+"
                  events={secondHalfEvents}
                  match={match}
                  clubSide={clubSide}
                  participants={eventParticipants}
                  scoreAfterEvent={scoreAfterEvent}
                  secondYellowIds={secondYellowIds}
                />
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
    </SelectOnFocus>
  );
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
