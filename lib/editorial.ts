import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { staffRoles } from "@/lib/types";

export async function requireStaff() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const profile = profileData as Profile | null;

  if (
    profileError ||
    !profile ||
    !staffRoles.includes(profile.role)
  ) {
    redirect("/account");
  }

  return { supabase, profile: profile as Profile, userId };
}

export function isEditor(profile: Profile) {
  return profile.role === "editor" || profile.role === "admin";
}


export async function requireEditor() {
  const context = await requireStaff();

  if (!isEditor(context.profile)) {
    redirect("/admin");
  }

  return context;
}

export async function requireAdmin() {
  const context = await requireStaff();

  if (context.profile.role !== "admin") {
    redirect("/admin");
  }

  return context;
}
