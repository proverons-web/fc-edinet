"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import {
  resolveRomanianTranslation,
  sourceHash,
  translateRuToRo,
  translationConfigured,
  translationModel,
  type TranslationDiagnosticDetails,
  type TranslationFields,
} from "@/lib/auto-translation";

const MAX_PER_RUN = 12;

type JobResult = { ok: boolean; diagnostic?: TranslationDiagnosticDetails };
type Job = {
  contentType: string;
  contentId: string | null;
  contentLabel: string;
  run: () => Promise<JobResult>;
};

export async function testTranslationConnection() {
  const { supabase, userId } = await requireEditor();
  if (!translationConfigured()) redirect("/admin/translations?error=missing_key");

  const result = await translateRuToRo(
    { test: "FC Edineț проверяет автоматический перевод." },
    "FC Edinet automatic translation connection test"
  );

  if (!result.ok) {
    await logDiagnostic(supabase, userId, {
      contentType: "connection_test",
      contentId: null,
      contentLabel: "Проверка OpenAI API",
      status: "error",
      diagnostic: result.diagnostic,
    });
    redirect("/admin/translations?test=error");
    throw new Error("redirect");
  }

  await logDiagnostic(supabase, userId, {
    contentType: "connection_test",
    contentId: null,
    contentLabel: "Проверка OpenAI API",
    status: "success",
  });
  redirect("/admin/translations?test=success");
}

export async function translateExistingContent(formData: FormData) {
  const { supabase, userId } = await requireEditor();

  if (!translationConfigured()) redirect("/admin/translations?error=missing_key");

  const force = formData.get("force") === "on";
  let processed = 0;
  let failed = 0;
  const jobs: Job[] = [];

  const [
    clubResult,
    heroResult,
    settingsResult,
    newsResult,
    playersResult,
    leadersResult,
    achievementsResult,
    partnersResult,
  ] = await Promise.all([
    supabase.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("news").select("*").order("updated_at", { ascending: false }).limit(100),
    supabase.from("players").select("*").order("display_order").limit(100),
    supabase.from("club_leadership").select("*").order("display_order").limit(100),
    supabase.from("club_achievements").select("*").order("display_order").limit(100),
    supabase.from("partners").select("*").order("display_order").limit(100),
  ]);

  const club = clubResult.data as any;
  if (club) {
    const source = {
      club_name: club.club_name,
      city: club.city,
      club_colors: club.club_colors,
      motto: club.motto,
      about_text: club.about_text,
      history_text: club.history_text,
      address: club.address,
      stadium_name: club.stadium_name,
      stadium_address: club.stadium_address,
      stadium_description: club.stadium_description,
    };
    if (shouldTranslate(club, source, force)) {
      jobs.push(makeJob({
        contentType: "club_profile",
        contentId: "1",
        contentLabel: "Профиль клуба",
        source,
        manual: {
          club_name: club.club_name_ro,
          city: club.city_ro,
          club_colors: club.club_colors_ro,
          motto: club.motto_ro,
          about_text: club.about_text_ro,
          history_text: club.history_text_ro,
          address: club.address_ro,
          stadium_name: club.stadium_name_ro,
          stadium_address: club.stadium_address_ro,
          stadium_description: club.stadium_description_ro,
        },
        context: "FC Edinet club profile, history, contacts and stadium",
        previousHash: club.ro_translation_source_hash,
        force,
        update: async (result) => supabase.from("club_profile").update({
          club_name_ro: result.values.club_name,
          city_ro: result.values.city,
          club_colors_ro: result.values.club_colors,
          motto_ro: result.values.motto,
          about_text_ro: result.values.about_text,
          history_text_ro: result.values.history_text,
          address_ro: result.values.address,
          stadium_name_ro: result.values.stadium_name,
          stadium_address_ro: result.values.stadium_address,
          stadium_description_ro: result.values.stadium_description,
          ro_translation_source_hash: result.sourceHash,
          ro_translation_updated_at: result.translatedAt,
        }).eq("id", 1),
      }));
    }
  }

  const hero = heroResult.data as any;
  if (hero) {
    const source = {
      eyebrow: hero.eyebrow,
      title_main: hero.title_main,
      title_accent: hero.title_accent,
      description: hero.description,
      primary_button_text: hero.primary_button_text,
      secondary_button_text: hero.secondary_button_text,
    };
    if (shouldTranslate(hero, source, force)) {
      jobs.push(makeJob({
        contentType: "homepage_hero",
        contentId: "1",
        contentLabel: "Hero главной",
        source,
        manual: {
          eyebrow: hero.eyebrow_ro,
          title_main: hero.title_main_ro,
          title_accent: hero.title_accent_ro,
          description: hero.description_ro,
          primary_button_text: hero.primary_button_text_ro,
          secondary_button_text: hero.secondary_button_text_ro,
        },
        context: "FC Edinet homepage hero",
        previousHash: hero.ro_translation_source_hash,
        force,
        update: async (result) => supabase.from("homepage_hero").update({
          eyebrow_ro: result.values.eyebrow,
          title_main_ro: result.values.title_main,
          title_accent_ro: result.values.title_accent,
          description_ro: result.values.description,
          primary_button_text_ro: result.values.primary_button_text,
          secondary_button_text_ro: result.values.secondary_button_text,
          ro_translation_source_hash: result.sourceHash,
          ro_translation_updated_at: result.translatedAt,
        }).eq("id", 1),
      }));
    }
  }

  const settings = settingsResult.data as any;
  if (settings) {
    const source = {
      banner_eyebrow: settings.banner_eyebrow,
      banner_title: settings.banner_title,
      banner_text: settings.banner_text,
      banner_button_text: settings.banner_button_text,
    };
    if (shouldTranslate(settings, source, force)) {
      jobs.push(makeJob({
        contentType: "homepage_settings",
        contentId: "1",
        contentLabel: "Баннер главной",
        source,
        manual: {
          banner_eyebrow: settings.banner_eyebrow_ro,
          banner_title: settings.banner_title_ro,
          banner_text: settings.banner_text_ro,
          banner_button_text: settings.banner_button_text_ro,
        },
        context: "FC Edinet homepage announcement banner",
        previousHash: settings.ro_translation_source_hash,
        force,
        update: async (result) => supabase.from("homepage_settings").update({
          banner_eyebrow_ro: result.values.banner_eyebrow,
          banner_title_ro: result.values.banner_title,
          banner_text_ro: result.values.banner_text,
          banner_button_text_ro: result.values.banner_button_text,
          ro_translation_source_hash: result.sourceHash,
          ro_translation_updated_at: result.translatedAt,
        }).eq("id", 1),
      }));
    }
  }

  for (const article of (newsResult.data ?? []) as any[]) {
    const source = { title: article.title, excerpt: article.excerpt, content: article.content };
    if (!shouldTranslate(article, source, force)) continue;
    jobs.push(makeJob({
      contentType: "news",
      contentId: String(article.id),
      contentLabel: article.title || `Новость #${article.id}`,
      source,
      manual: { title: article.title_ro, excerpt: article.excerpt_ro, content: article.content_ro },
      context: `FC Edinet news article: ${article.title}`,
      previousHash: article.ro_translation_source_hash,
      force,
      update: async (result) => supabase.from("news").update({
        title_ro: result.values.title,
        excerpt_ro: result.values.excerpt,
        content_ro: result.values.content,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", article.id),
    }));
  }

  for (const player of (playersResult.data ?? []) as any[]) {
    const source = { bio: player.bio };
    if (!shouldTranslate(player, source, force)) continue;
    jobs.push(makeJob({
      contentType: "player",
      contentId: String(player.id),
      contentLabel: `${player.first_name} ${player.last_name}`.trim(),
      source,
      manual: { bio: player.bio_ro },
      context: `FC Edinet player biography: ${player.first_name} ${player.last_name}`,
      previousHash: player.ro_translation_source_hash,
      force,
      update: async (result) => supabase.from("players").update({
        bio_ro: result.values.bio,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", player.id),
    }));
  }

  for (const leader of (leadersResult.data ?? []) as any[]) {
    const source = { role: leader.role, bio: leader.bio };
    if (!shouldTranslate(leader, source, force)) continue;
    jobs.push(makeJob({
      contentType: "club_leadership",
      contentId: String(leader.id),
      contentLabel: leader.name || `Руководство #${leader.id}`,
      source,
      manual: { role: leader.role_ro, bio: leader.bio_ro },
      context: `FC Edinet leadership profile: ${leader.name}`,
      previousHash: leader.ro_translation_source_hash,
      force,
      update: async (result) => supabase.from("club_leadership").update({
        role_ro: result.values.role,
        bio_ro: result.values.bio,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", leader.id),
    }));
  }

  for (const achievement of (achievementsResult.data ?? []) as any[]) {
    const source = { title: achievement.title, description: achievement.description };
    if (!shouldTranslate(achievement, source, force)) continue;
    jobs.push(makeJob({
      contentType: "club_achievement",
      contentId: String(achievement.id),
      contentLabel: achievement.title || `Достижение #${achievement.id}`,
      source,
      manual: { title: achievement.title_ro, description: achievement.description_ro },
      context: "FC Edinet club achievement",
      previousHash: achievement.ro_translation_source_hash,
      force,
      update: async (result) => supabase.from("club_achievements").update({
        title_ro: result.values.title,
        description_ro: result.values.description,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", achievement.id),
    }));
  }

  for (const partner of (partnersResult.data ?? []) as any[]) {
    const source = { description: partner.description };
    if (!shouldTranslate(partner, source, force)) continue;
    jobs.push(makeJob({
      contentType: "partner",
      contentId: String(partner.id),
      contentLabel: partner.name || `Партнёр #${partner.id}`,
      source,
      manual: { description: partner.description_ro },
      context: `FC Edinet partner description: ${partner.name}`,
      previousHash: partner.ro_translation_source_hash,
      force,
      update: async (result) => supabase.from("partners").update({
        description_ro: result.values.description,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", partner.id),
    }));
  }

  for (const job of jobs.slice(0, MAX_PER_RUN)) {
    const outcome = await job.run();
    if (outcome.ok) processed += 1;
    else failed += 1;
    await logDiagnostic(supabase, userId, {
      contentType: job.contentType,
      contentId: job.contentId,
      contentLabel: job.contentLabel,
      status: outcome.ok ? "success" : "error",
      diagnostic: outcome.diagnostic,
    });
  }

  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/team");
  revalidatePath("/club");
  revalidatePath("/partners");
  revalidatePath("/admin/translations");

  const more = Math.max(0, jobs.length - MAX_PER_RUN);
  redirect(`/admin/translations?processed=${processed}&failed=${failed}&more=${more}`);
}

function makeJob(options: {
  contentType: string;
  contentId: string | null;
  contentLabel: string;
  source: TranslationFields;
  manual: TranslationFields;
  context: string;
  previousHash?: string | null;
  force: boolean;
  update: (result: Awaited<ReturnType<typeof resolveRomanianTranslation>>) => Promise<{ error: any }> | any;
}): Job {
  return {
    contentType: options.contentType,
    contentId: options.contentId,
    contentLabel: options.contentLabel,
    run: async () => {
      const result = await resolveRomanianTranslation({
        source: options.source,
        manual: options.manual,
        context: options.context,
        previousHash: options.previousHash,
        force: options.force,
      });
      if (!result.translated) {
        return {
          ok: false,
          diagnostic: result.diagnostic ?? dbDiagnostic("translation_not_generated", result.warning || "Перевод не был создан."),
        };
      }

      const updateResult = await options.update(result);
      if (updateResult?.error) {
        return {
          ok: false,
          diagnostic: dbDiagnostic(updateResult.error.code || "supabase_update_error", updateResult.error.message || "Не удалось сохранить перевод в Supabase."),
        };
      }
      return { ok: true };
    },
  };
}

async function logDiagnostic(
  supabase: any,
  userId: string,
  input: {
    contentType: string;
    contentId: string | null;
    contentLabel: string;
    status: "success" | "error";
    diagnostic?: TranslationDiagnosticDetails;
  }
) {
  const diagnostic = input.diagnostic;
  await supabase.from("translation_diagnostics").insert({
    actor_user_id: userId,
    content_type: input.contentType,
    content_id: input.contentId,
    content_label: input.contentLabel,
    status: input.status,
    model: diagnostic?.model || translationModel(),
    http_status: diagnostic?.httpStatus ?? null,
    error_type: diagnostic?.errorType ?? null,
    error_code: diagnostic?.errorCode ?? null,
    error_message: diagnostic?.message ?? null,
    request_id: diagnostic?.requestId ?? null,
  });
}

function dbDiagnostic(code: string, message: string): TranslationDiagnosticDetails {
  return {
    model: translationModel(),
    httpStatus: null,
    errorType: "database_error",
    errorCode: code,
    message,
    requestId: null,
  };
}

function shouldTranslate(
  row: { ro_translation_locked?: boolean; ro_translation_source_hash?: string | null },
  source: Record<string, string | null | undefined>,
  force: boolean
) {
  if (row.ro_translation_locked) return false;
  const hasSource = Object.values(source).some((value) => String(value ?? "").trim());
  if (!hasSource) return false;
  if (force) return true;
  return row.ro_translation_source_hash !== sourceHash(source);
}
