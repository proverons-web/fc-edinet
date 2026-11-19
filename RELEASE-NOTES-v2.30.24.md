# FC Edineț v2.30.24 — Mobile UX Final Audit, phase 1

This release focuses on public match calendar and club admin touch ergonomics, keeping the desktop site and all backend data unchanged.

- Public calendar: active filter semantics, focusable horizontal edition tabs, better mobile action sizes and long RU/RO label wrapping.
- Club player profile: keyboard-operable season/competition statistic tables with localized region labels.
- Account: larger favorite/filter touch targets.
- Photo viewer: larger mobile close, previous/next, and action targets.
- Admin: mobile navigation and action target sizing, iOS text-entry zoom mitigation, safer wrapping of long match names.
- Added `qa:mobile-24` to QA, deployment checks and CI.

**No SQL migration.** This phase checks static layout fixtures at 320–768px, not real authenticated Supabase pages. Full production build and device checks must be run before deployment.
