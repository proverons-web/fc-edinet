# FC Edineț — v2.29.2 Security & Analytics Audit

## Scope

Patch over v2.29.1. Public design, content and club functionality remain unchanged.

## Dependency upgrade

- `next` was pinned from `16.3.2` to `16.4.4` because versions before `16.4.1` contain October 2026 high/critical advisories.
- No forced upgrades of other npm packages.
- Local npm registry is unreachable in the authoring environment (`EAI_AGAIN`), so `npm audit` and a production Next.js build **must still be run after deploying to Windows**.
- The release intentionally does **not** include a fabricated `package-lock.json`. Run `npm install`, commit its actual generated lockfile to the repository, and use `npm ci` on subsequent builds.

## Analytics API safeguards

- The IP hash is calculated with server-only `ANALYTICS_IP_SALT`, never storing the raw IP in Supabase.
- On Vercel, `x-vercel-forwarded-for` is treated as the only trusted client IP source. No fallback to raw client-provided headers in production.
- Requests with a different Origin are rejected if Origin is provided. Cross-site Fetch Metadata is also rejected.
- JSON is required and the body has a 2 KB limit before parsing.
- Bots, Preview deployments, and private pages are excluded as before.
- The existing `record_site_visit_v4` RPC still validates the server-only ingest proof against the hash stored privately in Supabase.
- These controls reduce accidental and basic automated pollution. They are **not** a substitute for Vercel WAF rate limiting against determined attackers.

## Production Supabase review on November 3, 2026

- All tables in the exposed public schema had RLS enabled.
- The `profiles` table allows authenticated users to update only `full_name`, `display_name`, `city`, `avatar_url`, `preferred_language`, `notifications_enabled`. Authenticated users have no table-level UPDATE grant and no UPDATE grant on `role`.
- The role-changing RPC `admin_set_user_role` checks `auth.uid()` and `current_user_role() = 'admin'` before any update.
- Migration `restrict_trigger_helper_execute` (local equivalent: `database/067_restrict_trigger_helper_execute.sql`) applied successfully. All seven internal trigger-only SECURITY DEFINER functions have direct EXECUTE revoked from anon/authenticated; their eight trigger attachments remain in the database.
- Intentional public RPCs remain: `get_public_visit_counts` (aggregate count only) and `record_site_visit_v4` (server-proof gated). They still appear in Supabase security advisor because SECURITY DEFINER functions can be called via anon, but their use is intentional.
- RLS enabled but no policies for `site_visitors`/`site_pageviews` is intentional; public table grants are revoked and access is only through narrowly scoped RPCs.
- Recent `ip_v1` sample: Moldova 11 unique HMAC IP hashes / 228 pageviews; United States 1 / 1. These counts will change over time.

## Remaining work

1. Run `npm audit --omit=dev` in the Windows project after installing packages; inspect any remaining advisories.
2. Run `npm run deploy:check`, check `next build`, and ensure Vercel actually serves the patched Next.js build.
3. Re-check the audit counts after 24–48 hours of real traffic. Confirm geography and unique IP trends against plausible audience behaviour.
4. Review Vercel WAF/bot/rate limit settings. The site endpoint intentionally does not store raw IPs.
5. Review Supabase performance lints separately (foreign key indexes, unused indexes). These are not fixed in a security-only patch.

Reference sources:
- https://github.com/vercel/next.js/releases/tag/v16.4.4
- https://nextjs.org/blog/nextjs-security-update-october-14-2026
- https://supabase.com/docs/guides/api/securing-your-api
- https://vercel.com/docs/headers/request-headers
