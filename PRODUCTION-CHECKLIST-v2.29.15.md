# FC Edineț v2.29.15 — Production checklist

- Deploy with `DEPLOY_FC_EDINET.bat` after local `.env.local` restoration.
- Ensure `npm run qa:data-integrity` passes before `next build`.
- Confirm `/api/version` reports 2.29.15 and `npm run qa:live` passes 12/12.
- Log in as administrator, open `/admin/data-integrity`.
- Verify match #17 is marked as finished but unpublished, with unfinished lineups; do not auto-publish.
- Check published match #16 has correct score and goal count; investigate any critical discrepancy.
- Open `/admin/match-center/16` and verify form saving and player statistics.
- Intentionally invalid server/database writes must show an error, not a success toast.
- No database migration is included. Do not execute historical migrations again.
- This report checks the most recent 100 matches; it is a read-only quality audit, not a full historical reconciliation.
