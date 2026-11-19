import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performancePriorities } from "../lib/rum-report.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const check = (name, predicate) => {
  try { predicate(); console.log("PASS", name); return true; }
  catch (error) { console.error("FAIL", name, error.message); return false; }
};
const checks = [];
const add = (name, predicate) => checks.push(check(name, predicate));
const row = (metric, value, device = "mobile", route_key = "/", id = 0) =>
  ({ metric, value, device_type: device, route_key, recorded_at: `2026-11-19T10:00:${String(id%60).padStart(2, "0")}Z` });
const repeat = (metric, value, count, device="mobile",route="/") =>
  Array.from({length: count},(_,i)=>row(metric,value,device,route,i));

add("release and install instructions are synchronized", () => {
  assert.equal(JSON.parse(read("package.json")).version,"2.30.26");
  assert.match(read("lib/release.ts"), /RELEASE_VERSION = "2\.30\.26"/);
  assert.deepEqual(fs.readdirSync(root).filter(x => /^STEP-.*\.txt$/.test(x)), ["STEP-2.30.26.txt"]);
});
add("priority groups are separated by device and route", () => {
  const input = [...repeat("LCP",3200,20,"mobile","/"),...repeat("LCP",3600,20,"desktop","/"),...repeat("CLS",.3,15,"mobile","/team/:slug")];
  const output = performancePriorities(input);
  assert.equal(output.length,3);
  assert.equal(output.find(x=>x.metric==="LCP"&&x.device==="mobile").p75,3200);
  assert.equal(output.find(x=>x.metric==="LCP"&&x.device==="desktop").p75,3600);
  assert.equal(output.find(x=>x.metric==="CLS").route,"/team/:slug");
});
add("small samples are never ranked as bad", () => {
  assert.deepEqual(performancePriorities(repeat("LCP",12000,9)),[]);
  assert.equal(performancePriorities(repeat("LCP",12000,10))[0].count,10);
});
add("p75 is not the mean and thresholds are metric specific", () => {
  const values=[...repeat("LCP",2200,9),...repeat("LCP",6000,3)];
  const result=performancePriorities(values);
  assert.equal(result.length,1);
  assert.ok(result[0].p75 > 2500);
  assert.ok(result[0].p75 < 6000);
  assert.equal(result[0].severity,"needs-improvement");
  assert.deepEqual(performancePriorities(repeat("INP",120,30)),[]);
  assert.deepEqual(performancePriorities(repeat("CLS",.05,30)),[]);
});
add("non-metric events, invalid and personal routes cannot affect ranking", () => {
  const input=[...repeat("LCP",2900,10),...repeat("JS_ERROR",1,10),...repeat("LCP",12000,25,"mobile","/account/settings"),...repeat("LCP",12000,10,"unknown","/")];
  const priorities=performancePriorities(input);
  assert.equal(priorities.length,1);
  assert.equal(priorities[0].route,"/");
});
add("metric priority sorting uses severity, not only sample count", () => {
  const input=[...repeat("LCP",3000,40,"mobile","/"),...repeat("LCP",5000,10,"mobile","/news")];
  const priorities=performancePriorities(input);
  assert.equal(priorities[0].route,"/news");
  assert.equal(priorities[0].severity,"poor");
});
add("optimization keeps safe image hosts and art direction", () => {
  const hero=read("app/components/ResponsiveHeroImage.tsx");
  assert.match(hero,/getImageProps/);
  assert.match(hero,/isOptimizablePublicImage/);
  assert.match(hero,/sizes: "100vw"/);
  assert.match(hero, /media="\(max-width: 680px\)"/);
  assert.match(hero, /media="\(max-width: 980px\)"/);
  assert.match(hero, /fetchPriority: "high"/);
  assert.doesNotMatch(hero,/dangerouslySetInnerHTML/);
  assert.match(read("app/page.tsx"), /<ResponsiveHeroImage/);
  assert.match(read("app/page.tsx"), /desktop=\{heroBaseImage\}/);
  assert.match(read("app/globals.css"),/\.fcRefHeroMedia picture img\{object-fit:cover/);
});
add("home still shows pinned lead plus four items without eight-row fetch", () => {
  const home=read("app/page.tsx");
  assert.match(home,/const latestNews = allNews\.filter[\s\S]+?\.slice\(0, 4\)/);
  const feed=home.split('.from("news")')[2]||"";
  assert.match(feed,/\.limit\(5\)/);
});
add("admin diagnosis is admin-only, uses anonymous samples and names data limits", () => {
  const page=read("app/admin/diagnostics/performance/page.tsx");
  assert.match(page,/await requireAdmin\(\)/);
  assert.match(page,/performancePriorities\(filteredRows\)/);
  assert.match(page,/минимум 10 измерениями/);
  assert.match(page,/aria-label="Приоритеты оптимизации"/);
  assert.doesNotMatch(page,/select\("\*"\)/);
  assert.match(read("app/admin/layout.tsx"),/admin-performance-v23023\.css/);
  assert.doesNotMatch(read("app/layout.tsx"),/admin-performance-v23023\.css/);
});
add("QA is integrated into local release, deployment, and CI", () => {
  const scripts=JSON.parse(read("package.json")).scripts;
  assert.match(scripts["qa:all"],/qa:performance-23/);
  assert.match(scripts["deploy:check"],/qa:performance-23/);
  assert.match(read(".github/workflows/responsive-qa.yml"),/qa-real-performance-v2323\.mjs/);
});

console.log(`\nReal performance v2.30.26: ${checks.filter(Boolean).length}/${checks.length} passed.`);
if (checks.some(x=>!x)) process.exitCode=1;
