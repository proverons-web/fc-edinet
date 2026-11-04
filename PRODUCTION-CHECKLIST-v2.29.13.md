# FC Edineț v2.29.13 — Production Verification

## Release baseline
- Start from the v2.29.12 FULL package. No database migrations or public design changes.
- Verify `GET /api/version` returns `2.29.13` after deployment.
- Run `npm run qa:all` and `npm run build` on Windows; `npm run qa:live` with network access.

## Public regression checks
1. `/` (desktop / mobile): next match, last match, news, standings, mobile menu, footer.
2. `/matches`: scheduled matches, a current live match (if one exists) and postponed fixtures; live must not disappear when kickoff time passes.
3. `/matches/16`: verify score, events, two clean lineup columns, goals/cards/substitution badges, match venue and anchors.
4. `/team`: images and positions, no missing-player false data.
5. `/team/<real-slug>`: picture anchored bottom, navigation above photo, context links to match and back.
6. `/statistics`, `/standings`, `/news`, `/news/<real-slug>`, `/media`, `/club/about`: verify no overflow, titles and links.
7. Switch RU/RO; verify date labels and breadcrumbs in both.
8. On 320/360/390/768/1280/1920 px, verify no horizontal scrollbar, missing data use dash instead of synthetic zero.
9. Visit a public player profile from a match and return using the context link; follow the standard Back button after direct external arrival.
10. Authenticated admin pages require a signed-in account; test them separately. Public route audit does not bypass authorization.

## Known audit limits
- Browser screenshots taken from synthetic layout fixtures cannot substitute for real screenshots of the deployed site.
- Live Vercel deployment metadata confirms publish status, not browser layout.
- If production cannot be fetched from the agent runtime, run `npm run qa:live` from your Windows PC or inspect the actual site manually.
