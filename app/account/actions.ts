"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { accountText } from "@/lib/account-i18n";

export type ProfileState = { error?: string; success?: string };
export type SettingsState = { error?: string; success?: string };

function localeFromForm(formData: FormData): Locale {
  return String(formData.get("locale") ?? "ru") === "ro" ? "ro" : "ru";
}

function avatarPathFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/avatars/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

async function requireUser() {
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (error || !userId) redirect("/login");
  return { supabase, userId };
}

export async function updateProfile(
  _previousState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const locale = localeFromForm(formData);
  const text = accountText[locale];
  const fullName = String(formData.get("full_name") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const avatar = formData.get("avatar");

  if (fullName.length < 2 || fullName.length > 100) return { error: text.invalidName };
  if (displayName.length < 2 || displayName.length > 60) return { error: text.invalidDisplayName };
  if (city.length > 80) return { error: text.invalidCity };

  const { supabase, userId } = await requireUser();
  const { data: currentProfile } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const previousAvatarPath = avatarPathFromUrl(currentProfile?.avatar_url);
  let avatarUrl: string | undefined;

  if (avatar instanceof File && avatar.size > 0) {
    const allowed = new Map([
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/webp", "webp"],
    ]);
    const extension = allowed.get(avatar.type);
    if (!extension) return { error: text.avatarType };
    if (avatar.size > 3 * 1024 * 1024) return { error: text.avatarSize };

    const objectPath = `${userId}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(objectPath, avatar, { contentType: avatar.type, upsert: false });

    if (uploadError) return { error: `${text.profileError} ${uploadError.message}` };
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(objectPath).data.publicUrl;
  }

  const payload: Record<string, string | null> = {
    full_name: fullName,
    display_name: displayName,
    city: city || null,
  };
  if (avatarUrl) payload.avatar_url = avatarUrl;

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) return { error: text.profileError };

  if (avatarUrl && previousAvatarPath) {
    await supabase.storage.from("avatars").remove([previousAvatarPath]);
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { success: text.profileSaved };
}

export async function removeAvatar(locale: Locale) {
  const { supabase, userId } = await requireUser();
  const { data: currentProfile } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const previousAvatarPath = avatarPathFromUrl(currentProfile?.avatar_url);
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (previousAvatarPath) await supabase.storage.from("avatars").remove([previousAvatarPath]);
  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/profile");
  redirect(`/account/profile?avatar=removed&lang=${locale}`);
}

export async function updateSettings(
  _previousState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const currentLocale = localeFromForm(formData);
  const text = accountText[currentLocale];
  const preferredLanguage = String(formData.get("preferred_language") ?? "ru") === "ro" ? "ro" : "ru";
  const notificationsEnabled = formData.get("notifications_enabled") === "on";
  const { supabase, userId } = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_language: preferredLanguage, notifications_enabled: notificationsEnabled })
    .eq("id", userId);

  if (error) return { error: text.settingsError };

  const store = await cookies();
  store.set(LOCALE_COOKIE, preferredLanguage, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/settings");
  return { success: accountText[preferredLanguage].settingsSaved };
}

export async function toggleFavoritePlayer(playerId: string, returnPath: string) {
  const { supabase, userId } = await requireUser();
  const { data: existing } = await supabase
    .from("favorite_players")
    .select("player_id")
    .eq("user_id", userId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorite_players").delete().eq("user_id", userId).eq("player_id", playerId);
  } else {
    await supabase.from("favorite_players").insert({ user_id: userId, player_id: playerId });
  }

  revalidatePath(returnPath);
  revalidatePath("/account");
  revalidatePath("/account/favorites");
}

export async function toggleFavoriteMatch(matchId: string, returnPath: string) {
  const numericMatchId = Number(matchId);
  if (!Number.isFinite(numericMatchId)) return;
  const { supabase, userId } = await requireUser();
  const { data: existing } = await supabase
    .from("favorite_matches")
    .select("match_id")
    .eq("user_id", userId)
    .eq("match_id", numericMatchId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorite_matches").delete().eq("user_id", userId).eq("match_id", numericMatchId);
  } else {
    await supabase.from("favorite_matches").insert({ user_id: userId, match_id: numericMatchId });
  }

  revalidatePath(returnPath);
  revalidatePath("/account");
  revalidatePath("/account/favorites");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
