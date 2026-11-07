# FC Edineț v2.30.7 — QA Results

Tested using the complete source package derived from v2.30.6.

| Area | Result |
|---|---|
| General site release QA | **176/176 PASS** |
| Club History Pro v2.30.7 | **52/52 PASS** |
| History timeline Chromium responsive QA | **16/16 PASS** (320, 390, 768, 1440 px) |
| Security QA | **11/11 PASS** |
| Editorial QA | **14/14 PASS** |
| Club seasons regression | **23/23 PASS** |
| Gallery experience regression | **21/21 PASS** |
| Video Match Center regression | **21/21 PASS** |
| UI Consistency baseline | **20/20 PASS** |
| Existing QA suite | Finished through final new v2.30.7 suite without failure; log kept during packaging process |
| TS/TSX syntax (10 changed source files) | **10/10 PASS** |
| `scripts/check-deploy.mjs` with dummy public env | **PASS** (not a production build) |
| Production Next.js build | **NOT VERIFIED**: npm Registry unreachable here; Next dependencies not installed |

## Important deployment note

- Apply `database/077_club_history_timeline.sql` manually in Supabase before deploying.
- `DEPLOY_FC_EDINET.bat` runs QA and actual Next.js build on the user's Windows PC **before** pushing to GitHub.
- New club events are not created automatically. Unpublished items remain private.
- Chromium layout QA is automatically skipped by the installer if Chromium is not installed locally.
