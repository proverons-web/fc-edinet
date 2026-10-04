import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import type { ClubMatch, MatchEvent, MatchLineupEntry, MatchLineupSetting, MatchReport } from "@/lib/types";

export const dynamic = "force-dynamic";

type Locale = "ru" | "ro";

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

function matchSelect() {
  return `id,competition_id,home_team_id,away_team_id,kickoff,stadium,round,status,home_score,away_score,notes,created_at,updated_at,
  home:teams!matches_home_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
  away:teams!matches_away_team_id_fkey(id,name,short_name,slug,city,home_stadium,logo_url,is_club,is_active),
  competition:competitions!matches_competition_id_fkey(id,name,slug,season,is_active)`;
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
  const supabase = await createClient();

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select(matchSelect())
    .eq("id", id)
    .maybeSingle();
  if (matchError || !matchData) notFound();
  const match = matchData as unknown as ClubMatch;

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

  return (
    <main className="publicMatchDetailPage">
      <section className="publicMatchDetailHero">
        <div className="container">
          <Link href="/matches" className="publicMatchBack">{t.back}</Link>
          <div className="publicMatchDetailMeta">
            <span>{match.competition?.name ?? t.match}</span>
            <strong>{formatDate(match.kickoff, locale)}</strong>
            <small>{[match.round, match.stadium].filter(Boolean).join(" • ")}</small>
          </div>
          <div className="publicMatchScoreBoard">
            <PublicTeam team={match.home} />
            <div className="publicMatchBigScore">
              <b>{statusHasScore ? `${match.home_score ?? 0} : ${match.away_score ?? 0}` : "VS"}</b>
              <span>{t.protocol}</span>
            </div>
            <PublicTeam team={match.away} />
          </div>
        </div>
      </section>

      <section className="section publicMatchProtocolSection">
        <div className="container">
          {!published ? (
            <div className="publicMatchProtocolEmpty">
              <strong>{t.notPublished}</strong>
              <span>{t.notPublishedHint}</span>
            </div>
          ) : (
            <div className="publicMatchProtocolGrid">
              <div className="publicMatchProtocolMain">
                <section className="publicMatchPanel publicMatchTimelinePublic">
                  <div className="publicMatchSectionHead"><p className="eyebrow blue">LIVE STORY</p><h2>{t.timeline}</h2></div>
                  {events.length === 0 ? <div className="adminEmpty">{t.noEvents}</div> : (
                    <div className="publicMatchEventList">
                      {events.map((event) => {
                        const isHome = String(event.team_id) === String(match.home_team_id);
                        return (
                          <article className={`publicMatchEvent ${isHome ? "home" : "away"}`} key={String(event.id)}>
                            <div className="publicMatchEventMinute">{eventMinute(event)}</div>
                            <div className="publicMatchEventIcon">{eventIcons[event.event_type] ?? "•"}</div>
                            <div className="publicMatchEventBody">
                              <small>{isHome ? match.home?.name : match.away?.name}</small>
                              <strong>{eventLabels[locale][event.event_type] ?? event.event_type}</strong>
                              <span>{eventPerson(event)}</span>
                              {event.description && event.description !== event.player_name ? <p>{event.description}</p> : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                {report?.summary ? (
                  <section className="publicMatchPanel publicMatchReportText">
                    <div className="publicMatchSectionHead"><p className="eyebrow blue">MATCH REPORT</p><h2>{t.report}</h2></div>
                    <p>{report.summary}</p>
                  </section>
                ) : null}
              </div>

              <aside className="publicMatchProtocolSide">
                <section className="publicMatchPanel">
                  <div className="publicMatchSectionHead compact"><p className="eyebrow blue">INFO</p><h3>{t.report}</h3></div>
                  <dl className="publicMatchFacts">
                    {report?.referee ? <><dt>{t.referee}</dt><dd>{report.referee}</dd></> : null}
                    {report?.attendance != null ? <><dt>{t.attendance}</dt><dd>{report.attendance.toLocaleString(locale === "ro" ? "ro-RO" : "ru-RU")}</dd></> : null}
                    {report?.weather ? <><dt>{t.weather}</dt><dd>{report.weather}</dd></> : null}
                    {report?.pitch_condition ? <><dt>{t.pitch}</dt><dd>{report.pitch_condition}</dd></> : null}
                    {mvpName ? <><dt>{t.mvp}</dt><dd>{mvpName}</dd></> : null}
                  </dl>
                </section>
              </aside>

              <section className="publicMatchPanel publicMatchLineupsPanel">
                <div className="publicMatchSectionHead"><p className="eyebrow blue">XI</p><h2>{t.lineups}</h2></div>
                <div className="publicMatchLineupGrid">
                  <PublicLineup side="home" teamName={match.home?.name ?? "HOME"} settings={lineupSettings} entries={lineupEntries} t={t} />
                  <PublicLineup side="away" teamName={match.away?.name ?? "AWAY"} settings={lineupSettings} entries={lineupEntries} t={t} />
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function PublicTeam({ team }: { team: ClubMatch["home"] }) {
  return (
    <div className="publicMatchDetailTeam">
      {team?.logo_url ? <img src={team.logo_url} alt="" /> : <span className={team?.is_club ? "club" : ""}>{(team?.short_name || team?.name || "FC").slice(0, 3).toUpperCase()}</span>}
      <strong>{team?.name ?? "—"}</strong>
    </div>
  );
}

function PublicLineup({
  side,
  teamName,
  settings,
  entries,
  t,
}: {
  side: "home" | "away";
  teamName: string;
  settings: MatchLineupSetting[];
  entries: MatchLineupEntry[];
  t: Copy;
}) {
  const setting = settings.find((row) => row.side === side);
  const starters = entries.filter((row) => row.side === side && row.lineup_role === "starter");
  const substitutes = entries.filter((row) => row.side === side && row.lineup_role === "substitute");
  return (
    <article className="publicMatchLineupTeam">
      <header>
        <h3>{teamName}</h3>
        {setting?.formation ? <span>{t.formation}: {setting.formation}</span> : null}
        {setting?.coach_name ? <small>{t.coach}: {setting.coach_name}</small> : null}
      </header>
      {starters.length === 0 && substitutes.length === 0 ? <div className="adminEmpty">{t.noLineup}</div> : (
        <>
          <h4>{t.starters}</h4>
          <div className="publicLineupRows">{starters.map((row) => <LineupRow row={row} t={t} key={String(row.id)} />)}</div>
          {substitutes.length > 0 ? <><h4>{t.substitutes}</h4><div className="publicLineupRows substitutes">{substitutes.map((row) => <LineupRow row={row} t={t} key={String(row.id)} />)}</div></> : null}
        </>
      )}
    </article>
  );
}

function LineupRow({ row, t }: { row: MatchLineupEntry; t: Copy }) {
  return (
    <div className="publicLineupRow">
      <b>{row.shirt_number ?? "—"}</b>
      <span>{row.player_name || "—"}{row.is_captain ? ` · ${t.captain}` : ""}</span>
      <small>{row.position ?? ""}</small>
    </div>
  );
}
