import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Cookie-free Supabase client for public, read-only data.
 *
 * Public pages should not inherit a stale browser auth token: an expired
 * session cookie can make an otherwise public PostgREST query return 401.
 * Keep authenticated/account/admin reads on lib/supabase/server.ts instead.
 */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseConfig();

  return createSupabaseClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
