"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type { MatchStatus } from "@/lib/types";

export type MatchFormState = {
  error?: string;
};

export type TeamFormState = {
  error?: string;
  success?: string;
};

type TeamLogoUploadResult =
  | {
      ok: true;
      error: null;
      path: string;
      publicUrl: string;
    }
  | {
      ok: false;
      error: string;
      path: null;
      publicUrl: null;
    };

const validStatuses = new Set<MatchStatus>([
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
]);

const allowedLogoMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const maxLogoBytes = 3 * 1024 * 1024;

export async function saveMatch(
  _previousState: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  const { supabase } = await requireEditor();

  const rawId = String(formData.get("match_id") ?? "").trim();
  const matchId = rawId || null;

  const competitionId = nullableId(formData.get("competition_id"));
  const homeTeamId = nullableId(formData.get("home_team_id"));
  const awayTeamId = nullableId(formData.get("away_team_id"));
  const kickoffLocal = String(formData.get("kickoff") ?? "").trim();
  const timezoneOffset = Number(formData.get("timezone_offset") ?? 0);
  const stadium = nullableString(formData.get("stadium"));
  const round = nullableString(formData.get("round"));
  const status = String(formData.get("status") ?? "scheduled") as MatchStatus;
  const homeScoreRaw = String(formData.get("home_score") ?? "").trim();
  const awayScoreRaw = String(formData.get("away_score") ?? "").trim();
  const notes = nullableString(formData.get("notes"));

  if (!homeTeamId || !awayTeamId) {
    return { error: "Выбери обе команды." };
  }

  if (homeTeamId === awayTeamId) {
    return { error: "Команды матча должны быть разными." };
  }

  if (!kickoffLocal) {
    return { error: "Укажи дату и время матча." };
  }

  if (!validStatuses.has(status)) {
    return { error: "Некорректный статус матча." };
  }

  const kickoff = localDateTimeToIso(kickoffLocal, timezoneOffset);
  if (!kickoff) {
    return { error: "Не удалось распознать дату матча." };
  }

  const homeScore = parseScore(homeScoreRaw);
  const awayScore = parseScore(awayScoreRaw);

  if (homeScore === "invalid" || awayScore === "invalid") {
    return { error: "Счёт должен быть целым неотрицательным числом." };
  }

  if (
    status === "finished" &&
    (homeScore === null || awayScore === null)
  ) {
    return { error: "Для завершённого матча укажи итоговый счёт." };
  }

  const payload = {
    competition_id: competitionId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    kickoff,
    stadium,
    round,
    status,
    home_score: status === "scheduled" ? null : homeScore,
    away_score: status === "scheduled" ? null : awayScore,
    notes,
  };

  let savedId: string;

  if (matchId) {
    const { data, error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", matchId)
      .select("id")
      .single();

    if (error || !data) {
      return { error: humanize(error?.message) };
    }

    savedId = String(data.id);
  } else {
    const { data, error } = await supabase
      .from("matches")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      return { error: humanize(error?.message) };
    }

    savedId = String(data.id);
  }

  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/admin");
  revalidatePath("/admin/matches");

  redirect(`/admin/matches/${savedId}/edit?saved=1`);
}

export async function deleteMatch(formData: FormData) {
  const { supabase, profile } = await requireEditor();

  if (profile.role !== "admin") {
    redirect("/admin/matches");
  }

  const matchId = String(formData.get("match_id") ?? "").trim();
  if (!matchId) redirect("/admin/matches");

  await supabase.from("matches").delete().eq("id", matchId);

  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/admin");
  revalidatePath("/admin/matches");
  redirect("/admin/matches");
}

export async function addTeam(
  _previousState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const { supabase, userId } = await requireEditor();

  const name = String(formData.get("name") ?? "").trim();
  const shortName = nullableString(formData.get("short_name"));
  const city = nullableString(formData.get("city"));
  const homeStadium = nullableString(formData.get("home_stadium"));
  const slug = slugify(String(formData.get("slug") ?? name));
  const isClub = formData.get("is_club") === "on";

  if (name.length < 2) {
    return { error: "Укажи название команды." };
  }

  if (!slug) {
    return { error: "Не удалось создать slug команды." };
  }

  let logoUrl: string | null = null;

  const logoValue = formData.get("logo_file");
  if (logoValue instanceof File && logoValue.size > 0) {
    const uploadResult = await uploadTeamLogo(supabase, userId, slug, logoValue);

    if (!uploadResult.ok) {
      return { error: uploadResult.error };
    }

    logoUrl = uploadResult.publicUrl;
  }

  const { error } = await supabase.from("teams").insert({
    name,
    short_name: shortName,
    slug,
    city,
    home_stadium: homeStadium,
    logo_url: logoUrl,
    is_club: isClub,
    is_active: true,
  });

  if (error) {
    if (logoUrl) {
      const path = storagePathFromPublicUrl(logoUrl, "teams");
      if (path) {
        await supabase.storage.from("teams").remove([path]);
      }
    }

    return {
      error: error.message.toLowerCase().includes("unique")
        ? "Команда с таким slug уже существует."
        : `Не удалось добавить команду: ${error.message}`,
    };
  }

  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/admin/matches");
  revalidatePath("/admin/matches/new");
  revalidatePath("/admin/matches/teams");

  return { success: "Команда добавлена." };
}

export async function saveTeam(
  _previousState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const { supabase, userId } = await requireEditor();

  const teamId = String(formData.get("team_id") ?? "").trim();
  if (!teamId) {
    return { error: "Команда не найдена." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const shortName = nullableString(formData.get("short_name"));
  const city = nullableString(formData.get("city"));
  const homeStadium = nullableString(formData.get("home_stadium"));
  const slug = slugify(String(formData.get("slug") ?? name));
  const isClub = formData.get("is_club") === "on";
  const isActive = formData.get("is_active") === "on";
  const clearLogo = formData.get("clear_logo") === "on";

  if (name.length < 2) {
    return { error: "Укажи название команды." };
  }

  if (!slug) {
    return { error: "Не удалось создать slug команды." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (existingError || !existing) {
    return { error: "Команда не найдена." };
  }

  let logoUrl: string | null = clearLogo ? null : (existing.logo_url ?? null);
  let newUploadedPath: string | null = null;

  const logoValue = formData.get("logo_file");
  if (logoValue instanceof File && logoValue.size > 0) {
    const uploadResult = await uploadTeamLogo(supabase, userId, slug, logoValue);

    if (!uploadResult.ok) {
      return { error: uploadResult.error };
    }

    logoUrl = uploadResult.publicUrl;
    newUploadedPath = uploadResult.path;
  }

  const { error } = await supabase
    .from("teams")
    .update({
      name,
      short_name: shortName,
      city,
      home_stadium: homeStadium,
      slug,
      logo_url: logoUrl,
      is_club: isClub,
      is_active: isActive,
    })
    .eq("id", teamId);

  if (error) {
    if (newUploadedPath) {
      await supabase.storage.from("teams").remove([newUploadedPath]);
    }

    return {
      error: error.message.toLowerCase().includes("unique")
        ? "Команда с таким slug уже существует."
        : `Не удалось сохранить команду: ${error.message}`,
    };
  }

  if (existing.logo_url && (clearLogo || newUploadedPath)) {
    const oldPath = storagePathFromPublicUrl(existing.logo_url, "teams");
    if (oldPath) {
      await supabase.storage.from("teams").remove([oldPath]);
    }
  }

  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/admin/matches");
  revalidatePath("/admin/matches/new");
  revalidatePath("/admin/matches/teams");
  revalidatePath(`/admin/matches/teams/${teamId}/edit`);

  redirect(`/admin/matches/teams/${teamId}/edit?saved=1`);
}

async function uploadTeamLogo(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  userId: string,
  slug: string,
  file: File
): Promise<TeamLogoUploadResult> {
  if (!allowedLogoMime.has(file.type)) {
    return {
      ok: false,
      error: "Логотип должен быть JPG, PNG, WEBP или SVG.",
      path: null,
      publicUrl: null,
    };
  }

  if (file.size > maxLogoBytes) {
    return {
      ok: false,
      error: "Максимальный размер логотипа — 3 МБ.",
      path: null,
      publicUrl: null,
    };
  }

  const ext = extensionForFile(file);
  const path = `${userId}/${Date.now()}-${slug}.${ext}`;

  const { error } = await supabase.storage
    .from("teams")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    if (error.message.toLowerCase().includes("bucket not found")) {
      return {
        ok: false,
        error:
          "Bucket teams не найден. Выполни database/009_team_logos_fix.sql в Supabase SQL Editor.",
        path: null,
        publicUrl: null,
      };
    }

    return {
      ok: false,
      error: `Не удалось загрузить логотип: ${error.message}`,
      path: null,
      publicUrl: null,
    };
  }

  const { data } = supabase.storage.from("teams").getPublicUrl(path);

  return {
    ok: true,
    error: null,
    path,
    publicUrl: data.publicUrl,
  };
}

function nullableString(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

function nullableId(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

function parseScore(value: string): number | null | "invalid" {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
    return "invalid";
  }
  return parsed;
}

function localDateTimeToIso(value: string, offsetMinutes: number) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );
  if (!match) return null;

  const [, y, m, d, hh, mm] = match;
  const utc =
    Date.UTC(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm)
    ) +
    offsetMinutes * 60_000;

  return new Date(utc).toISOString();
}

function slugify(value: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",
    и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
    с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",
    щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extensionForFile(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/svg+xml") return "svg";
  return "jpg";
}

function storagePathFromPublicUrl(url: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);

  if (index === -1) return null;

  return decodeURIComponent(url.slice(index + marker.length));
}

function humanize(message?: string) {
  if (!message) return "Не удалось сохранить матч.";

  if (message.toLowerCase().includes("different_teams")) {
    return "Команды матча должны быть разными.";
  }

  if (
    message.toLowerCase().includes("permission") ||
    message.toLowerCase().includes("row-level security")
  ) {
    return "Недостаточно прав для изменения матча.";
  }

  return `Не удалось сохранить матч: ${message}`;
}
