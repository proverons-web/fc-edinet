"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import {
  resolveRomanianTranslation,
  sourceHash,
  translationConfigured,
} from "@/lib/auto-translation";

const MAX_PER_RUN = 12;

export async function translateExistingContent(formData: FormData) {
  const { supabase } = await requireEditor();

  if (!translationConfigured()) {
    redirect("/admin/translations?error=missing_key");
  }

  const force = formData.get("force") === "on";
  let processed = 0;
  let failed = 0;

  type Job = () => Promise<boolean>;
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
      jobs.push(async () => {
        const result = await resolveRomanianTranslation({
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
        });
        if (!result.translated) return false;
        const { error } = await supabase.from("club_profile").update({
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
        }).eq("id", 1);
        return !error;
      });
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
      jobs.push(async () => {
        const result = await resolveRomanianTranslation({
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
        });
        if (!result.translated) return false;
        const { error } = await supabase.from("homepage_hero").update({
          eyebrow_ro: result.values.eyebrow,
          title_main_ro: result.values.title_main,
          title_accent_ro: result.values.title_accent,
          description_ro: result.values.description,
          primary_button_text_ro: result.values.primary_button_text,
          secondary_button_text_ro: result.values.secondary_button_text,
          ro_translation_source_hash: result.sourceHash,
          ro_translation_updated_at: result.translatedAt,
        }).eq("id", 1);
        return !error;
      });
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
      jobs.push(async () => {
        const result = await resolveRomanianTranslation({
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
        });
        if (!result.translated) return false;
        const { error } = await supabase.from("homepage_settings").update({
          banner_eyebrow_ro: result.values.banner_eyebrow,
          banner_title_ro: result.values.banner_title,
          banner_text_ro: result.values.banner_text,
          banner_button_text_ro: result.values.banner_button_text,
          ro_translation_source_hash: result.sourceHash,
          ro_translation_updated_at: result.translatedAt,
        }).eq("id", 1);
        return !error;
      });
    }
  }

  for (const article of (newsResult.data ?? []) as any[]) {
    const source = { title: article.title, excerpt: article.excerpt, content: article.content };
    if (!shouldTranslate(article, source, force)) continue;
    jobs.push(async () => {
      const result = await resolveRomanianTranslation({
        source,
        manual: { title: article.title_ro, excerpt: article.excerpt_ro, content: article.content_ro },
        context: `FC Edinet news article: ${article.title}`,
        previousHash: article.ro_translation_source_hash,
        force,
      });
      if (!result.translated) return false;
      const { error } = await supabase.from("news").update({
        title_ro: result.values.title,
        excerpt_ro: result.values.excerpt,
        content_ro: result.values.content,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", article.id);
      return !error;
    });
  }

  for (const player of (playersResult.data ?? []) as any[]) {
    const source = { bio: player.bio };
    if (!shouldTranslate(player, source, force)) continue;
    jobs.push(async () => {
      const result = await resolveRomanianTranslation({
        source,
        manual: { bio: player.bio_ro },
        context: `FC Edinet player biography: ${player.first_name} ${player.last_name}`,
        previousHash: player.ro_translation_source_hash,
        force,
      });
      if (!result.translated) return false;
      const { error } = await supabase.from("players").update({
        bio_ro: result.values.bio,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", player.id);
      return !error;
    });
  }

  for (const leader of (leadersResult.data ?? []) as any[]) {
    const source = { role: leader.role, bio: leader.bio };
    if (!shouldTranslate(leader, source, force)) continue;
    jobs.push(async () => {
      const result = await resolveRomanianTranslation({
        source,
        manual: { role: leader.role_ro, bio: leader.bio_ro },
        context: `FC Edinet leadership profile: ${leader.name}`,
        previousHash: leader.ro_translation_source_hash,
        force,
      });
      if (!result.translated) return false;
      const { error } = await supabase.from("club_leadership").update({
        role_ro: result.values.role,
        bio_ro: result.values.bio,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", leader.id);
      return !error;
    });
  }

  for (const achievement of (achievementsResult.data ?? []) as any[]) {
    const source = { title: achievement.title, description: achievement.description };
    if (!shouldTranslate(achievement, source, force)) continue;
    jobs.push(async () => {
      const result = await resolveRomanianTranslation({
        source,
        manual: { title: achievement.title_ro, description: achievement.description_ro },
        context: "FC Edinet club achievement",
        previousHash: achievement.ro_translation_source_hash,
        force,
      });
      if (!result.translated) return false;
      const { error } = await supabase.from("club_achievements").update({
        title_ro: result.values.title,
        description_ro: result.values.description,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", achievement.id);
      return !error;
    });
  }

  for (const partner of (partnersResult.data ?? []) as any[]) {
    const source = { description: partner.description };
    if (!shouldTranslate(partner, source, force)) continue;
    jobs.push(async () => {
      const result = await resolveRomanianTranslation({
        source,
        manual: { description: partner.description_ro },
        context: `FC Edinet partner description: ${partner.name}`,
        previousHash: partner.ro_translation_source_hash,
        force,
      });
      if (!result.translated) return false;
      const { error } = await supabase.from("partners").update({
        description_ro: result.values.description,
        ro_translation_source_hash: result.sourceHash,
        ro_translation_updated_at: result.translatedAt,
      }).eq("id", partner.id);
      return !error;
    });
  }

  for (const job of jobs.slice(0, MAX_PER_RUN)) {
    const ok = await job();
    if (ok) processed += 1;
    else failed += 1;
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
