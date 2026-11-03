# FC Edineț v2.29.12 — Production verification

- Run `npm run qa:player-layout` in the extracted folder: verify 320, 360, 390, 767, 768, 1280px.
- Check `npm run deploy:check` passes including `next build`.
- In Windows Chrome or Edge, inspect `/matches/16#lineups` at 320px with long names, substitutions and multiple badges. The player photo must not shrink.
- Check other phone sizes and desktop lineup remain visually consistent with v2.29.11; per-player metric strips remain removed.
- Verify player profile links and event badges continue to work.
- Confirm `/api/version` returns `2.29.12` after Vercel deployment.
- No Supabase migrations or server-side table mutations.
