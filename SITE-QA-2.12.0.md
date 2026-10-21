# FC Edineț v2.12.0 — Site-wide QA

## Reviewed
- Home
- News + article
- Team + player profile
- Calendar / matches
- Match protocol
- Standings
- Statistics
- Media + albums
- Club
- Partners
- Academy
- Header / footer
- Login / account public shell
- 404 / loading / error states
- Site Builder / visual preview labels

## Fixed in this release
- RU/RO localization leaks in Home, Team and player statistics.
- Romanian football terminology: `Pase decisive`, `Gol + pasă`.
- Localized recent-player result badges instead of W/D/L.
- Team group labels no longer expose internal English enum names.
- Match cards use the home team's configured stadium before match fallback data.
- Scheduled match separator no longer displays `VS`.
- Header search is now functional and opens `/search`.
- Added search across published news, active players and published media albums.
- Removed public English fallback copy from social preview images.
- Added final responsive protection for long strings, grids, tables and narrow screens.
- Added consistent keyboard focus styles and public touch target hardening.
- Cleaned mixed English labels and stale visible version text in admin previews.
- Synchronized `/api/health`, `/api/version`, Diagnostics and footer version display.

## Validation performed
- Parsed/transpiled every TS/TSX file in `app` and `lib`: no syntax diagnostics.
- CSS brace/parenthesis balance: OK.
- `scripts/check-deploy.mjs` with test environment: OK.
- Public hardcoded-English audit: only Schema.org `sport: Football` remains (machine-readable standard data).

## Environment limitation
A full `next build` was not completed in this environment because `npm install` timed out and dependencies are not available locally. `DEPLOY_FC_EDINET.bat` must still run the real production type-check/build before deployment.
