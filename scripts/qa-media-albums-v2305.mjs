import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const viewer=read('app/components/MediaGallery.tsx');
const css=read('app/components/media-viewer-v2305.css');
const hero=read('app/components/PageHeroShell.tsx');
const editor=read('app/components/AlbumCoverPositionEditor.tsx');
const form=read('app/components/MediaAlbumEditorForm.tsx');
const action=read('app/admin/media/actions.ts');
const page=read('app/media/[slug]/page.tsx');
const sql=read('database/076_media_album_cover_focus.sql');
const tests=[
  ['Isolated full-viewport gallery',viewer.includes('className="mediaViewer2305"') && css.includes('position:fixed;inset:0') && css.includes('z-index:10000')],
  ['Viewer avoids legacy sidebar layout',!viewer.includes('mediaLightboxInfo') && !viewer.includes('mediaLightboxContent')],
  ['Full image displayed without crop',css.includes('max-width:100%;max-height:100%;object-fit:contain')],
  ['Image centered in stage',css.includes('align-items:center;justify-content:center')],
  ['Previous/next controls',viewer.includes('onClick={previous}') && viewer.includes('onClick={next}')],
  ['Escape, arrow, Home, End controls', ['Escape','ArrowLeft','ArrowRight','Home','End'].every(k=>viewer.includes(k))],
  ['Focus restored on exit',viewer.includes('openerRefs.current[lastOpener.current]?.focus()')],
  ['Scroll lock restored',viewer.includes('document.body.style.overflow = previousOverflow')],
  ['Mobile swipe supported',viewer.includes('onTouchStart={onTouchStart}') && viewer.includes('onTouchEnd={onTouchEnd}')],
  ['Mobile filmstrip',css.includes('.mediaViewer2305Filmstrip') && css.includes('@media(max-width:700px)')],
  ['Focus trap in modal',viewer.includes('event.key === "Tab"') && viewer.includes('viewerRef.current')],
  ['Hero focus uses dedicated album override',hero.includes('albumImagePosition') && hero.includes('design.background_mode === "content"')],
  ['Full resolution cover when available',page.includes('?.image_url ?? album.cover_image_url')],
  ['User can drag crop position',editor.includes('setPointerCapture') && editor.includes('onPointerMove={moveDrag}')],
  ['User can reset crop',editor.includes('setX(50); setY(50)')],
  ['Admin sliders are saved through album form',form.includes('<AlbumCoverPositionEditor') && editor.includes('name="cover_position_x"') && editor.includes('name="cover_position_y"')],
  ['Server clamps focus to 0..100',action.includes('function percent(') && action.includes('Math.min(100, Math.max(0')],
  ['Admin action persists focus',action.includes('cover_position_x: coverPositionX') && action.includes('cover_position_y: coverPositionY')],
  ['DB migration is additive',sql.includes('ADD COLUMN IF NOT EXISTS') && !/DROP TABLE|DELETE FROM/i.test(sql)],
  ['DB validates focus ranges',sql.includes('BETWEEN 0 AND 100')],
  ['Release version',JSON.parse(read('package.json')).version === '2.30.21' && read('lib/release.ts').includes('RELEASE_VERSION = "2.30.21"')],
];
for(const [name,ok] of tests){assert.ok(ok,name);console.log('PASS',name)}
console.log(`Album Experience v2.30.5: ${tests.length}/${tests.length} checks passed.`);
