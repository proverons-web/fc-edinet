import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const run = (name, fn) => {
  try { fn(); checks.push(true); console.log(`PASS  ${name}`); }
  catch (error) { checks.push(false); console.error(`FAIL  ${name}: ${error.message}`); }
};
const packageJson = JSON.parse(read("package.json"));
const api = read("app/api/analytics/visit/route.ts");
const db = read("database/067_restrict_trigger_helper_execute.sql");

run("Next.js pinned to patched 16.4.4", () => {
  assert.equal(packageJson.dependencies.next, "16.4.4");
  assert.match(packageJson.dependencies.next, /^16\.4\.4$/);
});
run("Server-side credential never published as NEXT_PUBLIC", () => {
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "ANALYTICS_IP_SALT"]) {
    assert.ok(!Object.hasOwn(process.env, `NEXT_PUBLIC_${name}`), `Unsafe env: ${name}`);
  }
  assert.match(read("lib/supabase/admin.ts"), /process\.env\.SUPABASE_SECRET_KEY/);
});
run("Analytics HMAC hashes IP on server", () => {
  assert.match(api, /createHmac\("sha256", salt\)\.update\(ip\)/);
  assert.match(api, /record_site_visit_v4/);
  assert.match(api, /p_ingest_proof:\s*salt/);
});
run("Vercel IP source cannot fall back to client-controlled proxy header", () => {
  assert.match(api, /const runningOnVercel/);
  assert.match(api, /runningOnVercel\s*\? request\.headers\.get\("x-vercel-forwarded-for"\)/);
});
run("Analytics accepts only small JSON body", () => {
  assert.match(api, /contentType !== "application\/json"/);
  assert.match(api, /statedLength > 2048/);
  assert.match(api, /payload\.length > 2048/);
});
run("Analytics validates Origin and browser Fetch Metadata", () => {
  assert.match(api, /fetchSite === "cross-site"/);
  assert.match(api, /parsed\.origin !== expected\.origin/);
});
run("Preview analytics and robot traffic excluded", () => {
  assert.match(api, /process\.env\.VERCEL_ENV !== "production"/);
  assert.match(api, /BOT_RE\.test\(userAgent\)/);
});
run("Seven internal trigger RPCs denied to public and signed-in users", () => {
  const names = [
    "ensure_match_team_stat_rows", "refresh_competition_player_stats_season",
    "refresh_match_stats_context", "sync_match_lineup_context",
    "sync_match_team_stat_context", "sync_player_match_stat_context",
    "validate_completed_match_statistics",
  ];
  for (const name of names) {
    assert.ok(db.includes(`revoke execute on function public.${name}() from public, anon, authenticated;`), name);
  }
});
run("Admin role and analytics gated by verified account", () => {
  const editorial = read("lib/editorial.ts");
  assert.match(editorial, /supabase\.auth\.getClaims\(\)/);
  assert.match(editorial, /export async function requireAdmin\(\)/);
  assert.match(read("app/admin/users/actions.ts"), /await requireAdmin\(\)/);
  assert.match(read("app/admin/site-analytics/page.tsx"), /await requireEditor\(\)/);
});
run("Legacy visit endpoints remain inaccessible directly", () => {
  const previous = read("database/065_retire_legacy_analytics_rpc.sql");
  assert.match(previous, /record_site_visit_v2/);
  assert.match(read("database/066_guard_analytics_ingest.sql"), /revoke all on function public\.record_site_visit_v3/);
});
run("QA wired into deploy and CI", () => {
  assert.ok(packageJson.scripts["deploy:check"].includes("qa-security.mjs"));
  assert.ok(packageJson.scripts["qa:all"].includes("qa:security"));
  assert.match(read(".github/workflows/responsive-qa.yml"), /qa-security\.mjs/);
});
const passed = checks.filter(Boolean).length;
console.log(`\n${passed}/${checks.length} security checks passed.`);
if (passed !== checks.length) process.exit(1);
