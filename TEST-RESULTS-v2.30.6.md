# FC Edineț v2.30.6 — verification record

## Passed

- General site release checks: **174/174**.
- New season-archive checks: **23/23**, including valid/invalid results, pagination input, date display, public visibility, sitemap and RU/RO.
- Security QA: **11/11**.
- Editorial QA: **14/14**.
- Media album compatibility: **21/21**.
- Match videos compatibility: **21/21**.
- Fan Experience: **14/14**; Fan Dashboard: **16/16**.
- UI consistency regression snapshots: **20/20**.
- Club season archive synthetic browser fixture: **4/4** viewports (320, 390, 768 and 1440 px), no horizontal overflow.
- Typescript TS/TSX syntax parsing: **6/6** modified TS/TSX files passed.
- `scripts/check-deploy.mjs` integrity check passes with non-secret, dummy Supabase environment values; expected warnings for optional secrets.
- Existing `npm run qa:all` ran through album-viewer browser fixture with no reported failure after correcting an obsolete release-version assertion in `qa-match-media-v2302.mjs`; the combined runner exceeded the execution-time limit before the final season test. The season test was run successfully on its own.

## Not verified here

- `npm install`: failed because the container could not resolve `registry.npmjs.org` (`EAI_AGAIN`).
- Next.js production `next build` and fully deployed visual verification: **not run** without installed dependencies.
- Live Vercel publication and production database modifications: **not performed**.

## Release precautions

Installer `DEPLOY_FC_EDINET.bat` runs `npm run deploy:check` (tests, environment check, production build) before pushing to GitHub. If any step fails, the push does not occur. Verify the final build on Windows and confirm the Vercel deployment reports READY.
