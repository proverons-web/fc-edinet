import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

/**
 * FC Edinet 2.30.27: preserve and verify the 7 admin-only Site Builder actions,
 * then update the stale read-only stability QA expectation.
 * This script intentionally does not modify permissions or application code.
 */
const kit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(kit, '..');
const testFile = path.join(root, 'scripts', 'qa-performance-stability-v2310.mjs');
const actionsFile = path.join(root, 'app', 'admin', 'site-builder', 'actions.ts');
const layoutFile = path.join(root, 'app', 'admin', 'site-builder', 'layout.tsx');
const packageFile = path.join(root, 'package.json');
const expected = [
  'createCustomPage', 'saveCustomPage', 'deleteCustomPage',
  'saveMenuItem', 'createMenuItem', 'reorderMenuItems', 'deleteMenuItem',
];
const abort = (message) => { throw new Error(message); };
const originalCheck = 'check("Menu mutations are editor-protected before tag invalidation", () => {\n  assert.equal((actions.match(/await requireEditor\\(\\)/g) || []).length, 7);\n});';
const newCheck = 'check("Menu mutations are admin-protected before tag invalidation", () => {\n  assert.equal((actions.match(/await requireAdmin\\(\\)/g) || []).length, 7);\n});';
try {
  for (const file of [packageFile, testFile, actionsFile, layoutFile]) {
    if (!fs.existsSync(file)) abort(`Project file missing: ${path.relative(root, file)}`);
  }
  const version = JSON.parse(fs.readFileSync(packageFile, 'utf8')).version;
  if (version !== '2.30.27') abort(`Expected project v2.30.27; got ${version}. No files changed.`);
  const actions = fs.readFileSync(actionsFile, 'utf8');
  const layout = fs.readFileSync(layoutFile, 'utf8');
  const actionNames = [...actions.matchAll(/export async function\s+(\w+)\s*\(/g)].map((m) => m[1]);
  if (JSON.stringify(actionNames) !== JSON.stringify(expected)) {
    abort(`Actions changed since the reviewed release; found: ${actionNames.join(', ')}. No files changed.`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    const begin = actions.indexOf(`export async function ${expected[index]}(`);
    const end = index === expected.length - 1 ? actions.length : actions.indexOf(`export async function ${expected[index + 1]}(`);
    const section = actions.slice(begin, end);
    if (!/await\s+requireAdmin\(\)/.test(section) || /await\s+requireEditor\(\)/.test(section)) {
      abort(`Action ${expected[index]} is not strictly admin-only. No files changed.`);
    }
    if (!section.includes('updateTag("fce-public-site-menu")')) {
      abort(`Action ${expected[index]} does not invalidate public menu cache. No files changed.`);
    }
  }
  if ((actions.match(/await\s+requireAdmin\(\)/g) || []).length !== 7) abort('Unexpected admin gate count. No files changed.');
  if (!/await\s+requireAdmin\(\)/.test(layout)) abort('The Site Builder route is not admin-only. No files changed.');
  const originalBytes = fs.readFileSync(testFile);
  const original = originalBytes.toString('utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const normalized = original.replace(/\r\n/g, '\n');
  if (normalized.includes(newCheck) && !normalized.includes(originalCheck)) {
    console.log('PASS: Stability QA already checks seven admin-only menu mutations. Nothing to modify.');
    process.exit(0);
  }
  if (!normalized.includes(originalCheck) || normalized.split(originalCheck).length !== 2) {
    abort('Exact old QA fragment not found (or duplicated). No files changed.');
  }
  const updated = normalized.replace(originalCheck, newCheck).replace(/\n/g, eol);
  // The source contract must not be weakened: still exactly seven gates and tags.
  if (!updated.includes('assert.equal(tagCalls, 7)') || !updated.includes('assert.equal(tagCalls, layoutCalls)')) {
    abort('Cache invalidation safety checks are missing. No files changed.');
  }
  const backupDir = path.join(path.dirname(root), 'FC_Edinet_QABackups_v2.30.27');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `qa-performance-stability-v2310-${new Date().toISOString().replace(/[:.]/g, '-')}.mjs`);
  fs.writeFileSync(backup, originalBytes, { flag: 'wx' });
  try {
    fs.writeFileSync(testFile, updated, 'utf8');
    const result = spawnSync(process.execPath, [testFile], {
      cwd: root, encoding: 'utf8', timeout: 120_000, maxBuffer: 6 * 1024 * 1024,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error || result.status !== 0) {
      abort(`Updated stability QA did not pass: ${result.error?.message || `exit ${result.status}`}`);
    }
  } catch (error) {
    fs.writeFileSync(testFile, originalBytes);
    abort(`Check failed; original QA was restored. ${error.message}`);
  }
  console.log('\nPASS: Performance & Stability QA now verifies seven ADMIN-only mutations.');
  console.log(`Previous QA saved outside project: ${backup}`);
  console.log('Changed file: scripts/qa-performance-stability-v2310.mjs only.');
  console.log('NEXT: run DEPLOY_FC_EDINET.bat from the root of your project.');
} catch (error) {
  console.error('HOTFIX BLOCKED:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
