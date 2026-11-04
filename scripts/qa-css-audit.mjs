import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Baseline guard for the current legacy CSS cascade. We are intentionally not
// removing thousands of historical overrides in a single risky deployment.
// Future increases in !important declarations require an explicit baseline update.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssPaths = ["app/globals.css", "app/visual-polish.css", "app/home-v215.css", "app/mobile.css"];
const baselinePath = path.join(root, "qa/css-baseline.json");
const update = process.argv.includes("--update-baseline");

function info(rel) {
  const file = path.join(root, rel);
  const source = fs.readFileSync(file, "utf8");
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return {
    bytes: Buffer.byteLength(source),
    important: (stripped.match(/!\s*important\b/gi) || []).length,
    mediaQueries: (stripped.match(/@media\b/g) || []).length,
    // A broad estimate for inventory only; complex selectors may span lines.
    ruleOpeners: (stripped.match(/\{/g) || []).length,
  };
}

const actual = Object.fromEntries(cssPaths.map((file) => [file, info(file)]));
const layout = fs.readFileSync(path.join(root,"app/layout.tsx"),"utf8");
const activeImports = [...layout.matchAll(/import ["']\.\/([^"']+\.css)["'];/g)].map((x)=>x[1]);
const duplicates = activeImports.filter((name,i)=>activeImports.indexOf(name)!==i);
const errors=[];
if (duplicates.length) errors.push(`Duplicate CSS imports: ${duplicates.join(", ")}`);
if (activeImports.join(",") !== "globals.css,visual-polish.css,home-v215.css,mobile.css") errors.push("Global CSS import order changed; check breakpoint/cascade effects before release.");
const legacy = fs.readdirSync(path.join(root,"app")).filter((file)=>/^mobile-v2\./.test(file));
if (legacy.length) errors.push(`Versioned mobile stylesheets still exist: ${legacy.join(", ")}`);
const mobile = fs.readFileSync(path.join(root,"app/mobile.css"),"utf8");
if (!mobile.includes("@media (max-width:767px)")) errors.push("Mobile styles have lost the <=767px contract.");
if (/@media\s*\(\s*min-width\s*:\s*(?:768|769|[89]\d\d|\d{4,})px/.test(mobile)) errors.push("Mobile stylesheet now includes tablet/desktop rules.");
if (update) {
  if (errors.length) { errors.forEach((x)=>console.error(`FAIL  ${x}`)); process.exit(1); }
  fs.writeFileSync(baselinePath, JSON.stringify({schema:1, release:JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8")).version, imports:activeImports, css:actual},null,2)+"\n");
  console.log(`Updated CSS baseline: ${path.relative(root,baselinePath)}`);
} else {
  if (!fs.existsSync(baselinePath)) errors.push("CSS baseline missing; run npm run qa:css:baseline after review.");
  else {
    const previous = JSON.parse(fs.readFileSync(baselinePath,"utf8"));
    for (const file of cssPaths) {
      const limit = previous.css?.[file]?.important;
      if (typeof limit !== "number") errors.push(`No baseline for ${file}`);
      else if (actual[file].important > limit) errors.push(`${file}: ${actual[file].important} !important overrides > approved ${limit}. Refactor or review and update baseline.`);
    }
  }
}
console.log("CSS inventory (includes historical legacy CSS; no claim that it is cleaned):");
for (const [file, values] of Object.entries(actual)) {
  console.log(`  ${file}: ${(values.bytes/1024).toFixed(1)} KiB, ${values.important} !important, ${values.mediaQueries} @media`);
}
const totalImportant=Object.values(actual).reduce((n,x)=>n+x.important,0);
console.log(`  TOTAL: ${totalImportant} !important`);
if(errors.length) {errors.forEach((x)=>console.error(`FAIL  ${x}`));process.exit(1);}
console.log("PASS  CSS import order, mobile boundary and override budget");
