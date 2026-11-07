# FC Edineț v2.30.13 — Test results

Test scope: copied from FULL v2.30.12 release; includes Health & Final Audit changes.

| Check | Result |
|---|---|
| `npm run qa:all` (full installed-project QA pipeline) | PASS |
| Main site source QA | 176/176 |
| Offline Production Health fixture | 9/9 |
| Responsive geometry (fixture) | 59/59 |
| UI consistency screenshots against the approved QA fixtures | 20/20 |
| CSS polish | 7/7 |
| Security | 11/11 |
| History | 52/52 |
| Social sharing | 26/26 |
| Mobile source contracts | 19/19 |
| Browser gallery geometry | 4/4 widths |
| TS/TSX syntax parser (globally installed TypeScript) | 294 files / 0 parse errors |
| `qa-client-directives` | 294 source files / PASS |
| `scripts/check-deploy.mjs` with **dummy** test env values | PASS |
| `next build` and complete project TypeScript typecheck | NOT RUN — npm package registry inaccessible |
| Live post-deploy check against v2.30.13 | NOT RUN — v2.30.13 is not deployed yet |
| Vercel production deployment metadata | v2.30.12 / READY (at audit time) |
| Vercel production runtime logs/errors | Could not inspect: connector returned 403 |
| True Core Web Vitals / real-user monitoring | NOT MEASURED |

**Important:** fixture browser tests and source QA do not substitute a production Next.js build or real-world end-user measurements. The Windows installer runs TypeScript and Next.js before publishing; after the new deployment reaches READY, run `CHECK_PRODUCTION_FC_EDINET.bat` to check live public routes. No SQL migration required.
