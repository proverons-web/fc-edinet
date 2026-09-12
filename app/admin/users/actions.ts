"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/editorial";
import type { UserRole } from "@/lib/types";

const allowedRoles = new Set<UserRole>([
  "fan",
  "author",
  "editor",
  "admin",
]);

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

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/account");

  redirect("/admin/users?saved=1");
}
