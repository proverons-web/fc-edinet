"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";

const validAppearances = new Set(["starter", "substitute"]);
const validPositions = new Set(["goalkeeper", "defender", "midfielder", "forward"]);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function integer(
  formData: FormData,
  key: string,
  min: number,
  max: number,
  label: string
) {
  const raw = text(formData, key);
  if (raw === "") return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label}: допустимо от ${min} до ${max}.`);
  }
  return value;
}

function go(matchId: string, params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/admin/statistics/${encodeURIComponent(matchId)}?${query.toString()}`);
}

function parsePlayerIds(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((value) => String(value)).filter(Boolean))].slice(0, 100);
  } catch {
    return [];
  }
}

export async function saveMatchStatistics(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const matchId = text(formData, "match_id");
  const intent = text(formData, "intent") === "complete" ? "complete" : "draft";

  if (!/^\d+$/.test(matchId)) {
    redirect("/admin/statistics?error=Матч не найден.");
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id,status,competition_id")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    go(matchId, { error: "Матч не найден." });
  }

  if (match.status !== "finished") {
    go(matchId, { error: "Статистику можно заполнять только для завершённого матча." });
  }

  if (intent === "complete") {
    if (!match.competition_id) {
      go(matchId, { error: "Перед завершением статистики привяжи матч к турниру." });
    }
    const { data: competition, error: competitionError } = await supabase
      .from("competitions")
      .select("id,season_id")
      .eq("id", match.competition_id)
      .maybeSingle();
    if (competitionError || !competition?.season_id) {
      go(matchId, { error: "Перед завершением статистики привяжи турнир к сезону." });
    }
  }

  const requestedPlayerIds = parsePlayerIds(text(formData, "player_ids"));
  if (requestedPlayerIds.length === 0) {
    go(matchId, { error: "Список игроков пуст." });
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id,position")
    .in("id", requestedPlayerIds);

  if (playersError) {
    go(matchId, { error: `Не удалось проверить игроков: ${playersError.message}` });
  }

  const validPlayerIds = new Set((players ?? []).map((player) => String(player.id)));

  // v2.3.8 practical mode: advanced metrics are no longer shown in the normal form.
  // Preserve any advanced data that may already exist from older versions instead of
  // silently resetting it when an editor saves the simplified protocol.
  const { data: existingDetailedRows, error: existingDetailedError } = await supabase
    .from("player_match_stats")
    .select("*")
    .eq("match_id", matchId);

  if (existingDetailedError) {
    go(matchId, { error: `Не удалось загрузить сохранённые показатели: ${existingDetailedError.message}` });
  }

  const existingByPlayer = new Map(
    (existingDetailedRows ?? []).map((row) => [String(row.player_id), row as Record<string, unknown>])
  );

  const payload: Record<string, unknown>[] = [];
  let startersCount = 0;
  let goalkeepersCount = 0;
  let captainsCount = 0;

  try {
    for (const player of players ?? []) {
      const playerId = String(player.id);
      if (formData.get(`played_${playerId}`) !== "on") continue;

      const appearanceRaw = text(formData, `appearance_${playerId}`);
      const appearance = validAppearances.has(appearanceRaw) ? appearanceRaw : "starter";

      const positionRaw = text(formData, `position_${playerId}`);
      const fallbackPosition = validPositions.has(String(player.position))
        ? String(player.position)
        : "midfielder";
      const position = validPositions.has(positionRaw) ? positionRaw : fallbackPosition;
      const isGoalkeeper = position === "goalkeeper";
      const isCaptain = formData.get(`captain_${playerId}`) === "on";
      if (appearance === "starter") startersCount += 1;
      if (isGoalkeeper) goalkeepersCount += 1;
      if (isCaptain) captainsCount += 1;

      const previous = existingByPlayer.get(playerId) ?? {};
      const previousNumber = (key: string) => {
        const value = Number(previous[key] ?? 0);
        return Number.isFinite(value) ? value : 0;
      };
      const previousBool = (key: string) => Boolean(previous[key]);

      payload.push({
        match_id: matchId,
        player_id: playerId,
        appearance,
        position,
        is_captain: isCaptain,
        minutes_played: integer(formData, `minutes_${playerId}`, 0, 130, "Минуты"),
        goals: integer(formData, `goals_${playerId}`, 0, 20, "Голы"),
        assists: integer(formData, `assists_${playerId}`, 0, 20, "Ассисты"),
        own_goals: integer(formData, `own_goals_${playerId}`, 0, 10, "Автоголы"),
        penalties_scored: integer(formData, `penalties_scored_${playerId}`, 0, 20, "Забитые пенальти"),
        penalties_missed: integer(formData, `penalties_missed_${playerId}`, 0, 20, "Незабитые пенальти"),
        yellow_cards: integer(formData, `yellow_${playerId}`, 0, 2, "Жёлтые карточки"),
        red_cards: integer(formData, `red_${playerId}`, 0, 1, "Красные карточки"),

        // Advanced metrics are intentionally preserved, not requested in practical mode.
        goals_conceded: previousNumber("goals_conceded"),
        saves: previousNumber("saves"),
        clean_sheet: previousBool("clean_sheet"),
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

        notes: text(formData, `notes_${playerId}`).slice(0, 1000) || null,
        created_by: userId,
        updated_by: userId,
      });
    }
  } catch (error) {
    go(matchId, { error: error instanceof Error ? error.message : "Проверь значения статистики." });
  }

  if (intent === "complete") {
    if (payload.length === 0) {
      go(matchId, { error: "Нельзя завершить статистику без сыгравших футболистов." });
    }
    if (startersCount === 0) {
      go(matchId, { error: "Для завершённой статистики отметь хотя бы одного игрока в стартовом составе." });
    }
    if (goalkeepersCount === 0) {
      go(matchId, { error: "Для завершённой статистики отметь хотя бы одного вратаря." });
    }
    if (captainsCount > 1) {
      go(matchId, { error: "В одном матче можно отметить только одного капитана." });
    }
  }

  const selectedPlayerIds = new Set(payload.map((row) => String(row.player_id)));

  const { data: existingRows, error: existingError } = await supabase
    .from("player_match_stats")
    .select("player_id")
    .eq("match_id", matchId);

  if (existingError) {
    go(matchId, { error: `Не удалось загрузить сохранённую статистику: ${existingError.message}` });
  }

  const toDelete = (existingRows ?? [])
    .map((row) => String(row.player_id))
    .filter((playerId) => validPlayerIds.has(playerId) && !selectedPlayerIds.has(playerId));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("player_match_stats")
      .delete()
      .eq("match_id", matchId)
      .in("player_id", toDelete);

    if (deleteError) {
      go(matchId, {
        error: `Не удалось убрать игроков из матча: ${deleteError.message}. Проверь, применена ли миграция 035.`,
      });
    }
  }

  if (payload.length > 0) {
    const { error: upsertError } = await supabase
      .from("player_match_stats")
      .upsert(payload, { onConflict: "match_id,player_id" });

    if (upsertError) {
      go(matchId, { error: `Не удалось сохранить статистику: ${upsertError.message}` });
    }
  }

  const completed = intent === "complete";
  const now = new Date().toISOString();
  const { error: stateError } = await supabase
    .from("match_statistics_status")
    .upsert(
      {
        match_id: matchId,
        status: completed ? "complete" : "draft",
        completed_at: completed ? now : null,
        completed_by: completed ? userId : null,
        updated_by: userId,
      },
      { onConflict: "match_id" }
    );

  if (stateError) {
    go(matchId, { error: `Показатели сохранены, но статус матча не обновлён: ${stateError.message}` });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/statistics");
  revalidatePath(`/admin/statistics/${matchId}`);
  revalidatePath("/team");
  revalidatePath("/statistics");

  go(matchId, { saved: completed ? "complete" : "draft" });
}
