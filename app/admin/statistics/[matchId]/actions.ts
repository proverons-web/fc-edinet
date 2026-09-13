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
    .select("id,status")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    go(matchId, { error: "Матч не найден." });
  }

  if (match.status !== "finished") {
    go(matchId, { error: "Статистику можно заполнять только для завершённого матча." });
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
  const payload: Record<string, unknown>[] = [];

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

      const shots = isGoalkeeper
        ? 0
        : integer(formData, `shots_${playerId}`, 0, 40, "Удары");
      const shotsOnTarget = isGoalkeeper
        ? 0
        : integer(formData, `shots_on_target_${playerId}`, 0, 40, "Удары в створ");
      if (shotsOnTarget > shots) {
        throw new Error("Удары в створ не могут быть больше общего количества ударов.");
      }

      const passesAttempted = integer(
        formData,
        `passes_attempted_${playerId}`,
        0,
        400,
        "Передачи всего"
      );
      const passesCompleted = integer(
        formData,
        `passes_completed_${playerId}`,
        0,
        400,
        "Точные передачи"
      );
      if (passesCompleted > passesAttempted) {
        throw new Error("Точных передач не может быть больше общего количества передач.");
      }

      const defensiveRole = position === "defender" || position === "midfielder";
      const defender = position === "defender";

      payload.push({
        match_id: matchId,
        player_id: playerId,
        appearance,
        position,
        is_captain: formData.get(`captain_${playerId}`) === "on",
        minutes_played: integer(formData, `minutes_${playerId}`, 0, 130, "Минуты"),
        goals: integer(formData, `goals_${playerId}`, 0, 20, "Голы"),
        assists: integer(formData, `assists_${playerId}`, 0, 20, "Ассисты"),
        own_goals: integer(formData, `own_goals_${playerId}`, 0, 10, "Автоголы"),
        penalties_scored: integer(formData, `penalties_scored_${playerId}`, 0, 20, "Забитые пенальти"),
        penalties_missed: integer(formData, `penalties_missed_${playerId}`, 0, 20, "Незабитые пенальти"),
        yellow_cards: integer(formData, `yellow_${playerId}`, 0, 2, "Жёлтые карточки"),
        red_cards: integer(formData, `red_${playerId}`, 0, 1, "Красные карточки"),

        goals_conceded: isGoalkeeper
          ? integer(formData, `goals_conceded_${playerId}`, 0, 30, "Пропущенные голы")
          : 0,
        saves: isGoalkeeper
          ? integer(formData, `saves_${playerId}`, 0, 50, "Сейвы")
          : 0,
        clean_sheet: isGoalkeeper && formData.get(`clean_sheet_${playerId}`) === "on",
        penalties_saved: isGoalkeeper
          ? integer(formData, `penalties_saved_${playerId}`, 0, 10, "Отражённые пенальти")
          : 0,

        shots,
        shots_on_target: shotsOnTarget,
        passes_attempted: passesAttempted,
        passes_completed: passesCompleted,
        key_passes: isGoalkeeper
          ? 0
          : integer(formData, `key_passes_${playerId}`, 0, 60, "Ключевые передачи"),
        tackles_won: defensiveRole
          ? integer(formData, `tackles_won_${playerId}`, 0, 60, "Выигранные отборы")
          : 0,
        interceptions: defensiveRole
          ? integer(formData, `interceptions_${playerId}`, 0, 60, "Перехваты")
          : 0,
        clearances: defender
          ? integer(formData, `clearances_${playerId}`, 0, 80, "Выносы")
          : 0,
        blocks: defender
          ? integer(formData, `blocks_${playerId}`, 0, 60, "Блоки")
          : 0,
        fouls_committed: isGoalkeeper
          ? 0
          : integer(formData, `fouls_committed_${playerId}`, 0, 30, "Фолы"),
        fouls_won: isGoalkeeper
          ? 0
          : integer(formData, `fouls_won_${playerId}`, 0, 30, "Заработанные фолы"),

        notes: text(formData, `notes_${playerId}`).slice(0, 1000) || null,
        created_by: userId,
        updated_by: userId,
      });
    }
  } catch (error) {
    go(matchId, { error: error instanceof Error ? error.message : "Проверь значения статистики." });
  }

  if (intent === "complete" && payload.length === 0) {
    go(matchId, { error: "Нельзя завершить статистику без сыгравших футболистов." });
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

  go(matchId, { saved: completed ? "complete" : "draft" });
}
