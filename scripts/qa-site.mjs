import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const ok = (name, condition, detail = "") => checks.push({ name, ok: Boolean(condition), detail });

ok("sitemap exists", exists("app/sitemap.ts"));
ok("robots exists", exists("app/robots.ts"));
ok("404 exists", exists("app/not-found.tsx"));
ok("manifest exists", exists("app/manifest.ts"));
ok("Open Graph image exists", exists("app/opengraph-image.tsx"));
ok("admin noindex", /index:\s*false/.test(read("app/admin/layout.tsx")));
ok("account noindex", /index:\s*false/.test(read("app/account/layout.tsx")));
ok("login noindex", exists("app/login/layout.tsx") && /index:\s*false/.test(read("app/login/layout.tsx")));
ok("register noindex", exists("app/register/layout.tsx") && /index:\s*false/.test(read("app/register/layout.tsx")));
const sitemap = read("app/sitemap.ts");
for (const route of ["/club/about","/club/history","/club/stadium","/club/leadership","/club/achievements","/club/archive","/club/hall-of-fame"]) {
  ok(`sitemap ${route}`, sitemap.includes(route));
}
ok("custom pages in sitemap", sitemap.includes("site_custom_pages"));
ok("robots blocks API", read("app/robots.ts").includes('"/api/"'));
ok("security headers configured", read("next.config.ts").includes("X-Content-Type-Options"));
ok("release version", JSON.parse(read("package.json")).version === "2.26.0");

const failed = checks.filter((x) => !x.ok);
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
