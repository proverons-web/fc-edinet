import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { percentile75, summarizeRum } from "../lib/rum-report.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const pkg = JSON.parse(read("package.json"));
let passed = 0; let failed = 0;
function check(name, fn) {
  try { fn(); ++passed; console.log("PASS", name); }
  catch(e) { ++failed; console.error("FAIL", name, e.message); }
}
const client = read("app/components/RealUserMetrics.tsx");
const server = read("app/api/rum/route.ts");
const sql = read("database/078_real_user_monitoring.sql");
const admin = read("app/admin/diagnostics/performance/page.tsx");
const diagnostics = read("app/admin/diagnostics/page.tsx");
const ci = read(".github/workflows/responsive-qa.yml");
check("version matches current release", () => assert.equal(pkg.version, "2.30.20"));
check("stable Web Vitals client callback", () => {
  assert.match(client, /^"use client";/);
  assert.match(client, /useReportWebVitals\(onWebVital\)/);
  assert.match(client, /from "next\/web-vitals"/);
});
check("browser errors contain no stack or message in payload", () => {
  assert.match(client, /JSON\.stringify\(\{ metric, value: .* route, device:/);
  assert.doesNotMatch(client, /JSON\.stringify\(\{[^\n]*message|stack:|userId:|email:/);
});
check("private routes cannot report metrics", () => {
  assert.match(client, /const route = routeKey\(window\.location\.pathname\)/);
  assert.match(client, /if \(!route \|\| observed\.has\(onceKey\)\) return/);
  assert.doesNotMatch(client, /["']\/account["']|["']\/admin["']/);
});
check("client transport is small and best effort", () => {
  assert.match(client, /sentCount >= 16/);
  assert.match(client, /navigator\.sendBeacon/);
  assert.match(client, /keepalive: true, credentials: "omit"/);
});
check("endpoint refuses cross-origin calls", () => {
  assert.match(server, /sec-fetch-site/);
  assert.match(server, /new URL\(origin\)\.host !== new URL\(request\.url\)\.host/);
  assert.match(server, /if \(!origin\) return empty\(\)/);
});
check("endpoint validates finite numeric metrics and canonical route keys", () => {
  assert.match(server, /ROUTES\.has\(route\)/);
  assert.match(server, /METRICS\.has\(metric\)/);
  assert.match(server, /Number\.isFinite\(value\)/);
  assert.match(server, /raw\.length > 1024/);
});
check("server never forwards raw IP to database", () => {
  assert.match(server, /createHmac\("sha256", salt\)/);
  assert.match(server, /p_client_hash: hash/);
  assert.doesNotMatch(server, /p_client_ip:|p_ip:/);
});
check("only server-side service key writes samples", () => {
  assert.match(server, /createAdminClient\(\)/);
  assert.match(sql, /grant execute on function public\.record_rum_sample_v1\(.*\) to service_role/);
  assert.match(sql, /revoke all on function public\.record_rum_sample_v1\(.*\) from public, anon, authenticated/);
});
check("RLS and rate limiting are enforced in SQL", () => {
  assert.match(sql, /alter table public\.rum_samples enable row level security/);
  assert.match(sql, /alter table public\.rum_ingest_rate enable row level security/);
  assert.match(sql, /where public\.rum_ingest_rate\.hits < 90/);
  assert.match(sql, /on conflict \(hour_start,client_hash\) do update/);
});
check("SQL retention removes old data", () => {
  assert.match(sql, /interval '35 days'/);
  assert.match(sql, /interval '2 days'/);
});
check("admin report is protected with requireAdmin", () => {
  assert.match(admin, /await requireAdmin\(\)/);
  assert.match(admin, /createAdminClient\(\)/);
  assert.match(admin, /period === "30"/);
});
check("large reports page through Supabase instead of silent 1000-row truncation", () => {
  assert.match(admin, /for \(let offset = 0; offset <= 10000; offset \+= 1000\)/);
  assert.match(admin, /\.range\(offset, offset === 10000 \? offset : offset \+ 999\)/);
  assert.match(admin, /truncated = page\.length > 0/);
});
check("admin diagnostics link exposes new report", () => assert.match(diagnostics, /\/admin\/diagnostics\/performance/));
check("root layout mounts one tiny client collector", () => {
  assert.match(read("app/layout.tsx"), /<RealUserMetrics \/>/);
});
check("no use of raw anonymous errors in server logs", () => {
  assert.doesNotMatch(server, /console\.error\(.*payload|console\.warn\(.*payload/);
});
check("empty percentile is unknown", () => assert.equal(percentile75([]), null));
check("p75 follows interpolation", () => assert.equal(percentile75([500, 2000, 1000, 3000]), 2250));
check("p75 is robust to out-of-order measurements", () => assert.equal(percentile75([9, 1, 4, 8, 2]), 8));
check("empty report does not claim perfect performance", () => {
  const result = summarizeRum([]);
  assert.equal(result.samples, 0);
  assert.ok(result.vitals.every(x => x.rating === "insufficient" && x.p75 === null));
});
check("RUM report computes JS errors separately", () => {
  const now = new Date().toISOString();
  const rows = [
    ...Array.from({length:10},(_,i)=>({recorded_at:now,metric:'LCP',value:1700+i*100,route_key:'/',device_type:'mobile'})),
    {recorded_at:now,metric:'JS_ERROR',value:1,route_key:'/matches/:id',device_type:'desktop'},
  ];
  const result = summarizeRum(rows);
  assert.equal(result.errors,1);
  assert.equal(result.vitals[0].count,10);
  assert.equal(result.devices[0].count,10);
  assert.equal(result.vitals[0].rating,'good');
});
check("QA script is in deployment and CI", () => {
  assert.match(pkg.scripts["deploy:check"], /qa-rum-v2314\.mjs/);
  assert.match(pkg.scripts["qa:all"], /qa:rum/);
  assert.match(ci, /qa-rum-v2314\.mjs/);
});
console.log(`\nRUM v2.30.20: ${passed}/${passed+failed} checks passed`);
if(failed) process.exitCode = 1;
