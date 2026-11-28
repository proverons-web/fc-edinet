import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
function test(label, fn) {
  try { fn(); checks.push(true); console.log(`PASS ${label}`); }
  catch (error) { checks.push(false); console.error(`FAIL ${label}: ${error.message}`); }
}
const source = (name) => path.join(root, "scripts", name);
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function runNode(script, cwd, env = {}) {
  return spawnSync(process.execPath, [source(script)], {
    cwd, encoding: "utf8", env: { ...process.env, ...env }, timeout: 10000,
  });
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fc-edinet-deploy-safety-"));
const repo = path.join(temp, "repo");
fs.mkdirSync(repo);
try {
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.email", "qa@example.test");
  git(repo, "config", "user.name", "Production Safety QA");
  fs.writeFileSync(path.join(repo, "package.json"), JSON.stringify({ name: "fc-edinet", version: "2.30.29" }));
  fs.writeFileSync(path.join(repo, "safe.txt"), "only public, sample data\n");
  git(repo, "add", ".");

  test("Safe staged content passes guard", () => {
    const res = runNode("guard-staged-secrets.mjs", repo);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /PASS staged-secret guard/);
  });
  git(repo, "commit", "-m", "safe baseline");
  git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");

  test("Verified portable Git bundle backs up previous origin/main", () => {
    const backupDir = path.join(temp, "backup");
    const res = runNode("backup-remote-main.mjs", repo, { FC_EDINET_BACKUP_DIR: backupDir });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Database and Supabase Storage are NOT included/);
    const backups = fs.readdirSync(backupDir).filter((n) => n.endsWith(".bundle"));
    assert.equal(backups.length, 1);
    assert.match(git(repo, "bundle", "verify", path.join(backupDir, backups[0])), /okay|complete history|contains/i);
  });

  test("Backup inside the project is blocked", () => {
    const res = runNode("backup-remote-main.mjs", repo, { FC_EDINET_BACKUP_DIR: path.join(repo, "backups") });
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /BACKUP BLOCK/);
  });

  test("Tracked .env.production filename blocked", () => {
    fs.writeFileSync(path.join(repo, ".env.production"), "SAFE_SAMPLE=1\n");
    git(repo, "add", "-f", ".env.production");
    const res = runNode("guard-staged-secrets.mjs", repo);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /credential-like filename/);
    git(repo, "rm", "--cached", ".env.production");
    fs.unlinkSync(path.join(repo, ".env.production"));
  });

  test("Staged Supabase server token blocked without printing token", () => {
    const secret = ["sb", "secret", "a".repeat(32)].join("_");
    fs.writeFileSync(path.join(repo, "accidental.txt"), `KEY=${secret}\n`);
    git(repo, "add", "accidental.txt");
    const res = runNode("guard-staged-secrets.mjs", repo);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /possible Supabase server secret/);
    assert.doesNotMatch(res.stdout + res.stderr, new RegExp(secret));
    git(repo, "rm", "--cached", "accidental.txt");
    fs.unlinkSync(path.join(repo, "accidental.txt"));
  });

  test("Staged private key material blocked", () => {
    fs.writeFileSync(path.join(repo, "test.txt"), ["-----BEGIN", "PRIVATE KEY-----"].join(" ") + "\n");
    git(repo, "add", "test.txt");
    const res = runNode("guard-staged-secrets.mjs", repo);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /possible Private key material/);
    git(repo, "rm", "--cached", "test.txt");
    fs.unlinkSync(path.join(repo, "test.txt"));
  });

  test("Staged npm auth credentials blocked", () => {
    fs.writeFileSync(path.join(repo, ".npmrc"), "//registry.npmjs.org/:_authToken=example-token-not-real\n");
    git(repo, "add", ".npmrc");
    const res = runNode("guard-staged-secrets.mjs", repo);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /possible npm authentication token/);
    git(repo, "rm", "--cached", ".npmrc");
    fs.unlinkSync(path.join(repo, ".npmrc"));
  });

  test("Git staged-only check ignores untracked local secrets", () => {
    fs.writeFileSync(path.join(repo, ".env.local"), "LOCAL_SAMPLE=private_not_staged\n");
    const res = runNode("guard-staged-secrets.mjs", repo);
    assert.equal(res.status, 0, res.stderr);
  });
} finally { fs.rmSync(temp, { force: true, recursive: true }); }

test("Installer creates restore point AFTER fetch and BEFORE index reset", () => {
  const bat = read("DEPLOY_FC_EDINET.bat");
  const fetch = bat.indexOf("git fetch origin");
  const backup = bat.indexOf("node scripts/backup-remote-main.mjs");
  const reset = bat.indexOf("git reset origin/main");
  assert.ok(fetch !== -1 && backup > fetch && reset > backup);
});
test("Installer scans staged content AFTER add and BEFORE commit/push", () => {
  const bat = read("DEPLOY_FC_EDINET.bat");
  const staged = bat.indexOf("git add -A");
  const guard = bat.indexOf("node scripts/guard-staged-secrets.mjs");
  const commit = bat.indexOf("git commit -m");
  const push = bat.indexOf("git push -u origin main");
  assert.ok(staged !== -1 && guard > staged && commit > guard && push > commit);
});
test("Installer fails closed on backup and secret scanner failure", () => {
  const bat = read("DEPLOY_FC_EDINET.bat");
  assert.match(bat, /node scripts\/backup-remote-main\.mjs\s*\r?\nif errorlevel 1 goto :fail/);
  assert.match(bat, /node scripts\/guard-staged-secrets\.mjs\s*\r?\nif errorlevel 1 goto :fail/);
});
test("Credentials are ignored from Git", () => {
  const ignore = read(".gitignore");
  for (const f of [".env.production", ".env.staging", ".env.local", "*.pem", "*.p12"]) assert.ok(ignore.includes(f), f);
});
test("Production security response headers are present", () => {
  const config = read("next.config.ts");
  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /productionBrowserSourceMaps:\s*false/);
});
test("Automated security QA is wired into deploy and CI", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts["qa:all"], /qa:production-safety/);
  assert.match(pkg.scripts["deploy:check"], /qa:production-safety/);
  assert.match(read(".github/workflows/responsive-qa.yml"), /qa:production-safety/);
});
test("Release documentation covers database backup separately from Git", () => {
  assert.match(read("STEP-2.30.29.txt"), /Supabase.*(?:баз|резерв)/is);
  assert.match(read("STEP-2.30.29.txt"), /\.bundle/);
});
test("Release and installer version synchronized", () => {
  assert.equal(JSON.parse(read("package.json")).version, "2.30.29");
  assert.match(read("lib/release.ts"), /RELEASE_VERSION = "2\.30\.29"/);
});
const passed = checks.filter(Boolean).length;
console.log(`\nProduction Safety v2.30.29: ${passed}/${checks.length} passed.`);
if (passed !== checks.length) process.exitCode = 1;
