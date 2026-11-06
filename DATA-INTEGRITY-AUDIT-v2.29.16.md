# Data integrity improvement — FC Edineț 2.29.16

## Defect fixed

The old save code used three separate Supabase calls: upsert `match_lineup_settings`, delete `match_lineup_entries`, then insert replacement entries. A failed insert could leave a team without its roster, even though the editor received an error. Import from player statistics had the same issue.

## Correction

- A new editor-only PostgreSQL RPC `save_match_lineup_atomic` validates all incoming slots and captain, verifies existing players, locks the match row, compares an optional revision and writes the formation/coach and every lineup entry in **one transaction**.
- The match/side → team identity is derived from the database. Client-provided `team_id`, `created_by` and `updated_by` fields cannot replace it.
- The RPC is `SECURITY INVOKER`; `EXECUTE` is revoked from anonymous users. The function also requires a verified editor/admin role.
- Both ordinary lineup saves and import use this RPC; FC Edineț's combined editor also uses the RPC for the lineup portion.
- The editor sends the saved `match_lineup_settings.updated_at` revision and rejects changes made after it was loaded. Import requests are intentionally generated from current server-side data without a browser revision token.
- Data migration was applied to production without changing any existing match, lineups, player statistics or score records.

## Remaining non-atomic operations

When saving a club squad, the player statistics recalculation and its completion status are still performed *after* the lineup RPC in separate operations. This release does not claim atomicity across those objects. Failures are surfaced and should be checked in `/admin/data-integrity`. Temporary player creation for legacy manual inputs is also a separate operation.
