import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Release guards for v2.29.1: no Supabase credentials or live DB access.
// These are source contracts, NOT an LCP/INP production benchmark.
const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
function check(label, fn) {
  try { fn(); checks.push({ label, pass: true }); console.log(`PASS  ${label}`); }
  catch (error) { checks.push({ label, pass: false }); console.error(`FAIL  ${label}: ${error.message}`); }
}
const home = read("app/page.tsx");
const news = read("app/news/page.tsx");
const detail = read("app/news/[slug]/page.tsx");
const component = read("app/components/PublicImage.tsx");
const imageConfig = read("next.config.ts");
const globalDesign = read("lib/site-global-designs.ts");
const globalActions = read("app/admin/design/global-actions.ts");
const listQueries = (source) => [...source.matchAll(/\.from\("news"\)\s*\.select\(`([\s\S]*?)`\)/g)].map(x => x[1]);

check("Homepage excludes news article bodies from list and pinned queries", () => {
  const queries = listQueries(home);
  assert.equal(queries.length, 2);
  for(const columns of queries) assert.ok(!/(^|,)\s*content(?:_ro)?\b/m.test(columns), "Full article body requested");
});
check("News archive excludes full article bodies", () => {
  const queries = listQueries(news);
  assert.equal(queries.length, 1);
  assert.ok(!/(^|,)\s*content(?:_ro)?\b/m.test(queries[0]));
});
check("Full article is still loaded by the news detail route", () => {
  assert.match(detail, /const getArticle[\s\S]*?content,content_ro,cover_image_url/);
  const related = detail.split('const relatedPromise =')[1].split('const commentsPromise =')[0];
  assert.ok(!/content,content_ro/.test(related), "Related article previews requested full text");
});
check("Homepage uses one finished matches request with last match reused", () => {
  assert.equal((home.match(/\.eq\("status",\s*"finished"\)/g)||[]).length,1);
  assert.ok(home.includes("recentMatchesResult.data?.[0]"));
});
check("Homepage player fetch uses only display fields and four records", () => {
  const snippet = home.split('.from("players")')[1].split('.from("news")')[0];
  assert.ok(snippet.includes('select("id,first_name,last_name,slug,shirt_number,position,photo_url")'));
  assert.match(snippet, /\.limit\(4\)/);
});
check("Homepage secondary feeds no longer fetch unused columns", () => {
  for(const table of ["partners", "media_albums", "media_videos"]) {
    const snippet=home.split(`.from("${table}")`)[1]?.slice(0,240);
    assert.ok(snippet?.includes('.select("'),`${table}: missing select`);
    assert.ok(!snippet.includes('.select("*")'), `${table}: selects all fields`);
  }
});
check("Image optimizer allows only club public Supabase storage", () => {
  assert.match(imageConfig,/hostname: trustedSupabaseImageHost/);
  assert.match(imageConfig,/pathname: "\/storage\/v1\/object\/public\/\*\*"/);
  assert.ok(!imageConfig.includes("hostname: '**'"));
  assert.ok(!imageConfig.includes('hostname: "**"'));
});
check("Unknown or third-party image URLs fall back to native img", () => {
  assert.match(component,/actual\.host === trusted\.host/);
  assert.match(component,/actual\.pathname\.startsWith\("\/storage\/v1\/object\/public\/"\)/);
  assert.match(component,/return <img[\s\S]*decoding="async"/);
});
check("Optimized images declare dimensions and responsive sizes", () => {
  assert.match(component,/<Image[\s\S]*width=\{width\}[\s\S]*height=\{height\}[\s\S]*sizes=\{sizes\}/);
  for(const f of ["app/page.tsx","app/news/page.tsx","app/news/[slug]/page.tsx","app/components/NewsCard.tsx","app/components/PlayerCard.tsx","app/team/[slug]/page.tsx"]) {
    assert.ok(read(f).includes("<PublicImage"),`${f}: optimized image missing`);
  }
});
check("Global design short-cache and publish invalidation are linked", () => {
  assert.match(globalDesign,/unstable_cache/);
  assert.match(globalDesign,/revalidate: 30, tags: \["fce-public-global-designs"\]/);
  assert.match(globalActions,/updateTag\("fce-public-global-designs"\)/);
  assert.match(globalActions,/if \(intent === "draft"\)/);
});

const failed = checks.filter(x=>!x.pass).length;
console.log(`\n${checks.length-failed}/${checks.length} performance source contracts passed.`);
if(failed) process.exit(1);
