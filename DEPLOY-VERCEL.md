# FC Edineț v2.30.0 — deployment

1. Extract `fc-edinet-v2.30.0-FULL.zip` into `fc-edinet-v2.30.0` beside prior releases.
2. Run `DEPLOY_FC_EDINET.bat`. It restores `.env.local` locally when necessary, installs dependencies, runs all QA (including `qa:fan`) and builds before deployment.
3. No new Supabase migrations are required by the v2.30.0 fan calendar release. Previous migrations 068 and 069 remain in the package for reproducibility.
4. After deployment verify `https://fc-edinet.vercel.app/api/version` reports `2.30.0`.
5. Run `npm run qa:live`. The public smoke test verifies the iCalendar feed at `/api/calendar?lang=ru`.
6. Review `PRODUCTION-CHECKLIST-v2.30.0.md` before considering the release verified.

**Scope:** calendar feed and single-match `.ics` exports, localized fan actions and link sharing. No existing match, player or administrator data is changed by installation.
