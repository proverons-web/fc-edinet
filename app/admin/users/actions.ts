"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/editorial";
import {
  createAdminClient,
  createIsolatedSignupClient,
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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedRole = String(formData.get("role") ?? "fan").trim() as UserRole;

  if (
    !email ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    password.length < 10 ||
    fullName.length > 120 ||
    !allowedRoles.has(requestedRole)
  ) {
    redirect("/admin/users?error=create_invalid#new-user");
  }

  const { supabase } = await requireAdmin();
  let newUserId = "";
  let needsConfirmation = false;

  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });

    if (error || !data.user) {
      console.error("admin createUser failed", error);
      const duplicate = /already|registered|exists/i.test(error?.message ?? "");
      redirect(`/admin/users?error=${duplicate ? "email_exists" : "create_failed"}#new-user`);
    }

    newUserId = data.user.id;

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          email,
          full_name: fullName || null,
          role: requestedRole,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("new user profile setup failed", profileError);
      await admin.auth.admin.deleteUser(newUserId).catch(() => undefined);
      redirect("/admin/users?error=create_profile_failed#new-user");
    }
  } else {
    // Safe fallback for projects where the server-only Supabase secret has not
    // been added yet. This uses an isolated, non-persistent public auth client,
    // so the current administrator session/cookies are never replaced.
    const signup = createIsolatedSignupClient();
    const { data, error } = await signup.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    });

    if (error || !data.user) {
      console.error("isolated admin signup failed", error);
      const duplicate = /already|registered|exists/i.test(error?.message ?? "");
      redirect(`/admin/users?error=${duplicate ? "email_exists" : "create_failed"}#new-user`);
    }

    newUserId = data.user.id;
    needsConfirmation = !data.user.email_confirmed_at;

    const { error: roleError } = await supabase.rpc("admin_set_user_role", {
      target_user_id: newUserId,
      new_role: requestedRole,
    });

    if (roleError) {
      console.error("setting role for fallback signup failed", roleError);
      redirect("/admin/users?error=create_profile_failed#new-user");
    }
  }

  refreshUsers();
  redirect(`/admin/users?created=1${needsConfirmation ? "&confirm=1" : ""}`);
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
