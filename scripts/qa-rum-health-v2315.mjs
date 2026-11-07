import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filterRumByDevice, summarizeRum } from "../lib/rum-report.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const dashboard = read("app/admin/diagnostics/performance/page.tsx");
const reportSource = read("lib/rum-report.ts");
const server = read("app/api/rum/route.ts");
const ci = read(".github/workflows/responsive-qa.yml");
let passed = 0, failed = 0;
function check(name, work) {
  try { work(); passed++; console.log("PASS", name); }
  catch (error) { failed++; console.error("FAIL", name, error.message); }
}
const now = new Date().toISOString();
const sample = (metric, value, route = "/", device = "mobile") => ({
  recorded_at: now, metric, value, route_key: route, device_type: device,
});

check("one pinned Node.js major for Vercel deployments", () => {
  assert.equal(packageJson.engines.node, "22.x");
});
check("package and release metadata agree", () => {
  assert.equal(packageJson.version, "2.30.16");
  assert.match(read("lib/release.ts"), /RELEASE_VERSION = "2\.30\.16"/);
});
check("there is one current installer STEP file", () => {
  assert.deepEqual(fs.readdirSync(root).filter(f => /^STEP-.*\.txt$/.test(f)), ["STEP-2.30.16.txt"]);
});
check("no project .npmrc injects unsupported cache-dir", () => {
  const npmrc = path.join(root, ".npmrc");
  if (fs.existsSync(npmrc)) assert.doesNotMatch(read(".npmrc"), /^\s*cache-dir\s*=/m);
  assert.doesNotMatch(read("package.json"), /npm_config_cache_dir|NPM_CONFIG_CACHE_DIR/);
});
check("dashboard requires an administrator", () => {
  assert.match(dashboard, /await requireAdmin\(\)/);
});
check("dashboard never publishes server-only configuration values", () => {
  assert.match(dashboard, /!process\.env\.ANALYTICS_IP_SALT\?\.trim\(\)/);
  assert.doesNotMatch(dashboard, /{process\.env\.ANALYTICS_IP_SALT}|{process\.env\.SUPABASE_SECRET_KEY}/);
});
check("dashboard warns when new metrics cannot be received", () => {
  assert.match(dashboard, /Приём новых измерений выключен/);
  assert.match(dashboard, /missingSalt/);
});
check("dashboard distinguishes no measurements from no errors", () => {
  assert.match(dashboard, /Пока нет измерений за выбранный период/);
  assert.match(dashboard, /Отсутствие измерений не означает отсутствия проблем/);
});
check("dashboard shows time of last event in local timezone", () => {
  assert.match(dashboard, /Europe\/Chisinau/);
  assert.match(dashboard, /Последняя запись/);
});
check("dashboard supports only 3 device filter values", () => {
  assert.match(dashboard, /params\.device === "mobile" \|\| params\.device === "tablet" \|\| params\.device === "desktop"/);
  assert.match(dashboard, /filterRumByDevice\(rows, device\)/);
});
check("filter all returns all samples", () => {
  const rows = [sample("LCP", 1800, "/", "mobile"), sample("CLS", 0.02, "/", "desktop")];
  assert.equal(filterRumByDevice(rows, "all").length, 2);
});
check("filter mobile excludes desktop and tablet samples", () => {
  const rows = [sample("LCP", 1800, "/", "mobile"), sample("LCP", 3200, "/", "desktop")];
  assert.deepEqual(filterRumByDevice(rows, "mobile"), [rows[0]]);
});
check("device-specific p75 measures only that device", () => {
  const rows = [
    ...Array.from({ length: 10 }, () => sample("LCP", 1800, "/", "mobile")),
    ...Array.from({ length: 10 }, () => sample("LCP", 4500, "/", "desktop")),
  ];
  const mobile = summarizeRum(filterRumByDevice(rows, "mobile"));
  const desktop = summarizeRum(filterRumByDevice(rows, "desktop"));
  assert.equal(mobile.vitals[0].p75, 1800);
  assert.equal(mobile.vitals[0].rating, "good");
  assert.equal(desktop.vitals[0].p75, 4500);
  assert.equal(desktop.vitals[0].rating, "poor");
});
check("a single bad event must not label the route slow", () => {
  const info = summarizeRum([sample("LCP", 8000)]);
  assert.equal(info.routes[0].enoughData, false);
  assert.match(dashboard, /r\.enoughData \?/);
});
check("route warning activates after 10 values", () => {
  const info = summarizeRum(Array.from({ length: 10 }, () => sample("LCP", 4500)));
  assert.equal(info.routes[0].enoughData, true);
  assert.equal(info.routes[0].badShare, 1);
});
check("report reveals no private identifiers", () => {
  for (const privateField of ["ip_address", "user_id", "cookie", "stack_trace", "user_agent"]) {
    assert.doesNotMatch(reportSource, new RegExp(`\\b${privateField}\\b`));
  }
});
check("collector keeps route allowlist and server-only HMAC", () => {
  assert.match(server, /const ROUTES = new Set/);
  assert.match(server, /createHmac\("sha256", salt\)/);
  assert.match(server, /new NextResponse\(null, \{/);
});
check("release runs new QA in deploy, qa:all and CI", () => {
  assert.match(packageJson.scripts["deploy:check"], /qa-rum-health-v2315\.mjs/);
  assert.match(packageJson.scripts["qa:all"], /qa:rum-health/);
  assert.match(ci, /qa-rum-health-v2315\.mjs/);
});
check("v2.30.16 does not require new SQL migration", () => {
  assert.match(read("STEP-2.30.16.txt"), /SQL-МИГРАЦИИ: ДА/);
  assert.match(read("STEP-2.30.16.txt"), /078_real_user_monitoring\.sql/);
});
console.log(`\nFC Edineț v2.30.16 RUM operations: ${passed}/${passed + failed} checks passed`);
if (failed) process.exitCode = 1;
