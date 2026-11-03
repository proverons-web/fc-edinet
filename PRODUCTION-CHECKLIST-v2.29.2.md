# FC Edineț v2.29.2 — Production deployment checklist

1. Extract `fc-edinet-v2.29.2-FULL.zip` beside older versions. The BAT script can restore an existing local `.env.local` from another release; never paste secrets into the archive.
2. Migration 067 was applied to the active FC Edineț Supabase project on November 3, 2026. If deploying another Supabase project, apply `database/067_restrict_trigger_helper_execute.sql` there first.
3. Run `DEPLOY_FC_EDINET.bat` on Windows. It will install dependencies, check the deploy environment, and run the production build before publishing.
4. If npm reports vulnerabilities, run `npm audit --omit=dev` to get current details. Do not run `npm audit fix --force` automatically.
5. After deploy confirm `/api/version` returns version `2.29.2`, and check Home, News, Team, player pages, and `/admin/site-analytics` from a staff account.
6. Verify the Vercel environment includes the server-only `ANALYTICS_IP_SALT` and the two `NEXT_PUBLIC_SUPABASE_...` values. Never reveal secret values in screenshots/logs.
7. Verify `/api/analytics/visit` rejects cross-origin requests and oversized payloads, without breaking legitimate same-origin tracking.
8. Run `npm install` once and commit the genuine `package-lock.json` to the GitHub repository for reproducible future dependency installs.

Full security audit: `docs/SECURITY-AUDIT-v2.29.2.md`.
