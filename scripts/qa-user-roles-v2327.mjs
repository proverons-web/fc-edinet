import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canEditPublicPath, safePublicEditPath } from "../lib/admin-role-permissions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
const source = read("app/admin/users/actions.ts");
const adminPage = read("app/admin/users/page.tsx");
const policies = read("database/085_admin_editor_role_boundaries.sql");
const nav = read("app/components/AdminShellClient.tsx");
const editRoute = read("app/admin/edit/page.tsx");

check("Version is 2.30.27", () => assert.equal(JSON.parse(read("package.json")).version, "2.30.27"));
check("Admin account creation requires a verified administrator", () => {
  const section = source.slice(source.indexOf("export async function createAdminUser"), source.indexOf("export async function updateUserRole"));
  assert.match(section, /await requireAdmin\(\)/);
  assert.match(section, /!isSupabaseAdminConfigured\(\)/);
  assert.match(section, /admin\.auth\.admin\.createUser/);
  assert.doesNotMatch(section, /auth\.signUp|createIsolatedSignupClient/);
});
check("Admin-only server key never reaches browser", () => {
  const file = read("lib/supabase/admin.ts");
  assert.match(file, /process\.env\.SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(file, /process\.env\.NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
  assert.match(adminPage, /adminAuthReady &&/);
});
check("Created user profile gets assigned requested role", () => {
  const section = source.slice(source.indexOf("export async function createAdminUser"), source.indexOf("export async function updateUserRole"));
  assert.match(section, /role: requestedRole/);
  assert.match(section, /admin\.auth\.admin\.deleteUser\(newUserId\)/);
  assert.match(section, /email_confirm: true/);
});
check("Admin role retains complete navigation", () => {
  for (const target of ["/admin/users", "/admin/audit", "/admin/diagnostics", "/admin/site-builder"]) assert.ok(nav.includes(target));
});
check("Editor navigation contains only granted sections", () => {
  const granted = ["/admin/news", "/admin/media", "/admin/comments", "/admin/players", "/admin/staff", "/admin/matches", "/admin/matches/competitions", "/admin/match-center", "/admin/standings"];
  for (const path of granted) assert.match(nav, new RegExp(`href: "${path}"[^\\n]*minRole: "(?:author|editor)"`), path);
});
check("Editor does not see designer, club, analytics, translation tools", () => {
  for (const p of ["/admin/site-builder", "/admin/translations", "/admin/statistics", "/admin/club", "/admin/partners", "/admin/site-analytics"]) {
    assert.ok(nav.split("\n").some((s) => s.includes(`href: "${p}"`) && s.includes('minRole: "admin"')), p);
  }
});
check("Restricted admin-only route layouts check the server-side role", () => {
  for (const dir of ["club","design","home","page-builder","site-builder","partners","statistics","translations","site-analytics","data-integrity","diagnostics","audit","users"]) {
    assert.match(read(`app/admin/${dir}/layout.tsx`), /await requireAdmin\(\)/);
  }
});
check("Restricted server actions independently require admin", () => {
  for (const dir of ["club/actions.ts", "club/archive/actions.ts", "club/hall-of-fame/actions.ts", "club/history/actions.ts", "design/actions.ts", "design/global-actions.ts", "home/actions.ts", "page-builder/[pageKey]/actions.ts", "page-builder/club/actions.ts", "site-builder/actions.ts", "partners/actions.ts", "statistics/actions.ts", "statistics/[matchId]/actions.ts", "translations/actions.ts"]) {
    const body = read(`app/admin/${dir}`);
    assert.match(body, /requireAdmin\(/, dir);
    assert.doesNotMatch(body, /requireEditor\(/, dir);
  }
});
check("Authors only see their news and cannot edit others", () => {
  assert.match(read("app/admin/news/page.tsx"), /profile\.role === "author"\) query = query\.eq\("created_by", userId\)/);
  assert.match(read("app/admin/news/[id]/edit/page.tsx"), /article\.created_by !== userId\) notFound\(\)/);
});
check("Only administrator gets sitewide and system shortcuts", () => {
  for(const route of ["/", "/club/about", "/partners", "/academy", "/statistics"]){
    assert.equal(canEditPublicPath("admin",route),true,route);
    assert.equal(canEditPublicPath("editor",route),false,route);
  }
});
check("Editors get shortcuts to their approved public sections", () => {
  for(const route of ["/news", "/news/slug", "/media/gallery", "/team/defender", "/matches/17", "/standings", "/staff"]){
    assert.equal(canEditPublicPath("editor",route),true,route);
  }
});
check("Fans and authors never get edit shortcut", () => {
  for(const role of ["fan","author"])for(const route of ["/news/slug","/matches","/"])assert.equal(canEditPublicPath(role,route),false);
});
check("Untrusted external and malformed paths are rejected", () => {
  for(const url of ["//attacker.test", "https://attacker.test", "/news/../admin", "/news/abc?to=evil", "/news/a#hash", "\\bad", 2])assert.equal(safePublicEditPath(url),null);
  assert.equal(safePublicEditPath("/news/club-match"),"/news/club-match");
});
check("On-site pencil does not grant write privileges", () => {
  const code=read("app/components/EditOnSite.tsx");
  assert.match(code, /canEditPublicPath\(role, pathname\)/);
  assert.match(code, /\/admin\/edit\?from=/);
  assert.match(read("app/components/SiteHeader.tsx"), /<EditOnSite role=\{profile\?\.role/);
});
check("Edit redirect requires editor, validates source, and uses database IDs", () => {
  assert.match(editRoute,/await requireEditor\(\)/);
  assert.match(editRoute,/safePublicEditPath/);
  assert.match(editRoute,/canEditPublicPath/);
  assert.match(editRoute,/\.eq\("slug", decodeURIComponent\(slug\)\)/);
  assert.doesNotMatch(editRoute,/redirect\(from\)/);
});
check("RLS remains enabled and limits site-wide writes to admin", () => {
  assert.match(policies,/AS RESTRICTIVE FOR INSERT TO authenticated/);
  assert.match(policies,/AS RESTRICTIVE FOR UPDATE TO authenticated/);
  assert.match(policies,/AS RESTRICTIVE FOR DELETE TO authenticated/);
  assert.match(policies,/public\.current_user_role\(\)/);
});
check("Protection of last administrator is enforced by database", () => {
  assert.match(policies,/protect_last_fc_admin/);
  assert.match(policies,/BEFORE UPDATE OF role OR DELETE ON public\.profiles/);
  assert.match(policies,/pg_advisory_xact_lock/);
});
check("Existing roles remain unchanged and old data is not deleted", () => {
  assert.doesNotMatch(policies, /TRUNCATE|DROP TABLE|UPDATE public\.profiles SET role/i);
  assert.match(read("lib/types.ts"),/"fan" \| "author" \| "editor" \| "admin"/);
});
check("CI and installer run new role checks", () => {
  const scripts=JSON.parse(read("package.json")).scripts;
  assert.match(scripts["qa:all"], /qa:user-roles/);
  assert.match(scripts["deploy:check"], /qa:user-roles/);
  assert.match(read(".github/workflows/responsive-qa.yml"), /qa:user-roles/);
});
console.log(`\nFC Edinet Role Access v2.30.27: ${passed}/${passed+failed} checks passed.`);
if (failed) process.exitCode=1;
