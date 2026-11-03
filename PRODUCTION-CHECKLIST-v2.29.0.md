# FC Edineț v2.29.0 production acceptance checklist

- [ ] Extract FULL alongside the previous releases (`fc-edinet-v2.28.25`).
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
