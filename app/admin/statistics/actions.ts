"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function optionalDate(value: FormDataEntryValue | null) {
  const result = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function go(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/admin/statistics?${query.toString()}`);
}

export async function createSeason(formData: FormData) {
  const { supabase } = await requireEditor();

  const name = text(formData.get("name"));
  const startsOn = optionalDate(formData.get("starts_on"));
  const endsOn = optionalDate(formData.get("ends_on"));
  const makeCurrent = formData.get("is_current") === "on";

  if (name.length < 4) {
    go({ error: "Название сезона слишком короткое." });
  }

  if (startsOn && endsOn && startsOn > endsOn) {
    go({ error: "Дата окончания сезона не может быть раньше даты начала." });
  }

  const baseSlug = slugify(name) || `season-${Date.now()}`;

  const { data: created, error } = await supabase
    .from("seasons")
    .insert({
      name,
      slug: baseSlug,
      starts_on: startsOn,
      ends_on: endsOn,
      is_current: false,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    const duplicate = error?.message.toLowerCase().includes("duplicate");
    go({
      error: duplicate
        ? "Сезон с таким названием уже существует."
        : `Не удалось создать сезон: ${error?.message || "неизвестная ошибка"}`,
    });
  }

  if (makeCurrent) {
    const { error: clearError } = await supabase
      .from("seasons")
      .update({ is_current: false })
      .neq("id", created.id);

    if (clearError) {
      go({ error: `Сезон создан, но не удалось сделать его текущим: ${clearError.message}` });
    }

    const { error: currentError } = await supabase
      .from("seasons")
      .update({ is_current: true })
      .eq("id", created.id);

    if (currentError) {
      go({ error: `Сезон создан, но не удалось сделать его текущим: ${currentError.message}` });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/statistics");
  go({ saved: "season" });
}

export async function setCurrentSeason(formData: FormData) {
  const { supabase } = await requireEditor();
  const seasonId = text(formData.get("season_id"));

  if (!seasonId) {
    go({ error: "Сезон не найден." });
  }

  const { error: clearError } = await supabase
    .from("seasons")
    .update({ is_current: false })
    .neq("id", seasonId);

  if (clearError) {
    go({ error: `Не удалось изменить сезон: ${clearError.message}` });
  }

  const { error } = await supabase
    .from("seasons")
    .update({ is_current: true, is_active: true })
    .eq("id", seasonId);

  if (error) {
    go({ error: `Не удалось выбрать текущий сезон: ${error.message}` });
  }

  revalidatePath("/admin/statistics");
  go({ saved: "current" });
}

export async function assignCompetitionSeason(formData: FormData) {
  const { supabase } = await requireEditor();
  const competitionId = text(formData.get("competition_id"));
  const seasonId = text(formData.get("season_id"));

  if (!competitionId) {
    go({ error: "Турнир не найден." });
  }

  let seasonName: string | null = null;

  if (seasonId) {
    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("name")
      .eq("id", seasonId)
      .single();

    if (seasonError || !season) {
      go({ error: "Выбранный сезон не найден." });
    }

    seasonName = String(season.name);
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      season_id: seasonId || null,
      // Keep the legacy text field in sync: existing public UI already reads it.
      season: seasonName,
    })
    .eq("id", competitionId);

  if (error) {
    go({ error: `Не удалось привязать турнир: ${error.message}` });
  }

  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/admin/matches");
  revalidatePath("/admin/statistics");
  go({ saved: "competition" });
}
