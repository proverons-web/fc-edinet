# FC Edineț v2.30.6 — Season History & Match Archive

## Scope

This release advances the Club History phase using **existing historical data**. Previous club-history text, the Hall of Fame, archive photography and the entire v2.30.5 media gallery remain unchanged.

### Public routes

- `/club/seasons` — chronologically ordered active seasons, current season indicator, match counts, wins/draws/losses, goals and goal difference from `club_season_history`; a clear empty state for seasons with no results.
- `/club/seasons/[slug]` — detailed results for a single active season, tournament filter, 15-result server pagination, protocol links, home/away crests, club result indicators and links to player statistics, historic photographs and the Hall of Fame.
- `/club/history` — compact link to the archive at the end of the existing long-form club story.
- Club sub-navigation and sitemap now expose the season archive. RU/RO labels and narrow layouts are included.

### Integrity and security

- No results or seasons are synthesized. Finished matches are limited to club-team participation.
- Score-driven win/draw/loss badges are omitted if scores are missing.
- The season detail rejects an inactive or nonexistent season (`404`).
- Tournament filters are restricted to the season's actual public competitions; page numbers are clamped to a safe range.
- Public queries use the cookie-free read-only Supabase client and respect existing RLS. Database connection errors are not displayed as empty result totals.
- No schema changes, new secrets, destructive SQL, or live operations.
- Historical seasons and competition mapping continue to be managed from the existing `/admin/statistics` editor.

### Install and verification

Read `STEP-2.30.6.txt`. `DEPLOY_FC_EDINET.bat` runs all tests before any push.

*Testing recorded when packaging: see `TEST-RESULTS-v2.30.6.md`. Full Next.js production build may require installing dependencies on the Windows machine; the current packaging environment cannot reach npm Registry.*
