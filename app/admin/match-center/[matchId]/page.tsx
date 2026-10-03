import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type {
  ClubMatch,
  MatchCenterProgress,
  MatchEvent,
  MatchEventType,
  MatchReport,
  MatchTeamStatistic,
  Player,
} from "@/lib/types";
import {
  createMatchEvent,
  deleteMatchEvent,
  saveMatchReportFoundation,
  updateMatchEvent,
} from "./actions";

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

  const [reportResult, teamStatsResult, progressResult, playersResult, eventsResult] = await Promise.all([
    supabase.from("match_reports").select("*").eq("match_id", matchId).maybeSingle(),
    supabase
      .from("match_team_statistics")
      .select("*")
      .eq("match_id", matchId)
      .order("side"),
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
  ]);

  const loadError =
    reportResult.error || teamStatsResult.error || progressResult.error || playersResult.error || eventsResult.error;
  if (loadError) {
    return <MatchCenterMigrationRequired message={loadError.message} />;
  }

  const report = (reportResult.data as MatchReport | null) ?? null;
  const teamStats = (teamStatsResult.data ?? []) as MatchTeamStatistic[];
  const progress = (progressResult.data as MatchCenterProgress | null) ?? null;
  const players = (playersResult.data ?? []) as Player[];
  const events = (eventsResult.data ?? []) as MatchEvent[];

  const homeFoundation = teamStats.find((row) => row.side === "home") ?? null;
  const awayFoundation = teamStats.find((row) => row.side === "away") ?? null;
  const foundationReady = Boolean(homeFoundation && awayFoundation);
  const reportHasMetadata = Boolean(progress?.report_has_metadata);

  const homeGoalsFromTimeline = events.filter(
    (event) => String(event.team_id) === String(match.home_team_id) && countsAsGoal(event),
  ).length;
  const awayGoalsFromTimeline = events.filter(
    (event) => String(event.team_id) === String(match.away_team_id) && countsAsGoal(event),
  ).length;
  const scoreCanBeChecked = match.status === "finished" || match.status === "live";
  const timelineMatchesScore =
    !scoreCanBeChecked ||
    (homeGoalsFromTimeline === (match.home_score ?? 0) && awayGoalsFromTimeline === (match.away_score ?? 0));

  return (
    <main className="adminPage matchCenterPage">
      <section className="adminHero compactAdminHero matchCenterHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • MATCH CENTER v2.3.1</p>
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
          {errorMessage && <div className="formError matchCenterNotice">{errorMessage}</div>}
          {saved === "report" && <div className="statisticsSuccess matchCenterNotice">Основа матч-центра сохранена.</div>}
          {saved === "event" && <div className="statisticsSuccess matchCenterNotice">Событие добавлено в таймлайн.</div>}
          {saved === "event-updated" && <div className="statisticsSuccess matchCenterNotice">Событие изменено.</div>}
          {saved === "event-deleted" && <div className="statisticsSuccess matchCenterNotice">Событие удалено.</div>}

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
              label="Игроки"
              value={stateLabel(progress?.player_stats_status ?? "empty")}
              tone={progress?.player_stats_status === "complete" ? "ready" : progress?.player_stats_status === "draft" ? "draft" : "empty"}
              detail="Ветка v2.2"
            />
            <ProgressCard
              label="Командная статистика"
              value={`${progress?.team_stats_filled ?? 0}/2`}
              tone={(progress?.team_stats_filled ?? 0) === 2 ? "ready" : "empty"}
              detail={foundationReady ? "2 команды подготовлены" : "Нужна миграция 041"}
            />
            <ProgressCard
              label="События"
              value={String(events.length)}
              tone={events.length > 0 ? "draft" : "empty"}
              detail={timelineMatchesScore ? "Таймлайн активен" : "Проверь голы"}
            />
          </section>

          <div className="matchCenterLayout">
            <form action={saveMatchReportFoundation} className="statisticsPanel matchCenterForm">
              <input type="hidden" name="match_id" value={String(match.id)} />
              <div className="statisticsPanelHead">
                <div>
                  <p className="eyebrow blue">ОСНОВА ОТЧЁТА</p>
                  <h2>Данные матча</h2>
                  <p>Метаданные будущей публичной страницы матча. Их можно заполнять постепенно.</p>
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
                <p>Основа отчёта сохраняется независимо от таймлайна и статистики команд.</p>
                <button className="primaryButton" type="submit">Сохранить основу</button>
              </div>
            </form>

            <aside className="matchCenterSidebar">
              <section className="statisticsPanel">
                <p className="eyebrow blue">КОМАНДЫ</p>
                <h3>Фундамент статистики</h3>
                <div className="matchCenterTeams">
                  <TeamFoundation
                    name={match.home?.name ?? "Хозяева"}
                    side="HOME"
                    ready={Boolean(homeFoundation)}
                    logo={match.home?.logo_url ?? null}
                  />
                  <TeamFoundation
                    name={match.away?.name ?? "Гости"}
                    side="AWAY"
                    ready={Boolean(awayFoundation)}
                    logo={match.away?.logo_url ?? null}
                  />
                </div>
                <p className="matchCenterHelp">
                  В v2.3.5 сюда подключим владение, удары, угловые, фолы, офсайды, передачи, сейвы и xG.
                </p>
              </section>

              <section className="statisticsPanel matchCenterRoadmap">
                <p className="eyebrow blue">ВЕТКА v2.3</p>
                <RoadmapStep version="v2.3.1" title="События / таймлайн ✓" />
                <RoadmapStep version="v2.3.4" title="Составы и замены" />
                <RoadmapStep version="v2.3.5" title="Командная статистика" />
                <RoadmapStep version="v2.3.6" title="Публичная страница матча" />
              </section>

              <section className="statisticsPanel">
                <p className="eyebrow blue">СТАТИСТИКА ИГРОКОВ</p>
                <h3>{stateLabel(progress?.player_stats_status ?? "empty")}</h3>
                <p className="matchCenterHelp">Игроки остаются в проверенной системе v2.2 и связаны с этим же match_id.</p>
                <Link className="rowAction" href={`/admin/statistics/${match.id}`}>Открыть игроков →</Link>
              </section>
            </aside>
          </div>

          <section className="statisticsPanel matchEventEditor">
            <div className="statisticsPanelHead">
              <div>
                <p className="eyebrow blue">v2.3.1 • СОБЫТИЯ МАТЧА</p>
                <h2>Добавить событие</h2>
                <p>
                  Голы, карточки, замены, пенальти, VAR и другие эпизоды. Для игрока FC Edineț выбирай футболиста из списка;
                  для соперника введи имя вручную.
                </p>
              </div>
              <span className="matchCenterVersionBadge">{events.length} событий</span>
            </div>

            <form action={createMatchEvent} className="matchEventForm">
              <input type="hidden" name="match_id" value={String(match.id)} />
              <EventFields
                match={match}
                players={players}
                defaults={{ event_type: "goal", minute: 0, stoppage_minute: 0, sort_order: 0 }}
              />
              <div className="matchEventFormFooter">
                <p>
                  Для автогола в поле «Команда» выбирай команду, <b>которой засчитан гол</b>, а имя автора автогола введи в поле игрока.
                </p>
                <button className="primaryButton" type="submit">+ Добавить событие</button>
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
              <div className="matchTimeline">
                {events.map((event) => {
                  const isHome = String(event.team_id) === String(match.home_team_id);
                  const teamName = isHome ? match.home?.name : match.away?.name;
                  return (
                    <article className={`matchTimelineEvent ${isHome ? "home" : "away"}`} key={event.id}>
                      <div className="matchTimelineMinute">{eventMinute(event)}</div>
                      <div className="matchTimelineRail"><span>{EVENT_ICONS[event.event_type]}</span></div>
                      <div className="matchTimelineCard">
                        <div className="matchTimelineEventHead">
                          <div>
                            <small>{teamName ?? "Команда"}</small>
                            <strong>{EVENT_LABELS[event.event_type]}</strong>
                          </div>
                          <span>{eventParticipant(event)}</span>
                        </div>
                        {event.description && event.description !== event.player_name && (
                          <p>{event.description}</p>
                        )}
                        <div className="matchTimelineActions">
                          <details>
                            <summary>Изменить</summary>
                            <form action={updateMatchEvent} className="matchEventEditForm">
                              <input type="hidden" name="match_id" value={String(match.id)} />
                              <input type="hidden" name="event_id" value={String(event.id)} />
                              <EventFields match={match} players={players} defaults={event} compact />
                              <button className="rowAction" type="submit">Сохранить изменения</button>
                            </form>
                          </details>
                          <form action={deleteMatchEvent}>
                            <input type="hidden" name="match_id" value={String(match.id)} />
                            <input type="hidden" name="event_id" value={String(event.id)} />
                            <button className="rowAction muted" type="submit">Удалить</button>
                          </form>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function EventFields({
  match,
  players,
  defaults,
  compact = false,
}: {
  match: ClubMatch;
  players: Player[];
  defaults: Partial<MatchEvent> & { event_type?: MatchEventType; minute?: number; stoppage_minute?: number; sort_order?: number };
  compact?: boolean;
}) {
  return (
    <div className={`matchEventFields ${compact ? "compact" : ""}`}>
      <label className="fieldGroup">
        <span>Тип события</span>
        <select name="event_type" defaultValue={defaults.event_type ?? "goal"}>
          {Object.entries(EVENT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label className="fieldGroup">
        <span>Команда</span>
        <select name="team_id" defaultValue={defaults.team_id != null ? String(defaults.team_id) : String(match.home_team_id)}>
          <option value={String(match.home_team_id)}>HOME · {match.home?.name ?? "Хозяева"}</option>
          <option value={String(match.away_team_id)}>AWAY · {match.away?.name ?? "Гости"}</option>
        </select>
      </label>
      <label className="fieldGroup">
        <span>Минута</span>
        <input name="minute" type="number" min={0} max={130} step={1} defaultValue={defaults.minute ?? 0} />
      </label>
      <label className="fieldGroup">
        <span>Добавленное время</span>
        <input name="stoppage_minute" type="number" min={0} max={30} step={1} defaultValue={defaults.stoppage_minute ?? 0} placeholder="0" />
      </label>
      <label className="fieldGroup">
        <span>Игрок FC Edineț</span>
        <select name="player_id" defaultValue={defaults.player_id ?? ""}>
          <option value="">— не выбирать —</option>
          {players.map((player) => (
            <option value={String(player.id)} key={player.id}>
              {player.shirt_number != null ? `#${player.shirt_number} ` : ""}{player.first_name} {player.last_name}{!player.is_active ? " · архив" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="fieldGroup">
        <span>Или имя игрока вручную</span>
        <input name="player_name" maxLength={120} defaultValue={defaults.player_id ? "" : defaults.player_name ?? ""} placeholder="Игрок соперника" />
      </label>
      <label className="fieldGroup">
        <span>Второй игрок FC Edineț</span>
        <select name="related_player_id" defaultValue={defaults.related_player_id ?? ""}>
          <option value="">— для замены —</option>
          {players.map((player) => (
            <option value={String(player.id)} key={player.id}>
              {player.shirt_number != null ? `#${player.shirt_number} ` : ""}{player.first_name} {player.last_name}{!player.is_active ? " · архив" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="fieldGroup">
        <span>Или второе имя вручную</span>
        <input name="related_player_name" maxLength={120} defaultValue={defaults.related_player_id ? "" : defaults.related_player_name ?? ""} placeholder="Кто вышел на поле" />
      </label>
      <label className="fieldGroup matchEventDescription">
        <span>Комментарий</span>
        <input name="description" maxLength={500} defaultValue={defaults.description ?? ""} placeholder="Необязательно" />
      </label>
      <label className="fieldGroup matchEventSortOrder">
        <span>Порядок на той же минуте</span>
        <input name="sort_order" type="number" min={-1000} max={1000} step={1} defaultValue={defaults.sort_order ?? 0} />
      </label>
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

function RoadmapStep({ version, title }: { version: string; title: string }) {
  return (
    <div className="matchCenterRoadmapRow">
      <span>{version}</span>
      <strong>{title}</strong>
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
            <h1>Нужна миграция 041</h1>
            <p>Фундамент статистики матча ещё не создан в Supabase.</p>
          </div>
          <Link href="/admin/matches" className="adminBack">← Матчи</Link>
        </div>
      </section>
      <section className="section adminSurface">
        <div className="container">
          <div className="statisticsMigrationCard">
            <p className="eyebrow blue">DB • ОДИН РАЗ</p>
            <h2>Примени migration 041</h2>
            <p>В Supabase → SQL Editor выполни файл <code>database/041_match_statistics_foundation.sql</code>, затем обнови страницу.</p>
            <p className="formError">Ответ базы: {message}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
