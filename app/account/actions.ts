"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = {
  error?: string;
  success?: string;
};

export async function updateProfile(
  _previousState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (fullName.length < 2 || fullName.length > 80) {
    return { error: "Имя должно содержать от 2 до 80 символов." };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);

  if (error) {
    return { error: "Не удалось сохранить профиль." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  return { success: "Профиль сохранён." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
