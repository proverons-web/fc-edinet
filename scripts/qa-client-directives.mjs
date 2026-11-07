import fs from "node:fs";
import path from "node:path";

// Next.js requires the use-client directive to appear before all imports.
// TypeScript alone does not catch misplaced directives; Turbopack does.
const roots = ["app", "lib", "components"].filter((root) => fs.existsSync(root));
const allowed = new Set([".ts", ".tsx", ".js", ".jsx"]);
let inspected = 0;
const errors = [];

function isValidDirective(source) {
  const directive = /^[\t ]*(["'])use client\1[\t ]*;?[\t ]*$/m;
  const match = directive.exec(source);
  if (!match) return true;
  const before = source.slice(0, match.index)
    .replace(/^\uFEFF/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[\t ]*\/\/[^\r\n]*$/gm, "")
    .trim();
  return before.length === 0;
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", "dist"].includes(entry.name)) walk(absolute);
      continue;
    }
    if (!entry.isFile() || !allowed.has(path.extname(entry.name))) continue;
    inspected++;
    if (!isValidDirective(fs.readFileSync(absolute, "utf8"))) errors.push(absolute);
  }
}

// Self-test the guard to prevent it accidentally becoming a no-op.
if (isValidDirective('import X from "x";\n"use client";\n') ||
    !isValidDirective('// comment\n"use client";\nimport X from "x";\n')) {
  console.error("FAIL use-client directive QA self-test");
  process.exit(1);
}
for (const root of roots) walk(root);
if (errors.length) {
  console.error("FAIL Next.js client directives must precede imports:");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`PASS use-client directives: ${inspected} source files scanned`);
