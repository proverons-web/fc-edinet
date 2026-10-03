import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type {
  ClubMatch,
  MatchCenterProgress,
  MatchReport,
  MatchTeamStatistic,
  Player,
} from "@/lib/types";
import { saveMatchReportFoundation } from "./actions";

export const metadata = { title: "Матч-центр — Админ" };
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

function stateLabel(value: string) {
  if (value === "complete") return "Готово";
  if (value === "draft") return "Черновик";
  return "Не заполнено";
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

  const [reportResult, teamStatsResult, progressResult, playersResult] = await Promise.all([
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
  ]);

  const loadError =
    reportResult.error || teamStatsResult.error || progressResult.error || playersResult.error;
  if (loadError) {
    return <MatchCenterMigrationRequired message={loadError.message} />;
  }

  const report = (reportResult.data as MatchReport | null) ?? null;
  const teamStats = (teamStatsResult.data ?? []) as MatchTeamStatistic[];
  const progress = (progressResult.data as MatchCenterProgress | null) ?? null;
  const players = (playersResult.data ?? []) as Player[];

  const homeFoundation = teamStats.find((row) => row.side === "home") ?? null;
  const awayFoundation = teamStats.find((row) => row.side === "away") ?? null;
  const foundationReady = Boolean(homeFoundation && awayFoundation);
  const reportHasMetadata = Boolean(progress?.report_has_metadata);

  return (
    <main className="adminPage matchCenterPage">
      <section className="adminHero compactAdminHero matchCenterHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • MATCH CENTER v2.3.0</p>
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
          {saved && (
            <div className="statisticsSuccess matchCenterNotice">
              Основа матч-центра сохранена.
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
              value={String(progress?.events_count ?? 0)}
              tone={(progress?.events_count ?? 0) > 0 ? "draft" : "empty"}
              detail="Таймлайн — v2.3.1"
            />
          </section>

          <div className="matchCenterLayout">
            <form action={saveMatchReportFoundation} className="statisticsPanel matchCenterForm">
              <input type="hidden" name="match_id" value={String(match.id)} />
              <div className="statisticsPanelHead">
                <div>
                  <p className="eyebrow blue">ОСНОВА ОТЧЁТА</p>
                  <h2>Данные матча</h2>
                  <p>
                    Эти поля станут верхней частью будущей публичной страницы матча.
                    Их можно заполнять постепенно — сейчас всё сохраняется как черновик.
                  </p>
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
                  <textarea name="summary" rows={7} maxLength={5000} defaultValue={report?.summary ?? ""} placeholder="Кратко опиши ход матча. В v2.3.4 этот текст сможет использоваться на публичной странице." />
                </label>
              </div>

              <div className="matchCenterFormFooter">
                <p>v2.3.0 сохраняет основу. Статус «Готово» появится после подключения событий, составов и командной статистики.</p>
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
                  Миграция 041 создаёт две отдельные строки — хозяева и гости. В v2.3.3 сюда подключим владение, удары, угловые, фолы, офсайды, передачи, сейвы и xG.
                </p>
              </section>

              <section className="statisticsPanel matchCenterRoadmap">
                <p className="eyebrow blue">СЛЕДУЮЩИЕ ШАГИ</p>
                <RoadmapStep version="v2.3.1" title="События / таймлайн" />
                <RoadmapStep version="v2.3.2" title="Составы и замены" />
                <RoadmapStep version="v2.3.3" title="Командная статистика" />
                <RoadmapStep version="v2.3.4" title="Публичная страница матча" />
              </section>

              <section className="statisticsPanel">
                <p className="eyebrow blue">СТАТИСТИКА ИГРОКОВ</p>
                <h3>{stateLabel(progress?.player_stats_status ?? "empty")}</h3>
                <p className="matchCenterHelp">Игроки остаются в отдельной проверенной системе v2.2 и связываются с этим же match_id.</p>
                <Link className="rowAction" href={`/admin/statistics/${match.id}`}>Открыть игроков →</Link>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
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
