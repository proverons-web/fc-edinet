# FC Edineț v2.30.24 — Test Results

| Check | Result |
| --- | --- |
| `npm run qa:all` (full regression suite) | **PASS (exit 0)** |
| `node scripts/qa-site.mjs` | **188/188** |
| `node scripts/qa-css-polish-v2312.mjs` | **7/7** |
| `node scripts/qa-mobile-ux-v2324.mjs` | **33/33** (11 source + 22 Chromium geometry checks) |
| Existing UI snapshot consistency | **20/20** |
| Chromium mobile fixture widths | **320 / 360 / 390 / 430 / 768 px**, no full-page horizontal overflow in simplified fixture |
| TypeScript syntax parsing (global compiler, `app/`, `lib/`) | **311 files, 0 parse errors** |
| `node scripts/check-deploy.mjs` (dummy env vars only) | **PASS** |
| `next build` / `npm run typecheck` | **Not run: project dependencies unavailable in this environment** |
| Authenticated real-device testing | **Not performed** |

Tested geometry uses simplified HTML with the actual project class names and CSS, not production pages. Touch target checks concern the tested match card and admin action controls, not every control on every route. The existing browser QA suite separately renders a set of regression fixtures.

No SQL changes, no production deploy and no changes to user data.
