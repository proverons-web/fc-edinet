"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/editorial";

export type StandingsState = {
  error?: string;
  success?: string;
};

export async function saveStandings(
  _previousState: StandingsState,
  formData: FormData
): Promise<StandingsState> {
  const { supabase } = await requireEditor();

  const competitionId = String(
    formData.get("competition_id") ?? ""
  ).trim();

  if (!competitionId) {
    return { error: "Турнир не выбран." };
  }

  const teamIds = formData
    .getAll("team_id")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (teamIds.length === 0) {
    return { error: "Нет команд для сохранения." };
  }

  const upserts: Array<{
    competition_id: string;
    team_id: string;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    points_adjustment: number;
  }> = [];

  const unchecked: string[] = [];

  for (const teamId of teamIds) {
    const participates =
      formData.get(`participant_${teamId}`) === "on";

    if (!participates) {
      unchecked.push(teamId);
      continue;
    }

    const wins = readNumber(formData, `wins_${teamId}`);
    const draws = readNumber(formData, `draws_${teamId}`);
    const losses = readNumber(formData, `losses_${teamId}`);
    const goalsFor = readNumber(formData, `gf_${teamId}`);
    const goalsAgainst = readNumber(formData, `ga_${teamId}`);
    const adjustment = readSignedNumber(
      formData,
      `adjustment_${teamId}`
    );

    if (
      wins === null ||
      draws === null ||
      losses === null ||
      goalsFor === null ||
      goalsAgainst === null ||
      adjustment === null
    ) {
      return {
        error:
          "Проверь статистику команд: допускаются только целые числа.",
      };
    }

    upserts.push({
      competition_id: competitionId,
      team_id: teamId,
      wins,
      draws,
      losses,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      points_adjustment: adjustment,
    });
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("standings")
      .upsert(upserts, {
        onConflict: "competition_id,team_id",
      });

    if (error) {
      return {
        error: `Не удалось сохранить таблицу: ${error.message}`,
      };
    }
  }

  if (unchecked.length > 0) {
    const { error } = await supabase
      .from("standings")
      .delete()
      .eq("competition_id", competitionId)
      .in("team_id", unchecked);

    if (error) {
      return {
        error: `Не удалось обновить участников: ${error.message}`,
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/standings");
  revalidatePath("/admin");
  revalidatePath("/admin/standings");

  return { success: "Турнирная таблица сохранена." };
}

function readNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "0").trim();
  const value = raw === "" ? 0 : Number(raw);

  if (!Number.isInteger(value) || value < 0 || value > 999) {
    return null;
  }

  return value;
}

function readSignedNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "0").trim();
  const value = raw === "" ? 0 : Number(raw);

  if (!Number.isInteger(value) || value < -100 || value > 100) {
    return null;
  }

  return value;
}
