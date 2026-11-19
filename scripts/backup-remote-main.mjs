// Creates a portable Git restore point BEFORE this release replaces remote main.
// This is a source-code backup only; database and storage need separate backups.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const run = (...args) => execFileSync("git", args, {
  encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 2 * 1024 * 1024,
}).trim();
try {
  const root = run("rev-parse", "--show-toplevel");
  const commit = run("rev-parse", "--verify", "refs/remotes/origin/main^{commit}");
  const previous = path.dirname(root);
  const directory = process.env.FC_EDINET_BACKUP_DIR
    ? path.resolve(process.env.FC_EDINET_BACKUP_DIR)
    : path.join(previous, "FC_Edinet_DeployBackups");
  const relative = path.relative(root, directory);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("Backup directory must be outside the project directory.");
  }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const localVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `fc-edinet-before-${localVersion}-${stamp}-${commit.slice(0, 12)}.bundle`;
  const destination = path.join(directory, filename);
  if (fs.existsSync(destination)) throw new Error("Backup already exists; refusing to overwrite it.");
  try {
    run("bundle", "create", destination, "refs/remotes/origin/main");
    run("bundle", "verify", destination);
    fs.chmodSync(destination, 0o600);
  } catch (error) {
    fs.rmSync(destination, { force: true });
    throw error;
  }
  console.log("PASS Git restore point created and verified before publishing.");
  console.log(`Saved locally: ${destination}`);
  console.log(`Previous origin/main commit: ${commit.slice(0, 12)}`);
  console.log("Database and Supabase Storage are NOT included in this bundle.");
} catch (error) {
  console.error(`[BACKUP BLOCK] Cannot create verified pre-deploy restore point: ${error instanceof Error ? error.message.split("\n")[0] : "unknown error"}`);
  process.exitCode = 1;
}
