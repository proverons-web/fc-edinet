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

const supabaseUrl = readValue("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = readValue(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
);
const siteUrl = readValue("NEXT_PUBLIC_SITE_URL");

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
