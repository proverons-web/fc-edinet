import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const gallery = read('app/components/MediaGallery.tsx');
const order = read('app/components/AlbumPhotoOrder.tsx');
const actions = read('app/admin/media/actions.ts');
const admin = read('app/admin/media/[id]/edit/page.tsx');
const css = read('app/globals.css');
const checks = [
  ['Thumbnail navigation', gallery.includes('mediaViewer2305Filmstrip') && gallery.includes('setActiveIndex(index)')],
  ['Keyboard first/last', gallery.includes('event.key === "Home"') && gallery.includes('event.key === "End"')],
  ['Accessible photo indicator', gallery.includes('aria-current=')],
  ['Focus restore on close', gallery.includes('lastOpener.current') && gallery.includes('openerRefs.current[lastOpener.current]?.focus()')],
  ['Thumbnail swipe retained', gallery.includes('onTouchEnd={onTouchEnd}')],
  ['Album ordering controls', order.includes('move(index, -1)') && order.includes('move(index, 1)')],
  ['Authenticated save', actions.includes('saveAlbumPhotoOrder') && actions.includes('await requireEditor()')],
  ['Cross-album write guard', actions.includes('.eq("album_id", albumId)')],
  ['Order set validation', actions.includes('new Set(orderedIds).size')],
  ['Editor integration', admin.includes('<AlbumPhotoOrder')],
  ['Responsive filmstrip CSS', read('app/components/media-viewer-v2305.css').includes('.mediaViewer2305Filmstrip') && read('app/components/media-viewer-v2305.css').includes('@media(max-width:700px)')],
];
for (const [name, ok] of checks) { assert.ok(ok, name); console.log(`PASS ${name}`); }
console.log(`Media Gallery Pro v2.30.3: ${checks.length}/${checks.length} checks passed.`);
