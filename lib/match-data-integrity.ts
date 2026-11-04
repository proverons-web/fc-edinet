/** Read-only match-data audit. Never rewrites published football results. */
export type IntegrityMatch = {
  id: number | string;
  status: string;
  home_team_id: number | string;
  away_team_id: number | string;
  home_score: number | null;
  away_score: number | null;
  kickoff: string;
};
export type IntegrityReport = { match_id: number | string; is_published: boolean | null; status: string | null };
export type IntegrityEvent = { match_id: number | string; team_id: number | string; event_type: string };
export type IntegrityLineup = { match_id: number | string; side: string; lineup_role: string; position: string | null; is_captain: boolean | null; player_id: string | null };
export type IntegrityStatsStatus = { match_id: number | string; status: string | null };
export type IntegrityPlayerStats = { match_id: number | string; team_id: number | string | null; player_id: string };
export type IntegrityIssue = { code: string; severity: "critical" | "warning"; message: string };
export type IntegrityResult = {
  matchId: string;
  published: boolean;
  status: string;
  issues: IntegrityIssue[];
  homeGoals: number;
  awayGoals: number;
  homeStarters: number;
  awayStarters: number;
};
const id = (value: string | number | null | undefined) => String(value ?? "");
function indexRows<T extends { match_id: string | number }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = id(row.match_id);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return map;
}

export function auditMatchData(
  matches: IntegrityMatch[],
  reports: IntegrityReport[],
  events: IntegrityEvent[],
  lineups: IntegrityLineup[],
  statuses: IntegrityStatsStatus[],
  playerStats: IntegrityPlayerStats[],
  clubTeamIds: ReadonlySet<string> = new Set(),
): IntegrityResult[] {
  const reportsByMatch = new Map(reports.map((row) => [id(row.match_id), row]));
  const eventsByMatch = indexRows(events);
  const lineupsByMatch = indexRows(lineups);
  const statusesByMatch = new Map(statuses.map((row) => [id(row.match_id), row]));
  const statsByMatch = indexRows(playerStats);

  return matches.map((match) => {
    const matchId = id(match.id);
    const report = reportsByMatch.get(matchId);
    const published = report?.is_published === true;
    const issues: IntegrityIssue[] = [];
    const critical = (code: string, message: string) => issues.push({ code, message, severity: "critical" });
    const warning = (code: string, message: string) => issues.push({ code, message, severity: "warning" });
    const homeId = id(match.home_team_id);
    const awayId = id(match.away_team_id);
    const rows = lineupsByMatch.get(matchId) ?? [];
    const homeRows = rows.filter((row) => row.side === "home");
    const awayRows = rows.filter((row) => row.side === "away");
    const homeStarters = homeRows.filter((row) => row.lineup_role === "starter").length;
    const awayStarters = awayRows.filter((row) => row.lineup_role === "starter").length;
    const homeCaptains = homeRows.filter((row) => row.is_captain === true).length;
    const awayCaptains = awayRows.filter((row) => row.is_captain === true).length;
    let homeGoals = 0;
    let awayGoals = 0;
    for (const event of eventsByMatch.get(matchId) ?? []) {
      if (!(["goal", "penalty_goal", "own_goal"].includes(event.event_type))) continue;
      const eventTeam = id(event.team_id);
      if (eventTeam !== homeId && eventTeam !== awayId) {
        critical("event_team_outside_match", "Событие гола привязано к команде вне этого матча.");
        continue;
      }
      const scoreForHome = event.event_type === "own_goal" ? eventTeam === awayId : eventTeam === homeId;
      if (scoreForHome) homeGoals += 1;
      else awayGoals += 1;
    }

    if (published) {
      if (match.status !== "finished") critical("published_not_finished", "Опубликован протокол матча, который не завершён.");
      if (match.home_score == null || match.away_score == null) critical("published_missing_score", "У опубликованного протокола не заполнен итоговый счёт.");
      else if (homeGoals !== match.home_score || awayGoals !== match.away_score) {
        critical("score_events_mismatch", `Счёт ${match.home_score}:${match.away_score} не совпадает с голами в хронологии ${homeGoals}:${awayGoals}.`);
      }
      if (report?.status !== "complete") critical("published_report_not_complete", "Опубликованный протокол не имеет статуса «Готово».");
      if (homeStarters !== 11 || awayStarters !== 11) critical("published_incomplete_lineups", `Стартовые составы: ${homeStarters} и ${awayStarters} вместо 11 и 11.`);
      if (homeCaptains !== 1 || awayCaptains !== 1) warning("captain_count", `Капитаны: ${homeCaptains} у хозяев и ${awayCaptains} у гостей.`);
      const currentStatus = statusesByMatch.get(matchId)?.status;
      if (currentStatus === "complete" && (statsByMatch.get(matchId) ?? []).length === 0) {
        critical("complete_without_player_stats", "Статистика отмечена завершённой, но записей игроков нет.");
      }
      for (const [side, sideRows] of [["home", homeRows], ["away", awayRows]] as const) {
        const duplicate = new Set<string>();
        for (const row of sideRows) {
          if (!row.player_id) continue;
          if (duplicate.has(row.player_id)) {
            critical("duplicate_lineup_player", `Игрок продублирован в составе команды (${side === "home" ? "хозяева" : "гости"}).`);
            break;
          }
          duplicate.add(row.player_id);
        }
      }
      for (const [side, sideRows, teamId] of [["home", homeRows, homeId], ["away", awayRows, awayId]] as const) {
        if (!clubTeamIds.has(teamId)) continue;
        const keeper = sideRows.some((row) => row.lineup_role === "starter" && row.position === "goalkeeper");
        if (!keeper) warning("club_goalkeeper_missing", `У FC Edineț не указана позиция вратаря (${side === "home" ? "хозяева" : "гости"}).`);
      }
    } else if (match.status === "finished") {
      warning("finished_unpublished", "Матч завершён, но подробный протокол ещё не опубликован.");
      if (homeStarters !== 11 || awayStarters !== 11) warning("unfinished_lineups", `Составы пока неполные: ${homeStarters} и ${awayStarters} стартовых.`);
    }
    return { matchId, published, status: match.status, issues, homeGoals, awayGoals, homeStarters, awayStarters };
  });
}
