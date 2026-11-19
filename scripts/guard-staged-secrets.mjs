// Production gate: inspect the Git INDEX (not only the working tree) immediately
// before committing / pushing. Exit nonzero without ever printing secret values.
import { execFileSync } from "node:child_process";
import path from "node:path";

const git = (...args) => execFileSync("git", args, {
  encoding: "buffer",
  stdio: ["ignore", "pipe", "pipe"],
  maxBuffer: 16 * 1024 * 1024,
});
const splitPaths = (bytes) => bytes.toString("utf8").split("\0").filter(Boolean);
const suspiciousName = (filename) => {
  const normalized = filename.replaceAll("\\", "/");
  const basename = path.posix.basename(normalized).toLowerCase();
  if (/^\.env(?:\..+)?$/.test(basename) && !/^\.env\.(?:example|sample|template)$/.test(basename)) return true;
  if (/^(?:id_rsa|id_ed25519|credentials\.json|service-account\.json|service_account\.json)$/.test(basename)) return true;
  return /\.(?:pem|p12|pfx|p8|key|keystore|jks)$/i.test(basename);
};
const detectors = [
  { name: "Supabase server secret", pattern: /\bsb_secret_[A-Za-z0-9_-]{16,}\b/ },
  { name: "OpenAI API secret", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: "GitHub token", pattern: /\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{20,}\b/ },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: "Private key material", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/ },
  { name: "npm authentication token", pattern: /(?:^|\n)\s*(?:\/\/[^\s:]+\/?:_authToken|_authToken)\s*=\s*\S+/i },
];

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
  const tracked = splitPaths(git("ls-files", "--cached", "-z"));
  const changed = splitPaths(git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"));
  const issues = [];
  for (const file of tracked) {
    if (suspiciousName(file)) issues.push(`${file}: credential-like filename must not be committed`);
  }
  for (const file of changed) {
    const size = Number(git("cat-file", "-s", `:${file}`).toString("utf8").trim());
    // Text content above this size is not expected in the project. Fail closed
    // instead of silently skipping something that could contain a credential.
    if (size > 12 * 1024 * 1024) {
      issues.push(`${file}: staged file exceeds the 12 MB security scan limit; review it separately`);
      continue;
    }
    const data = git("show", `:${file}`);
    if (data.includes(0)) continue; // binary asset: no text parsing
    const contents = data.toString("utf8");
    for (const detector of detectors) {
      if (detector.pattern.test(contents)) issues.push(`${file}: possible ${detector.name}`);
    }
  }
  if (issues.length) {
    console.error("[SECURITY BLOCK] Potentially sensitive files or credentials in Git staging:");
    for (const issue of issues) console.error(`  - ${issue}`);
    console.error("Remove the sensitive data from the index, then rerun the installer. No credentials were printed.");
    process.exitCode = 1;
  } else {
    console.log(`PASS staged-secret guard: ${tracked.length} tracked filenames; ${changed.length} staged file(s) inspected.`);
  }
} catch (error) {
  console.error(`[SECURITY BLOCK] Could not inspect staged Git content: ${error instanceof Error ? error.message.split("\n")[0] : "unknown error"}`);
  process.exitCode = 1;
}
