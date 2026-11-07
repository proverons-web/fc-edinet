"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type { MatchEventType } from "@/lib/types";

const EVENT_TYPES = new Set<MatchEventType>([
  "goal",
  "own_goal",
  "penalty_goal",
  "penalty_miss",
  "yellow_card",
  "red_card",
  "substitution",
  "var",
  "injury",
  "other",
]);

const PLAYER_REQUIRED = new Set<MatchEventType>([
  "goal",
  "own_goal",
  "penalty_goal",
  "penalty_miss",
  "yellow_card",
  "red_card",
  "substitution",
  "injury",
]);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData: FormData, key: string, maxLength: number) {
  const value = text(formData, key);
  return value ? value.slice(0, maxLength) : null;
}

function go(matchId: string, params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/admin/match-center/${encodeURIComponent(matchId)}?${query.toString()}`);
}

function parseWholeNumber(
  formData: FormData,
  key: string,
  min: number,
  max: number,
  label: string,
  matchId: string,
) {
  const raw = text(formData, key);
  const parsed = Number(raw || "0");
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    go(matchId, { error: `${label}: допустимо целое число от ${min} до ${max}.` });
  }
  return parsed;
}

async function loadMatchContext(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  matchId: string,
) {
  const { data: match, error } = await supabase
    .from("matches")
    .select("id,home_team_id,away_team_id")
    .eq("id", matchId)
    .maybeSingle();

  if (error || !match) {
    go(matchId, { error: "Матч не найден." });
  }

  return match;
}

async function resolvePlayerName(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  playerId: string | null,
  manualName: string | null,
  matchId: string,
  label: string,
) {
  if (!playerId) return { id: null, name: manualName };

  const { data: player, error } = await supabase
    .from("players")
    .select("id,first_name,last_name")
    .eq("id", playerId)
    .maybeSingle();

  if (error || !player) {
    go(matchId, { error: `${label}: выбранный игрок не найден.` });
  }

  return {
    id: String(player.id),
    name: `${player.first_name} ${player.last_name}`.trim(),
  };
}

async function buildEventPayload(
  formData: FormData,
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  userId: string,
  matchId: string,
) {
  const match = await loadMatchContext(supabase, matchId);
  const eventType = text(formData, "event_type") as MatchEventType;
  if (!EVENT_TYPES.has(eventType)) {
    go(matchId, { error: "Выбран неизвестный тип события." });
  }

  const teamId = text(formData, "team_id");
  const allowedTeams = new Set([String(match.home_team_id), String(match.away_team_id)]);
  if (!allowedTeams.has(teamId)) {
    go(matchId, { error: "Для события нужно выбрать хозяев или гостей этого матча." });
  }

  const minute = parseWholeNumber(formData, "minute", 0, 130, "Минута", matchId);
  const stoppageMinute = parseWholeNumber(
    formData,
    "stoppage_minute",
    0,
    30,
    "Добавленное время",
    matchId,
  );

  function parseParticipantRef(value: string) {
    if (!value) return { playerId: null as string | null, manualName: null as string | null };
    if (value.startsWith("db:")) return { playerId: value.slice(3) || null, manualName: null };
    if (value.startsWith("manual:")) return { playerId: null, manualName: value.slice(7).trim().slice(0, 120) || null };
    return { playerId: value, manualName: null };
  }

  const primaryRef = text(formData, "player_ref");
  const relatedRef = text(formData, "related_player_ref");
  const primary = primaryRef
    ? parseParticipantRef(primaryRef)
    : { playerId: text(formData, "player_id") || null, manualName: nullableText(formData, "player_name", 120) };
  const related = relatedRef
    ? parseParticipantRef(relatedRef)
    : { playerId: text(formData, "related_player_id") || null, manualName: nullableText(formData, "related_player_name", 120) };

  const player = await resolvePlayerName(
    supabase,
    primary.playerId,
    primary.manualName,
    matchId,
    "Основной игрок",
  );
  const relatedPlayer = await resolvePlayerName(
    supabase,
    related.playerId,
    related.manualName,
    matchId,
    "Связанный игрок",
  );

  if (PLAYER_REQUIRED.has(eventType) && !player.name) {
    go(matchId, {
      error: "Для этого события выбери игрока из сохранённого состава команды.",
    });
  }

  if (eventType === "substitution" && !relatedPlayer.name) {
    go(matchId, {
      error: "Для замены выбери игрока, который вышел на поле.",
    });
  }

  // A player cannot substitute themselves. Check canonical IDs where available,
  // otherwise compare normalized names for manually entered guest players.
  if (eventType === "substitution" && player.name && relatedPlayer.name && (
    (player.id && relatedPlayer.id && player.id === relatedPlayer.id) ||
    (!player.id || !relatedPlayer.id) && player.name.trim().toLocaleLowerCase("ru-RU") === relatedPlayer.name.trim().toLocaleLowerCase("ru-RU")
  )) {
    go(matchId, { error: "При замене уходящий и выходящий игрок должны отличаться." });
  }

  return {
    match_id: matchId,
    team_id: teamId,
    player_id: player.id,
    player_name: player.name,
    related_player_id: relatedPlayer.id,
    related_player_name: relatedPlayer.name,
    event_type: eventType,
    minute,
    stoppage_minute: stoppageMinute,
    description: nullableText(formData, "description", 500),
    sort_order: parseWholeNumber(formData, "sort_order", -1000, 1000, "Порядок", matchId),
    updated_by: userId,
  };
}

// v2.29.16: a single RPC replaces the lineup and settings in one DB transaction.
// The database checks the editor role, derives the team from the match and
// refuses stale forms instead of silently overwriting another tab's changes.
async function persistLineupAtomically(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  matchId: string,
  side: "home" | "away",
  formation: string | null,
  coachName: string | null,
  rows: Record<string, unknown>[],
  expectedRevision: string | null,
  compareRevision: boolean,
) {
  const { data, error } = await supabase.rpc("save_match_lineup_atomic", {
    p_match_id: Number(matchId),
    p_side: side,
    p_formation: formation,
    p_coach_name: coachName,
    p_rows: rows,
    p_compare_revision: compareRevision,
    p_expected_updated_at: expectedRevision,
  });
  if (error) {
    const stale = error.code === "40001" || /changed in another tab/i.test(error.message);
    go(matchId, { error: stale
      ? "Состав изменён в другой вкладке. Обнови страницу и проверь данные перед сохранением."
      : `Не удалось сохранить состав целиком: ${error.message}` });
  }
  if (!data || data.saved !== true || data.entries !== rows.length || data.side !== side) {
    go(matchId, { error: "База не подтвердила сохранение всего состава. Повтори после проверки страницы." });
  }
}

function revalidateMatchCenter(matchId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/match-center");
  revalidatePath(`/admin/match-center/${matchId}`);
}

export async function saveMatchReportFoundation(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");

  if (!/^\d+$/.test(matchId)) {
    redirect("/admin/match-center?error=Матч не найден.");
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    go(matchId, { error: "Матч не найден." });
  }

  const attendanceRaw = text(formData, "attendance");
  let attendance: number | null = null;
  if (attendanceRaw) {
    const parsed = Number(attendanceRaw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 200000) {
      go(matchId, { error: "Посещаемость должна быть целым числом от 0 до 200000." });
    }
    attendance = parsed;
  }

  const manOfMatchPlayerId = text(formData, "man_of_match_player_id") || null;
  if (manOfMatchPlayerId) {
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("id", manOfMatchPlayerId)
      .maybeSingle();

    if (playerError || !player) {
      go(matchId, { error: "Выбранный лучший игрок не найден." });
    }
  }

  const payload = {
    referee: nullableText(formData, "referee", 160),
    attendance,
    weather: nullableText(formData, "weather", 120),
    pitch_condition: nullableText(formData, "pitch_condition", 120),
    summary: nullableText(formData, "summary", 5000),
    man_of_match_player_id: manOfMatchPlayerId,
    updated_by: userId,
  };

  const { data: existing, error: existingError } = await supabase
    .from("match_reports")
    .select("match_id,status,created_by")
    .eq("match_id", matchId)
    .maybeSingle();

  if (existingError) {
    go(matchId, {
      error: `Не удалось открыть основу отчёта: ${existingError.message}. Проверь миграцию 041.`,
    });
  }

  if (existing) {
    const { error } = await supabase
      .from("match_reports")
      .update(payload)
      .eq("match_id", matchId);

    if (error) {
      go(matchId, { error: `Не удалось сохранить матч-центр: ${error.message}` });
    }
  } else {
    const { error } = await supabase.from("match_reports").insert({
      match_id: matchId,
      status: "draft",
      ...payload,
      created_by: userId,
    });

    if (error) {
      go(matchId, { error: `Не удалось создать матч-центр: ${error.message}` });
    }
  }

  revalidateMatchCenter(matchId);
  revalidatePath("/admin/matches");
  go(matchId, { saved: "report" });
}


export async function publishMatchProtocol(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  if (!/^\d+$/.test(matchId)) redirect("/admin/match-center");
  if (text(formData, "review_confirmed") !== "yes") {
    go(matchId, { error: "Перед публикацией подтверди проверку протокола." });
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id,status,home_team_id,away_team_id,home_score,away_score")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) go(matchId, { error: "Матч не найден." });
  if (match.status !== "finished") go(matchId, { error: "Публичный протокол можно опубликовать только после завершения матча." });
  if (match.home_score == null || match.away_score == null) go(matchId, { error: "Перед публикацией укажи окончательный счёт обеих команд." });

  const { data: events, error: eventsError } = await supabase
    .from("match_events")
    .select("team_id,event_type")
    .eq("match_id", matchId);
  if (eventsError) go(matchId, { error: `Не удалось проверить таймлайн: ${eventsError.message}` });

  const goalTypes = new Set(["goal", "penalty_goal", "own_goal"]);
  let homeGoals = 0;
  let awayGoals = 0;
  for (const event of events ?? []) {
    if (!goalTypes.has(event.event_type)) continue;
    const eventTeamId = String(event.team_id);
    const scoringTeamId = event.event_type === "own_goal"
      ? (eventTeamId === String(match.home_team_id) ? String(match.away_team_id) : String(match.home_team_id))
      : eventTeamId;
    if (scoringTeamId === String(match.home_team_id)) homeGoals += 1;
    if (scoringTeamId === String(match.away_team_id)) awayGoals += 1;
  }
  if (homeGoals !== Number(match.home_score ?? 0) || awayGoals !== Number(match.away_score ?? 0)) {
    go(matchId, { error: `Перед публикацией таймлайн голов должен совпадать со счётом (${homeGoals}:${awayGoals} / ${match.home_score ?? 0}:${match.away_score ?? 0}).` });
  }

  // Evaluate club readiness first; statistics and any completion transition
  // will be committed together by save_club_player_stats_atomic below.
  const { data: clubTeams, error: clubTeamsError } = await supabase.from("teams").select("id").eq("is_club", true);
  if (clubTeamsError) go(matchId, { error: `Не удалось проверить команду клуба: ${clubTeamsError.message}` });
  const clubTeamIds = new Set((clubTeams ?? []).map((team) => String(team.id)));
  const matchClubId = [match.home_team_id, match.away_team_id].map(String).find((teamId) => clubTeamIds.has(teamId));
  if (!matchClubId) go(matchId, { error: "Не удалось определить команду FC Edineț в матче." });
  const { data: clubLineup, error: clubLineupError } = await supabase
    .from("match_lineup_entries")
    .select("lineup_role,position")
    .eq("match_id", matchId)
    .eq("team_id", matchClubId)
    .not("player_id", "is", null);
  if (clubLineupError) go(matchId, { error: `Не удалось проверить клубный состав: ${clubLineupError.message}` });
  const starters = (clubLineup ?? []).filter((row) => row.lineup_role === "starter");
  const hasGoalkeeper = starters.some((row) => row.position === "goalkeeper");
  await syncClubPlayerStatsFromEvents(supabase, userId, matchId,
    starters.length === 11 && hasGoalkeeper ? "complete" : null);

  // The report publication itself is still a separate transaction. Errors
  // after player-stat synchronization are surfaced, never swallowed.
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("match_reports")
    .upsert({
      match_id: matchId,
      status: "complete",
      is_published: true,
      published_at: now,
      completed_at: now,
      completed_by: userId,
      updated_by: userId,
      created_by: userId,
    }, { onConflict: "match_id" });
  if (error) go(matchId, { error: `Не удалось опубликовать протокол: ${error.message}. Проверь миграцию 046.` });

  revalidateMatchCenter(matchId);
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  go(matchId, { saved: "published" });
}

export async function unpublishMatchProtocol(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  if (!/^\d+$/.test(matchId)) redirect("/admin/match-center");

  const { error } = await supabase
    .from("match_reports")
    .update({
      is_published: false,
      published_at: null,
      status: "draft",
      completed_at: null,
      completed_by: null,
      updated_by: userId,
    })
    .eq("match_id", matchId);
  if (error) go(matchId, { error: `Не удалось снять протокол с публикации: ${error.message}` });

  revalidateMatchCenter(matchId);
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  go(matchId, { saved: "unpublished" });
}

export async function createMatchEvent(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  if (!/^\d+$/.test(matchId)) redirect("/admin/match-center");

  const payload = await buildEventPayload(formData, supabase, userId, matchId);
  const { error } = await supabase.from("match_events").insert({
    ...payload,
    created_by: userId,
  });

  if (error) {
    go(matchId, { error: `Не удалось добавить событие: ${error.message}` });
  }

  await syncClubPlayerStatsFromEvents(supabase, userId, matchId);
  revalidateMatchCenter(matchId);
  revalidatePath("/admin/statistics");
  revalidatePath("/statistics");
  // Keep only the non-personal event context for fast consecutive entry.
  // Player and related-player references must be selected anew to avoid duplicates.
  if (text(formData, "after_save") === "continue") {
    go(matchId, {
      saved: "event",
      next_type: String(payload.event_type),
      next_team: String(payload.team_id),
      next_minute: String(payload.minute),
      next_stoppage: String(payload.stoppage_minute),
    });
  }
  go(matchId, { saved: "event-done" });
}

export async function updateMatchEvent(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  const eventId = text(formData, "event_id");
  if (!/^\d+$/.test(matchId) || !/^\d+$/.test(eventId)) redirect("/admin/match-center");

  const { data: event, error: eventError } = await supabase
    .from("match_events")
    .select("id,match_id")
    .eq("id", eventId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (eventError || !event) {
    go(matchId, { error: "Событие не найдено." });
  }

  const payload = await buildEventPayload(formData, supabase, userId, matchId);
  const { error } = await supabase
    .from("match_events")
    .update(payload)
    .eq("id", eventId)
    .eq("match_id", matchId);

  if (error) {
    go(matchId, { error: `Не удалось изменить событие: ${error.message}` });
  }

  await syncClubPlayerStatsFromEvents(supabase, userId, matchId);
  revalidateMatchCenter(matchId);
  revalidatePath("/admin/statistics");
  revalidatePath("/statistics");
  go(matchId, { saved: "event-updated" });
}

export async function deleteMatchEvent(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  const eventId = text(formData, "event_id");
  if (!/^\d+$/.test(matchId) || !/^\d+$/.test(eventId)) redirect("/admin/match-center");

  const { error } = await supabase
    .from("match_events")
    .delete()
    .eq("id", eventId)
    .eq("match_id", matchId);

  if (error) {
    go(matchId, { error: `Не удалось удалить событие: ${error.message}` });
  }

  await syncClubPlayerStatsFromEvents(supabase, userId, matchId);
  revalidateMatchCenter(matchId);
  revalidatePath("/admin/statistics");
  revalidatePath("/statistics");
  go(matchId, { saved: "event-deleted" });
}

const LINEUP_POSITIONS = new Set(["goalkeeper", "defender", "midfielder", "forward"]);
const LINEUP_ROLES = ["starter", "substitute"] as const;

function validSide(value: string): value is "home" | "away" {
  return value === "home" || value === "away";
}

export async function saveMatchLineup(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  const sideRaw = text(formData, "side");
  if (!/^\d+$/.test(matchId) || !validSide(sideRaw)) redirect("/admin/match-center");
  const side = sideRaw;

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id,home_team_id,away_team_id")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) go(matchId, { error: "Матч не найден." });

  const teamId = String(side === "home" ? match.home_team_id : match.away_team_id);
  const formation = nullableText(formData, "formation", 40);
  const coachName = nullableText(formData, "coach_name", 160);

  const requestedPlayerIds: string[] = [];
  for (const role of LINEUP_ROLES) {
    const max = role === "starter" ? 11 : 12;
    for (let slot = 1; slot <= max; slot += 1) {
      const id = text(formData, `${role}_${slot}_player_id`);
      if (id) requestedPlayerIds.push(id);
    }
  }

  const playerMap = new Map<string, { id: string; first_name: string; last_name: string; shirt_number: number | null; position: string }>();
  if (requestedPlayerIds.length > 0) {
    const { data: playerRows, error: playerError } = await supabase
      .from("players")
      .select("id,first_name,last_name,shirt_number,position")
      .in("id", [...new Set(requestedPlayerIds)]);
    if (playerError) go(matchId, { error: `Не удалось проверить игроков: ${playerError.message}` });
    for (const player of playerRows ?? []) {
      playerMap.set(String(player.id), {
        id: String(player.id),
        first_name: player.first_name,
        last_name: player.last_name,
        shirt_number: player.shirt_number,
        position: player.position,
      });
    }
  }

  const payload: Record<string, unknown>[] = [];
  const usedPlayerIds = new Set<string>();
  let captains = 0;

  for (const role of LINEUP_ROLES) {
    const max = role === "starter" ? 11 : 12;
    for (let slot = 1; slot <= max; slot += 1) {
      const prefix = `${role}_${slot}`;
      const playerId = text(formData, `${prefix}_player_id`) || null;
      const manualName = nullableText(formData, `${prefix}_player_name`, 120);
      const player = playerId ? playerMap.get(playerId) : null;
      if (playerId && !player) go(matchId, { error: `Игрок в слоте ${slot} не найден.` });
      const playerName = player ? `${player.first_name} ${player.last_name}`.trim() : manualName;
      if (!playerName) continue;

      if (playerId) {
        if (usedPlayerIds.has(playerId)) go(matchId, { error: `${playerName} добавлен в состав дважды.` });
        usedPlayerIds.add(playerId);
      }

      const shirtRaw = text(formData, `${prefix}_shirt_number`);
      let shirtNumber = player?.shirt_number ?? null;
      if (shirtRaw !== "") {
        const parsed = Number(shirtRaw);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
          go(matchId, { error: `Номер игрока ${playerName}: допустимо от 0 до 99.` });
        }
        shirtNumber = parsed;
      }

      const positionRaw = text(formData, `${prefix}_position`);
      const position = LINEUP_POSITIONS.has(positionRaw)
        ? positionRaw
        : LINEUP_POSITIONS.has(player?.position ?? "")
          ? player!.position
          : null;
      const isCaptain = formData.get(`${prefix}_captain`) === "on";
      if (isCaptain) captains += 1;

      payload.push({
        match_id: matchId,
        team_id: teamId,
        side,
        lineup_role: role,
        slot_number: slot,
        player_id: playerId,
        player_name: playerName,
        shirt_number: shirtNumber,
        position,
        is_captain: isCaptain,
        sort_order: slot,
        created_by: userId,
        updated_by: userId,
      });
    }
  }

  if (payload.length > 0 && captains !== 1) go(matchId, { error: "Перед сохранением состава выбери одного капитана." });

  await persistLineupAtomically(supabase, matchId, side, formation, coachName, payload,
    nullableText(formData, "lineup_revision", 80), true);

  revalidateMatchCenter(matchId);
  go(matchId, { saved: `lineup-${side}` });
}

export async function importClubLineupFromPlayerStats(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  if (!/^\d+$/.test(matchId)) redirect("/admin/match-center");

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`
      id,home_team_id,away_team_id,
      home:teams!matches_home_team_id_fkey(id,is_club),
      away:teams!matches_away_team_id_fkey(id,is_club)
    `)
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) go(matchId, { error: "Матч не найден." });

  const home = Array.isArray(match.home) ? match.home[0] : match.home;
  const away = Array.isArray(match.away) ? match.away[0] : match.away;
  const side: "home" | "away" | null = home?.is_club ? "home" : away?.is_club ? "away" : null;
  if (!side) go(matchId, { error: "В матче не удалось определить сторону FC Edineț." });
  const teamId = String(side === "home" ? match.home_team_id : match.away_team_id);

  const { data: stats, error: statsError } = await supabase
    .from("player_match_stats")
    .select("player_id,appearance,position,is_captain")
    .eq("match_id", matchId);
  if (statsError) go(matchId, { error: `Не удалось загрузить статистику игроков: ${statsError.message}` });
  if (!stats || stats.length === 0) go(matchId, { error: "По этому матчу ещё нет статистики игроков для импорта." });

  const ids = stats.map((row) => String(row.player_id));
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id,first_name,last_name,shirt_number,position")
    .in("id", ids);
  if (playersError) go(matchId, { error: `Не удалось загрузить состав: ${playersError.message}` });
  const playerMap = new Map((players ?? []).map((player) => [String(player.id), player]));

  const starters = stats.filter((row) => row.appearance === "starter");
  const substitutes = stats.filter((row) => row.appearance !== "starter");
  if (starters.length > 11) go(matchId, { error: "В статистике больше 11 игроков отмечены как стартовые. Сначала исправь статистику матча." });
  if (substitutes.length > 12) go(matchId, { error: "В статистике больше 12 запасных. Состав нужно заполнить вручную." });

  const rows: Record<string, unknown>[] = [];
  for (const [role, group] of [["starter", starters], ["substitute", substitutes]] as const) {
    group.forEach((stat, index) => {
      const player = playerMap.get(String(stat.player_id));
      if (!player) return;
      rows.push({
        match_id: matchId,
        team_id: teamId,
        side,
        lineup_role: role,
        slot_number: index + 1,
        player_id: String(player.id),
        player_name: `${player.first_name} ${player.last_name}`.trim(),
        shirt_number: player.shirt_number,
        position: stat.position || player.position || null,
        is_captain: Boolean(stat.is_captain),
        sort_order: index + 1,
        created_by: userId,
        updated_by: userId,
      });
    });
  }

  // The import is generated against current server-side statistics, so it
  // runs under the match row lock without a browser revision precondition.
  await persistLineupAtomically(supabase, matchId, side, null, null, rows, null, false);

  revalidateMatchCenter(matchId);
  go(matchId, { saved: "lineup-imported" });
}


async function ensureTemporaryClubPlayer(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  matchId: string,
  clubTeamId: string,
  manualName: string,
  position: string,
) {
  const cleaned = manualName.replace(/\s+/g, " ").trim().slice(0, 120);
  const parts = cleaned.split(" ").filter(Boolean);
  const lastName = (parts[0] || "Игрок").slice(0, 80);
  const firstName = (parts.slice(1).join(" ") || "Временный").slice(0, 80);
  const slug = `match-player-${matchId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: created, error } = await supabase
    .from("players")
    .insert({
      first_name: firstName,
      last_name: lastName,
      slug,
      position,
      is_active: false,
      display_order: 9999,
    })
    .select("id,first_name,last_name,shirt_number,position")
    .single();

  if (error || !created) {
    go(matchId, { error: `Не удалось создать временного игрока ${cleaned}: ${error?.message || "ошибка базы"}` });
  }

  const playerId = String(created.id);
  await Promise.all([
    supabase
      .from("match_events")
      .update({ player_id: playerId })
      .eq("match_id", matchId)
      .eq("team_id", clubTeamId)
      .is("player_id", null)
      .ilike("player_name", cleaned),
    supabase
      .from("match_events")
      .update({ related_player_id: playerId })
      .eq("match_id", matchId)
      .eq("team_id", clubTeamId)
      .is("related_player_id", null)
      .ilike("related_player_name", cleaned),
  ]);

  return { playerId, player: created, playerName: cleaned };
}

async function syncClubPlayerStatsFromEvents(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  userId: string,
  matchId: string,
  status: "draft" | "complete" | null = null,
) {
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`
      id,home_team_id,away_team_id,
      home:teams!matches_home_team_id_fkey(id,is_club),
      away:teams!matches_away_team_id_fkey(id,is_club)
    `)
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) go(matchId, { error: `Не удалось пересчитать статистику: ${matchError?.message || "матч не найден"}. Данные события или состава могли сохраниться.` });

  const home = Array.isArray(match.home) ? match.home[0] : match.home;
  const away = Array.isArray(match.away) ? match.away[0] : match.away;
  const clubSide: "home" | "away" | null = home?.is_club ? "home" : away?.is_club ? "away" : null;
  if (!clubSide) return;
  const clubTeamId = String(clubSide === "home" ? match.home_team_id : match.away_team_id);

  const [lineupResult, eventsResult, existingResult] = await Promise.all([
    supabase
      .from("match_lineup_entries")
      .select("player_id,lineup_role,position,is_captain")
      .eq("match_id", matchId)
      .eq("side", clubSide),
    supabase
      .from("match_events")
      .select("player_id,related_player_id,event_type,minute,stoppage_minute,sort_order")
      .eq("match_id", matchId)
      .eq("team_id", clubTeamId)
      .order("minute", { ascending: true })
      .order("stoppage_minute", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("player_match_stats").select("*").eq("match_id", matchId).eq("team_id", clubTeamId),
  ]);

  if (lineupResult.error || eventsResult.error || existingResult.error) {
    go(matchId, { error: `Событие или состав могли сохраниться, но пересчёт статистики не завершился: ${lineupResult.error?.message || eventsResult.error?.message || existingResult.error?.message}.` });
  }

  const lineup = (lineupResult.data ?? []).filter((row) => row.player_id);
  const events = eventsResult.data ?? [];
  const existingByPlayer = new Map(
    (existingResult.data ?? []).map((row) => [String(row.player_id), row as Record<string, unknown>]),
  );

  type Runtime = {
    playerId: string;
    appearance: "starter" | "substitute";
    position: string | null;
    isCaptain: boolean;
    enteredAt: number | null;
    minutes: number;
    appeared: boolean;
    goals: number;
    assists: number;
    ownGoals: number;
    penaltiesScored: number;
    penaltiesMissed: number;
    yellow: number;
    red: number;
  };

  const runtime = new Map<string, Runtime>();
  for (const row of lineup) {
    const playerId = String(row.player_id);
    const starter = row.lineup_role === "starter";
    runtime.set(playerId, {
      playerId,
      appearance: starter ? "starter" : "substitute",
      position: typeof row.position === "string" ? row.position : null,
      isCaptain: Boolean(row.is_captain),
      enteredAt: starter ? 0 : null,
      minutes: 0,
      appeared: starter,
      goals: 0,
      assists: 0,
      ownGoals: 0,
      penaltiesScored: 0,
      penaltiesMissed: 0,
      yellow: 0,
      red: 0,
    });
  }

  let duration = 90;
  if (events.some((event) => Number(event.minute ?? 0) > 105)) duration = 120;

  for (const event of events) {
    const minute = Math.max(0, Math.min(duration, Number(event.minute ?? 0)));
    const primaryId = event.player_id ? String(event.player_id) : null;
    const relatedId = event.related_player_id ? String(event.related_player_id) : null;

    if (event.event_type === "substitution") {
      if (primaryId) {
        const outgoing = runtime.get(primaryId);
        if (outgoing?.enteredAt != null) {
          outgoing.minutes += Math.max(0, minute - outgoing.enteredAt);
          outgoing.enteredAt = null;
        }
      }
      if (relatedId) {
        const incoming = runtime.get(relatedId);
        if (incoming && incoming.enteredAt == null) {
          incoming.enteredAt = minute;
          incoming.appeared = true;
        }
      }
      continue;
    }

    if (primaryId) {
      const player = runtime.get(primaryId);
      if (player) {
        if (event.event_type === "goal") player.goals += 1;
        if (event.event_type === "penalty_goal") {
          player.goals += 1;
          player.penaltiesScored += 1;
        }
        if (event.event_type === "own_goal") player.ownGoals += 1;
        if (event.event_type === "penalty_miss") player.penaltiesMissed += 1;
        if (event.event_type === "yellow_card") {
          player.yellow += 1;
          // The second yellow automatically means a sending-off. We keep both
          // yellow-card events in the timeline, but derive the red card here.
          if (player.yellow === 2) player.red += 1;
        }
        if (event.event_type === "red_card") player.red += 1;
      }
    }

    if ((event.event_type === "goal" || event.event_type === "penalty_goal") && relatedId) {
      const assister = runtime.get(relatedId);
      if (assister) assister.assists += 1;
    }
  }

  for (const player of runtime.values()) {
    if (player.enteredAt != null) {
      player.minutes += Math.max(0, duration - player.enteredAt);
      player.enteredAt = null;
    }
  }

  const statsRows: Record<string, unknown>[] = [];
  for (const player of runtime.values()) {
    if (!player.appeared) continue;
    const previous = existingByPlayer.get(player.playerId) ?? {};
    const previousNumber = (key: string) => {
      const value = Number(previous[key] ?? 0);
      return Number.isFinite(value) ? value : 0;
    };
    statsRows.push({
      match_id: matchId,
      team_id: clubTeamId,
      player_id: player.playerId,
      appearance: player.appearance,
      position: player.position,
      is_captain: player.isCaptain,
      minutes_played: Math.max(0, Math.min(130, player.minutes)),
      goals: player.goals,
      assists: player.assists,
      own_goals: player.ownGoals,
      penalties_scored: player.penaltiesScored,
      penalties_missed: player.penaltiesMissed,
      yellow_cards: Math.min(2, player.yellow),
      red_cards: Math.min(1, player.red),
      goals_conceded: previousNumber("goals_conceded"),
      saves: previousNumber("saves"),
      clean_sheet: Boolean(previous.clean_sheet),
      penalties_saved: previousNumber("penalties_saved"),
      shots: previousNumber("shots"),
      shots_on_target: previousNumber("shots_on_target"),
      passes_attempted: previousNumber("passes_attempted"),
      passes_completed: previousNumber("passes_completed"),
      key_passes: previousNumber("key_passes"),
      tackles_won: previousNumber("tackles_won"),
      interceptions: previousNumber("interceptions"),
      clearances: previousNumber("clearances"),
      blocks: previousNumber("blocks"),
      fouls_committed: previousNumber("fouls_committed"),
      fouls_won: previousNumber("fouls_won"),
      notes: typeof previous.notes === "string" ? previous.notes : null,
      created_by: previous.created_by || userId,
      updated_by: userId,
    });
  }

  // v2.29.20: the complete club snapshot and optional status transition are
  // committed in one PostgreSQL transaction. A stale snapshot cannot overwrite
  // statistics written after this request loaded its baseline.
  const expectedUpdatedAt = (existingResult.data ?? [])
    .map((row) => typeof row.updated_at === "string" ? row.updated_at : "")
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  const { data: saved, error: atomicError } = await supabase.rpc("save_club_player_stats_atomic", {
    p_match_id: Number(matchId),
    p_rows: statsRows,
    p_status: status,
    p_compare_revision: true,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (atomicError) {
    const conflict = atomicError.code === "40001" || /another tab/i.test(atomicError.message);
    go(matchId, { error: conflict
      ? "Статистика изменилась в другой вкладке. Обнови страницу перед повторным сохранением."
      : `Пересчёт статистики не завершён: ${atomicError.message}. Данные события или состава проверь повторно.` });
  }
  if (!saved || saved.saved !== true || saved.entries !== statsRows.length ||
      String(saved.team_id) !== String(clubTeamId)) {
    go(matchId, { error: "База не подтвердила транзакционное сохранение статистики. Проверь данные матча." });
  }
}

export async function saveClubSquadAndStats(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  if (!/^\d+$/.test(matchId)) redirect("/admin/match-center");

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`
      id,status,competition_id,home_team_id,away_team_id,
      home:teams!matches_home_team_id_fkey(id,is_club),
      away:teams!matches_away_team_id_fkey(id,is_club)
    `)
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) go(matchId, { error: "Матч не найден." });

  const home = Array.isArray(match.home) ? match.home[0] : match.home;
  const away = Array.isArray(match.away) ? match.away[0] : match.away;
  const clubSide: "home" | "away" | null = home?.is_club ? "home" : away?.is_club ? "away" : null;
  if (!clubSide) go(matchId, { error: "Не удалось определить FC Edineț в этом матче." });
  const clubTeamId = String(clubSide === "home" ? match.home_team_id : match.away_team_id);

  const requestedIds: string[] = [];
  const requestedManualNames: string[] = [];
  for (const role of LINEUP_ROLES) {
    const max = role === "starter" ? 11 : 12;
    for (let slot = 1; slot <= max; slot += 1) {
      const playerId = text(formData, `${role}_${slot}_player_id`);
      const manualName = text(formData, `${role}_${slot}_player_name`).replace(/\s+/g, " ").trim().toLowerCase();
      if (playerId) requestedIds.push(playerId);
      else if (manualName) requestedManualNames.push(manualName);
    }
  }
  if (new Set(requestedIds).size !== requestedIds.length || new Set(requestedManualNames).size !== requestedManualNames.length) {
    go(matchId, { error: "Один игрок не может быть одновременно указан в нескольких строках состава." });
  }

  const { data: players, error: playersError } = requestedIds.length
    ? await supabase.from("players").select("id,first_name,last_name,shirt_number,position").in("id", requestedIds)
    : { data: [], error: null };
  if (playersError) go(matchId, { error: `Не удалось проверить игроков: ${playersError.message}` });
  const playerMap = new Map((players ?? []).map((player) => [String(player.id), player]));

  const lineupRows: Record<string, unknown>[] = [];
  let starterCount = 0;
  let goalkeeperCount = 0;
  let captainCount = 0;

  for (const role of LINEUP_ROLES) {
    const max = role === "starter" ? 11 : 12;
    for (let slot = 1; slot <= max; slot += 1) {
      const prefix = `${role}_${slot}`;
      let playerId = text(formData, `${prefix}_player_id`) || null;
      const manualName = nullableText(formData, `${prefix}_player_name`, 120);
      let player = playerId ? playerMap.get(playerId) : null;
      if (playerId && !player) go(matchId, { error: `Игрок в строке ${slot} не найден.` });

      const positionRaw = text(formData, `${prefix}_position`);
      let position = LINEUP_POSITIONS.has(positionRaw)
        ? positionRaw
        : LINEUP_POSITIONS.has(String(player?.position ?? ""))
          ? String(player?.position)
          : null;

      let playerName = player ? `${player.first_name} ${player.last_name}`.trim() : manualName;
      if (!playerName) continue;

      if (!playerId && manualName) {
        if (!position) go(matchId, { error: `Для игрока ${manualName} выбери позицию.` });
        const temporary = await ensureTemporaryClubPlayer(supabase, matchId, clubTeamId, manualName, position);
        playerId = temporary.playerId;
        player = temporary.player;
        playerName = temporary.playerName;
        playerMap.set(playerId, player);
      }
      const isCaptain = formData.get(`${prefix}_captain`) === "on";
      const shirtRaw = text(formData, `${prefix}_shirt_number`);
      let shirtNumber = player?.shirt_number ?? null;
      if (shirtRaw) {
        const parsed = Number(shirtRaw);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
          go(matchId, { error: `Номер игрока ${playerName}: допустимо от 0 до 99.` });
        }
        shirtNumber = parsed;
      }

      if (role === "starter") starterCount += 1;
      if (role === "starter" && position === "goalkeeper") goalkeeperCount += 1;
      if (isCaptain) captainCount += 1;

      lineupRows.push({
        match_id: matchId,
        team_id: clubTeamId,
        side: clubSide,
        lineup_role: role,
        slot_number: slot,
        player_id: playerId,
        player_name: playerName,
        shirt_number: shirtNumber,
        position,
        is_captain: isCaptain,
        sort_order: slot,
        created_by: userId,
        updated_by: userId,
      });
    }
  }

  if (captainCount !== 1) go(matchId, { error: "Перед сохранением состава FC Edineț выбери одного капитана." });

  let hasSeasonCompetition = false;
  if (match.competition_id) {
    const { data: competition, error: competitionError } = await supabase
      .from("competitions")
      .select("id,season_id")
      .eq("id", match.competition_id)
      .maybeSingle();
    hasSeasonCompetition = !competitionError && Boolean(competition?.season_id);
  }

  // v2.10.4: there is only one Save button. A valid lineup of a finished match
  // becomes COMPLETE automatically so season/tournament aggregation includes it.
  const completed =
    match.status === "finished" &&
    starterCount === 11 &&
    goalkeeperCount >= 1 &&
    hasSeasonCompetition;

  const formation = nullableText(formData, "formation", 40);
  const coachName = nullableText(formData, "coach_name", 160);
  await persistLineupAtomically(supabase, matchId, clubSide, formation, coachName,
    lineupRows, nullableText(formData, "lineup_revision", 80), true);

  // The club statistics and the completed/draft status now form one atomic
  // transaction. The lineup itself is saved by the preceding (separate) RPC.
  await syncClubPlayerStatsFromEvents(supabase, userId, matchId, completed ? "complete" : "draft");

  revalidateMatchCenter(matchId);
  revalidatePath(`/admin/statistics/${matchId}`);
  revalidatePath("/admin/statistics");
  revalidatePath("/statistics");
  revalidatePath("/team");
  go(matchId, { saved: completed ? "squad-complete" : "squad-draft" });
}


const MATCH_CENTER_STATUSES = new Set(["scheduled", "live", "finished", "postponed", "cancelled"]);

function nullableNumber(
  formData: FormData,
  key: string,
  min: number,
  max: number,
  label: string,
  matchId: string,
  decimals = false,
) {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < min || value > max || (!decimals && !Number.isInteger(value))) {
    go(matchId, { error: `${label}: допустимо значение от ${min} до ${max}.` });
  }
  return value;
}

export async function saveMatchBasics(formData: FormData) {
  const { supabase } = await requireEditor();
  const matchId = text(formData, "match_id");
  if (!/^\d+$/.test(matchId)) redirect("/admin/match-center");

  const status = text(formData, "status");
  if (!MATCH_CENTER_STATUSES.has(status)) go(matchId, { error: "Некорректный статус матча." });

  const homeScore = nullableNumber(formData, "home_score", 0, 99, "Счёт хозяев", matchId);
  const awayScore = nullableNumber(formData, "away_score", 0, 99, "Счёт гостей", matchId);
  if (status === "finished" && (homeScore == null || awayScore == null)) {
    go(matchId, { error: "Для завершённого матча укажи итоговый счёт." });
  }

  const { error } = await supabase
    .from("matches")
    .update({
      status,
      home_score: status === "scheduled" ? null : homeScore,
      away_score: status === "scheduled" ? null : awayScore,
      stadium: nullableText(formData, "stadium", 180),
      round: nullableText(formData, "round", 120),
      notes: nullableText(formData, "notes", 2000),
    })
    .eq("id", matchId);

  if (error) go(matchId, { error: `Не удалось сохранить основные данные: ${error.message}` });

  revalidateMatchCenter(matchId);
  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/admin/matches");
  go(matchId, { saved: "basics" });
}

export async function saveMatchTeamStatistics(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  if (!/^\d+$/.test(matchId)) redirect("/admin/match-center");

  const match = await loadMatchContext(supabase, matchId);

  const rows = ([
    ["home", String(match.home_team_id)],
    ["away", String(match.away_team_id)],
  ] as const).map(([side, teamId]) => {
    const p = `${side}_`;
    const shots = nullableNumber(formData, `${p}shots`, 0, 100, `${side}: удары`, matchId);
    const shotsOnTarget = nullableNumber(formData, `${p}shots_on_target`, 0, 100, `${side}: удары в створ`, matchId);
    const passesAttempted = nullableNumber(formData, `${p}passes_attempted`, 0, 1500, `${side}: пасы`, matchId);
    const passesCompleted = nullableNumber(formData, `${p}passes_completed`, 0, 1500, `${side}: точные пасы`, matchId);

    if (shots != null && shotsOnTarget != null && shotsOnTarget > shots) {
      go(matchId, { error: `${side === "home" ? "Хозяева" : "Гости"}: удары в створ не могут превышать все удары.` });
    }
    if (passesAttempted != null && passesCompleted != null && passesCompleted > passesAttempted) {
      go(matchId, { error: `${side === "home" ? "Хозяева" : "Гости"}: точные пасы не могут превышать все пасы.` });
    }

    return {
      match_id: matchId,
      team_id: teamId,
      side,
      possession_percent: nullableNumber(formData, `${p}possession_percent`, 0, 100, `${side}: владение`, matchId, true),
      shots,
      shots_on_target: shotsOnTarget,
      corners: nullableNumber(formData, `${p}corners`, 0, 60, `${side}: угловые`, matchId),
      fouls: nullableNumber(formData, `${p}fouls`, 0, 80, `${side}: фолы`, matchId),
      offsides: nullableNumber(formData, `${p}offsides`, 0, 40, `${side}: офсайды`, matchId),
      yellow_cards: nullableNumber(formData, `${p}yellow_cards`, 0, 20, `${side}: жёлтые карточки`, matchId),
      red_cards: nullableNumber(formData, `${p}red_cards`, 0, 10, `${side}: красные карточки`, matchId),
      passes_attempted: passesAttempted,
      passes_completed: passesCompleted,
      saves: nullableNumber(formData, `${p}saves`, 0, 100, `${side}: сейвы`, matchId),
      expected_goals: nullableNumber(formData, `${p}expected_goals`, 0, 30, `${side}: xG`, matchId, true),
      notes: nullableText(formData, `${p}notes`, 600),
      updated_by: userId,
      created_by: userId,
    };
  });

  const { error } = await supabase
    .from("match_team_statistics")
    .upsert(rows, { onConflict: "match_id,side" });

  if (error) go(matchId, { error: `Не удалось сохранить командную статистику: ${error.message}` });

  revalidateMatchCenter(matchId);
  revalidatePath(`/matches/${matchId}`);
  go(matchId, { saved: "team-stats" });
}
