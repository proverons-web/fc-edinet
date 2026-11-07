import Link from "next/link";
import { notFound } from "next/navigation";
import ClubSectionShell from "@/app/components/ClubSectionShell";
import { archiveDate, archiveLink, archivePage, clubArchiveOutcome } from "@/lib/club-seasons";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";
import type { ClubSeasonHistory, Season } from "@/lib/types";
import { HISTORY_COPY, historyEventHref, historyText, type ClubHistoryEvent } from "@/lib/club-history";
import "../season-archive.css";
import "../../history/history-timeline.css";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 15;
type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; competition?: string }> };
type TeamRef = { id: number | string; name: string; short_name: string | null; logo_url: string | null; is_club: boolean } | null;
type MatchRow = {
  id: number | string; kickoff: string; round: string | null;
  home_score: number | null; away_score: number | null; status: string;
  home: TeamRef; away: TeamRef;
  competition: { id: number | string; name: string } | null;
};
type CompetitionRow = { id: string | number; name: string; season_id: string | number | null };

export async function generateMetadata({ params }: { params: Params["params"] }) {
  const locale = await getLocale();
  const { slug } = await params;
  const { data } = await createPublicClient().from("seasons").select("name").eq("slug", slug).eq("is_active", true).maybeSingle();
  const title = data ? (locale === "ro" ? `Sezonul ${data.name} — FC Edineț` : `Сезон ${data.name} — FC Edineț`) : "FC Edineț";
  return publicMetadata({ title, description: locale === "ro" ? "Rezultatele istorice ale FC Edineț." : "Исторические результаты FC Edineț.", path: `/club/seasons/${encodeURIComponent(slug)}`, locale });
}

export default async function ClubSeasonDetailPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const query = await searchParams;
  const locale = await getLocale();
  const ro = locale === "ro";
  const label = (ru: string, romanian: string) => ro ? romanian : ru;
  const db = createPublicClient();
  const { data: seasonData, error: seasonError } = await db.from("seasons")
    .select("id,name,slug,starts_on,ends_on,is_current,is_active").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (seasonError) throw seasonError;
  if (!seasonData) notFound();
  const season = seasonData as Season;
  const [historyResponse, competitionsResponse, clubResponse, eventsResponse] = await Promise.all([
    db.from("club_season_history").select("season_id,played,wins,draws,losses,goals_for,goals_against,goal_difference,win_rate,statistics_complete,players_with_stats").eq("season_id", season.id).maybeSingle(),
    db.from("competitions").select("id,name,season_id").eq("season_id", season.id).eq("is_active", true).order("name"),
    db.from("teams").select("id").eq("is_club", true).eq("is_active", true),
    db.from("club_history_events").select("id,event_year,title,title_ro")
      .eq("season_id", season.id).eq("is_published", true)
      .order("event_year", { ascending: false }).limit(6),
  ]);
  const competitions = (competitionsResponse.data ?? []) as CompetitionRow[];
  const clubIds = (clubResponse.data ?? []).map((team) => String(team.id)).filter((id) => /^\d+$/.test(id));
  const errors = [historyResponse.error, competitionsResponse.error, clubResponse.error].filter(Boolean);
  const requestedCompetition = query.competition && /^\d+$/.test(query.competition) ? query.competition : "";
  const selectedCompetition = competitions.find((item) => String(item.id) === requestedCompetition);
  const ids = (selectedCompetition ? [selectedCompetition] : competitions).map((item) => Number(item.id));
  const page = archivePage(query.page);
  let matches: MatchRow[] = [];
  let total = 0;
  let matchError = false;
  if (!errors.length && ids.length && clubIds.length) {
    const clubFilter = clubIds.flatMap((id) => [`home_team_id.eq.${id}`, `away_team_id.eq.${id}`]).join(",");
    const response = await db.from("matches")
      .select("id,kickoff,round,home_score,away_score,status,home:teams!matches_home_team_id_fkey(id,name,short_name,logo_url,is_club),away:teams!matches_away_team_id_fkey(id,name,short_name,logo_url,is_club),competition:competitions!matches_competition_id_fkey(id,name)", { count: "exact" })
      .in("competition_id", ids).eq("status", "finished").or(clubFilter)
      .order("kickoff", { ascending: false }).order("id", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    matchError = Boolean(response.error);
    matches = (response.data ?? []) as unknown as MatchRow[];
    total = response.count ?? 0;
  }
  const stat = historyResponse.data as unknown as ClubSeasonHistory | null;
  const relatedEvents = (eventsResponse.data ?? []) as Pick<ClubHistoryEvent, "id"|"event_year"|"title"|"title_ro">[];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCompetitionId = selectedCompetition ? String(selectedCompetition.id) : undefined;

  return <ClubSectionShell locale={locale} active="seasons" title={season.name}>
    <header className="clubSeasonHero"><div className="container">
      <Link className="clubSeasonBack" href="/club/seasons">← {label("Все сезоны", "Toate sezoanele")}</Link>
      <p className="eyebrow">FC EDINEȚ · {label("АРХИВ СЕЗОНА", "ARHIVA SEZONULUI")}</p>
      <h1>{label("Сезон", "Sezonul")} {season.name}</h1>
      <p>{label("Результаты FC Edineț, сохранённые в официальном архиве клуба.", "Rezultatele FC Edineț păstrate în arhiva clubului.")}</p>
      <div className="clubSeasonHeroLinks"><Link href={`/statistics?season=${season.id}`}>{label("Статистика игроков", "Statistica jucătorilor")} ↗</Link><Link href="/club/hall-of-fame">{label("Зал славы", "Galeria de onoare")} ↗</Link></div>
    </div></header>
    <section className="section clubSeasonSection"><div className="container">
      {errors.length || matchError ? <div className="clubSeasonNotice" role="alert">{label("Не удалось загрузить все данные сезона. Попробуйте обновить страницу.", "Nu toate datele sezonului au putut fi încărcate. Reîncărcați pagina.")}</div> : <>
        <div className="clubSeasonHeading"><div><p className="eyebrow blue">{label("ИТОГИ", "BILANȚ")}</p><h2>{label("Результаты сезона", "Rezultatele sezonului")}</h2></div>{season.is_current && <span>{label("Текущий сезон", "Sezonul actual")}</span>}</div>
        {stat && stat.played > 0 ? <div className="clubSeasonTotals">
          {[
            [label("Матчи", "Meciuri"), stat.played],
            [label("Победы", "Victorii"), stat.wins],
            [label("Ничьи", "Egaluri"), stat.draws],
            [label("Поражения", "Înfrângeri"), stat.losses],
            [label("Забито", "Marcate"), stat.goals_for],
            [label("Пропущено", "Primite"), stat.goals_against],
          ].map(([name, value]) => <div key={name}><small>{name}</small><strong>{value}</strong></div>)}
        </div> : <div className="clubSeasonNotice">{label("Для этого сезона пока не опубликованы завершённые матчи.", "Nu există încă meciuri încheiate publicate pentru acest sezon.")}</div>}
        {relatedEvents.length > 0 && <section className="clubRelatedHistory" aria-labelledby="season-related-events-title">
          <h2 id="season-related-events-title">{HISTORY_COPY[locale].related}</h2>
          <ul>{relatedEvents.map(event => <li key={event.id}><Link href={historyEventHref(event.id)}><span>{event.event_year}</span>{historyText(event.title,event.title_ro,locale)}</Link></li>)}</ul>
        </section>}
        <div className="clubSeasonHeading clubSeasonMatchesHeading"><div><p className="eyebrow blue">{label("МАТЧИ", "MECIURI")}</p><h2>{label("Протоколы и счёт", "Rapoarte și scoruri")}</h2></div><span>{total} {label("в списке", "în listă")}</span></div>
        {competitions.length > 1 && <nav className="clubSeasonFilters" aria-label={label("Турниры сезона", "Competițiile sezonului")}>
          <Link href={archiveLink(slug)} className={!activeCompetitionId ? "selected" : ""} aria-current={!activeCompetitionId ? "page" : undefined}>{label("Все турниры", "Toate competițiile")}</Link>
          {competitions.map((competition) => <Link key={competition.id} href={archiveLink(slug, String(competition.id))} className={String(competition.id) === activeCompetitionId ? "selected" : ""} aria-current={String(competition.id) === activeCompetitionId ? "page" : undefined}>{competition.name}</Link>)}
        </nav>}
        {matches.length ? <div className="clubSeasonMatchList">{matches.map((match) => {
          const outcome = clubArchiveOutcome(match);
          return <Link href={`/matches/${match.id}`} className="clubSeasonMatch" key={match.id}>
            <div className="clubSeasonMatchMeta"><time dateTime={match.kickoff}>{archiveDate(match.kickoff, locale)}</time><span>{match.competition?.name ?? "FC Edineț"}{match.round ? ` · ${match.round}` : ""}</span></div>
            <div className="clubSeasonMatchTeams"><span className={match.home?.is_club ? "isClub" : ""}>{match.home?.logo_url && <img src={match.home.logo_url} alt="" loading="lazy"/>}{match.home?.name ?? "—"}</span><b>{match.home_score === null || match.away_score === null ? "— : —" : `${match.home_score} : ${match.away_score}`}</b><span className={match.away?.is_club ? "isClub" : ""}>{match.away?.logo_url && <img src={match.away.logo_url} alt="" loading="lazy"/>}{match.away?.name ?? "—"}</span></div>
            <div className="clubSeasonMatchEnd">{outcome && <span className={`clubSeasonOutcome ${outcome}`}>{outcome === "win" ? label("П", "V") : outcome === "draw" ? label("Н", "E") : label("Пр", "Î")}</span>}<span className="clubSeasonMatchArrow" aria-hidden="true">→</span></div>
          </Link>;
        })}</div> : <div className="clubSeasonNotice">{label("Завершённые матчи не найдены для выбранного турнира.", "Nu există meciuri încheiate pentru competiția selectată.")}</div>}
        {totalPages > 1 && <nav className="clubSeasonPagination" aria-label={label("Страницы матчей", "Paginile meciurilor")}>
          {page > 1 ? <Link href={archiveLink(slug, activeCompetitionId, page - 1)}>← {label("Назад", "Înapoi")}</Link> : <span/>}
          <span>{label("Страница", "Pagina")} {Math.min(page, totalPages)} / {totalPages}</span>
          {page < totalPages ? <Link href={archiveLink(slug, activeCompetitionId, page + 1)}>{label("Далее", "Înainte")} →</Link> : <span/>}
        </nav>}
        <div className="clubSeasonBottomLinks"><Link href="/club/archive">{label("Исторические фотографии", "Fotografii de arhivă")} →</Link><Link href="/club/history">{label("История клуба", "Istoria clubului")} →</Link></div>
      </>}
    </div></section>
  </ClubSectionShell>;
}
