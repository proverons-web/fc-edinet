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

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id,status,home_team_id,away_team_id,home_score,away_score")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) go(matchId, { error: "Матч не найден." });
  if (match.status !== "finished") go(matchId, { error: "Публичный протокол можно опубликовать только после завершения матча." });

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

  // Keep match statistics in sync before publication. This is intentionally
  // independent from the navigation label “Календарь” and the /matches route.
  await syncClubPlayerStatsFromEvents(supabase, userId, matchId);
  const { data: clubLineup } = await supabase
    .from("match_lineup_entries")
    .select("lineup_role,position")
    .eq("match_id", matchId)
    .not("player_id", "is", null);
  const starters = (clubLineup ?? []).filter((row) => row.lineup_role === "starter");
  const hasGoalkeeper = starters.some((row) => row.position === "goalkeeper");
  if (starters.length === 11 && hasGoalkeeper) {
    await supabase.from("match_statistics_status").upsert({
      match_id: matchId,
      status: "complete",
      completed_at: new Date().toISOString(),
      completed_by: userId,
      updated_by: userId,
    }, { onConflict: "match_id" });
  }

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
  go(matchId, { saved: "event" });
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

  if (captains > 1) go(matchId, { error: "В одной команде можно отметить только одного капитана." });

  const { error: settingsError } = await supabase
    .from("match_lineup_settings")
    .upsert({
      match_id: matchId,
      team_id: teamId,
      side,
      formation,
      coach_name: coachName,
      updated_by: userId,
      created_by: userId,
    }, { onConflict: "match_id,side" });
  if (settingsError) go(matchId, { error: `Не удалось сохранить схему: ${settingsError.message}` });

  const { error: deleteError } = await supabase
    .from("match_lineup_entries")
    .delete()
    .eq("match_id", matchId)
    .eq("side", side);
  if (deleteError) go(matchId, { error: `Не удалось обновить состав: ${deleteError.message}` });

  if (payload.length > 0) {
    const { error: insertError } = await supabase.from("match_lineup_entries").insert(payload);
    if (insertError) go(matchId, { error: `Не удалось сохранить состав: ${insertError.message}` });
  }

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

  const { error: deleteError } = await supabase
    .from("match_lineup_entries")
    .delete()
    .eq("match_id", matchId)
    .eq("side", side);
  if (deleteError) go(matchId, { error: `Не удалось подготовить импорт: ${deleteError.message}` });

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("match_lineup_entries").insert(rows);
    if (insertError) go(matchId, { error: `Не удалось импортировать состав: ${insertError.message}` });
  }

  const { error: settingsError } = await supabase
    .from("match_lineup_settings")
    .upsert({
      match_id: matchId,
      team_id: teamId,
      side,
      formation: null,
      coach_name: null,
      created_by: userId,
      updated_by: userId,
    }, { onConflict: "match_id,side" });
  if (settingsError) go(matchId, { error: `Состав импортирован, но настройки не сохранены: ${settingsError.message}` });

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
  if (matchError || !match) return;

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
    supabase.from("player_match_stats").select("*").eq("match_id", matchId),
  ]);

  if (lineupResult.error || eventsResult.error || existingResult.error) return;

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
        if (event.event_type === "yellow_card") player.yellow += 1;
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

  const selectedIds = new Set(statsRows.map((row) => String(row.player_id)));
  const staleIds = [...existingByPlayer.keys()].filter((id) => !selectedIds.has(id));
  if (staleIds.length > 0) {
    await supabase.from("player_match_stats").delete().eq("match_id", matchId).in("player_id", staleIds);
  }
  if (statsRows.length > 0) {
    await supabase.from("player_match_stats").upsert(statsRows, { onConflict: "match_id,player_id" });
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

  if (captainCount > 1) go(matchId, { error: "У FC Edineț можно отметить только одного капитана." });

  let hasSeasonCompetition = false;
  if (match.competition_id) {
    const { data: competition, error: competitionError } = await supabase
      .from("competitions")
      .select("id,season_id")
      .eq("id", match.competition_id)
      .maybeSingle();
    hasSeasonCompetition = !competitionError && Boolean(competition?.season_id);
  }

  // v2.9.9: there is only one Save button. A valid lineup of a finished match
  // becomes COMPLETE automatically so season/tournament aggregation includes it.
  const completed =
    match.status === "finished" &&
    starterCount === 11 &&
    goalkeeperCount >= 1 &&
    hasSeasonCompetition;

  const formation = nullableText(formData, "formation", 40);
  const coachName = nullableText(formData, "coach_name", 160);
  const { error: settingsError } = await supabase.from("match_lineup_settings").upsert({
    match_id: matchId,
    team_id: clubTeamId,
    side: clubSide,
    formation,
    coach_name: coachName,
    created_by: userId,
    updated_by: userId,
  }, { onConflict: "match_id,side" });
  if (settingsError) go(matchId, { error: `Не удалось сохранить настройки состава: ${settingsError.message}` });

  const { error: lineupDeleteError } = await supabase
    .from("match_lineup_entries")
    .delete()
    .eq("match_id", matchId)
    .eq("side", clubSide);
  if (lineupDeleteError) go(matchId, { error: `Не удалось обновить состав: ${lineupDeleteError.message}` });
  if (lineupRows.length > 0) {
    const { error: lineupInsertError } = await supabase.from("match_lineup_entries").insert(lineupRows);
    if (lineupInsertError) go(matchId, { error: `Не удалось сохранить состав: ${lineupInsertError.message}` });
  }

  await syncClubPlayerStatsFromEvents(supabase, userId, matchId);

  const { error: statusError } = await supabase.from("match_statistics_status").upsert({
    match_id: matchId,
    status: completed ? "complete" : "draft",
    completed_at: completed ? new Date().toISOString() : null,
    completed_by: completed ? userId : null,
    updated_by: userId,
  }, { onConflict: "match_id" });
  if (statusError) go(matchId, { error: `Состав сохранён, но статус статистики не обновлён: ${statusError.message}` });

  revalidateMatchCenter(matchId);
  revalidatePath(`/admin/statistics/${matchId}`);
  revalidatePath("/admin/statistics");
  revalidatePath("/statistics");
  revalidatePath("/team");
  go(matchId, { saved: completed ? "squad-complete" : "squad-draft" });
}

