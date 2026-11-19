import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Place the entire hotfix folder inside the FC Edinet v2.30.27 project root.
const kit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(kit, '..');
const testFile = path.join(root, 'scripts', 'qa-club-history-v2307.mjs');
const actionFile = path.join(root, 'app', 'admin', 'club', 'history', 'actions.ts');
const layoutFile = path.join(root, 'app', 'admin', 'club', 'layout.tsx');
const pkgFile = path.join(root, 'package.json');

function abort(message) { throw Error(message); }
function replaceOnce(input, before, after, description) {
  const start = input.indexOf(before);
  if (start < 0) abort(`${description}: old test was not found; no files changed.`);
  if (input.indexOf(before, start + 1) >= 0) abort(`${description}: multiple matches; no files changed.`);
  return input.slice(0, start) + after + input.slice(start + before.length);
}
try {
  for (const f of [pkgFile, testFile, actionFile, layoutFile]) {
    if (!fs.existsSync(f)) abort(`Required project file not found: ${path.relative(root, f)}`);
  }
  const version = JSON.parse(fs.readFileSync(pkgFile, 'utf8')).version;
  if (version !== '2.30.27') abort(`Expected FC Edinet v2.30.27, found ${version}. No files changed.`);

  const action = fs.readFileSync(actionFile, 'utf8');
  const saveBegin = action.indexOf('export async function saveHistoryEvent');
  const deleteBegin = action.indexOf('export async function deleteHistoryEvent');
  if (saveBegin < 0 || deleteBegin <= saveBegin) abort('Could not identify the save action boundaries. No files changed.');
  const save = action.slice(saveBegin, deleteBegin);
  if (!/await\s+requireAdmin\(\)/.test(save) || /requireEditor\(\)/.test(save)) {
    abort('The save action is not strictly admin-only. Refusing to weaken or bypass authorization.');
  }
  const layout = fs.readFileSync(layoutFile, 'utf8');
  if (!/await\s+requireAdmin\(\)/.test(layout)) abort('Club admin route lacks an admin-only layout. No files changed.');

  const oldSource = fs.readFileSync(testFile);
  const original = oldSource.toString('utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const oldLayout = 'test("admin timeline uses editor gate", () => assert.match(admin,/requireEditor\\(\\)/));';
  const oldSave = 'test("save requires editor", () => assert.match(action,/saveHistoryEvent[\\s\\S]*requireEditor\\(\\)/));';
  const newLayout = 'test("history management route requires admin", () => assert.match(read("app/admin/club/layout.tsx"),/await requireAdmin\\(\\)/));';
  const newSave = 'test("save requires admin", () => { const save = action.split("export async function saveHistoryEvent")[1]?.split("export async function deleteHistoryEvent")[0]; assert.ok(save); assert.match(save,/await requireAdmin\\(\\)/); assert.doesNotMatch(save,/requireEditor\\(\\)/); });';
  if (original.includes(newLayout) && original.includes(newSave)) {
    console.log('PASS: Club History Pro QA is already fixed. No change needed.');
    process.exit(0);
  }
  let updated = replaceOnce(original, oldLayout, newLayout, 'Admin route QA');
  updated = replaceOnce(updated, oldSave, newSave, 'Save action QA');
  if (eol === '\r\n') updated = updated.replace(/(?<!\r)\n/g, '\r\n');
  const parent = path.dirname(root);
  const backupDir = path.join(parent, 'FC_Edinet_QABackups_v2.30.27');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `qa-club-history-v2307-${new Date().toISOString().replace(/[:.]/g, '-')}.mjs`);
  fs.writeFileSync(backup, oldSource, { flag: 'wx' });
  fs.writeFileSync(testFile, updated, 'utf8');
  const run = spawnSync(process.execPath, [testFile], { cwd: root, encoding: 'utf8', timeout: 90000 });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.error || run.status !== 0) {
    fs.writeFileSync(testFile, oldSource);
    abort(`Test did not pass, original QA restored. Backup: ${backup}. ${run.error?.message || `Exit ${run.status}`}`);
  }
  console.log('\nPASS: outdated v2.30.26 role expectations updated for v2.30.27.');
  console.log('Only scripts/qa-club-history-v2307.mjs changed.');
  console.log(`Original QA backup saved outside the project: ${backup}`);
  console.log('NEXT: run npm run qa:user-roles, then DEPLOY_FC_EDINET.bat.');
} catch (err) {
  console.error('HOTFIX BLOCKED:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
