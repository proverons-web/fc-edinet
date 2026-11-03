# FC EDINEȚ v2.29.3 — Production Checklist

## Before deployment

1. Unzip v2.29.3 FULL in a sibling folder of previous versions.
2. Confirm `.env.local` is found by `DEPLOY_FC_EDINET.bat` (it must not be in the ZIP).
3. Run `npm run qa:site`, `npm run qa:editorial`, `npm run qa:css`, `npm run qa:security`, `npm run qa:performance`, `npm run qa:responsive`.
4. Run `npm run build` or the normal deploy BAT. Do not publish if a build fails.
5. Confirm `/api/version` responds with 2.29.3 after Vercel deployment.

## Editorial acceptance test (authenticated)

- Sign in as author; create a draft with RU title, slug, active category and content >=20 characters.
- Check validation indicators and preview for RU/RO and desktop/mobile. Check the preview never publishes a draft.
- Leave RO fields empty with auto-translation enabled; the warning must be shown. With RO translation locked, the warning must mention RU fallback.
- Check image preview, focal position controls and remove-cover checkbox.
- Save as a draft, then send for review; the author must not be able to publish directly.
- As editor, open a draft/review and publish it. Verify public article and link.
- Edit a published article: changing the form and clicking Save must ask for confirmation.
- Open one article in two editor tabs. Save in A; try to save older content from B. B must report conflict rather than overwrite A. Copy local text before reloading B.
- Confirm `/admin/news`, `/admin/page-builder`, public `/news`, home page, mobile and desktop still look as expected.

## Limitations

- No database migration is needed; the existing news.updated_at trigger is used.
- Unsaved-changes warning covers browser reload/unload, but it is not a universal Next.js client-side navigation guard.
- The in-form preview is a draft approximation, not an authenticated preview of the entire published page builder.
- Real multi-user and production build tests need to be run on the deployed site.
