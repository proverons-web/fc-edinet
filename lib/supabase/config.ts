export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured. " +
        "Add it to .env.local locally or Vercel Environment Variables."
    );
  }

  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured. " +
        "Add it to .env.local locally or Vercel Environment Variables."
    );
  }

  return {
    url,
    publishableKey,
  };
}
