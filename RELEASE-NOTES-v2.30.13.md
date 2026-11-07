# FC Edineț v2.30.13 — Production Health & Final Audit

Built from the full v2.30.12 release. No database migration, no redesign.

## Changes

- `/admin/diagnostics` now reports the combined runtime of eight actual parallel Supabase queries, and flags their errors instead of presenting a static green status. This requires editor/admin authorization as before.
- Runtime Next.js version now comes from `package.json` rather than the obsolete hard-coded `16.3.2`.
- The migration-file marker `077` is labeled as a source-file marker, **not** proof of executed SQL migrations.
- The public `/api/health` endpoint is explicitly a *configuration-only* check. It no longer exposes translation model names or internal environment information. A DB outage can still coexist with HTTP 200; the payload says `database: not_checked`.
- The internal list of routes is no longer represented as a live HTTP check.
- The existing public error page now displays the Next.js error digest (if supplied), without showing error messages, stack traces or secrets.
- Added `CHECK_PRODUCTION_FC_EDINET.bat` and a dependency-free Node.js HTTP smoke check covering 10 public routes, `/api/version` mismatch detection, HTTP status and response-header timing, producing `production-health-report.json`.
- Added offline tests of that smoke check; included in QA, deployment validation and CI.

## Important scope and limitations

The smoke checker measures approximate **time to HTTP response headers** and basic availability, *not* Core Web Vitals or browser end-user experience. It does not login, touch admin APIs, submit forms or generate DB writes. QA screenshots check existing baselines, not real consumer traffic. Runtime logs/Observability were inaccessible via the connected Vercel app (403) while production deployment metadata remained accessible.

No production deployment or Supabase migration is triggered by preparing this ZIP.
