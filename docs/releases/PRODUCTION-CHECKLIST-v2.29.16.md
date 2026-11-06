# FC Edineț v2.29.16 — Production checklist

## Database migration (required)

`database/068_atomic_match_lineup_save.sql` introduces `public.save_match_lineup_atomic(...)`.
**The migration has already been applied to the production FC Edineț Supabase project.**
For any new/staging database, apply it once *before* deploying the application code.
It does **not** rewrite existing lineups or scores. Do not re-run the historical migrations.

Check that the function is `SECURITY INVOKER`, `anon` cannot execute it, and
`authenticated` can execute it (the function checks `auth.uid()` and editor role).

## Deployment

1. Extract `fc-edinet-v2.29.16` beside v2.29.15. Keep the prior `.env.local` available.
2. Run `DEPLOY_FC_EDINET.bat` and require all eight steps to complete. It runs the new `qa:atomic-lineups` check and `next build` before deployment.
3. Verify `/api/version` reports `2.29.16` and run `npm run qa:live` (12/12 expected).
4. In `/admin/match-center/16`, inspect both saved lineups before saving any changes. **Do not edit the published match during a simple release smoke test.**
5. For a test match, open the same lineup in two browser tabs. Save a harmless edit in tab A; saving from stale tab B must fail with a reload message and must not undo tab A.
6. Verify a valid lineup save updates the formation, coach and all roster rows together. Verify missing captain / duplicate player / invalid slot are rejected without changing any rows.
7. Check `/admin/data-integrity` for unmatched published goals or draft reports; it is read-only.

## Scope and remaining limitations

- **Atomic in v2.29.16:** `match_lineup_settings` and `match_lineup_entries` for each team/side in a single PostgreSQL RPC transaction, including DB validation and match-row locking.
- **Not yet atomic as a group:** automatic derived `player_match_stats` recalculation and the `match_statistics_status` update after a club lineup save. Errors are reported and require review. Converting those into the same DB transaction requires a dedicated follow-up and real-data tests.
- Legacy manual creation of temporary players in the club action occurs before this RPC; a failed save could leave an inactive temporary player. Standard club editor selects existing players and does not use this path.
- No public pages, scores, event scoring logic, or CSS were modified.

## Local QA

```powershell
npm run qa:atomic-lineups
npm run qa:all
npm run build
npm run qa:live
```
