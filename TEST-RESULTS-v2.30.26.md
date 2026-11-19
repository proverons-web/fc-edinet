# FC Edineț v2.30.26 — QA evidence

## Completed

- `node scripts/qa-production-safety-v2326.mjs`: **16 / 16 PASS**.
  - Temporary independent Git repository; simulated safe commit, private key,
    accidentally staged Supabase server token, npm auth token and `.env.production`.
  - Verified Git bundle of previous `origin/main` and a blocked backup path
    inside the repository.
  - Checked ordering: backup before branch reset; staged scanner before commit.
  - Asserted that output never prints the simulated secret.
- Release compatibility tests: original `npm run qa:all` finished its first 28
  groups, then the long-running command hit the execution environment limit.
  Remaining 26 groups were run in sequence independently; **26 / 26 passed**.
  No `FAIL` lines in either log. This is equivalent functional QA coverage,
  but **not** a single successful full-run exit code.
- TypeScript/TSX/JS syntax parse: **315 files / 0 syntax errors**.
- `scripts/check-deploy.mjs`: **PASS** with synthetic environment values.
- ZIP checksum and file manifest verified at packaging time.

## Not completed in this environment

- `npm run typecheck`: project npm dependencies unavailable; the syntax parser
  does not perform type checking or resolve imports.
- `next build`: npm dependencies unavailable; the Windows installer runs the
  actual Next.js production build before the Git push.
- Live Supabase permission changes: **none**. SQL migration: **none**.
- No live deployment, production rollback drill, or database restore test.

## Deployment caveats

- Git `.bundle` covers source history, **not** Supabase database or Storage.
- Supabase Security Advisor warnings remain; see `SECURITY-AUDIT-v2.30.26.md`.
- `EBADENGINE` with installed Node 24 vs project Node 22.x is a warning, not
  proof of a build failure. A successful typecheck/build is still required.
