# FC Edineț v2.30.19 — QA report

| Проверка | Результат |
|---|---|
| `npm run qa:all` | PASS, completed after release changes |
| Bracket-specific tests | 42/42 PASS |
| Previous cup-result tests | 42/42 PASS |
| Calendar/postponement regression | 49/49 PASS |
| Site core checks | 182/182 PASS |
| Public route existence | PASS, 318+ links |
| Next.js client directives | PASS, 308 source files |
| TS/TSX parser pass | 308 files, 0 syntax errors |
| Pure `cup-bracket.ts` TypeScript typecheck | PASS |
| Installer's configuration validation with mock variables | PASS |
| Full `next build` | **NOT VERIFIED**, npm Registry lookup failed with EAI_AGAIN |
| SQL migration 082 on production Supabase | **NOT EXECUTED**; execute manually before deployment |
| Live production deploy | **NOT PERFORMED** |

The tests verify application contracts and bracket rules. They are not a replacement for a full TypeScript/Next.js production build or post-migration integration testing. The Windows installer runs `npm run typecheck` and `next build` before pushing the code to GitHub.
