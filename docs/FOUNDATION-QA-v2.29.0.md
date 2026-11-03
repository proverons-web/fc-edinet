# FC Edineț — v2.29.0 Foundation & Responsive Stabilization

## Scope

This is a **stabilization release** based on v2.28.25. It does not redesign public pages, change Supabase schema, or intentionally change the desktop/mobile appearance. In particular, keep the player profile, mobile menu, recent matches, standings, statistics, match chronology and footer behavior introduced in v2.28.x.

## CSS cascade work

- `app/layout.tsx` imports four stylesheets in fixed order: `globals.css`, `visual-polish.css`, `home-v215.css`, `mobile.css`.
- Three successive mobile override files were consolidated into `app/mobile.css` in their original cascade order.
- A handful of declarations completely superseded by later **identical selectors at the same media breakpoint** were removed. The rendered test fixture still matches the approved mobile baseline.
- Current stylesheet CSS: ~863 KiB before Next.js bundling, **4,238 `!important` declarations** across all files. This is still large legacy CSS and will require incremental component-level refactoring. **Do not remove thousands of rules blindly**.
- `npm run qa:css` checks order, breakpoint isolation and guards against *increases* in the approved `!important` counts.
- A reviewed change may run `npm run qa:css:baseline` to explicitly update `qa/css-baseline.json`.

## Browser validation

`npm run qa:responsive` starts a local headless Chrome/Edge/Chromium using the DevTools Protocol; no extra browser-testing dependency, Supabase credentials, external network requests or production site access are needed. It uses `qa/fixtures/home-mobile.html` and the real public stylesheets.

Assertions cover widths **320, 360, 390, 430, 767, 768, 1280 and 1920 px**:

- no document-level horizontal overflow;
- four stats in first row, three in second on mobile;
- a complete recent-match card per swipe;
- three footer link columns on mobile;
- readable name and visible metric cards for season statistics;
- complete mobile chronology, desktop chronology retained above 767 px;
- match result with a three-column title layout;
- fixed mobile navigation overlay after scrolling down, without losing scroll position;
- desktop statistics table present above 767 px.

Five reference widths (**320, 390, 767, 768, 1280 px**) also compare Chromium screenshots with an approved **CSS-only** baseline in `qa/baselines/mobile.css`. Both renderings happen in the same browser instance to minimize cross-platform screenshot differences. The comparison concerns a **synthetic UI fixture**, not every live route; it is a regression guard, not a complete production end-to-end test.

Use Node.js 22+ and an installed Chrome/Edge/Chromium. Set `CHROME_PATH` if it cannot be found. `npm run qa:responsive:shots` saves visual screenshots in the ignored local `qa-artifacts/` folder. If a CSS change is intentional and reviewed, run `npm run qa:responsive:baseline` to update the snapshot CSS source, **then inspect the resulting screenshots before committing**.

## Commands

```bash
npm run qa:site        # static page, route and release assertions
npm run qa:css         # stylesheet order, mobile scope, override budget
npm run qa:responsive  # browser layout + visual regression fixture
npm run qa:all         # all three commands
```

The Windows deploy BAT continues restoring `.env.local` from an older sibling release. After `npm install`, its `deploy:check` command runs static QA, CSS audit, and browser QA if Chrome/Node 22 is available, before the env validation and Next.js production build. Browser QA explicitly reports `SKIP` if the browser/Node runtime cannot run it; for a full check, execute `npm run qa:responsive` manually.

GitHub Actions additionally runs these checks on push/PR to `main`. The workflow is a signal, **not automatically a Vercel deployment gate** unless branch protection and deployment policy are configured.

## Next step — manual production acceptance

After Windows deploy, open the live site with real data and review the homepage, `/news`, `/team`, `/staff`, `/matches`, `/statistics`, `/standings`, `/media`, the player detail page and one match protocol on an actual phone. Test the menu after scrolling down and review the match timeline, player badges, and longest RU/RO team names. Check `/api/version` returns `2.29.0`. Automated fixture checks do not replace these manual production validations.

## No database changes

No new SQL migrations, altered access policies, analytics counters or API tokens. The existing 064/065/066 analytics migrations and server secrets are unchanged.
