# FC Edineț v2.30.8 FULL — SEO & Social Sharing Pro

**Base:** v2.30.7 FULL. **Schema migrations:** none.

## What changed

- Added dynamic, 1200 × 630 branded Open Graph images for published news and media albums using `next/og`, with dedicated route-specific image handlers.
- Metadata for news, album and match pages now provides dimensions and versioned image URLs based on the content's `updated_at`; Facebook/Telegram still control caching of the *page* preview.
- All three card types use only public data, with no session cookies or admin/secret Supabase keys.
- WebP thumbnails (used by existing club albums) are converted to JPEG through pinned `sharp@0.35.5` for reliable compatibility with the Open Graph renderer.
- Remote images are fetched only from the configured public Supabase Storage host; other hosts, private paths, redirects, invalid image types, oversized images, and network failures fall back to branded imagery.
- Match card remains compatible with the shared score visibility policy; missing remote team crests now fail gracefully.
- Canonical URLs prefer the stable Vercel production domain over one-off preview deployment URLs (unless `NEXT_PUBLIC_SITE_URL` is configured explicitly).
- New automated QA suite (`scripts/qa-seo-social-v2308.mjs`) is part of `deploy:check` and `qa:all`.
- No changes to site design, existing editorial form fields, database schema, login, stats, or history data.

## Production smoke tests

1. Confirm `/api/version` reports `v2.30.8`.
2. Open `/news/<published-slug>/opengraph-image`; should return a 1200×630 PNG card with a photo when a supported public Storage image is available.
3. Open `/media/<published-slug>/opengraph-image` and `/matches/<id>/opengraph-image`.
4. Inspect rendered `<head>` for `og:image`, `og:image:width`, `og:image:height`, Twitter image, and canonical link on these pages.
5. Share a news/match URL in a messaging app. Facebook's Sharing Debugger can request a rescrape, but third-party cache expiry is not controlled by this application.

## Known constraint

The existing single-URL RU/RO cookie scheme does not guarantee that social crawlers receive the visitor's locale. Dedicated localized URLs would be a separate future SEO project.
