# FC Edineț v2.30.29 — Image Recovery and Match Updates

- Vercel Image Optimization is disabled site-wide; uploaded sources are served directly. News covers fall back to the club crest on load errors. New covers are resized to at most 1600 px and compressed to WebP on save.
- Published videos explicitly linked to a match are displayed at the end of its protocol, including when the written protocol is not yet published. Reassignment/deletion invalidates the corresponding match page.
- A future replacement kickoff confirms postponed fixtures. The homepage, calendar, match detail, calendar export and social preview treat legacy confirmed dates as normal scheduled fixtures.
- Migration `database/086_confirm_rescheduled_fixtures.sql` persists this change for existing future replacement dates without changing the match ID or previous kickoff. Undated postponements and cancellations remain unchanged. Run it once in Supabase before or after deployment; back up the database first.

## Verification

- `npm run typecheck` and `npm run build` passed.
- `npm run qa:schedule`, `npm run qa:competitions`, `npm run qa:match-videos`, `npm run qa:cost`, `npm run qa:editorial`, `npm run qa:on-site-editor` passed.
- Local full browser QA could not complete because Chromium exited with status 127. Production has not yet been changed by this release preparation.
