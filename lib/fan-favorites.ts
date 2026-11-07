import type { ClubMatch, Player } from "@/lib/types";

/** Shared, minimal PostgREST projections for private account pages. */
export const FAN_PLAYER_SELECT = "created_at,player:players!favorite_players_player_id_fkey(id,first_name,last_name,slug,shirt_number,position,photo_url,is_active)";
export const FAN_MATCH_SELECT = "created_at,match:matches!favorite_matches_match_id_fkey(id,kickoff,stadium,round,status,home_score,away_score,home:teams!matches_home_team_id_fkey(id,name,short_name,logo_url,is_club),away:teams!matches_away_team_id_fkey(id,name,short_name,logo_url,is_club),competition:competitions!matches_competition_id_fkey(name))";

export type FanFavoritePlayer = { created_at: string; player: Player | null };
export type FanFavoriteMatch = { created_at: string; match: ClubMatch | null };
export type FanMatchView = "all" | "upcoming" | "results";

export function fanMatchView(value: unknown): FanMatchView {
  return value === "upcoming" || value === "results" ? value : "all";
}

function kickoffTimestamp(match: ClubMatch): number {
  const timestamp = Date.parse(match.kickoff);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** No fabricated kickoffs: postponed, cancelled and stale scheduled games stay in 'other'. */
export function groupFanMatches(rows: FanFavoriteMatch[], now = new Date()) {
  const upcoming: ClubMatch[] = [];
  const results: ClubMatch[] = [];
  const other: ClubMatch[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.match) continue;
    const match = row.match;
    if (seen.has(String(match.id))) continue;
    seen.add(String(match.id));
    if (match.status === "finished") results.push(match);
    else if (match.status === "live" || (match.status === "scheduled" && kickoffTimestamp(match) >= now.getTime())) upcoming.push(match);
    else other.push(match);
  }
  upcoming.sort((a, b) => (a.status === "live" ? -1 : 0) - (b.status === "live" ? -1 : 0) || kickoffTimestamp(a) - kickoffTimestamp(b) || String(a.id).localeCompare(String(b.id)));
  results.sort((a, b) => kickoffTimestamp(b) - kickoffTimestamp(a) || String(b.id).localeCompare(String(a.id)));
  other.sort((a, b) => kickoffTimestamp(b) - kickoffTimestamp(a));
  return { upcoming, results, other, all: [...upcoming, ...results, ...other] };
}

export const fanDashboardText = {
  ru: {
    personalFeed: "МОЙ ФУТБОЛ", personalFeedTitle: "Матчи и игроки, за которыми я слежу",
    nextMatch: "БЛИЖАЙШИЙ СОХРАНЁННЫЙ МАТЧ", nextMatchEmpty: "Пока нет сохранённых предстоящих матчей.",
    viewMatches: "Выбрать матч", inCalendar: "В календарь", goToMatch: "Открыть матч",
    latestResults: "РЕЗУЛЬТАТЫ ИЗ ИЗБРАННОГО", noResults: "Завершённые избранные матчи появятся здесь.",
    moreResults: "Все результаты", myPlayers: "МОИ ИГРОКИ", noFavoritePlayers: "Добавьте любимых игроков из раздела «Состав».",
    allPlayers: "Все любимые игроки", allSavedMatches: "Все матчи", all: "Все", upcoming: "Предстоящие", results: "Результаты",
    noUpcoming: "Пока нет сохранённых предстоящих матчей.", noFinished: "Завершённые сохранённые матчи пока отсутствуют.",
    other: "Перенесённые и другие", matchList: "СОХРАНЁННЫЕ МАТЧИ", resultLabel: "Результат", unknownScore: "Счёт не указан",
    dataError: "Не удалось загрузить избранное. Повторите попытку позднее.", live: "В прямом эфире",
  },
  ro: {
    personalFeed: "FOTBALUL MEU", personalFeedTitle: "Meciurile și jucătorii pe care îi urmăresc",
    nextMatch: "URMĂTORUL MECI SALVAT", nextMatchEmpty: "Nu ai meciuri viitoare salvate.",
    viewMatches: "Alege un meci", inCalendar: "În calendar", goToMatch: "Deschide meciul",
    latestResults: "REZULTATELE DIN FAVORITE", noResults: "Rezultatele meciurilor favorite vor apărea aici.",
    moreResults: "Toate rezultatele", myPlayers: "JUCĂTORII MEI", noFavoritePlayers: "Adaugă jucători din secțiunea «Lot».",
    allPlayers: "Toți jucătorii favoriți", allSavedMatches: "Toate meciurile", all: "Toate", upcoming: "Viitoare", results: "Rezultate",
    noUpcoming: "Nu ai meciuri viitoare salvate.", noFinished: "Nu ai încă meciuri salvate încheiate.",
    other: "Amânate și altele", matchList: "MECIURI SALVATE", resultLabel: "Scor", unknownScore: "Scor indisponibil",
    dataError: "Favoritele nu au putut fi încărcate. Încearcă din nou mai târziu.", live: "În direct",
  },
} as const;
