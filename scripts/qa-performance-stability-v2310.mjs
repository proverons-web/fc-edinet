import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Source-level regression contracts, not a Lighthouse/Core Web Vitals benchmark.
const root = path.resolve(import.meta.dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const menu = read("lib/site-public-menu.ts");
const header = read("app/components/SiteHeader.tsx");
const footer = read("app/components/SiteFooter.tsx");
const actions = read("app/admin/site-builder/actions.ts");
const config = read("next.config.ts");
const main = read("app/layout.tsx");
const home = read("app/page.tsx");
const pkg = JSON.parse(read("package.json"));
const checks = [];
function check(label, fn) {
  try { fn(); checks.push(true); console.log("PASS", label); }
  catch (err) { checks.push(false); console.error("FAIL", label, err.message); }
}
check("v2.30.14 release and canonical version agree", () => {
  assert.equal(pkg.version, "2.30.14");
  assert.match(read("lib/release.ts"), /RELEASE_VERSION = "2\.30\.14"/);
  assert.deepEqual(fs.readdirSync(root).filter(n => /^STEP-.*\.txt$/.test(n)), ["STEP-2.30.14.txt"]);
});
check("Public menu comes from cookie-free public client", () => {
  assert.match(menu, /createPublicClient\(\)/);
  assert.doesNotMatch(menu, /cookies\(|headers\(|supabase\/server/);
  assert.match(read("lib/supabase/public.ts"), /persistSession: false/);
});
check("Public menu uses a bounded 60s server cache", () => {
  assert.match(menu, /unstable_cache\(/);
  assert.match(menu, /revalidate: 60, tags: \["fce-public-site-menu"\]/);
  assert.match(menu, /cache\(loadPublicSiteMenu\)/);
});
check("Public menu retrieves only needed display columns", () => {
  assert.match(menu, /\.select\("id,system_key,label_ru,label_ro,href,visible,display_order,parent_id,custom_page_id"\)/);
  assert.doesNotMatch(menu, /\.select\("\*"\)/);
});
check("Only visible public menu entries are fetched in stable order", () => {
  assert.match(menu, /\.eq\("visible", true\)/);
  assert.match(menu, /\.order\("display_order"\)/);
  assert.match(menu, /\.order\("id"\)/);
});
check("Fallback navigation survives network and hierarchy errors", () => {
  assert.match(menu, /if \(error\) return canonicalPublicMenu/);
  assert.match(menu, /hasCanonicalMenuHierarchy\(menu\) \? menu : canonicalPublicMenu/);
  assert.match(menu, /catch \{/);
  assert.match(menu, /normalizeCanonicalMenuRoutes/);
});
check("The header reads the shared menu, not a new PostgREST request", () => {
  assert.match(header, /getPublicSiteMenu\(\)/);
  assert.doesNotMatch(header, /\.from\("site_menu_items"\)/);
});
check("Authentication stays per-request and outside the public cache", () => {
  assert.match(header, /supabase\.auth\.getClaims\(\)/);
  assert.match(header, /\.from\("profiles"\)/);
  assert.doesNotMatch(menu, /getClaims|\.from\("profiles"\)/);
});
check("Every menu-changing server action invalidates the public menu tag", () => {
  const tagCalls = (actions.match(/updateTag\("fce-public-site-menu"\)/g) || []).length;
  const layoutCalls = (actions.match(/revalidatePath\("\/", "layout"\)/g) || []).length;
  assert.equal(tagCalls, 7);
  assert.equal(tagCalls, layoutCalls);
  assert.match(actions, /import \{ revalidatePath, updateTag \} from "next\/cache"/);
});
check("Menu mutations are editor-protected before tag invalidation", () => {
  assert.equal((actions.match(/await requireEditor\(\)/g) || []).length, 7);
});
check("Footer counters are cached for 60 seconds", () => {
  assert.match(footer, /unstable_cache\(async \(\): Promise<VisitCounts \| null>/);
  assert.match(footer, /\["fce-public-visit-counts-v1"\], \{ revalidate: 60 \}/);
});
check("Footer counters remain public and not session-specific", () => {
  assert.match(footer, /const supabase = createPublicClient\(\)/);
  assert.match(footer, /supabase\.rpc\("get_public_visit_counts"\)/);
  assert.doesNotMatch(footer, /auth\.getUser|auth\.getClaims/);
});
check("Footer errors do not become false zeros", () => {
  assert.match(footer, /if \(error\) return null/);
  assert.match(footer, /catch \{\s*return null/);
});
check("Footer retains all three time windows", () => {
  for (const window of ["unique_24h", "unique_7d", "unique_30d"]) assert.ok(footer.includes(window), window);
});
check("Unversioned brand assets are not cached forever", () => {
  assert.match(config, /source: "\/brand\/:path\*"/);
  assert.match(config, /max-age=3600, must-revalidate/);
  assert.doesNotMatch(config, /max-age=31536000, immutable/);
});
check("Global CSS import order and responsive policies unchanged", () => {
  for (const name of ["globals.css", "visual-polish.css", "home-v215.css", "mobile.css"]) assert.match(main, new RegExp(`import "\\./${name.replaceAll(".", "\\.")}"`));
  assert.match(read("app/mobile.css"), /@media \(max-width:767px\)/);
});
check("New stability QA is wired into deploy, developer scripts and CI", () => {
  assert.match(pkg.scripts["deploy:check"], /qa-performance-stability-v2310\.mjs/);
  assert.match(pkg.scripts["qa:all"], /qa:stability/);
  assert.match(read(".github/workflows/responsive-qa.yml"), /qa-performance-stability-v2310\.mjs/);
});
check("Homepage begins fetching config without serially blocking its feeds", () => {
  assert.match(home, /const homepageConfigPromise = Promise\.all\(\[/);
  assert.match(home, /const pinnedNewsPromise = homepageConfigPromise\.then/);
  assert.match(home, /const \[playersResult, newsResult,[\s\S]+?\] = await Promise\.all\(\[/);
  const firstWait = home.indexOf("const [playersResult, newsResult");
  const configWait = home.indexOf("const [heroResult, settingsResult, sectionsResult] = await homepageConfigPromise;");
  assert.ok(firstWait >= 0 && configWait > firstWait, "Feeds must be started before config is awaited separately");
});
check("Pinned news returns a consistent Promise value for TypeScript", () => {
  assert.match(home, /homepageConfigPromise\.then\(async \(\[, settingsResult\]\) =>/);
  assert.match(home, /if \(!\(cfg\?\.show_pinned_news && cfg\.pinned_news_id\)\) return null/);
  assert.match(home, /return error \? null : data/);
  assert.match(home, /const pinnedNews = pinnedNewsResult as unknown as NewsListArticle \| null/);
  assert.doesNotMatch(home, /Promise\.resolve\(\{ data: null, error: null \}\)/);
  assert.doesNotMatch(home, /pinnedNewsResult\.data/);
});
check("Pinned article query still respects its editorial toggle", () => {
  assert.match(home, /cfg\?\.show_pinned_news && cfg\.pinned_news_id/);
  assert.match(home, /\.eq\("id", cfg\.pinned_news_id\)/);
  assert.match(home, /\.eq\("status", "published"\)/);
});
check("Homepage preserves safe hero and section fallbacks", () => {
  assert.match(home, /const settings = settingsResult\.data as HomepageSettings \| null/);
  assert.match(home, /const sectionEnabled = \(key: string\) =>/);
  assert.match(home, /const heroCanvas = repairHomepageCanvas/);
});
check("Stability contracts survive new monitoring migration", () => {
  assert.match(read("STEP-2.30.14.txt"), /SQL-МИГРАЦИИ: ДА/);
  assert.equal(fs.readdirSync(path.join(root,"database")).filter(n => /^078_/.test(n)).length, 1);
});
const passed = checks.filter(Boolean).length;
console.log(`\nPerformance & Stability v2.30.14: ${passed}/${checks.length} source contracts passed (not a speed benchmark).`);
if (passed !== checks.length) process.exitCode = 1;
