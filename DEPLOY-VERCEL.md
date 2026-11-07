**Before deploying v2.30.2:** apply `database/074_media_match_albums.sql` in Supabase SQL Editor.

# FC Edineț v2.30.2 — deployment

1. Extract `fc-edinet-v2.30.2-FULL.zip` into `fc-edinet-v2.30.2` next to the previous release.
2. Run `DEPLOY_FC_EDINET.bat`. The deploy process restores `.env.local` locally when needed, runs the QA suite, and requires a successful `next build` before publishing to Vercel.
3. No new Supabase migrations are required. The fan dashboard reads the existing `favorite_players`, `favorite_matches`, `matches`, `players`, `teams`, and `competitions` tables. RLS and explicit `user_id` filters protect user-specific reads.
4. After publishing check `https://fc-edinet.vercel.app/api/version` reports `2.30.2` and execute `npm run qa:live` (public URLs).
5. Log in as a regular fan and complete the account-specific steps in `PRODUCTION-CHECKLIST-v2.30.2.md`. Public smoke tests cannot exercise private account pages.

**Changes:** Personal fan dashboard in `/account`, categorised/sorted favorite matches in `/account/favorites`, calendar export for saved future matches and clear error states. RU/RO supported. No automatic emailing or push notifications.
