import type { Metadata } from "next";
import { cache } from "react";
import PublicBreadcrumbs from "@/app/components/PublicBreadcrumbs";
import PublicBackLink from "@/app/components/PublicBackLink";
import JsonLd from "@/app/components/JsonLd";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { secondYellowEventIds } from "@/lib/match-discipline";
import { publicText } from "@/lib/i18n";
import { publicMetadata, sportsEventJsonLd } from "@/lib/seo";
import type { ClubMatch, MatchEvent, MatchLineupEntry, MatchLineupSetting, MatchReport } from "@/lib/types";

export const dynamic = "force-dynamic";

type Locale = "ru" | "ro";

const CLUB_CREST = "/brand/fc-edinet-crest.png";

type Copy = {
  back: string;
  protocol: string;
  notPublished: string;
  notPublishedHint: string;
  timeline: string;
  lineups: string;
  starters: string;
  substitutes: string;
  coach: string;
  report: string;
  referee: string;
  attendance: string;
  weather: string;
  pitch: string;
  mvp: string;
  minute: string;
  noEvents: string;
  noLineup: string;
  captain: string;
  formation: string;
  match: string;
  storyEyebrow: string;
  reportEyebrow: string;
  infoEyebrow: string;
  lineupEyebrow: string;
  status: string;
  stadium: string;
};

const copy: Record<Locale, Copy> = {
  ru: {
    back: "← Все матчи",
    protocol: "Протокол матча",
    notPublished: "Подробный протокол ещё не опубликован",
    notPublishedHint: "Счёт и основная информация уже доступны. Составы, события и отчёт появятся после публикации редактором клуба.",
    timeline: "Ход матча",
    lineups: "Составы",
    starters: "Стартовый состав",
    substitutes: "Запасные",
    coach: "Тренер",
    report: "О матче",
    referee: "Судья",
    attendance: "Зрители",
    weather: "Погода",
    pitch: "Поле",
    mvp: "Лучший игрок",
    minute: "мин",
    noEvents: "События не добавлены.",
    noLineup: "Состав пока не опубликован.",
    captain: "капитан",
    formation: "Схема",
    match: "Матч",
    storyEyebrow: "ХРОНОЛОГИЯ",
    reportEyebrow: "ОТЧЁТ",
    infoEyebrow: "ИНФОРМАЦИЯ",
    lineupEyebrow: "СОСТАВЫ",
    status: "Статус",
    stadium: "Стадион",
  },
  ro: {
    back: "← Toate meciurile",
    protocol: "Raportul meciului",
    notPublished: "Raportul detaliat nu este publicat încă",
    notPublishedHint: "Scorul și informația de bază sunt disponibile. Echipele, evenimentele și raportul vor apărea după publicare.",
    timeline: "Desfășurarea meciului",
    lineups: "Loturi",
    starters: "Primul 11",
    substitutes: "Rezerve",
    coach: "Antrenor",
    report: "Despre meci",
    referee: "Arbitru",
    attendance: "Spectatori",
    weather: "Vreme",
    pitch: "Teren",
    mvp: "Jucătorul meciului",
    minute: "min",
    noEvents: "Nu au fost adăugate evenimente.",
    noLineup: "Lotul nu a fost publicat încă.",
    captain: "căpitan",
    formation: "Sistem",
    match: "Meci",
    storyEyebrow: "CRONOLOGIE",
    reportEyebrow: "RAPORT",
    infoEyebrow: "INFORMAȚII",
    lineupEyebrow: "ECHIPE",
    status: "Statut",
    stadium: "Stadion",
  },
};

const eventLabels: Record<Locale, Record<string, string>> = {
  ru: {
    goal: "Гол",
    own_goal: "Автогол",
    penalty_goal: "Гол с пенальти",
    penalty_miss: "Пенальти не реализован",
    yellow_card: "Жёлтая карточка",
    red_card: "Красная карточка",
    substitution: "Замена",
    var: "VAR",
    injury: "Травма",
    other: "Событие",
  },
  ro: {
    goal: "Gol",
    own_goal: "Autogol",
    penalty_goal: "Gol din penalty",
    penalty_miss: "Penalty ratat",
    yellow_card: "Cartonaș galben",
    red_card: "Cartonaș roșu",
    substitution: "Schimbare",
    var: "VAR",
    injury: "Accidentare",
    other: "Eveniment",
  },
};

const eventIcons: Record<string, string> = {
  goal: "⚽",
  own_goal: "⚽",
  penalty_goal: "⚽",
  penalty_miss: "×",
  yellow_card: "▰",
  red_card: "■",
  substitution: "↔",
  var: "VAR",
  injury: "+",
  other: "•",
};

function eventCountsAsGoal(event: MatchEvent) {
  return event.event_type === "goal" || event.event_type === "penalty_goal" || event.event_type === "own_goal";
}

function eventScoringTeamId(event: MatchEvent, match: ClubMatch) {
  const eventTeamId = String(event.team_id);
  if (event.event_type !== "own_goal") return eventTeamId;
  return eventTeamId === String(match.home_team_id) ? String(match.away_team_id) : String(match.home_team_id);
}

function publicRunningScoreByEvent(events: MatchEvent[], match: ClubMatch) {
  let home = 0;
  let away = 0;
  const scores = new Map<string, { home: number; away: number }>();
  for (const event of events) {
    if (!eventCountsAsGoal(event)) continue;
    const scoringTeam = eventScoringTeamId(event, match);
    if (scoringTeam === String(match.home_team_id)) home += 1;
    if (scoringTeam === String(match.away_team_id)) away += 1;
    scores.set(String(event.id), { home, away });
  }
  return scores;
}

function matchSelect() {
  return `id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,home_score,away_score,notes,created_at,updated_at,
  home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
  away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
  competition:competitions!matches_competition_id_fkey(id,name,slug,season,is_active)`;
}

const getMatch = cache(async (id: string): Promise<ClubMatch | null> => {
  if (!/^\d+$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(matchSelect())
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as ClubMatch;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) return { title: locale === "ro" ? "Meci — FC Edineț" : "Матч — FC Edineț" };
  const home = match.home?.name ?? "—";
  const away = match.away?.name ?? "—";
  const title = `${home} — ${away}`;
  const score = match.home_score !== null && match.away_score !== null
    ? `${match.home_score}:${match.away_score}`
    : null;
  const description = locale === "ro"
    ? `${title}.${score ? ` Scor ${score}.` : ""} Calendar și raportul meciului FC Edineț.`
    : `${title}.${score ? ` Счёт ${score}.` : ""} Дата и протокол матча FC Edineț.`;
  return publicMetadata({
    title,
    description,
    path: `/matches/${encodeURIComponent(id)}`,
    locale,
    image: `/matches/${encodeURIComponent(id)}/opengraph-image`,
  });
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Chisinau",
  }).format(new Date(value));
}

function eventMinute(event: MatchEvent) {
  return `${event.minute}${event.stoppage_minute > 0 ? `+${event.stoppage_minute}` : ""}′`;
}

function eventPerson(event: MatchEvent) {
  if (event.event_type === "substitution") {
    return `${event.player_name || "—"} → ${event.related_player_name || "—"}`;
  }
  return event.player_name || event.description || "—";
}

export default async function PublicMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const locale = (await getLocale()) as Locale;
  const t = copy[locale] ?? copy.ru;
  const match = await getMatch(id);
  if (!match) notFound();
  const supabase = await createClient();

  const { data: reportData } = await supabase
    .from("match_reports")
    .select("*")
    .eq("match_id", id)
    .maybeSingle();
  const report = (reportData as MatchReport | null) ?? null;
  const published = Boolean(report?.is_published);

  let events: MatchEvent[] = [];
  let lineupSettings: MatchLineupSetting[] = [];
  let lineupEntries: MatchLineupEntry[] = [];
  let playerPhotos = new Map<string, string>();
  let mvpName: string | null = null;

  if (published) {
    const [eventsResult, settingsResult, entriesResult] = await Promise.all([
      supabase.from("match_events").select("*").eq("match_id", id).order("minute").order("stoppage_minute").order("sort_order").order("id"),
      supabase.from("match_lineup_settings").select("*").eq("match_id", id).order("side"),
      supabase.from("match_lineup_entries").select("*").eq("match_id", id).order("side").order("lineup_role").order("slot_number"),
    ]);
    events = (eventsResult.data ?? []) as MatchEvent[];
    lineupSettings = (settingsResult.data ?? []) as MatchLineupSetting[];
    lineupEntries = (entriesResult.data ?? []) as MatchLineupEntry[];

    const playerIds = [...new Set(lineupEntries.map((row) => row.player_id).filter(Boolean).map(String))];
    if (playerIds.length > 0) {
      const { data: lineupPlayers } = await supabase.from("players").select("id,photo_url").in("id", playerIds);
      playerPhotos = new Map((lineupPlayers ?? []).filter((row) => row.photo_url).map((row) => [String(row.id), String(row.photo_url)]));
    }

    if (report?.man_of_match_player_id) {
      const { data: player } = await supabase
        .from("players")
        .select("first_name,last_name")
        .eq("id", report.man_of_match_player_id)
        .maybeSingle();
      if (player) mvpName = `${player.first_name} ${player.last_name}`.trim();
    }
  }

  const statusHasScore = match.status === "finished" || match.status === "live";
  const scoreAfterEvent = publicRunningScoreByEvent(events, match);
  const secondYellowIds = secondYellowEventIds(events);
  const eventJsonLd = sportsEventJsonLd(match, locale);
  const firstHalfEvents = events.filter((event) => Number(event.minute) <= 45);
  const secondHalfEvents = events.filter((event) => Number(event.minute) > 45);
  const halfTimeScore = scoreAtEnd(firstHalfEvents, match);
  const homeGoalMinutes = goalMinutes(events, match, String(match.home_team_id));
  const awayGoalMinutes = goalMinutes(events, match, String(match.away_team_id));
  const homeYellow = events.filter((event) => event.event_type === "yellow_card" && String(event.team_id) === String(match.home_team_id)).length;
  const awayYellow = events.filter((event) => event.event_type === "yellow_card" && String(event.team_id) === String(match.away_team_id)).length;
  const homeRed = events.filter((event) => (event.event_type === "red_card" || secondYellowIds.has(String(event.id))) && String(event.team_id) === String(match.home_team_id)).length;
  const awayRed = events.filter((event) => (event.event_type === "red_card" || secondYellowIds.has(String(event.id))) && String(event.team_id) === String(match.away_team_id)).length;
  const homeSubs = events.filter((event) => event.event_type === "substitution" && String(event.team_id) === String(match.home_team_id)).length;
  const awaySubs = events.filter((event) => event.event_type === "substitution" && String(event.team_id) === String(match.away_team_id)).length;
  const matchStadium = match.home?.home_stadium || match.stadium || null;
  const hasInfo = Boolean(matchStadium || report?.referee || report?.attendance != null || report?.weather || report?.pitch_condition || mvpName);

  return (
    <>
      <JsonLd data={eventJsonLd} />
      <main className="publicMatchDetailPage premiumMatchReport">
        <section className="publicMatchDetailHero premiumMatchHero">
          <div className="container premiumMatchHeroInner">
            <PublicBackLink fallbackHref="/matches" locale={locale} className="publicBackOnDark" />
            <PublicBreadcrumbs locale={locale} items={[{ label: publicText[locale].matches.title, href: "/matches" }, { label: `${match.home?.name ?? "—"} — ${match.away?.name ?? "—"}` }]} className="breadcrumbsOnDark publicMatchBreadcrumbs" />
            <div className="premiumMatchMetaRow">
              <span className="premiumMatchCompetition">{match.competition?.name ?? t.match}</span>
              {match.round ? <span>{match.round}</span> : null}
              <span className={`publicMatchStatusChip status-${match.status}`}>{match.status === "finished" ? (locale === "ro" ? "Final" : "Завершён") : match.status === "live" ? (locale === "ro" ? "ÎN JOC" : "В ИГРЕ") : match.status === "postponed" ? (locale === "ro" ? "Amânat" : "Перенесён") : (locale === "ro" ? "Programat" : "Запланирован")}</span>
              <strong>{formatDate(match.kickoff, locale)}</strong>
            </div>
            <div className="publicMatchScoreBoard premiumScoreBoard">
              <PublicTeam team={match.home} />
              <div className="publicMatchBigScore premiumBigScore">
                <b>{statusHasScore ? `${match.home_score ?? 0} : ${match.away_score ?? 0}` : "VS"}</b>
                <span>{match.status === "finished" ? (locale === "ro" ? "MECI ÎNCHEIAT" : "МАТЧ ЗАВЕРШЁН") : t.protocol}</span>
              </div>
              <PublicTeam team={match.away} />
            </div>
            {published && events.length > 0 ? (
              <div className="premiumGoalStrip">
                <div><strong>{match.home?.short_name || match.home?.name || "—"}</strong><span>{homeGoalMinutes || "—"}</span></div>
                <i>•</i>
                <div><strong>{match.away?.short_name || match.away?.name || "—"}</strong><span>{awayGoalMinutes || "—"}</span></div>
              </div>
            ) : null}
          </div>
        </section>

        {published ? (
          <nav className="premiumMatchNav" aria-label={locale === "ro" ? "Navigarea raportului" : "Навигация по протоколу"}>
            <div className="container">
              <a href="#overview">{locale === "ro" ? "Rezumat" : "Обзор"}</a>
              <a href="#timeline">{t.timeline}</a>
              <a href="#lineups">{t.lineups}</a>
              {hasInfo ? <a href="#info">{locale === "ro" ? "Informații" : "Информация"}</a> : null}
            </div>
          </nav>
        ) : null}

        <section className="section publicMatchProtocolSection premiumProtocolSection">
          <div className="container premiumProtocolContainer">
            {!published ? (
              <div className="publicMatchProtocolEmpty">
                <strong>{t.notPublished}</strong>
                <span>{t.notPublishedHint}</span>
              </div>
            ) : (
              <div className="premiumMatchContent">
                <section className="premiumOverview" id="overview">
                  <div className="premiumOverviewHead">
                    <div><p className="eyebrow blue">{locale === "ro" ? "REZUMAT" : "ИТОГ МАТЧА"}</p><h2>{match.home?.name ?? "—"} <span>{match.home_score ?? 0}:{match.away_score ?? 0}</span> {match.away?.name ?? "—"}</h2></div>
                  </div>
                  <div className="premiumOverviewMetrics">
                    <MatchMetric label={locale === "ro" ? "Goluri" : "Голы"} home={match.home_score ?? 0} away={match.away_score ?? 0} />
                    <MatchMetric label={locale === "ro" ? "Cartonașe galbene" : "Жёлтые карточки"} home={homeYellow} away={awayYellow} />
                    <MatchMetric label={locale === "ro" ? "Cartonașe roșii" : "Красные карточки"} home={homeRed} away={awayRed} />
                    <MatchMetric label={locale === "ro" ? "Schimbări" : "Замены"} home={homeSubs} away={awaySubs} />
                  </div>
                </section>

                <section className="publicMatchPanel premiumTimelinePanel" id="timeline">
                  <div className="publicMatchSectionHead premiumSectionHead"><p className="eyebrow blue">{t.storyEyebrow}</p><h2>{t.timeline}</h2></div>
                  {events.length === 0 ? <div className="adminEmpty">{t.noEvents}</div> : (
                    <div className="premiumTimeline">
                      <TimelineHalf label={locale === "ro" ? "PRIMA REPRIZĂ" : "1 ТАЙМ"} events={firstHalfEvents} match={match} locale={locale} scoreAfterEvent={scoreAfterEvent} secondYellowIds={secondYellowIds} />
                      <div className="premiumHalfTime"><span>{locale === "ro" ? "PAUZĂ" : "ПЕРЕРЫВ"}</span><strong>{halfTimeScore.home}:{halfTimeScore.away}</strong></div>
                      <TimelineHalf label={locale === "ro" ? "REPRIZA A DOUA" : "2 ТАЙМ"} events={secondHalfEvents} match={match} locale={locale} scoreAfterEvent={scoreAfterEvent} secondYellowIds={secondYellowIds} />
                    </div>
                  )}
                </section>

                {report?.summary ? (
                  <section className="publicMatchPanel publicMatchReportText premiumReportText">
                    <div className="publicMatchSectionHead premiumSectionHead"><p className="eyebrow blue">{t.reportEyebrow}</p><h2>{locale === "ro" ? "Cronica meciului" : "Отчёт о матче"}</h2></div>
                    <p>{report.summary}</p>
                  </section>
                ) : null}

                <section className="publicMatchPanel publicMatchLineupsPanel premiumLineupsPanel" id="lineups">
                  <div className="publicMatchSectionHead premiumSectionHead"><p className="eyebrow blue">{t.lineupEyebrow}</p><h2>{t.lineups}</h2></div>
                  <div className="publicMatchLineupGrid premiumLineupGrid">
                    <PublicLineup side="home" team={match.home} settings={lineupSettings} entries={lineupEntries} events={events} secondYellowIds={secondYellowIds} playerPhotos={playerPhotos} t={t} locale={locale} />
                    <PublicLineup side="away" team={match.away} settings={lineupSettings} entries={lineupEntries} events={events} secondYellowIds={secondYellowIds} playerPhotos={playerPhotos} t={t} locale={locale} />
                  </div>
                </section>

                {hasInfo ? <section className="publicMatchPanel premiumInfoPanel" id="info">
                  <div className="publicMatchSectionHead premiumSectionHead compact"><p className="eyebrow blue">{t.infoEyebrow}</p><h2>{t.report}</h2></div>
                  <dl className="premiumMatchFacts">
                    {matchStadium ? <div><dt>{t.stadium}</dt><dd>{matchStadium}</dd></div> : null}
                    {report?.referee ? <div><dt>{t.referee}</dt><dd>{report.referee}</dd></div> : null}
                    {report?.attendance != null ? <div><dt>{t.attendance}</dt><dd>{report.attendance.toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU")}</dd></div> : null}
                    {report?.weather ? <div><dt>{t.weather}</dt><dd>{report.weather}</dd></div> : null}
                    {report?.pitch_condition ? <div><dt>{t.pitch}</dt><dd>{report.pitch_condition}</dd></div> : null}
                    {mvpName ? <div className="is-mvp"><dt>{t.mvp}</dt><dd>★ {mvpName}</dd></div> : null}
                  </dl>
                </section> : null}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function MatchMetric({ label, home, away }: { label: string; home: number; away: number }) {
  return <article className="premiumMatchMetric"><span>{label}</span><div><strong>{home}</strong><i>—</i><strong>{away}</strong></div></article>;
}

function scoreAtEnd(events: MatchEvent[], match: ClubMatch) {
  let home = 0;
  let away = 0;
  for (const event of events) {
    if (!eventCountsAsGoal(event)) continue;
    const team = eventScoringTeamId(event, match);
    if (team === String(match.home_team_id)) home += 1;
    if (team === String(match.away_team_id)) away += 1;
  }
  return { home, away };
}

function goalMinutes(events: MatchEvent[], match: ClubMatch, teamId: string) {
  return events.filter(eventCountsAsGoal).filter((event) => eventScoringTeamId(event, match) === teamId).map(eventMinute).join(", ");
}

function TimelineHalf({ label, events, match, locale, scoreAfterEvent, secondYellowIds }: { label: string; events: MatchEvent[]; match: ClubMatch; locale: Locale; scoreAfterEvent: Map<string, { home: number; away: number }>; secondYellowIds: Set<string> }) {
  return (
    <section className="premiumTimelineHalf">
      <header><span>{label}</span></header>
      <div className="premiumTimelineRows">
        {events.length === 0 ? <div className="premiumTimelineEmpty">—</div> : events.map((event) => {
          const scoringTeam = eventCountsAsGoal(event) ? eventScoringTeamId(event, match) : String(event.team_id);
          const isHome = scoringTeam === String(match.home_team_id);
          const goalScore = scoreAfterEvent.get(String(event.id));
          const isSecondYellow = event.event_type === "yellow_card" && secondYellowIds.has(String(event.id));
          const labelText = isSecondYellow ? (locale === "ro" ? "Al doilea galben / roșu" : "Вторая жёлтая / красная") : (eventLabels[locale][event.event_type] ?? event.event_type);
          const icon = isSecondYellow ? "▰■" : (eventIcons[event.event_type] ?? "•");
          return (
            <article className={`premiumTimelineRow ${isHome ? "is-home" : "is-away"} event-${event.event_type}${isSecondYellow ? " second-yellow" : ""}`} key={String(event.id)}>
              <div className="premiumTimelineSide premiumTimelineLeft">{isHome ? <TimelineEventCard event={event} teamName={match.home?.name || "—"} label={labelText} icon={icon} goalScore={goalScore} /> : null}</div>
              <div className="premiumTimelineCenter"><span>{eventMinute(event)}</span><i>{icon}</i></div>
              <div className="premiumTimelineSide premiumTimelineRight">{!isHome ? <TimelineEventCard event={event} teamName={match.away?.name || "—"} label={labelText} icon={icon} goalScore={goalScore} /> : null}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TimelineEventCard({ event, teamName, label, goalScore }: { event: MatchEvent; teamName: string; label: string; icon: string; goalScore?: { home: number; away: number } }) {
  return <div className="premiumTimelineCard"><small>{teamName}</small><strong>{label}{goalScore ? <b>{goalScore.home}:{goalScore.away}</b> : null}</strong><span>{eventPerson(event)}</span>{event.description && event.description !== event.player_name ? <p>{event.description}</p> : null}</div>;
}

function teamLogo(team: ClubMatch["home"]) {
  if (team?.is_club) return CLUB_CREST;
  return team?.logo_url || null;
}

function PublicTeam({ team }: { team: ClubMatch["home"] }) {
  const logo = teamLogo(team);
  return (
    <div className="publicMatchDetailTeam">
      {logo ? <img src={logo} alt="" /> : <span>{(team?.short_name || team?.name || "FC").slice(0, 3).toUpperCase()}</span>}
      <strong>{team?.name ?? "—"}</strong>
    </div>
  );
}

function PublicLineup({ side, team, settings, entries, events, secondYellowIds, playerPhotos, t, locale }: { side: "home" | "away"; team: ClubMatch["home"]; settings: MatchLineupSetting[]; entries: MatchLineupEntry[]; events: MatchEvent[]; secondYellowIds: Set<string>; playerPhotos: Map<string, string>; t: Copy; locale: Locale }) {
  const setting = settings.find((row) => row.side === side);
  const starters = entries.filter((row) => row.side === side && row.lineup_role === "starter");
  const substitutes = entries.filter((row) => row.side === side && row.lineup_role === "substitute");
  const teamName = team?.name ?? (side === "home" ? (locale === "ro" ? "GAZDE" : "ХОЗЯЕВА") : (locale === "ro" ? "OASPEȚI" : "ГОСТИ"));
  return (
    <article className={`publicMatchLineupTeam premiumLineupTeam${team?.is_club ? " is-club" : ""}`}>
      <header>
        <div className="premiumLineupIdentity">{teamLogo(team) ? <img src={teamLogo(team) || ""} alt="" /> : <span>{(team?.short_name || teamName).slice(0,3).toUpperCase()}</span>}<div><h3>{teamName}</h3><small>{side === "home" ? (locale === "ro" ? "GAZDE" : "ХОЗЯЕВА") : (locale === "ro" ? "OASPEȚI" : "ГОСТИ")}</small></div></div>
        <div className="premiumLineupMeta">{setting?.formation ? <span>{t.formation}: <b>{setting.formation}</b></span> : null}{setting?.coach_name ? <span>{t.coach}: <b>{setting.coach_name}</b></span> : null}</div>
      </header>
      {starters.length === 0 && substitutes.length === 0 ? <div className="adminEmpty">{t.noLineup}</div> : (
        <>
          <h4>{t.starters}</h4>
          <div className="publicLineupRows">{starters.map((row) => <LineupRow row={row} t={t} locale={locale} events={events} secondYellowIds={secondYellowIds} photo={row.player_id ? playerPhotos.get(String(row.player_id)) : undefined} key={String(row.id)} />)}</div>
          {substitutes.length > 0 ? <><h4>{t.substitutes}</h4><div className="publicLineupRows substitutes">{substitutes.map((row) => <LineupRow row={row} t={t} locale={locale} events={events} secondYellowIds={secondYellowIds} photo={row.player_id ? playerPhotos.get(String(row.player_id)) : undefined} key={String(row.id)} />)}</div></> : null}
        </>
      )}
    </article>
  );
}

function LineupRow({ row, t, locale, events, secondYellowIds, photo }: { row: MatchLineupEntry; t: Copy; locale: Locale; events: MatchEvent[]; secondYellowIds: Set<string>; photo?: string }) {
  const name = (row.player_name || "").trim().toLocaleLowerCase();
  const playerEvents = events.filter((event) => (event.player_name || "").trim().toLocaleLowerCase() === name || (event.related_player_name || "").trim().toLocaleLowerCase() === name);
  const goals = playerEvents.filter((event) => (event.event_type === "goal" || event.event_type === "penalty_goal") && (event.player_name || "").trim().toLocaleLowerCase() === name).length;
  const ownGoals = playerEvents.filter((event) => event.event_type === "own_goal" && (event.player_name || "").trim().toLocaleLowerCase() === name).length;
  const yellows = playerEvents.filter((event) => event.event_type === "yellow_card" && (event.player_name || "").trim().toLocaleLowerCase() === name).length;
  const reds = playerEvents.filter((event) => (event.event_type === "red_card" || secondYellowIds.has(String(event.id))) && (event.player_name || "").trim().toLocaleLowerCase() === name).length;
  const subOut = playerEvents.some((event) => event.event_type === "substitution" && (event.player_name || "").trim().toLocaleLowerCase() === name);
  const subIn = playerEvents.some((event) => event.event_type === "substitution" && (event.related_player_name || "").trim().toLocaleLowerCase() === name);
  return (
    <div className="publicLineupRow premiumLineupRow">
      <div className="premiumLineupAvatar">{photo ? <img src={photo} alt="" /> : <span>{row.shirt_number ?? "—"}</span>}</div>
      <b>{row.shirt_number ?? "—"}</b>
      <span className="premiumLineupName">{row.player_name || "—"}<small>{row.position ?? ""}</small></span>
      <div className="premiumLineupBadges">{row.is_captain ? <i title={t.captain}>C</i> : null}{goals ? <i>⚽{goals > 1 ? goals : ""}</i> : null}{ownGoals ? <i>{locale === "ro" ? "AG" : "АГ"}</i> : null}{yellows ? <i className="yellow">{yellows > 1 ? `🟨${yellows}` : "🟨"}</i> : null}{reds ? <i className="red">🟥</i> : null}{subIn ? <i>↗</i> : null}{subOut ? <i>↘</i> : null}</div>
    </div>
  );
}
