import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleLabels, staffRoles, type Profile } from "@/lib/types";
import AdminShellClient from "@/app/components/AdminShellClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("id,email,full_name,display_name,role")
    .eq("id", userId)
    .single();

  const profile = data as Pick<Profile, "id" | "email" | "full_name" | "display_name" | "role"> | null;
  if (!profile || !staffRoles.includes(profile.role)) redirect("/account");

  return (
    <AdminShellClient
      role={profile.role}
      displayName={profile.display_name || profile.full_name || profile.email || "FC Edineț"}
      roleLabel={roleLabels[profile.role]}
    >
      {children}
    </AdminShellClient>
  );
}
