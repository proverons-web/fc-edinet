import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const editor=read('app/components/AdminUniversalPhotoEditor.tsx');
const helper=read('lib/admin-photo-crop.ts');
const layout=read('app/admin/layout.tsx');
const css=read('app/components/admin-universal-photo-editor.css');
const listing=read('app/club/hall-of-fame/page.tsx');
const search=read('app/club/hall-of-fame/HallSearchLauncher.tsx');
let pass=0;let fail=0;
function test(label,cb){try{cb();console.log('PASS',label);pass++;}catch(e){console.error('FAIL',label,e.message);fail++;}}
test('Universal editor mounts only in authenticated admin layout',()=>{
 assert.match(layout,/if \(!userId\) redirect/);
 assert.match(layout,/staffRoles\.includes/);
 assert.match(layout,/<AdminUniversalPhotoEditor \/>/);
 assert.doesNotMatch(read('app/layout.tsx'),/AdminUniversalPhotoEditor/);
});
test('Captures selected images before existing upload listeners',()=>{
 assert.match(editor,/addEventListener\("change", capture, true\)/);
 assert.match(editor,/event\.stopImmediatePropagation\(\)/);
 assert.match(editor,/input\.value = ""/);
});
test('Replays a real change event to existing React file inputs',()=>{
 assert.match(editor,/new DataTransfer\(\)/);
 assert.match(editor,/input\.files = transfer\.files/);
 assert.match(editor,/new Event\("change", \{ bubbles: true \}\)/);
 assert.match(editor,/bypass\.current\.add\(input\)/);
});
test('Supports per-file queue and preserve-original action',()=>{
 assert.match(editor,/selection\.position \+ 1/);
 assert.match(editor,/advance\(currentFile\)/);
 assert.match(editor,/\.\.\.selection\.original\.slice\(selection\.position\)/);
});
test('Crops through browser canvas to a real WebP file',()=>{
 assert.match(helper,/ctx\.drawImage\(/);
 assert.match(helper,/canvas\.toBlob/);
 assert.match(helper,/new File\(\[blob\]/);
 assert.match(helper,/2400 \/ Math\.max\(crop\.width, crop\.height\)/);
});
test('Offers zoom, drag, horizontal and vertical positioning',()=>{
 for(const pattern of [/react-easy-crop/,/onCropChange=\{setCrop\}/,/onZoomChange=\{setZoom\}/,/Влево/,/Вправо/,/Вверх/,/Вниз/,/Масштаб/])assert.match(editor,pattern);
});
test('Allows original and three crop aspect presets',()=>{
 for(const token of ['original','portrait','landscape','square'])assert.ok(editor.includes(token));
 assert.match(editor,/setAspect\(option\.key\)/);
});
test('Avoids double editors for players, team logos and visual hero',()=>{
 assert.match(helper,/photo_source/);
 assert.match(helper,/team_logo_source/);
 assert.match(helper,/logo_source/);
 assert.match(helper,/\.imageEditorField/);
});
test('Preserves vector logos and no cross-origin URL rewriting',()=>{
 assert.match(helper,/image\/jpeg/);
 assert.match(editor,/isRaster/);
 assert.doesNotMatch(editor,/\.upload\(|fetch\(/);
});
test('Cancelling never submits partial selections',()=>{
 assert.match(editor,/selection\.input\.value = ""/);
 assert.match(editor,/window\.alert\(/);
});
test('Cleans browser blob URLs after editing',()=>{
 assert.match(editor,/URL\.revokeObjectURL\(url\)/);
 assert.match(helper,/URL\.revokeObjectURL\(source\)/);
});
test('Admin-specific CSS and mobile controls are isolated',()=>{
 assert.match(css,/\.adminPhotoBackdrop/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.doesNotMatch(read('app/globals.css'),/\.adminPhotoBackdrop/);
});
test('Hall of Fame displays no permanent search or category toolbar',()=>{
 assert.doesNotMatch(listing,/className="hallV2Filters"/);
 assert.doesNotMatch(listing,/className="hallV2Tabs"/);
 assert.match(listing,/<HallSearchLauncher/);
});
test('Hall search dialog retains safe categories and query',()=>{
 assert.match(search,/aria-haspopup="dialog"/);
 assert.match(search,/aria-modal="true"/);
 assert.match(search,/role="search"/);
 assert.match(search,/HALL_CATEGORIES\.map/);
 assert.match(search,/hallHref\(\{ category:item, q \}\)/);
 assert.match(search,/event\.key === "Escape"/);
});
console.log(`\nAdmin photo and hall UI: ${pass}/${pass+fail} passed.`);
if(fail)process.exitCode=1;
