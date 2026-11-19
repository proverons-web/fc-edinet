# FC Edineț v2.30.26 — Production Quality & Security

## Goals

Reduce the risk of destructive or unsafe deployment without changing existing
club content, match data, account data, or Supabase database schema.

## Included

- **Pre-push Git restore point:** before resetting the local index, the deploy
  script saves and verifies a portable bundle of `origin/main` in an adjacent
  `FC_Edinet_DeployBackups` directory. Publishing stops if the bundle fails.
- **Staged secret protection:** the installer inspects Git-index filenames and
  changed content before `git commit`, detecting credentials and common
  private-key formats without logging values. Publishing stops on findings.
- **Additional gitignore protections:** production/staging environment files
  and common private-key exports cannot be accidentally staged via `git add -A`.
- **HTTP hardening:** a one-year HSTS policy, while retaining existing security
  headers. Explicit `productionBrowserSourceMaps: false`.
- **Automatic QA:** isolated temporary Git fixtures exercise both backup and
  staged-secret failures; suite included in `qa:all`, `deploy:check`, CI.

## Not included / limitations

- No Supabase schema migration in v2.30.26.
- Git bundle backs up **source code only**, NOT Supabase tables or Storage.
- No change to public analytics RPC permissions. The warnings are documented
  for a compatibility-safe future audit.
- A full Next.js production build requires dependencies and access to an npm
  registry; installation on the Windows PC remains the production build gate.

## QA

See `TEST-RESULTS-v2.30.26.md` for exact completed and unverified checks.
