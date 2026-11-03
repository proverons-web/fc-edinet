# FC Edineț v2.29.1 production acceptance checklist

- [ ] Extract FULL alongside the previous releases (`fc-edinet-v2.29.0`).
- [ ] Run `DEPLOY_FC_EDINET.bat` on Windows. `.env.local` is local only; do not commit it.
- [ ] Confirm build and Git push succeeded. Check the GitHub Actions `Responsive QA` workflow.
- [ ] Confirm Vercel deployment reached production. `/api/version` should report `2.29.0`.
- [ ] Test responsive layouts at 320/360/390/430/767/768/1280/1920 px; check the real phone as well.
- [ ] Homepage: one recent-match card per swipe on phones; no blank dashboard bands; footer three columns.
- [ ] Navigation: `☰` opens in the **visible viewport after scrolling** and closes without jumping.
- [ ] Match protocol: score, chronology, cards, substitutions, players fit the screen.
- [ ] Statistics: readable mobile player cards + sort; desktop table remains unchanged.
- [ ] Player profile: photo aligned at hero bottom; back/breadcrumb above photo.
- [ ] News: 4 recent items on homepage; news sidebar share button stays with details.
- [ ] Confirm `/staff`, `/matches`, `/standings`, `/media`, and `/club/about` load normally.
- [ ] Admin: verify staff actions, site analytics (unique IP), and media uploads.
- [ ] Inspect `npm audit` result separately; do not run `npm audit fix --force` blindly.

## Performance-specific acceptance

- [ ] Check actual LCP / INP / CLS on the published site (mobile and desktop) with Chrome DevTools or PageSpeed Insights. No improvement percentage is claimed without real measurements.
- [ ] In DevTools Network open `/news`: thumbnails from public Supabase Storage should use `/_next/image` and WebP in supported browsers; external image hosts use native URLs.
- [ ] Confirm portrait photo, news cover crop/zoom and image fallback are unchanged on actual content pages.
- [ ] Inspect the `/news` HTML payload: preview data must not include full `content` / `content_ro` articles.
- [ ] After publishing header/footer design in admin, refresh public site and confirm change shows immediately.
- [ ] Confirm match updates and news publications still show promptly — no caching was added to live match feeds.
- [ ] Monitor Vercel Image Optimization usage and image request errors (especially 400) after deployment.
- [ ] Compare real traffic/Core Web Vitals before/after; QA fixture is not a production benchmark.
