# FC Edineț v2.30.11 — Test results

Source: v2.30.10 FULL FIX1 archive. Tests executed on the modified v2.30.11 source (2026-11-07).

| Check | Result |
| --- | --- |
| `npm run qa:all` (full project regression) | PASS (exit code 0) |
| Main site QA | 176/176 |
| Mobile Experience source checks | 19/19 |
| Stability source checks | 22/22 |
| Responsive Chromium assertions | 59/59 |
| UI Consistency baseline screenshot comparisons | 20/20 |
| Security checks | 11/11 |
| Club History | 52/52 |
| SEO & Social Sharing | 26/26 |
| Match social logos | 21/21 |
| TypeScript transpile syntax diagnostics for 10 touched TS/TSX files | 10/10 |
| `scripts/check-deploy.mjs` with synthetic, non-secret test configuration | PASS (warnings about unset optional integrations expected) |
| Full `npm run typecheck` and `npm run build` | **NOT RUN**: npm dependencies unavailable in this runtime; registry.npmjs.org DNS resolution failed |
| Real-user Web Vitals (LCP, INP, CLS) | **NOT MEASURED**: requires production telemetry or Lighthouse |

Important: source-level QA and fixture comparisons are not a substitute for an authenticated production smoke test. The Windows deployment script runs `npm run typecheck` then `next build` before any GitHub push.

## Manual post-deploy smoke tests

1. /api/version should report 2.30.11.
2. Open mobile menu at 320/390/430px, test Tab, Shift+Tab, Escape and close button.
3. /matches: logo sizes, score/cards, protocol navigation; favorites still functional.
4. Standings and Club Archive: logos and historical thumbnails load, full-size images remain original.
5. Home Hero image does not distort or jump; video loads only after click.
6. Use Chrome Lighthouse / PSI after deploying for LCP/INP/CLS field and lab checks.

## v2.30.11 FULL FIX1 — corrective checks (2026-11-07)

The first v2.30.11 package failed `next build` because an import preceded
`"use client"` in `app/components/ClubArchiveGallery.tsx`. The directive now
precedes all imports. This is a Turbopack client-boundary error and was not
detected by the prior TypeScript-only syntax checks.

| Check | FIX1 result |
| --- | --- |
| Source-wide directive guard: 294 source files | PASS |
| Guard self-test (misplaced import is rejected) | PASS |
| Mobile Experience source checks | 19/19 |
| Full `npm run qa:all` | PASS |
| TSX parse/transpile diagnostics for fixed component | 0 errors |
| Actual Next.js production build in current environment | NOT RUN: npm Registry DNS unavailable |

The directive guard now runs in `deploy:check`, `qa:all`, and CI.
The Windows installer still runs TypeScript and `next build` before any Git push.
