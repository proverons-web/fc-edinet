# FC Edineț v2.29.4 — Production checklist

- [ ] Node.js 22.16+ installed; `npm install` and `npm run deploy:check` pass on Windows, including `next build`.
- [ ] `/api/version` returns 2.29.4 after deploying.
- [ ] Admin overview `/admin`: task cards reflect recent data; follow a missing photo or unpublished match link.
- [ ] News `/admin/news?q=...`: search title/category/author; switch status without losing query; reset query.
- [ ] Players `/admin/players?q=...`: search surname/first name/shirt number; change sort and status without losing query.
- [ ] Matches `/admin/matches?q=...` and `/admin/match-center?q=...`: search opponent/tournament; switch status; open a result.
- [ ] Query terms over 80 chars are truncated server-side; the form is GET and needs no JavaScript.
- [ ] Test on 360px mobile and desktop; public homepage/club/team match layout unchanged.
- [ ] Double-check live profile photos: empty string and null count as missing; failed Supabase requests display an error instead of false zero.

No schema migration. No user accounts required. No production deploy executed in the build environment.
