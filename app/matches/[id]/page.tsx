import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
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

const positionLabels: Record<Locale, Record<string, string>> = {
  ru: {
    goalkeeper: "Вратарь",
    defender: "Защитник",
    midfielder: "Полузащитник",
    forward: "Нападающий",
  },
  ro: {
    goalkeeper: "Portar",
    defender: "Fundaș",
    midfielder: "Mijlocaș",
    forward: "Atacant",
  },
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
  let playerSlugs = new Map<string, string>();
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
      const { data: lineupPlayers } = await supabase.from("players").select("id,photo_url,slug").in("id", playerIds);
      playerPhotos = new Map((lineupPlayers ?? []).filter((row) => row.photo_url).map((row) => [String(row.id), String(row.photo_url)]));
      playerSlugs = new Map((lineupPlayers ?? []).filter((row) => row.slug).map((row) => [String(row.id), String(row.slug)]));
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
                    <HorizontalMatchTimeline
                      events={events}
                      match={match}
                      locale={locale}
                      scoreAfterEvent={scoreAfterEvent}
                      secondYellowIds={secondYellowIds}
                      halfTimeScore={halfTimeScore}
                    />
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
                    <PublicLineup side="home" team={match.home} settings={lineupSettings} entries={lineupEntries} events={events} secondYellowIds={secondYellowIds} playerPhotos={playerPhotos} playerSlugs={playerSlugs} t={t} locale={locale} />
                    <PublicLineup side="away" team={match.away} settings={lineupSettings} entries={lineupEntries} events={events} secondYellowIds={secondYellowIds} playerPhotos={playerPhotos} playerSlugs={playerSlugs} t={t} locale={locale} />
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

function horizontalEventPosition(event: MatchEvent, half: "first" | "second") {
  const minute = Number(event.minute) || 0;
  const stoppage = Math.max(0, Number(event.stoppage_minute) || 0);
  if (half === "first") {
    if (minute >= 45) return Math.min(98.5, 96 + stoppage * 0.35);
    return Math.max(2, Math.min(96, (minute / 45) * 100));
  }
  if (minute >= 90) return Math.min(98.5, 96 + stoppage * 0.35);
  return Math.max(2, Math.min(96, ((minute - 45) / 45) * 100));
}

function eventDisplayTeamId(event: MatchEvent, match: ClubMatch) {
  return event.event_type === "own_goal" ? eventScoringTeamId(event, match) : String(event.team_id);
}

function eventGlyphClass(event: MatchEvent, secondYellow: boolean) {
  if (secondYellow) return "second-yellow";
  if (event.event_type === "yellow_card") return "yellow-card";
  if (event.event_type === "red_card") return "red-card";
  if (event.event_type === "goal" || event.event_type === "penalty_goal" || event.event_type === "own_goal") return "goal";
  if (event.event_type === "substitution") return "substitution";
  if (event.event_type === "penalty_miss") return "penalty-miss";
  if (event.event_type === "var") return "var";
  if (event.event_type === "injury") return "injury";
  return "other";
}

function EventGlyph({ event, secondYellow }: { event: MatchEvent; secondYellow: boolean }) {
  const kind = eventGlyphClass(event, secondYellow);
  const content = kind === "goal" ? "⚽" : kind === "substitution" ? "⇄" : kind === "penalty-miss" ? "×" : kind === "var" ? "VAR" : kind === "injury" ? "+" : kind === "other" ? "•" : "";
  return <span className={`horizontalEventGlyph is-${kind}`} aria-hidden="true">{content}</span>;
}

function buildTimelineLanes(events: MatchEvent[], match: ClubMatch, half: "first" | "second") {
  const counters = new Map<string, number>();
  return events.map((event) => {
    const displayTeam = eventDisplayTeamId(event, match);
    const side = displayTeam === String(match.home_team_id) ? "home" : "away";
    const key = `${side}-${event.minute}-${event.stoppage_minute || 0}`;
    const lane = counters.get(key) ?? 0;
    counters.set(key, lane + 1);
    const shift = lane === 0 ? 0 : Math.ceil(lane / 2) * 18 * (lane % 2 === 1 ? 1 : -1);
    return { event, side, shift, position: horizontalEventPosition(event, half) };
  });
}

function HorizontalMatchTimeline({ events, match, locale, scoreAfterEvent, secondYellowIds, halfTimeScore }: {
  events: MatchEvent[];
  match: ClubMatch;
  locale: Locale;
  scoreAfterEvent: Map<string, { home: number; away: number }>;
  secondYellowIds: Set<string>;
  halfTimeScore: { home: number; away: number };
}) {
  const first = buildTimelineLanes(events.filter((event) => Number(event.minute) <= 45), match, "first");
  const second = buildTimelineLanes(events.filter((event) => Number(event.minute) > 45), match, "second");
  return (
    <div className="horizontalTimelineViewport" role="region" aria-label={locale === "ro" ? "Cronologia meciului" : "Хронология матча"} tabIndex={0}>
      <div className="horizontalTimelineCanvas">
        <div className="horizontalTimelineTeamLegend" aria-hidden="true">
          <span>{match.home?.short_name || match.home?.name || (locale === "ro" ? "Gazde" : "Хозяева")}</span>
          <span>{match.away?.short_name || match.away?.name || (locale === "ro" ? "Oaspeți" : "Гости")}</span>
        </div>
        <div className="horizontalTimelineGrid">
          <TimelineSegment
            half="first"
            items={first}
            match={match}
            locale={locale}
            scoreAfterEvent={scoreAfterEvent}
            secondYellowIds={secondYellowIds}
          />
          <div className="horizontalHalfTime" aria-label={`${locale === "ro" ? "Pauză" : "Перерыв"} ${halfTimeScore.home}:${halfTimeScore.away}`}>
            <span>{locale === "ro" ? "PAUZĂ" : "ПЕРЕРЫВ"}</span>
            <strong>{halfTimeScore.home}:{halfTimeScore.away}</strong>
          </div>
          <TimelineSegment
            half="second"
            items={second}
            match={match}
            locale={locale}
            scoreAfterEvent={scoreAfterEvent}
            secondYellowIds={secondYellowIds}
          />
        </div>
      </div>
    </div>
  );
}

function TimelineSegment({ half, items, match, locale, scoreAfterEvent, secondYellowIds }: {
  half: "first" | "second";
  items: Array<{ event: MatchEvent; side: string; shift: number; position: number }>;
  match: ClubMatch;
  locale: Locale;
  scoreAfterEvent: Map<string, { home: number; away: number }>;
  secondYellowIds: Set<string>;
}) {
  const ticks = half === "first" ? [15, 30, 45] : [60, 75, 90];
  return (
    <section className={`horizontalTimelineSegment is-${half}`}>
      <div className="horizontalTimelineHalfLabel">{half === "first" ? (locale === "ro" ? "PRIMA REPRIZĂ" : "1 ТАЙМ") : (locale === "ro" ? "REPRIZA A DOUA" : "2 ТАЙМ")}</div>
      <div className="horizontalTimelineAxis" />
      {ticks.map((tick, index) => <div key={tick} className="horizontalTimelineTick" style={{ left: `${((index + 1) / 3) * 100}%` }}><i/><span>{tick}′</span></div>)}
      {items.map(({ event, side, shift, position }) => {
        const isSecondYellow = event.event_type === "yellow_card" && secondYellowIds.has(String(event.id));
        const label = isSecondYellow ? (locale === "ro" ? "Al doilea galben / roșu" : "Вторая жёлтая / красная") : (eventLabels[locale][event.event_type] ?? event.event_type);
        const goalScore = scoreAfterEvent.get(String(event.id));
        const originalTeam = String(event.team_id) === String(match.home_team_id) ? match.home : match.away;
        const tooltipTeam = originalTeam?.name || "—";
        const substitutionText = event.event_type === "substitution" ? `${event.player_name || "—"} → ${event.related_player_name || "—"}` : null;
        const style = { left: `${position}%`, "--event-shift": `${shift}px` } as CSSProperties;
        return (
          <button
            type="button"
            key={String(event.id)}
            className={`horizontalTimelineEvent is-${side} event-${event.event_type}${isSecondYellow ? " second-yellow" : ""}`}
            style={style}
            aria-label={`${eventMinute(event)} ${label}: ${eventPerson(event)}`}
          >
            <EventGlyph event={event} secondYellow={isSecondYellow} />
            <span className="horizontalEventTooltip" role="tooltip">
              <b>{eventMinute(event)} · {label}{goalScore ? ` · ${goalScore.home}:${goalScore.away}` : ""}</b>
              <strong>{substitutionText || eventPerson(event)}</strong>
              <small>{tooltipTeam}</small>
              {event.description && event.description !== event.player_name ? <em>{event.description}</em> : null}
            </span>
          </button>
        );
      })}
    </section>
  );
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

function PublicLineup({ side, team, settings, entries, events, secondYellowIds, playerPhotos, playerSlugs, t, locale }: { side: "home" | "away"; team: ClubMatch["home"]; settings: MatchLineupSetting[]; entries: MatchLineupEntry[]; events: MatchEvent[]; secondYellowIds: Set<string>; playerPhotos: Map<string, string>; playerSlugs: Map<string, string>; t: Copy; locale: Locale }) {
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
          <div className="publicLineupRows">{starters.map((row) => <LineupRow row={row} t={t} locale={locale} events={events} secondYellowIds={secondYellowIds} photo={row.player_id ? playerPhotos.get(String(row.player_id)) : undefined} profileSlug={row.player_id ? playerSlugs.get(String(row.player_id)) : undefined} isClub={Boolean(team?.is_club)} key={String(row.id)} />)}</div>
          {substitutes.length > 0 ? <><h4>{t.substitutes}</h4><div className="publicLineupRows substitutes">{substitutes.map((row) => <LineupRow row={row} t={t} locale={locale} events={events} secondYellowIds={secondYellowIds} photo={row.player_id ? playerPhotos.get(String(row.player_id)) : undefined} profileSlug={row.player_id ? playerSlugs.get(String(row.player_id)) : undefined} isClub={Boolean(team?.is_club)} key={String(row.id)} />)}</div></> : null}
        </>
      )}
    </article>
  );
}

function LineupRow({ row, t, locale, events, secondYellowIds, photo, profileSlug, isClub }: {
  row: MatchLineupEntry;
  t: Copy;
  locale: Locale;
  events: MatchEvent[];
  secondYellowIds: Set<string>;
  photo?: string;
  profileSlug?: string;
  isClub: boolean;
}) {
  const name = (row.player_name || "").trim().toLocaleLowerCase();
  const playerEvents = events.filter((event) => (event.player_name || "").trim().toLocaleLowerCase() === name || (event.related_player_name || "").trim().toLocaleLowerCase() === name);
  const goals = playerEvents.filter((event) => (event.event_type === "goal" || event.event_type === "penalty_goal") && (event.player_name || "").trim().toLocaleLowerCase() === name).length;
  const ownGoals = playerEvents.filter((event) => event.event_type === "own_goal" && (event.player_name || "").trim().toLocaleLowerCase() === name).length;
  const yellows = playerEvents.filter((event) => event.event_type === "yellow_card" && (event.player_name || "").trim().toLocaleLowerCase() === name).length;
  const reds = playerEvents.filter((event) => (event.event_type === "red_card" || secondYellowIds.has(String(event.id))) && (event.player_name || "").trim().toLocaleLowerCase() === name).length;
  const substitutions = playerEvents.filter((event) => event.event_type === "substitution" && ((event.player_name || "").trim().toLocaleLowerCase() === name || (event.related_player_name || "").trim().toLocaleLowerCase() === name));
  const localizedPosition = positionLabels[locale][String(row.position || "").toLowerCase()] || row.position || "";
  const playerName = <span className="premiumLineupName">{row.player_name || "—"}<small>{localizedPosition}</small></span>;
  return (
    <div className="publicLineupRow premiumLineupRow">
      {isClub && profileSlug ? (
        <Link className="premiumLineupPlayerLink" href={`/team/${profileSlug}`} aria-label={`${row.player_name || "—"} — ${locale === "ro" ? "profil" : "профиль"}`}>
          <div className="premiumLineupAvatar">{photo ? <img src={photo} alt="" /> : <span>{row.shirt_number ?? "—"}</span>}</div>
          <b>{row.shirt_number ?? "—"}</b>
          {playerName}
        </Link>
      ) : (
        <>
          <div className="premiumLineupAvatar">{photo ? <img src={photo} alt="" /> : <span>{row.shirt_number ?? "—"}</span>}</div>
          <b>{row.shirt_number ?? "—"}</b>
          {playerName}
        </>
      )}
      <div className="premiumLineupBadges">
        {row.is_captain ? <i className="captain" data-tooltip={t.captain}>C</i> : null}
        {goals ? <i className="goal" data-tooltip={locale === "ro" ? `${goals} gol(uri)` : `${goals} гол(а)`}>⚽{goals > 1 ? goals : ""}</i> : null}
        {ownGoals ? <i className="own-goal" data-tooltip={locale === "ro" ? "Autogol" : "Автогол"}>{locale === "ro" ? "AG" : "АГ"}</i> : null}
        {yellows ? <i className="yellow-card" data-tooltip={locale === "ro" ? `${yellows} cartonaș(e) galben(e)` : `${yellows} жёлтая карточка`}>{yellows > 1 ? yellows : ""}</i> : null}
        {reds ? <i className="red-card" data-tooltip={locale === "ro" ? "Cartonaș roșu" : "Красная карточка"}></i> : null}
        {substitutions.map((event) => <i className="substitution" key={`sub-${String(event.id)}`} data-tooltip={`${eventMinute(event)} · ${event.player_name || "—"} → ${event.related_player_name || "—"}`}>⇄</i>)}
      </div>
    </div>
  );
}
