import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const ok = (name, condition, detail = "") => checks.push({ name, ok: Boolean(condition), detail });

function walk(dir, extensions = null) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(file, extensions));
    else if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) out.push(file);
  }
  return out;
}

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

// Final Product QA hardening.
ok("cookie-free public Supabase client", exists("lib/supabase/public.ts") && read("lib/supabase/public.ts").includes("persistSession: false"));
ok("public menu isolated from auth cookies", read("app/components/SiteHeader.tsx").includes('publicSupabase.from("site_menu_items")'));
ok("global public design isolated from auth cookies", read("lib/site-global-designs.ts").includes("createPublicClient"));
ok("homepage public data isolated from auth cookies", read("app/page.tsx").includes("createPublicClient"));
ok("stale auth 401 clears session cookies", /status === 401/.test(read("lib/supabase/proxy.ts")));
ok("admin dashboard requires staff before profile use", read("app/admin/page.tsx").includes("await requireStaff()"));
ok("custom pages protect reserved slugs", read("app/admin/site-builder/actions.ts").includes("isReservedSiteSlug"));
ok("managed menu validates href", read("app/admin/site-builder/actions.ts").includes("normalizeSiteMenuHref"));
ok("club system preview uses canonical route", read("app/admin/site-builder/page.tsx").includes('preview:"/club/about"'));
ok("legacy header club link uses canonical route", read("app/components/HeaderNavClient.tsx").includes('club: { href: "/club/about"'));

const unifiedBuilder = read("app/components/UnifiedSiteBuilderClient.tsx");
const unsafeUiButtons = [...unifiedBuilder.matchAll(/<button\b([^>]*)\bonClick=/g)].filter((match) => !/\btype=/.test(match[1]));
ok("Site Builder UI buttons have explicit type", unsafeUiButtons.length === 0, unsafeUiButtons.length ? `${unsafeUiButtons.length} missing type` : "");

const targetBlankWithoutRel = [];
for (const file of walk(path.join(root, "app"), [".tsx", ".ts"])) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/g)) {
    if (!/\brel=/.test(match[0])) targetBlankWithoutRel.push(path.relative(root, file));
  }
}
ok("target=_blank links declare rel", targetBlankWithoutRel.length === 0, [...new Set(targetBlankWithoutRel)].join(", "));

for (const cssFile of walk(path.join(root, "app"), [".css"])) {
  const css = fs.readFileSync(cssFile, "utf8");
  ok(`CSS braces ${path.relative(root, cssFile)}`, (css.match(/{/g) || []).length === (css.match(/}/g) || []).length);
}

ok("release version", JSON.parse(read("package.json")).version === "2.27.0");

const failed = checks.filter((x) => !x.ok);
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
