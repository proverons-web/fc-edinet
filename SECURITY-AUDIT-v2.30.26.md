# FC Edineț — Security review at v2.30.26

Reviewed on 19 November 2026 with the live project's Supabase Security Advisors,
read-only database metadata, and the release source. **No database permissions
were changed** during this review.

## Advisor findings and interpretation

1. **4 informational RLS/no-policy findings:** `rum_ingest_rate`,
   `rum_samples`, `site_pageviews`, `site_visitors`. These are restricted
   collection tables; no public row policy can be deliberate. Do NOT add
   blanket public SELECT just to clear the linter.
2. **2 warnings for anonymous EXECUTE on SECURITY DEFINER RPCs:**
   `get_public_visit_counts()` (public aggregate counter) and
   `record_site_visit_v4(...)` (ingestion guarded by server-side proof).
   Their public accessibility is intentional in the existing architecture,
   but each elevated function deserves a separate threat-model review.
   Remediation guidance:
   https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
3. **6 warnings for authenticated EXECUTE on SECURITY DEFINER RPCs:**
   four admin/report RPCs plus the two functions above. The site includes
   authorization checks, but these should be reviewed individually before
   modifying GRANTs or converting to SECURITY INVOKER.
   Guidance:
   https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
4. **Leaked Password Protection disabled** in Supabase Auth. Enable this in
   Auth security/password settings if the project's plan permits it.
   Guidance:
   https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Operational safety measures added in this release

- Before changing Git history: verified Git restore point outside the project.
- Before commit: fail-closed scan of staged filenames, changed index blobs,
  credential patterns and private-key material.
- Server headers: HSTS, nosniff, referrer policy, existing frame restrictions.
- Production browser source maps explicitly disabled.

## Still to do

- Verify Supabase backup capabilities and periodic restore drills.
- Separately preserve Supabase Storage objects.
- Audit admin SECURITY DEFINER RPC bodies, authentication and GRANTs in a
  staging environment before any permission change in Production.
- Use Node 22 LTS to match deployed engine expectations.
- Perform a real `next build` on a configured machine before publishing.

This is an audit and development checklist, **not a penetration test**.
