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
for (const route of ["/team","/club/about","/club/history","/club/stadium","/club/leadership","/club/achievements","/club/archive","/club/hall-of-fame"]) {
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

ok("team root is squad page", read("app/team/page.tsx").includes("positionOrder"));
ok("team squad page exists", exists("app/team/page.tsx"));
ok("team staff is first-class public route", exists("app/staff/page.tsx") && read("app/staff/page.tsx").includes('from("team_staff")') && read("lib/site-navigation.ts").includes('href: "/staff"'));
ok("legacy team squad redirects", read("app/team/squad/page.tsx").includes('redirect("/team")'));
ok("legacy team staff redirects", read("app/team/staff/page.tsx").includes('redirect("/staff")'));
ok("team legacy staff query redirects", read("app/team/page.tsx").includes('redirect("/staff")'));
ok("legacy roster filter removed", !exists("app/components/TeamRosterBrowser.tsx"));
ok("managed navigation has one canonical CSS block", (read("app/globals.css").match(/^\.globalHeader \.menu \.managedMenuDropdown\{/gm) || []).length === 1);
ok("managed navigation matches header palette", read("app/globals.css").includes("background:#052b5d"));
ok("managed navigation uses visible hamburger glyph", read("app/components/HeaderNavClient.tsx").includes('>☰</span>'));
ok("dropdown rendered through body portal", read("app/components/HeaderNavClient.tsx").includes("createPortal") && read("app/globals.css").includes("managedMenuDropdownPortal"));
ok("desktop nav centered with balanced grid", read("app/globals.css").includes("grid-template-columns:minmax(250px,1fr) auto minmax(250px,1fr)"));
ok("desktop menu blocks equal width", read("app/globals.css").includes(".globalHeader .menu>a,.globalHeader .menu>.managedMenuGroup"));
ok("dropdown hover uses mouse events", read("app/components/HeaderNavClient.tsx").includes("onMouseEnter") && !read("app/components/HeaderNavClient.tsx").includes("onPointerEnter"));
ok("season migration exists", exists("database/059_navigation_season_2627.sql"));
ok("season contains calendar statistics standings", ["system_key='matches'","system_key='statistics'","system_key='standings'"].every((x) => read("database/059_navigation_season_2627.sql").includes(x)));
ok("fallback nav uses season label", read("lib/i18n.ts").includes('team: "Сезон 26/27"'));
ok("canonical managed-menu fallback exists", exists("lib/site-navigation.ts") && read("lib/site-navigation.ts").includes("canonicalPublicMenu"));
ok("header rejects broken flat managed menu", read("app/components/SiteHeader.tsx").includes("hasCanonicalMenuHierarchy") && read("app/components/SiteHeader.tsx").includes("canonicalPublicMenu"));
ok("header always supplies managed hierarchy", read("app/components/SiteHeader.tsx").includes("managedMenu={managedMenu}"));
ok("public menu RLS migration exists", exists("database/060_fix_public_site_menu_rls.sql") && read("database/060_fix_public_site_menu_rls.sql").includes('to anon') && !read("database/060_fix_public_site_menu_rls.sql").includes('to anon,authenticated'));
ok("public custom pages RLS migration exists", exists("database/061_fix_public_custom_pages_rls.sql") && read("database/061_fix_public_custom_pages_rls.sql").includes('to anon'));
ok("API version cache disabled", read("app/api/version/route.ts").includes('Vercel-CDN-Cache-Control') && read("app/api/version/route.ts").includes('revalidate = 0'));
ok("API version display field exists", read("app/api/version/route.ts").includes('apiVersion:') && read("app/admin/diagnostics/page.tsx").includes('API v2.28.4'));
ok("Site Builder exposes squad and staff", read("app/admin/site-builder/page.tsx").includes('key:"team_squad"') && read("app/admin/site-builder/page.tsx").includes('key:"team_staff"'));
ok("legacy public hero wrapper removed", !read("app/components/PageHeroShell.tsx").includes("managedPageHeroInner") && !read("app/components/PageHeroShell.tsx").includes("heroBuilderContent"));
ok("staff route restore migration exists", exists("database/063_restore_staff_route.sql") && read("database/063_restore_staff_route.sql").includes("href = '/staff'"));

ok("internal page heroes render without background media", !read("app/components/PageHeroShell.tsx").includes("managedPageHeroMedia") && !read("app/components/ManagedPageCanvas.tsx").includes("proManagedHeroMedia"));
ok("club hero no longer renders background image", !read("app/components/ClubSectionShell.tsx").includes("backgroundImage"));
ok("menu separators removed", read("app/globals.css").includes("v2.28.4 — final clean public header") && read("app/globals.css").includes("border-left:0!important"));
ok("menu yellow underlines removed", read("app/globals.css").includes(".globalHeader .menu a:after") && read("app/globals.css").includes("content:none!important"));
ok("sitemap includes staff", read("app/sitemap.ts").includes('route(base, "/staff"'));
ok("release version", JSON.parse(read("package.json")).version === "2.28.4");

const failed = checks.filter((x) => !x.ok);
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
