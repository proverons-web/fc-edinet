import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Per-render signed-in role lookup using database profiles, not editable claims. */
export const canCurrentUserEdit = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) return false;
  const { data, error } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
  return !error && (data?.role === "admin" || data?.role === "editor");
});
