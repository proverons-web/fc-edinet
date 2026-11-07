/** Cup tie-breakers are distinct from goals in the match timeline and player statistics. */
export type CupResultSource = {
  status?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  extra_time_played?: boolean | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
};
export type MatchWinner = "home" | "away" | "draw" | null;

export function hasShootout(match: CupResultSource): boolean {
  return match.status === "finished" && typeof match.home_score === "number" && Number.isInteger(match.home_score)
    && typeof match.away_score === "number" && Number.isInteger(match.away_score)
    && match.home_score === match.away_score
    && typeof match.home_penalties === "number"
    && typeof match.away_penalties === "number"
    && Number.isInteger(match.home_penalties) && Number.isInteger(match.away_penalties)
    && match.home_penalties >= 0 && match.away_penalties >= 0
    && match.home_penalties !== match.away_penalties;
}
/** Returns the winner, counting penalties only as a tie-breaker (never as match goals). */
export function matchWinner(match: CupResultSource): MatchWinner {
  if (match.status !== "finished" || typeof match.home_score !== "number" || !Number.isInteger(match.home_score) || typeof match.away_score !== "number" || !Number.isInteger(match.away_score)) return null;
  if ((match.home_score ?? -1) < 0 || (match.away_score ?? -1) < 0) return null;
  if (match.home_score! > match.away_score!) return "home";
  if (match.home_score! < match.away_score!) return "away";
  if (hasShootout(match)) return match.home_penalties! > match.away_penalties! ? "home" : "away";
  return "draw";
}
/** Human-readable subline beneath the official score; no fabricated shootout. */
export function cupResultDetail(match: CupResultSource, locale: "ru" | "ro"): string | null {
  if (match.status !== "finished") return null;
  if (hasShootout(match)) {
    return locale === "ro"
      ? `Lov. dep. ${match.home_penalties}:${match.away_penalties}${match.extra_time_played ? " · după prelungiri" : ""}`
      : `По пенальти ${match.home_penalties}:${match.away_penalties}${match.extra_time_played ? " · после доп. времени" : ""}`;
  }
  return match.extra_time_played ? (locale === "ro" ? "După prelungiri" : "После дополнительного времени") : null;
}
/** For editor validation, both shootout counts are required and the football score must be level. */
export function validateCupResult(data: CupResultSource & { competitionType?: string | null }): string | null {
  const penaltiesSet = data.home_penalties !== null && data.home_penalties !== undefined || data.away_penalties !== null && data.away_penalties !== undefined;
  const extraTime = Boolean(data.extra_time_played);
  if ((penaltiesSet || extraTime) && data.competitionType !== "cup") return "Дополнительное время и серия пенальти доступны только для кубкового матча.";
  if (!penaltiesSet) return null;
  if (data.status !== "finished") return "Серию пенальти можно сохранить только после завершения матча.";
  if (!Number.isInteger(data.home_score) || !Number.isInteger(data.away_score) || data.home_score !== data.away_score) return "Серия пенальти проводится при равном счёте после игрового времени.";
  if (!hasShootout(data)) return "Укажи результат серии пенальти обеих команд. Счёт серии не может быть равным.";
  if (data.home_penalties! > 99 || data.away_penalties! > 99) return "Количество реализованных пенальти не должно превышать 99.";
  return null;
}
