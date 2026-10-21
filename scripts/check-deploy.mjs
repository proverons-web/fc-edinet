import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const localEnvPath = path.join(cwd, ".env.local");

function parseEnv(contents) {
  const result = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result.set(key, value);
  }

  return result;
}

const fromFile = fs.existsSync(localEnvPath)
  ? parseEnv(fs.readFileSync(localEnvPath, "utf8"))
  : new Map();

function readValue(name) {
  return process.env[name] || fromFile.get(name) || "";
}

const errors = [];
const warnings = [];

// Static release integrity checks. These run before Next.js starts so a
// broken package is rejected early with a useful message.
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  const versionRoute = fs.readFileSync(path.join(cwd, "app", "api", "version", "route.ts"), "utf8");
  const routeVersion = versionRoute.match(/version:\s*["']([^"']+)["']/)?.[1] || "";

  if (!packageJson.version) {
    errors.push("package.json version is missing.");
  } else if (!routeVersion) {
    errors.push("/api/version does not expose a static version string.");
  } else if (packageJson.version !== routeVersion) {
    errors.push(`Version mismatch: package.json=${packageJson.version}, /api/version=${routeVersion}.`);
  }
} catch (error) {
  errors.push(`Release metadata check failed: ${error instanceof Error ? error.message : String(error)}`);
}

// Admin diagnostics must ship with the release and report the same app version.
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  const diagnosticsSource = fs.readFileSync(path.join(cwd, "app", "admin", "diagnostics", "page.tsx"), "utf8");
  const diagnosticsVersion = diagnosticsSource.match(/const APP_VERSION = ["']([^"']+)["']/)?.[1] || "";
  if (!diagnosticsVersion) {
    errors.push("/admin/diagnostics does not expose APP_VERSION.");
  } else if (diagnosticsVersion !== packageJson.version) {
    errors.push(`Diagnostics version mismatch: package.json=${packageJson.version}, diagnostics=${diagnosticsVersion}.`);
  }
  // Runtime diagnostics must never inspect the repository filesystem. With
  // Next.js/Turbopack a dynamic process.cwd() + fs access can trace the entire
  // project into the server bundle and fail deployment size/static analysis.
  if (/from\s+["']node:fs["']|from\s+["']node:path["']|\bfs\.(?:existsSync|readFileSync|readdirSync)\b|\bprocess\.cwd\s*\(/.test(diagnosticsSource)) {
    errors.push("/admin/diagnostics contains runtime filesystem access. Move release-file checks to scripts/check-deploy.mjs.");
  }
} catch (error) {
  errors.push(`Admin diagnostics check failed: ${error instanceof Error ? error.message : String(error)}`);
}

const officialCrestPath = path.join(cwd, "public", "brand", "fc-edinet-crest.png");
if (!fs.existsSync(officialCrestPath)) {
  errors.push("Official crest is missing: public/brand/fc-edinet-crest.png");
}

for (const requiredSeoFile of ["app/sitemap.ts", "app/robots.ts", "app/opengraph-image.tsx"]) {
  if (!fs.existsSync(path.join(cwd, requiredSeoFile))) {
    errors.push(`SEO release file is missing: ${requiredSeoFile}`);
  }
}

// RU/RO release integrity: auth actions must receive the active locale so
// validation errors cannot silently fall back to Russian on the RO site.
for (const authPair of [
  ["app/components/LoginForm.tsx", "app/login/actions.ts"],
  ["app/components/RegisterForm.tsx", "app/register/actions.ts"],
]) {
  const [formFile, actionFile] = authPair;
  const formSource = fs.readFileSync(path.join(cwd, formFile), "utf8");
  const actionSource = fs.readFileSync(path.join(cwd, actionFile), "utf8");
  if (!/name=["']locale["']/.test(formSource)) {
    errors.push(`Locale field is missing from ${formFile}.`);
  }
  if (!/formData\.get\(["']locale["']\)/.test(actionSource)) {
    errors.push(`Localized auth action does not read locale: ${actionFile}.`);
  }
}


// Client-boundary hygiene: keep the full public translation dictionary out of
// hydrated components. Passing small string subsets from server components
// prevents an accidental site-wide i18n payload from entering public JS bundles.
function walkSource(dir) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkSource(full));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const file of walkSource(path.join(cwd, "app"))) {
  const source = fs.readFileSync(file, "utf8");
  const isClient = /^\s*["']use client["'];?/m.test(source.slice(0, 160));
  if (!isClient) continue;
  if (/import\s*\{[^}]*\bpublicText\b[^}]*\}\s*from\s*["']@\/lib\/i18n["']/.test(source)) {
    warnings.push(`Client component imports full publicText dictionary: ${path.relative(cwd, file)}. Pass localized labels from a server component instead.`);
  }
  if (/\bdebugger\s*;/.test(source)) {
    errors.push(`Debugger statement found in client component: ${path.relative(cwd, file)}.`);
  }
}

const supabaseUrl = readValue("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = readValue(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
);
const siteUrl = readValue("NEXT_PUBLIC_SITE_URL");
const openaiKey = readValue("OPENAI_API_KEY");
const translationModel = readValue("OPENAI_TRANSLATION_MODEL") || "gpt-5.6-luna";
const supabaseAdminSecret = readValue("SUPABASE_SECRET_KEY") || readValue("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl) {
  errors.push("NEXT_PUBLIC_SUPABASE_URL is missing.");
} else {
  try {
    const parsed = new URL(supabaseUrl);

    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".supabase.co")
    ) {
      warnings.push(
        "NEXT_PUBLIC_SUPABASE_URL does not look like a hosted Supabase URL."
      );
    }
  } catch {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
}

if (!publishableKey) {
  errors.push(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing."
  );
} else if (
  !publishableKey.startsWith("sb_publishable_") &&
  publishableKey.split(".").length !== 3
) {
  warnings.push(
    "Supabase key does not look like a publishable key or legacy anon JWT."
  );
}

if (!openaiKey) {
  warnings.push(
    "OPENAI_API_KEY is not set. Site will work, but automatic RU -> RO translation will be disabled."
  );
}

if (!supabaseAdminSecret) {
  warnings.push(
    "SUPABASE_SECRET_KEY is not set. Admin user creation will use the email-confirmation fallback and user blocking will be disabled."
  );
}

if (!siteUrl) {
  warnings.push(
    "NEXT_PUBLIC_SITE_URL is not set. Vercel URL fallback will be used."
  );
} else {
  try {
    const parsed = new URL(siteUrl);

    if (
      parsed.hostname !== "localhost" &&
      parsed.protocol !== "https:"
    ) {
      errors.push(
        "Production NEXT_PUBLIC_SITE_URL must use https://."
      );
    }
  } catch {
    errors.push("NEXT_PUBLIC_SITE_URL is not a valid URL.");
  }
}

const forbiddenPublicNames = [
  "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
];

for (const name of forbiddenPublicNames) {
  if (readValue(name)) {
    errors.push(
      `${name} must never be exposed with NEXT_PUBLIC_.`
    );
  }
}

console.log("");
console.log("FC Edineț — deploy check");
try { console.log(`Release version: ${JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")).version || "unknown"}`); } catch {}
console.log("------------------------");
console.log(
  `Supabase URL: ${supabaseUrl ? "configured" : "missing"}`
);
console.log(
  `Publishable key: ${publishableKey ? "configured" : "missing"}`
);
console.log(
  `Site URL: ${siteUrl || "automatic Vercel fallback"}`
);
console.log(
  `RU -> RO translation: ${openaiKey ? `configured (${translationModel})` : "disabled"}`
);
console.log(
  `Admin user management: ${supabaseAdminSecret ? "full (server secret configured)" : "fallback mode"}`
);

if (warnings.length > 0) {
  console.log("");
  console.log("Warnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (errors.length > 0) {
  console.error("");
  console.error("Deploy check FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("");
console.log("Environment check OK.");
console.log("Next.js production build will run now.");
console.log("");
