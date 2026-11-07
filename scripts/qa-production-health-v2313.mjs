import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { PUBLIC_CHECKS, runProductionHealth, validateBaseUrl } from "./production-health-v2313.mjs";
import fs from "node:fs";

let passed = 0;
function check(name, cb) {
  try { cb(); passed++; console.log("PASS", name); }
  catch (err) { console.error("FAIL", name, err); process.exitCode = 1; }
}

const packageInfo = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
check("release 2.30.16 consistent", () => { assert.equal(packageInfo.version, "2.30.16"); });
check("public routes are safe GETs only", () => {
  assert.equal(PUBLIC_CHECKS.length, 10);
  assert.ok(PUBLIC_CHECKS.every(c => c.path.startsWith("/") && !c.path.startsWith("/admin") && !c.path.startsWith("/api/analytics")));
});
check("reject URL credentials and non-local HTTP", () => {
  assert.throws(() => validateBaseUrl("http://example.com"));
  assert.throws(() => validateBaseUrl("https://alice:secret@example.com"));
  assert.throws(() => validateBaseUrl("https://example.com/news"));
  assert.equal(validateBaseUrl("http://127.0.0.1:32100/"), "http://127.0.0.1:32100");
});
check("public health keeps internal secrets and translation model out", () => {
  const code = fs.readFileSync(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
  assert.match(code, /check: "configuration_only"/);
  assert.match(code, /database: "not_checked"/);
  assert.doesNotMatch(code, /OPENAI_API_KEY|translationModel|authProxy|VERCEL_ENV/);
});
check("admin diagnostics reports actual Supabase query duration", () => {
  const code = fs.readFileSync(new URL("../app/admin/diagnostics/page.tsx", import.meta.url), "utf8");
  assert.match(code, /const diagnosticsStartedAt = Date\.now\(\)/);
  assert.match(code, /const databaseDurationMs = Date\.now\(\) - diagnosticsStartedAt/);
  assert.match(code, /packageJson\.dependencies\.next/);
  assert.doesNotMatch(code, /value="16\.3\.2"/);
});
check("deploy and CI include offline regression guard", () => {
  assert.match(packageInfo.scripts["qa:all"], /qa:health/);
  assert.match(packageInfo.scripts["deploy:check"], /qa-production-health-v2313\.mjs/);
  assert.match(fs.readFileSync(new URL("../.github/workflows/responsive-qa.yml", import.meta.url), "utf8"), /qa-production-health-v2313\.mjs/);
});

const server = createServer((req, res) => {
  if (req.url === "/api/version") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, version: "2.30.16" }));
  } else if (req.url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", check: "configuration_only" }));
  } else if (req.url === "/bad") {
    res.writeHead(404, { "content-type": "text/html" }); res.end("Not Found");
  } else {
    res.writeHead(200, { "content-type": "text/html" }); res.end("<html>ok</html>");
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
try {
  const good = await runProductionHealth({ baseUrl, expectedVersion: "2.30.16" });
  check("all ten routes pass healthy fixture", () => assert.equal(good.passed, good.total));
  const wrongVersion = await runProductionHealth({ baseUrl, expectedVersion: "2.30.12", checks: [PUBLIC_CHECKS[0]] });
  check("outdated release is detected", () => {
    assert.equal(wrongVersion.passed, 0);
    assert.match(wrongVersion.results[0].error, /expected v2\.30\.12/);
  });
  const missing = await runProductionHealth({ baseUrl, expectedVersion: "2.30.16", checks: [{ path: "/bad", kind: "html" }] });
  check("HTTP 404 causes a failing result", () => assert.equal(missing.results[0].httpStatus, 404));
} finally { server.close(); await once(server, "close"); }
console.log(`\nProduction Health (offline fixture): ${passed}/9 tests passed.`);
