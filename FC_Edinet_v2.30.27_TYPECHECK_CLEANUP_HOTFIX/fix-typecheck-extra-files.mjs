#!/usr/bin/env node
/**
 * FC Edinet 2.30.27: move redundant upgrade-kit TypeScript sources OUT of
 * the Next.js project so `tsc --noEmit` checks only the real application.
 * Fail closed when a candidate does not match the installed source.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const kit = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(kit, '..');
const liveSource = path.join(project, 'lib', 'admin-role-permissions.ts');
const liveTypes = path.join(project, 'lib', 'types.ts');
const candidates = [
  {
    label: 'Loose files folder',
    directory: path.join(project, 'files'),
    duplicate: path.join(project, 'files', 'lib', 'admin-role-permissions.ts'),
  },
  {
    label: 'v2.30.27 upgrade kit',
    directory: path.join(project, 'UPDATE_FC_EDINET_v2.30.27'),
    duplicate: path.join(project, 'UPDATE_FC_EDINET_v2.30.27', 'files', 'lib', 'admin-role-permissions.ts'),
    marker: path.join(project, 'UPDATE_FC_EDINET_v2.30.27', 'apply.mjs'),
  },
];
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const abort = (message) => { console.error(`CLEANUP BLOCKED: ${message}`); process.exit(1); };
const isRealDir = (file) => fs.lstatSync(file).isDirectory() && !fs.lstatSync(file).isSymbolicLink();

try {
  const pkgPath = path.join(project, 'package.json');
  if (!fs.existsSync(pkgPath)) abort('The hotfix folder must be extracted next to package.json.');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.name !== 'fc-edinet' || pkg.version !== '2.30.27') {
    abort(`Expected fc-edinet v2.30.27; found ${pkg.name ?? 'unknown'} v${pkg.version ?? 'unknown'}. No changes made.`);
  }
  if (!fs.existsSync(liveSource) || !fs.existsSync(liveTypes)) {
    abort('Missing actual lib/admin-role-permissions.ts or lib/types.ts. Do NOT move files; restore the real source first.');
  }
  const liveContent = fs.readFileSync(liveSource);
  if (!liveContent.toString('utf8').includes('import type { UserRole } from "./types"')) {
    abort('Active lib/admin-role-permissions.ts has changed. Manual review required.');
  }

  // Validate ALL candidates BEFORE modifying the project.
  const toArchive = [];
  for (const item of candidates) {
    if (!fs.existsSync(item.directory)) continue;
    if (!isRealDir(item.directory)) abort(`Unexpected symlink/file at ${item.directory}`);
    if (!fs.existsSync(item.duplicate) || (item.marker && !fs.existsSync(item.marker))) {
      abort(`Folder ${item.directory} does not look like the known upgrade kit. Leave it untouched; inspect manually.`);
    }
    if (sha256(fs.readFileSync(item.duplicate)) !== sha256(liveContent)) {
      abort(`Upgrade copy differs from active code: ${item.duplicate}. Leave it untouched; inspect manually.`);
    }
    toArchive.push(item);
  }

  if (!toArchive.length) {
    console.log('PASS: No extra upgrade-kit TypeScript copies were found. Nothing to move.');
    console.log(`Checked active module: ${liveSource}`);
    process.exit(0);
  }

  // Sibling of the project on the same drive; never add an archive directory
  // inside Next.js root. No deleting files; reverse move restores everything.
  const archiveRoot = path.join(path.dirname(project), 'FC_Edinet_InstallerArchives_v2.30.27');
  const run = new Date().toISOString().replace(/[:.]/g, '-') + `-${process.pid}`;
  const destination = path.join(archiveRoot, `typecheck-cleanup-${run}`);
  if (fs.existsSync(destination)) abort(`Archive already exists: ${destination}`);
  fs.mkdirSync(destination, { recursive: true });
  const moved = [];
  try {
    for (const item of toArchive) {
      const target = path.join(destination, path.basename(item.directory));
      if (fs.existsSync(target)) throw new Error(`Destination already exists: ${target}`);
      fs.renameSync(item.directory, target);
      moved.push({ original: item.directory, saved: target, label: item.label });
      console.log(`ARCHIVED ${item.label}: ${target}`);
    }
    for (const item of toArchive) {
      if (fs.existsSync(item.duplicate)) throw new Error(`Old duplicate still present: ${item.duplicate}`);
    }
    if (!fs.existsSync(liveSource) || sha256(fs.readFileSync(liveSource)) !== sha256(liveContent)) {
      throw new Error('Live module verification failed after cleanup.');
    }
    const manifest = ['FC Edinet v2.30.27 upgrade-kit cleanup','These are redundant installer copies; NOT live app source.','To undo: close all Node processes and move each archived folder back:', ...moved.map(x => `FROM: ${x.saved}\nTO:   ${x.original}`),'Active lib/admin-role-permissions.ts was not modified.'].join('\n');
    fs.writeFileSync(path.join(destination, 'RESTORE_INSTRUCTIONS.txt'), manifest, 'utf8');
  } catch (error) {
    console.error(`Cleanup failed, attempting rollback: ${error instanceof Error ? error.message : String(error)}`);
    for (const item of moved.reverse()) {
      if (!fs.existsSync(item.original) && fs.existsSync(item.saved)) fs.renameSync(item.saved, item.original);
    }
    throw error;
  }
  console.log(`PASS: ${moved.length} redundant installer folder(s) moved outside the Next.js project.`);
  console.log(`Active lib/admin-role-permissions.ts unchanged. Archives: ${destination}`);
  console.log('NEXT: npm run typecheck; then run DEPLOY_FC_EDINET.bat only after typecheck passes.');
} catch (error) {
  console.error(`CLEANUP BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
