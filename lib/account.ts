import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function requireAccountProfile() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) redirect("/login");

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error("Profile not found");
  return { supabase, userId, profile: data as Profile };
}
