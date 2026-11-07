# Production Health — runbook

After successful deployment to Vercel, run `CHECK_PRODUCTION_FC_EDINET.bat` on Windows.

This invokes the bundled dependency-free Node script:

```
node scripts/check-production-v2313.mjs --base-url https://fc-edinet.vercel.app --expect-version 2.30.13 --report production-health-report.json
```

It checks `/api/version`, `/api/health`, `/`, `/news`, `/matches`, `/team`, `/standings`, `/media`, `/club/history`, `/club/seasons`. No admin requests. Maximum two requests at a time, 10 second timeout per URL. It detects non-2xx responses, HTML/JSON content-type mismatch, version mismatch, health configuration errors, non-JSON data and cross-origin redirects.

Results are exported with UTC timestamp, response status and approximate header latency. Those measurements depend on network conditions; they must not be represented as Core Web Vitals or site-wide performance.

`/api/health`: its `status:ok` means Supabase public configuration variables are present; `database:not_checked` explicitly states that actual DB connectivity was not tested there. Use `/admin/diagnostics` for results from the eight authenticated diagnostic queries.

For site-wide actual user performance, use a configured field monitoring/RUM product and evaluate 75th-percentile LCP, INP and CLS for sufficient traffic. The release does not assert any such readings. Vercel runtime error access requires working permissions/Observability; the attempt during this audit resulted in 403.

If a route fails, examine the exact failing status, Vercel deployment logs and Supabase console; never infer that 0 accessible logs means 0 errors. Re-run the smoke test after fixing the issue. The script itself changes no site data.
