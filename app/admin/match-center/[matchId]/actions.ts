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
