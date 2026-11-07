# FC Edineț v2.29.15 — Match Data Integrity & Admin Audit

## Live database audit, 4 November 2026

Read-only SQL inspection of the connected production Supabase project:
- 15 finished matches among the queried records.
- 14 published match reports: all 14 scorelines agree with the sum of goal, penalty-goal and own-goal events (own goals credited to the other team).
- All 14 published match reports contain 11 starters on each team and one captain per side.
- Match #17: `finished`, score `2:0`, but no published report, lineup or recorded event. This is a pending editorial task, not a reason to rewrite the official result.
- The opponent goalkeeper position is absent in some published lineups. It should not prevent publication of an otherwise complete report. The audit only warns if the club-side keeper position is missing.

No production database rows were changed by this release.

## Changes

1. `/admin/data-integrity`: read-only match-data dashboard with warning/critical classifications, direct links to each match, safe errors on partial Supabase reads, and paging for event/lineup/player-stat tables.
2. `lib/match-data-integrity.ts`: pure deterministic audit of goals (including own goals), published score, lineup starters/captains, duplicate player identity, and completed stats without player records.
3. Automatic club player statistics no longer silently ignore PostgREST failures. Upserts run before deleting stale club rows, with error messages if either step fails. Existing rows from other teams are never selected as club statistics or deleted as stale club entries.
4. Publication readiness checks the club team's starting XI, not a combination of both teams, and verifies the status write.
5. `npm run qa:data-integrity` with 24 assertions, wired into `qa:all`, deploy checks and GitHub Actions. The audit does not update a result or publish a report.

## Remaining limitations / follow-up

- The report covers the latest 100 matches, not unlimited historical fixtures.
- The editor's multi-step lineup save still consists of several HTTP operations and is **not** an atomic PostgreSQL transaction. In a future release we should replace it with a single guarded transaction/RPC, after staging and database migration review.
- A multi-step stats sync can still partially save new rows if a later operation fails; the editor now explicitly shows an error and requires review. This release does not claim transactionality.
- A separate build on the user's Windows/CI environment is required. The current execution environment cannot download npm dependencies.
- Screenshots and visual QA fixtures do not verify authenticated production admin screens; test `/admin/data-integrity` under a real administrator session after deployment.
