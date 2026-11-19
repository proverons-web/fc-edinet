import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// FC Edinet v2.30.27: fix documented Git bundle extension, preserving actual
// pre-deployment backup and security tests untouched.
const kit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(kit, '..');
const pkgPath = path.join(root, 'package.json');
const stepPath = path.join(root, 'STEP-2.30.27.txt');
const qaPath = path.join(root, 'scripts', 'qa-production-safety-v2326.mjs');
const backupScript = path.join(root, 'scripts', 'backup-remote-main.mjs');
const originalBlock = [
  '- Git bundle из предыдущей версии содержит КОД, не резервную копию',
  '  базы Supabase. Храни и отдельно проверяй резервную копию данных/Storage.',
].join('\n');
const added = '  Файл с расширением .bundle — проверенный архив предыдущей Git-версии сайта. Он не содержит резервную копию базы Supabase или объектов Storage.';
function stop(message) { throw new Error(message); }
function runQa() {
  const proc = spawnSync(process.execPath, [qaPath], {
    cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.error || proc.status !== 0) stop(`Production Safety QA failed: ${proc.error?.message ?? `exit code ${proc.status}`}`);
  if (!/Production Safety v2\.30\.27:\s*16\/16 passed\./.test(proc.stdout ?? '')) {
    stop('The updated QA did not report 16/16 checks.');
  }
}
try {
  for (const filename of [pkgPath, stepPath, qaPath, backupScript]) {
    if (!fs.existsSync(filename)) stop(`Required file not found: ${path.relative(root, filename)}`);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.version !== '2.30.27') stop(`Expected version 2.30.27; got ${pkg.version}. No files changed.`);
  const qa = fs.readFileSync(qaPath, 'utf8');
  const backupSource = fs.readFileSync(backupScript, 'utf8');
  if (!qa.includes('Release documentation covers database backup separately from Git') ||
      !qa.includes(String.raw`/\.bundle/`) ||
      !qa.includes('Backup inside the project is blocked') ||
      !qa.includes('Staged Supabase server token blocked without printing token')) {
    stop('The security QA differs from the reviewed version. No files changed.');
  }
  if (!backupSource.includes('"bundle", "create"') || !backupSource.includes('"bundle", "verify"')) {
    stop('The real Git backup/verification is missing. Refusing a documentation-only bypass.');
  }
  const previousBytes = fs.readFileSync(stepPath);
  const oldText = previousBytes.toString('utf8');
  const normalized = oldText.replace(/\r\n/g, '\n');
  const eol = oldText.includes('\r\n') ? '\r\n' : '\n';
  if (normalized.includes(added)) {
    console.log('The .bundle explanation is already present. Running QA without further changes.');
    runQa();
    process.exit(0);
  }
  if (normalized.includes('.bundle')) {
    stop('The instruction already has a different .bundle reference. Review manually; no file changed.');
  }
  if (normalized.split(originalBlock).length !== 2) {
    stop('The exact reviewed STEP text was not found once. No files changed.');
  }
  const updated = normalized.replace(originalBlock, `${originalBlock}\n${added}`).replace(/\n/g, eol);
  const backupDir = path.join(path.dirname(root), 'FC_Edinet_QABackups_v2.30.27');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(backupDir, `STEP-2.30.27-before-safety-fix-${stamp}.txt`);
  fs.writeFileSync(backup, previousBytes, { flag: 'wx' });
  let modified = false;
  try {
    fs.writeFileSync(stepPath, updated, 'utf8');
    modified = true;
    runQa();
  } catch (error) {
    if (modified) {
      fs.writeFileSync(stepPath, previousBytes);
      console.error('QA did not pass. Original STEP-2.30.27.txt restored.');
    }
    throw error;
  }
  console.log('SUCCESS: Production Safety 16/16. Only STEP-2.30.27.txt changed.');
  console.log(`Backup saved outside project: ${backup}`);
} catch (error) {
  console.error(`HOTFIX BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
