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

  const playerId = text(formData, "player_id") || null;
  const manualPlayerName = nullableText(formData, "player_name", 120);
  const relatedPlayerId = text(formData, "related_player_id") || null;
  const manualRelatedName = nullableText(formData, "related_player_name", 120);

  const player = await resolvePlayerName(
    supabase,
    playerId,
    manualPlayerName,
    matchId,
    "Основной игрок",
  );
  const relatedPlayer = await resolvePlayerName(
    supabase,
    relatedPlayerId,
    manualRelatedName,
    matchId,
    "Связанный игрок",
  );

  if (PLAYER_REQUIRED.has(eventType) && !player.name) {
    go(matchId, {
      error: "Для этого события укажи игрока: выбери футболиста FC Edineț или введи имя вручную.",
    });
  }

  if (eventType === "substitution" && !relatedPlayer.name) {
    go(matchId, {
      error: "Для замены укажи второго игрока: кто вышел на поле.",
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

  revalidateMatchCenter(matchId);
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

  revalidateMatchCenter(matchId);
  go(matchId, { saved: "event-updated" });
}

export async function deleteMatchEvent(formData: FormData) {
  const { supabase } = await requireEditor();
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

  revalidateMatchCenter(matchId);
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
