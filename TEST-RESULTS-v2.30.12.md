# Test results — FC Edineț v2.30.12

Environment: Node 22.16.0, Chromium headless; no installed Next.js dependencies in this container.

| Check | Result |
|---|---|
| `npm run qa:all` | PASS, exit code 0 |
| Main site contracts | 176/176 |
| CSS Final Polish | 7/7 |
| CSS legacy audit | PASS; 4,080 existing `!important` directives unchanged |
| UI pixel-level baseline comparisons | 20/20 identical |
| Responsive viewport assertions | 59/59 |
| Security | 11/11 |
| Mobile experience | 19/19 |
| Club history | 52/52 |
| SEO & social sharing | 26/26 |
| TypeScript syntax parser (app + lib) | 294 files, 0 parse errors |
| Next.js production build | Not run: npm registry unavailable (EAI_AGAIN) |
| TypeScript semantic typecheck | Not run: project dependencies unavailable |

CSS source size (all four global stylesheets): 885,481 bytes before / 884,331 after.
No SQL migrations added. No database or live website changes made as part of this archive.
