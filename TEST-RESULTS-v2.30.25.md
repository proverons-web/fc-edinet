# FC Edineț v2.30.25 — Test results

- Source: v2.30.24 FULL archive, with only notification-related features and release synchronization added.
- `npm run qa:all` — **PASS**, including Chromium browser regression checks.
- `npm run qa:fan-notifications` — **24/24 PASS**.
- `node scripts/qa-site.mjs` — **189/189 PASS**.
- `node scripts/qa-mobile-ux-v2324.mjs` — **33/33 PASS**.
- TypeScript/TSX parser across `app/` and `lib/` — **315 files, 0 syntax errors**.
- `node scripts/check-deploy.mjs` — **PASS with synthetic public environment parameters** (not production credentials).
- New migration `084_fan_notifications.sql` — source reviewed for RLS, account scoping, column-level UPDATE permission, private trigger, duplicate suppression and foreign-key cleanup.

Not run in this environment: `npm install`, `npm run typecheck` and `next build` because project dependencies are not installed and npm Registry was previously unavailable. These run automatically on the user's PC before the ZIP installer commits or pushes to GitHub. SQL has not been applied to the live Supabase database; no real user notifications were sent or generated.

Functional test steps AFTER SQL migration and deployment:
1. Log into a test account, save a test match to favorites and verify `/account/notifications` is initially empty.
2. Change match kickoff in admin; one reschedule notification appears with old/new Moldova-local times, while non-followers receive none.
3. Save same data again; no duplicate should appear.
4. Postpone, cancel or publish the result; new matching event should appear.
5. Mark one, then all notifications read; the unread count should update.
6. Disable notification setting; subsequent changes should create no new events. Re-enable and test again.
7. Remove match from favorites; all linked notifications should disappear.
8. Verify the Romanian interface and that no one can query or update another user's notifications.
