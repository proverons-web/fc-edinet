import Link from "next/link";
import ClubSectionShell from "@/app/components/ClubSectionShell";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { createPublicClient } from "@/lib/supabase/public";
import type { ClubSeasonHistory, Season } from "@/lib/types";
import "./season-archive.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return publicMetadata({
    title: locale === "ro" ? "Sezoanele FC Edineț" : "Архив сезонов FC Edineț",
    description: locale === "ro" ? "Rezultatele și statisticile FC Edineț, sezon cu sezon." : "Результаты, статистика и матчи FC Edineț по сезонам.",
    path: "/club/seasons", locale,
  });
}

export default async function ClubSeasonsPage() {
  const locale = await getLocale();
  const ro = locale === "ro";
  const db = createPublicClient();
  const [seasonsResponse, historyResponse] = await Promise.all([
    db.from("seasons").select("id,name,slug,starts_on,ends_on,is_current,is_active")
      .eq("is_active", true).order("starts_on", { ascending: false, nullsFirst: false }).order("name", { ascending: false }),
    db.from("club_season_history").select("season_id,played,wins,draws,losses,goals_for,goals_against,goal_difference,win_rate,statistics_complete,players_with_stats"),
  ]);
  const seasons = (seasonsResponse.data ?? []) as Season[];
  const results = (historyResponse.data ?? []) as unknown as ClubSeasonHistory[];
  const history = new Map(results.map((row) => [String(row.season_id), row]));
  const loadFailed = Boolean(seasonsResponse.error || historyResponse.error);
  const label = (ru: string, romanian: string) => ro ? romanian : ru;

  return <ClubSectionShell locale={locale} active="seasons" title={label("Архив сезонов", "Arhiva sezoanelor")}>
    <header className="clubSeasonHero"><div className="container">
      <p className="eyebrow">FC EDINEȚ · {label("ИСТОРИЯ И РЕЗУЛЬТАТЫ", "ISTORIE ȘI REZULTATE")}</p>
      <h1>{label("Архив сезонов", "Arhiva sezoanelor")}</h1>
      <p>{label("Каждый сезон — матчи, результаты, статистика и люди, создававшие историю клуба.", "Fiecare sezon — meciuri, rezultate, statistici și oamenii care au scris istoria clubului.")}</p>
      <div className="clubSeasonHeroLinks"><Link href="/club/history">{label("История клуба", "Istoria clubului")}</Link><Link href="/club/hall-of-fame">{label("Зал славы", "Galeria de onoare")}</Link></div>
    </div></header>
    <section className="section clubSeasonSection"><div className="container">
      <div className="clubSeasonHeading"><div><p className="eyebrow blue">{label("ХРОНОЛОГИЯ", "CRONOLOGIE")}</p><h2>{label("Сезоны клуба", "Sezoanele clubului")}</h2></div>
      <span>{seasons.length} {label("в базе", "în arhivă")}</span></div>
      {loadFailed ? <div className="clubSeasonNotice" role="alert">{label("Не удалось загрузить архив сезонов. Повторите попытку позже.", "Arhiva sezoanelor nu poate fi încărcată. Încercați din nou mai târziu.")}</div>
      : seasons.length ? <div className="clubSeasonGrid">{seasons.map((season) => {
        const result = history.get(String(season.id));
        return <Link className="clubSeasonCard" href={`/club/seasons/${encodeURIComponent(season.slug)}`} key={season.id}>
          <div className="clubSeasonCardTop"><span>{label("СЕЗОН", "SEZON")}</span>{season.is_current && <b>{label("ТЕКУЩИЙ", "ACTUAL")}</b>}</div>
          <strong className="clubSeasonCardYear">{season.name}</strong>
          {result && result.played > 0 ? <>
            <div className="clubSeasonCardRecord"><span><b>{result.played}</b>{label("Матчей", "Meciuri")}</span><span><b>{result.wins}</b>{label("Побед", "Victorii")}</span><span><b>{result.draws}</b>{label("Ничьих", "Egaluri")}</span><span><b>{result.losses}</b>{label("Поражений", "Înfrângeri")}</span></div>
            <div className="clubSeasonCardBottom"><span>{label("Мячи", "Goluri")} <b>{result.goals_for}:{result.goals_against}</b></span><span>{label("Разница", "Golaveraj")} <b>{result.goal_difference > 0 ? "+" : ""}{result.goal_difference}</b></span></div>
          </> : <p className="clubSeasonNoResults">{label("Результаты ещё не внесены", "Rezultatele nu au fost introduse încă")}</p>}
          <div className="clubSeasonCardFooter">{label("Открыть сезон", "Vezi sezonul")} <span aria-hidden="true">→</span></div>
        </Link>;
      })}</div> : <div className="clubSeasonNotice">{label("В архив пока не добавлены сезоны.", "Nu există sezoane în arhivă deocamdată.")}</div>}
      <p className="clubSeasonSourceNote">{label("Данные формируются из опубликованных матчей и статистики сайта. Сезоны без внесённых результатов не получают выдуманных показателей.", "Datele provin din meciurile și statisticile publicate pe site. Sezoanele fără rezultate înregistrate nu primesc cifre estimate.")}</p>
    </div></section>
  </ClubSectionShell>;
}
