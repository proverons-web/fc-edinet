import fs from "node:fs";
import path from "node:path";

// FC Edinet FULL updates never include .env.local. Recover a previously
// configured local file from the latest older sibling release, if available.
// Never log variable values and never overwrite an existing .env.local.
const cwd = process.cwd();
const target = path.join(cwd, ".env.local");
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const releasePattern = /^fc-edinet-v(\d+)\.(\d+)\.(\d+)$/i;

function readEnv(file) {
  const values = new Map();
  for (const raw of fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("export ")) continue;
    const at = line.indexOf("=");
    if (at <= 0) continue;
    const name = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(name, value);
  }
  return values;
}

function missing(file) {
  const values = fs.existsSync(file) ? readEnv(file) : new Map();
  return required.filter((name) => !(process.env[name] || values.get(name)));
}

function rank(version) {
  return version.slice(1).map(Number);
}

function compare(a, b) {
  const av = rank(a), bv = rank(b);
  for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return av[i] - bv[i];
  return 0;
}

if (missing(target).length === 0) {
  console.log("Local Supabase settings: available. Values are hidden.");
  process.exit(0);
}

if (fs.existsSync(target)) {
  console.error("[ERROR] Existing .env.local is missing required settings:");
  missing(target).forEach((name) => console.error(`  - ${name}`));
  console.error("Check this file manually. The deploy script will not overwrite it.");
  process.exit(1);
}

const currentRelease = path.basename(cwd).match(releasePattern);
if (currentRelease) {
  const parent = path.dirname(cwd);
  const olderReleases = fs.readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && releasePattern.test(entry.name))
    .map((entry) => ({ name: entry.name, version: entry.name.match(releasePattern) }))
    .filter((entry) => compare(entry.version, currentRelease) < 0)
    .sort((a, b) => compare(b.version, a.version));

  for (const release of olderReleases) {
    const source = path.join(parent, release.name, ".env.local");
    if (!fs.existsSync(source)) continue;
    // Require both keys in the source file itself, not inherited variables.
    const values = readEnv(source);
    if (required.some((name) => !values.get(name))) continue;
    try {
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
      console.log(`Recovered .env.local from ${release.name}. Values are hidden.`);
      console.log("Local-only file: .gitignore excludes it from GitHub.");
      process.exit(0);
    } catch (error) {
      console.error(`[ERROR] Could not copy .env.local: ${error.message}`);
      process.exit(1);
    }
  }
}

console.error("[ERROR] Supabase settings were not found in this release or older sibling releases.");
console.error("Copy .env.local from your last working FC Edinet folder into this folder.");
console.error("Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
console.error("Do not paste private keys into chat or commit .env.local to GitHub.");
process.exit(1);
