import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function getSupabaseAdminSecret() {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
}

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabaseAdminSecret());
}

export function createAdminClient() {
  const secret = getSupabaseAdminSecret();

  if (!secret) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not configured. Add the server-only Supabase secret key to .env.local / Vercel Environment Variables."
    );
  }

  const { url } = getSupabaseConfig();

  return createSupabaseClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function createIsolatedSignupClient() {
  const { url, publishableKey } = getSupabaseConfig();

  return createSupabaseClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
