# FC Edineț v2.30.1 — production acceptance checklist

## 1. Deployment
- [ ] `DEPLOY_FC_EDINET.bat` runs all eight steps and completes `next build` without errors.
- [ ] `/api/version` says `2.30.1` (not a previous deployment).
- [ ] `npm run qa:live` succeeds. This only checks public pages, not authenticated account views.

## 2. Fan dashboard — signed in
- [ ] `/account` shows favorite player and match counts from the current account only.
- [ ] Nearest saved future match appears at the top with a link to the protocol.
- [ ] The calendar download is offered only when that saved match is scheduled in the future.
- [ ] Three latest finished favorite results are sorted by kickoff (newest first).
- [ ] Favorite players open the correct public player profile.
- [ ] With no saved matches or players, clear empty-state guidance appears.
- [ ] An actual Supabase read error is not represented as zero favorites.

## 3. Favorite list
- [ ] `/account/favorites` preserves the existing ability to remove saved players and matches.
- [ ] `?view=upcoming` shows only scheduled future games and live matches.
- [ ] `?view=results` shows only finished matches, newest first.
- [ ] The All tab also preserves postponed/cancelled and overdue scheduled entries.
- [ ] A true `0:0` remains `0:0`; a missing result is shown as unknown, never as a fabricated draw.
- [ ] A match removed from favorites disappears after server revalidation.

## 4. Security, languages and layout
- [ ] Open the account from a second signed-in user and confirm that their favorites are independent.
- [ ] Signed-out access to `/account` and `/account/favorites` redirects to `/login`.
- [ ] Check RU/RO labels and date formats.
- [ ] Check width 320/360/390/430/768/1280px without horizontally clipped content.
- [ ] No new SQL migration or background notification service was deployed.

## 5. Local QA
- `npm run qa:fan-dashboard` — behavior contracts and isolated real-Chromium geometry checks.
- `npm run qa:all` — full regression suite.

**Important limitation:** The local source tests do not replace authenticated end-to-end checks on the deployed site.
