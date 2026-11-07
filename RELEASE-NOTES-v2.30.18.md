# FC Edineț v2.30.18 FULL — Cup Matches & Competition Statistics

Basis: **v2.30.17 FULL FIX2**. No existing match, gallery, account, score, or fixture date was rewritten.

## Cup match outcomes

- In the match editor (`/admin/matches/[id]/edit`), choose a competition of type **Кубок**, enter the knockout stage via the existing «Тур / стадия» field (with suggested cup stages), and mark the match **Завершён**.
- The finished cup result can indicate that 2×15 minutes of extra time were played and, if necessary, enter **home and away shootout scores separately**.
- `home_score` and `away_score` always mean **match goals including extra time, excluding shootout kicks**. A 1:1 draw decided 4:3 on penalties is recorded as **1:1; penalties 4:3**.
- Match center's «Основное» panel supports the same cup result fields. It validates competition type and disallows contradictory outcomes.
- Both series fields are required together; a shootout is only valid after a finished cup match with level football scores, and cannot be tied.
- The penalties are **not added** to the match event timeline, player goal statistics, penalty goal events, or team goals. Existing goals and historical matches are preserved.
- Match page, public calendar, favorites, club season archive, home results, and social share image show the score and cup decision distinctly, with RU/RO display on public pages.

## Statistics per competition

- New `public.club_competition_results` Postgres view aggregates wins/draws/losses, played and goal totals **by competition and season**. Shootout wins count as wins/defeats for cup result classification, but penalty kicks are not added to goal totals.
- Season archive now has separate cards for each tournament and links to a filtered match listing.
- Public player statistics already support per-competition data via `player_season_statistics`, and `/statistics?competition=...` remains available.
- Championship standings remain **league-only** and never include cup or friendly results.
- No new or fabricated Cupa Moldovei match is inserted into the database.

## Migration and deployment

1. Run `database/081_cup_results.sql` in Supabase SQL Editor, after the previously installed 079 and 080 migrations.
2. Copy `.env.local` from your previous installation into the extracted FULL project.
3. Run `DEPLOY_FC_EDINET.bat`. QA, `tsc --noEmit`, and `next build` must finish successfully before any Git push.
4. Check `/api/version` shows `2.30.18` and test one **separate** cup fixture without changing real Liga 2 results.

The migration adds three nullable/defaulted columns, a validity CHECK, a private trigger that enforces cup-only usage, and a RLS-aware read-only aggregate view. No data deletion is performed.

## Verification scope

- Automated Cup source/function regression checks including invalid shootouts.
- Existing `qa:all`, CSS/layout and old scheduling regression tests.
- TS/TSX syntax parser plus isolated strict type check of new pure calculation modules.
- **Full Next.js production build is not confirmed in this environment** because npm dependencies are unavailable. The Windows deploy script will run it before publishing.
