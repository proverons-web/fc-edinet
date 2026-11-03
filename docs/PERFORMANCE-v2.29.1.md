# FC Edineț v2.29.1 — Performance plan and verification

## What was optimized

1. Lists of news now query article metadata and previews, not `content` and `content_ro`. The detail `/news/[slug]` route still loads the full article.
2. The homepage displays four player cards and now requests only the fields needed for those cards.
3. The last completed match comes from the already requested finished-match feed, avoiding one duplicate Supabase request.
4. Other homepage preview feeds (partners, albums, videos) request selected columns instead of `*`.
5. `PublicImage` uses Next.js responsive optimization for exact public Supabase Storage URLs and the `/brand/` static path. Unknown/third-party hosts use a normal `img` with explicit dimensions and lazy loading. Remote optimizer allowlisting is restricted to the Supabase project host and `/storage/v1/object/public/**`; there is no wildcard host pattern.
6. Global public header/footer/design-system configs are cached for up to 30 seconds using a tagged server cache and revalidated immediately when an administrator publishes a new design. Drafts do not invalidate the public cache.
7. Added `qa:performance` and included it in the CI and Windows deploy QA sequence.

## What deliberately was not cached

Live matches, published news feeds, editorial drafts, auth/account state, visitor tracking and admin statistics are not placed into a new global cache. This avoids delays in match reporting, publishing and authorization.

## What to measure after deployment

Use real production traffic and the same browser/network settings for before/after comparison. In Chrome DevTools (mobile throttle), check LCP/INP/CLS, transferred image bytes, HTTP response times, and `_next/image` status. A 400 from `/_next/image` may mean the configured Supabase URL/remotePatterns differ from the media URL.

Targets for user experience: LCP <= 2.5 seconds, INP <= 200 ms, CLS <= 0.1. Targets are not measurements of this release. Monitor Vercel image transformation quotas/costs and user-uploaded image dimensions.

## Local QA

- `npm run qa:site` — public routes/version contracts
- `npm run qa:css` — CSS cascade budget
- `npm run qa:performance` — source/payload/image/cache contracts
- `npm run qa:responsive` — Chromium fixture at eight widths
- `npm run deploy:check` — all QA, local env check and production Next build (requires installed dependencies + `.env.local`)

This work does not edit any Supabase tables or migrations.
