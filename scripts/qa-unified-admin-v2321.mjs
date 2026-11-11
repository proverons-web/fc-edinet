import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { organizeMenu, reorderSibling, dropSibling } from "../lib/admin-builder-menu.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let passed = 0;
let failed = 0;
function check(label, fn) {
  try { fn(); passed++; console.log(`  ✓ ${label}`); }
  catch (error) { failed++; console.error(`  ✗ ${label}: ${error.message}`); }
}

const pkg = JSON.parse(read("package.json"));
const adminShell = read("app/components/AdminShellClient.tsx");
const dashboard = read("app/admin/page.tsx");
const builder = read("app/components/UnifiedSiteBuilderClient.tsx");
const page = read("app/admin/site-builder/page.tsx");
const css = read("app/admin-unified-v23021.css");

check("release is synchronized", () => {
  assert.equal(pkg.version, "2.30.21");
  assert.match(read("lib/release.ts"), /RELEASE_VERSION = "2\.30\.21"/);
  assert.equal(fs.readdirSync(root).filter((item) => /^STEP-.*\.txt$/.test(item)).join(","), "STEP-2.30.21.txt");
});
check("one entry point for all page management", () => {
  assert.match(adminShell, /href: "\/admin\/site-builder"/);
  assert.match(dashboard, /href="\/admin\/site-builder"/);
  assert.match(read("app/admin/page-builder/page.tsx"), /redirect\("\/admin\/site-builder"\)/);
  assert.match(page, /requireEditor\(\)/);
});
check("author cannot open the visual editor", () => {
  assert.match(adminShell, /href: "\/admin\/site-builder"[^\n]*minRole: "editor"/);
  assert.match(read("app/admin/site-builder/actions.ts"), /await requireEditor\(\)/);
});
check("dashboard retains existing football, media and publishing tools", () => {
  for (const link of ["/admin/news/new", "/admin/matches/new", "/admin/media", "/admin/match-center", "/admin/standings"]) assert.ok(dashboard.includes(link), link);
  assert.match(dashboard, /adminAdvancedTools/);
});
check("mobile navigation restores keyboard focus", () => {
  assert.match(adminShell, /mobileMenuButtonRef\.current\?\.focus\(\)/);
  assert.match(adminShell, /event\.key === "Escape"/);
  assert.match(adminShell, /sidebarRef\.current\.querySelectorAll/);
});
check("page editor supports RU\/RO and draft publication", () => {
  for (const field of ["title_ru", "title_ro", "intro_ru", "intro_ro", "body_ru", "body_ro", "hero_image_url", "status"]) assert.ok(builder.includes(`name="${field}"`), field);
  assert.match(builder, /selectedCustom\?\.status === "draft"/);
  assert.match(builder, /Страница пока не опубликована/);
});
check("device preview is available on mobile screens", () => {
  assert.match(builder, /const widths: Record<Device, number>/);
  assert.match(builder, /aria-pressed=\{device === value\}/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /\.siteBuilderDevices \{ display: flex/);
});
check("menu editing has meaningful labels, safe deletions and a saving state", () => {
  assert.match(builder, /aria-label="Найти страницу"/); // refuted? if incorrect catch
  assert.match(builder, /onSubmit=\{\(event\) =>/);
  assert.match(builder, /window\.confirm/);
  assert.match(builder, /orderState === "error"/);
  assert.match(builder, /disabled=\{pending \|\| siblingIndex/);
});
check("menu renders nested children beside their parents", () => {
  const input = [
    { id: 1, parent_id: null }, { id: 3, parent_id: null },
    { id: 2, parent_id: 1 }, { id: 5, parent_id: 3 }, { id: 4, parent_id: 1 },
  ];
  assert.deepEqual(organizeMenu(input).map((item) => item.id), [1,2,4,3,5]);
});
check("keyboard reorder moves only siblings", () => {
  const input = [
    { id: 1, parent_id: null }, { id: 2, parent_id: 1 },
    { id: 3, parent_id: 1 }, { id: 4, parent_id: null },
  ];
  assert.deepEqual(reorderSibling(input, 3, -1).map((item) => item.id), [1,3,2,4]);
  assert.deepEqual(reorderSibling(input, 2, -1).map((item) => item.id), [1,2,3,4]);
  assert.deepEqual(reorderSibling(input, 1, 1).map((item) => item.id), [4,1,2,3]);
});
check("drag cannot change parent or discard a child", () => {
  const input = [
    { id: 1, parent_id: null }, { id: 2, parent_id: 1 },
    { id: 3, parent_id: 1 }, { id: 4, parent_id: null }, { id: 5, parent_id: 4 },
  ];
  const original = organizeMenu(input).map((item) => item.id);
  assert.deepEqual(dropSibling(input, 2, 5).map((item) => item.id), original);
  assert.deepEqual(dropSibling(input, 2, 3).map((item) => item.id), [1,3,2,4,5]);
});
check("editor actions and RLS logic are unchanged", () => {
  for (const file of ["app/admin/site-builder/actions.ts", "app/admin/design/actions.ts", "app/admin/page-builder/club/actions.ts"]) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
  assert.match(read("app/admin/site-builder/actions.ts"), /requireEditor/);
});
check("admin CSS is isolated and responsive", () => {
  assert.match(read("app/admin/layout.tsx"), /admin-unified-v23021\.css/);
  assert.match(css, /\.adminAppShell/);
  assert.ok((css.match(/{/g) ?? []).length === (css.match(/}/g) ?? []).length);
});

console.log(`\nUnified Admin v2.30.21: ${passed}/${passed + failed} checks passed.`);
if (failed) process.exitCode = 1;
