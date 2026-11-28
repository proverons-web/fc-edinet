import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { moveBuilderSection, dropBuilderSection } from "../lib/editor-section-order.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let passed = 0;
let failed = 0;
function check(label, fn) {
  try { fn(); ++passed; console.log(`  PASS ${label}`); }
  catch (error) { ++failed; console.error(`  FAIL ${label}: ${error.message}`); }
}
const pro = read("app/components/ProPageBuilder.tsx");
const parent = read("app/components/UnifiedSiteBuilderClient.tsx");
const style = read("app/builder-workspace-v23022.css");
const sample = [{ key: "hero" }, { key: "albums" }, { key: "videos" }, { key: "contact" }];
const keys = (items) => items.map((item) => item.key);

check("release 2.30.29 synchronized", () => {
  assert.equal(JSON.parse(read("package.json")).version, "2.30.29");
  assert.match(read("lib/release.ts"), /RELEASE_VERSION = "2\.30\.29"/);
  assert.deepEqual(fs.readdirSync(root).filter(x => /^STEP-.*\.txt$/.test(x)), ["STEP-2.30.29.txt"]);
});
check("up arrow changes neighbor sections, not original", () => {
  const copy = moveBuilderSection(sample, "videos", -1);
  assert.deepEqual(keys(copy), ["hero", "videos", "albums", "contact"]);
  assert.deepEqual(keys(sample), ["hero", "albums", "videos", "contact"]);
});
check("down arrow changes neighbor sections", () => {
  assert.deepEqual(keys(moveBuilderSection(sample, "albums", 1)), ["hero", "videos", "albums", "contact"]);
});
check("first ordinary section cannot cross Hero", () => {
  assert.deepEqual(keys(moveBuilderSection(sample, "albums", -1)), keys(sample));
});
check("Hero cannot be moved", () => {
  assert.deepEqual(keys(moveBuilderSection(sample, "hero", 1)), keys(sample));
  assert.deepEqual(keys(moveBuilderSection(sample, "hero", -1)), keys(sample));
});
check("last section cannot leave list", () => {
  assert.deepEqual(keys(moveBuilderSection(sample, "contact", 1)), keys(sample));
});
check("unknown section cannot change list", () => {
  assert.deepEqual(keys(moveBuilderSection(sample, "unknown", 1)), keys(sample));
});
check("drag moves section into position", () => {
  assert.deepEqual(keys(dropBuilderSection(sample, "contact", "albums")), ["hero", "contact", "albums", "videos"]);
});
check("drag cannot move Hero or replace first section", () => {
  assert.deepEqual(keys(dropBuilderSection(sample, "hero", "videos")), keys(sample));
  assert.deepEqual(keys(dropBuilderSection(sample, "videos", "hero")), keys(sample));
});
check("drag ignores invalid sources and targets", () => {
  for (const [from, to] of [[null,"videos"],["missing","videos"],["albums","missing"],["videos","videos"]]) {
    assert.deepEqual(keys(dropBuilderSection(sample, from, to)), keys(sample));
  }
});
check("reordering keeps section objects and count", () => {
  const section = { key: "albums", visible: false, data: { foo: 12 } };
  const elements = [sample[0], section, sample[2]];
  const moved = moveBuilderSection(elements, "albums", 1);
  assert.equal(moved.length, elements.length);
  assert.strictEqual(moved[2], section);
});
check("unified builder still controls editor access", () => {
  assert.match(read("app/admin/site-builder/page.tsx"), /requireAdmin\(\)/);
  assert.match(read("app/admin/page-builder\/\[pageKey\]\/actions.ts"), /requireAdmin\(\)/);
});
check("section structure has keyboard ordering and visibility", () => {
  assert.match(pro, /moveBuilderSection\(layout\.sections, key, direction\)/);
  assert.match(pro, /dropBuilderSection\(layout\.sections, dragKey, targetKey\)/);
  assert.match(pro, /aria-label={`Переместить/);
  assert.match(pro, /aria-pressed=\{section\.visible\}/);
});
check("live draft preview uses existing ManagedPageCanvas", () => {
  assert.match(pro, /showEmbeddedPreview/);
  assert.match(pro, /<ManagedPageCanvas/);
  assert.match(pro, /preview\/>/);
  assert.match(pro, /Несохранённый макет/);
  assert.match(pro, /aria-pressed=\{showEmbeddedPreview\}/);
});
check("preview has three responsive device controls", () => {
  assert.match(pro, /desktop:.*1440/);
  assert.match(pro, /tablet:.*900/);
  assert.match(pro, /mobile:.*390/);
  assert.match(pro, /!embedded \|\| showEmbeddedPreview/);
});
check("unsaved state is derived from layout JSON", () => {
  assert.match(pro, /const dirty = json !== savedJson/);
  assert.match(pro, /submittedJson\.current = json/);
  assert.match(pro, /setSavedJson\(submittedJson\.current \?\? json\)/);
  assert.match(pro, /beforeunload/);
});
check("parent accepts messages only from same-origin active editor", () => {
  assert.match(parent, /event\.origin !== window\.location\.origin/);
  assert.match(parent, /event\.source !== editorFrameRef\.current\?\.contentWindow/);
  assert.match(parent, /payload\.type === "fc-builder-editor-state"/);
});
check("unsaved changes prompt before closing or changing tabs", () => {
  assert.match(parent, /dirtyRef\.current && !window\.confirm/);
  assert.match(parent, /embeddedDirty && !window\.confirm/);
  assert.match(parent, /switchEditorTab\("design"\)/);
});
check("draft and publish feedback are differentiated", () => {
  assert.match(pro, /"fc-builder-editor-saved"/);
  assert.match(parent, /payload\.published \? /);
  assert.match(parent, /if \(payload\.published\) setPreviewRevision/);
});
check("publishing requires a separate explicit confirmation", () => {
  assert.match(pro, /Опубликовать изменения для всех посетителей сайта/);
  assert.match(pro, /event\.preventDefault\(\)/);
});
check("failed menu reorder restores the prior UI state", () => {
  assert.match(parent, /const previous = menu/);
  assert.match(parent, /catch \{ setMenu\(previous\)/);
});
check("styling remains scoped and responsive", () => {
  assert.match(read("app/admin/layout.tsx"), /builder-workspace-v23022\.css/);
  assert.match(style, /\.adminAppShell/);
  assert.match(style, /@media \(max-width: 900px\)/);
  assert.equal((style.match(/{/g) ?? []).length, (style.match(/}/g) ?? []).length);
});
check("install instructions do not require SQL migration", () => {
  assert.match(read("STEP-2.30.29.txt"), /SQL-МИГРАЦИИ: ДА, 084_fan_notifications\.sql/);
  assert.match(read("STEP-2.30.29.txt"), /DEPLOY_FC_EDINET\.bat/);
});

console.log(`\nVisual Editor v2.30.29: ${passed}/${passed + failed} passed.`);
if (failed) process.exitCode = 1;
