"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/editorial";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

const allowedRoles = new Set<UserRole>([
  "fan",
  "author",
  "editor",
  "admin",
]);

function refreshUsers() {
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/account");
}

export async function createAdminUser(formData: FormData) {
  // Protect the action itself, not just the page or the browser form.
  await requireAdmin();
  if (!isSupabaseAdminConfigured()) redirect("/admin/users?error=admin_secret_required#new-user");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedRole = String(formData.get("role") ?? "fan").trim() as UserRole;
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || password.length > 128 || fullName.length > 120 || !allowedRoles.has(requestedRole)) {
    redirect("/admin/users?error=create_invalid#new-user");
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (error || !data.user) {
    console.error("admin createUser failed", error?.message || "no user returned");
    redirect(`/admin/users?error=${/already|registered|exists/i.test(error?.message ?? "") ? "email_exists" : "create_failed"}#new-user`);
  }
  const newUserId = data.user.id;
  const { error: profileError } = await admin.from("profiles").upsert({
    id: newUserId, email, full_name: fullName || null, role: requestedRole,
  }, { onConflict: "id" });
  if (profileError) {
    console.error("new user profile setup failed", profileError.message);
    const rollback = await admin.auth.admin.deleteUser(newUserId);
    if (rollback.error) console.error("user creation rollback failed", rollback.error.message);
    redirect("/admin/users?error=create_profile_failed#new-user");
  }
  refreshUsers();
  redirect("/admin/users?created=1");
}

export async function updateUserRole(formData: FormData) {
  const targetUserId = String(formData.get("user_id") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "").trim() as UserRole;

  if (!targetUserId || !allowedRoles.has(requestedRole)) {
    redirect("/admin/users?error=invalid_request");
  }

  const { supabase, userId } = await requireAdmin();

  if (targetUserId === userId && requestedRole !== "admin") {
    redirect("/admin/users?error=self_role");
  }

  const { error } = await supabase.rpc("admin_set_user_role", {
    target_user_id: targetUserId,
    new_role: requestedRole,
  });

  if (error) {
    console.error("admin_set_user_role failed", error);
    redirect("/admin/users?error=update_failed");
  }

  refreshUsers();
  redirect("/admin/users?saved=1");
}

export async function toggleUserBlock(formData: FormData) {
  const targetUserId = String(formData.get("user_id") ?? "").trim();

  if (!targetUserId) redirect("/admin/users?error=invalid_request");

  const { userId } = await requireAdmin();
  if (targetUserId === userId) redirect("/admin/users?error=self_block");

  if (!isSupabaseAdminConfigured()) {
    redirect("/admin/users?error=admin_secret_required");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(targetUserId);

  if (error || !data.user) {
    console.error("getUserById failed", error);
    redirect("/admin/users?error=block_failed");
  }

  const bannedUntil = data.user.banned_until
    ? new Date(data.user.banned_until).getTime()
    : 0;
  const isBlocked = bannedUntil > Date.now();

  const { error: updateError } = await admin.auth.admin.updateUserById(targetUserId, {
    ban_duration: isBlocked ? "none" : "876000h",
  });

  if (updateError) {
    console.error("toggle user ban failed", updateError);
    redirect("/admin/users?error=block_failed");
  }

  refreshUsers();
  redirect(`/admin/users?${isBlocked ? "unblocked" : "blocked"}=1`);
}
