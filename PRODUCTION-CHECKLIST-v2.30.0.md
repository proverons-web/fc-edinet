# FC Edineț v2.30.0 — Production checklist

## What changed

Fan Experience: calendar subscriptions, downloadable single-match `.ics` invitations and native sharing of match URLs. The calendar feed uses **public fixture data only**. No Supabase migrations, account permissions, table updates, analytics changes or public global CSS changes.

## Deployment (Windows)

1. Extract `fc-edinet-v2.30.0` next to the previous full version. Do **not** manually copy credentials; `DEPLOY_FC_EDINET.bat` restores `.env.local` from an older sibling release if available.
2. Run `DEPLOY_FC_EDINET.bat`. It must complete all stages, including `next build` (not run in the assistant's offline environment).
3. Visit `https://fc-edinet.vercel.app/api/version`; expected `2.30.0`.
4. From the project folder run `npm run qa:live`. This now checks `/api/calendar?lang=ru` in addition to the other public routes.

## Test the new fan features

- Open `/matches` in Russian and Romanian. The upcoming-matches heading offers **Subscribe** (webcal link) and **Download .ics**.
- Select a future scheduled match. Its card has **Add to calendar**, and its detail page has **Add to calendar** and **Share match**.
- Download `/api/calendar?lang=ru` and verify it contains `BEGIN:VCALENDAR`, `VERSION:2.0`, and one `VEVENT` per scheduled fixture in the future.
- Open `/api/calendar/<FUTURE_MATCH_ID>?lang=ru` for an actual future match. Verify the downloaded event has correct team names, stadium and kickoff in the user's local calendar time. The file uses UTC timestamps, which calendar clients convert automatically.
- Alarm trigger is one hour before the kickoff. The event duration is an **estimate of two hours**, not an official final whistle time.
- In Romanian (`lang=ro`) labels and calendar description use Romanian; team names remain as entered in Supabase.
- Click **Share match** on a phone and a desktop. Supported mobile browsers use the system share sheet. Otherwise the link is copied; if clipboard access is blocked, a selectable prompt is shown.
- For a postponed or finished match, the Add to calendar button should not appear. An attempt to download such a match returns HTTP 409 rather than a fictitious confirmed kickoff.
- Change a future match's kickoff in a controlled test fixture, then request the same `.ics` URL again. Its stable UID stays identical while DTSTART changes. Do not modify real matches just for testing.
- Test 320, 360, 390, 768 and 1280 px; no clipped controls, no page-wide horizontal scrolling.
- Confirm no changes to news, player profiles, match statistics, admin screens or club pages.

## Calendar behavior and limitations

- The subscription link uses `webcal://.../api/calendar`, which is handled by calendar apps that support subscribed calendars. The refresh interval is suggested as six hours; actual refresh frequency is controlled by each calendar app.
- Downloading `.ics` imports a **snapshot**; importing it once does not enable ongoing updates. Use the webcal subscription for updates.
- Future scheduled fixtures only. Postponed fixtures are excluded because a confirmed kickoff is not available; previously imported snapshots are not automatically recalled.
- Reminder alarms depend on the calendar application's alarm permissions and import/subscription behavior.
- The webcal scheme may not be registered on every Windows browser. Use the download link as a fallback, or paste the HTTPS feed URL into the calendar app's Add by URL subscription field.

## Automated QA

Run `npm run qa:fan` (14 logic/integration checks plus six Chromium widths) and `npm run qa:all` for the full regression suite. GitHub CI also checks the fan features. The root archive excludes all `.env*`, `node_modules`, `.next` and `.git` files.
