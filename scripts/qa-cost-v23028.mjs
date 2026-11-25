// Source contracts only. No production traffic or secret reads.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0;
function check(name,fn){fn();n++;console.log('PASS '+name);}
const config=read('next.config.ts'),image=read('app/components/PublicImage.tsx'),css=read('app/site-edit-v23028.css'),team=read('app/team/page.tsx'),stand=read('app/standings/page.tsx'),home=read('app/page.tsx');
check('Pinned image sizes and safe host retained',()=>{assert.match(config,/deviceSizes: \[360, 640, 1024, 1600, 1920\]/);assert.match(config,/imageSizes: \[64, 128, 256, 320\]/);assert.match(config,/hostname: trustedSupabaseImageHost/);assert.match(config,/pathname: "\/storage\/v1\/object\/public\/\*\*"/);});
check('Only known generated album thumbnail bypasses optimizer',()=>{assert.match(image,/isOptimizablePublicImage\(src\) && !isPreparedAlbumThumbnail\(src\)/);assert.match(image,/url\.pathname\.startsWith\("\/storage\/v1\/object\/public\/media\/"\)/);assert.match(image,/if \(!isOptimizablePublicImage\(src\)/);assert.ok(image.includes('-thumb\\.webp'));});
check('Gallery already uses separate thumbnails and full image',()=>{const g=read('app/components/MediaGallery.tsx');assert.match(g,/src=\{photo.thumb_url\}/);assert.match(g,/src=\{active.image_url\}/);assert.doesNotMatch(g,/import Image from "next\/image"/);});
check('Album uploader uses immutable WebP URLs',()=>{const u=read('app/components/AlbumPhotoUploader.tsx');assert.match(u,/-thumb\.webp/);assert.match(u,/upsert: false/);assert.match(u,/cacheControl: "31536000"/);});
check('Loss badge cannot wrap and fits widened centered column',()=>{assert.match(css,/FC_EDINET_COST_AND_BADGE_FIX_23028/);assert.match(css,/\.fcRefRecentMatchScore>span\{[^}]*white-space:nowrap!important/);assert.match(css,/minmax\(82px,\.9fr\)/);assert.ok(Buffer.byteLength(css)<=9000);});
check('Heavy public collection links opt out of prefetch',()=>{for(const p of ['app/page.tsx','app/news/page.tsx','app/components/NewsCard.tsx','app/components/PlayerCard.tsx'])assert.match(read(p),/prefetch=\{false\}/);});
check('Roster cache is anonymous, short and errors not persisted',()=>{assert.match(team,/async function readPublicRoster\(\)\s*\{\s*const supabase = createPublicClient\(\)/);assert.match(team,/if \(result\.some\(\(item\) => item\.error\)\) throw/);assert.match(team,/revalidate: 120, tags: \["fce-public-roster"\]/);assert.match(team,/editorEnabled\s*\? readPublicRoster\(\)/);assert.match(team,/cachedPublicRoster\(\)\.catch/);});
check('Standings uses only a known competition ID and anonymous cache',()=>{assert.match(stand,/async function readPublicStandings\(competitionId: Competition\["id"\]\)\s*\{\s*const supabase = createPublicClient\(\)/);assert.match(stand,/if \(result\.error\) throw/);assert.match(stand,/revalidate: 120, tags: \["fce-public-standings"\]/);assert.match(stand,/competitions\.find\(/);assert.match(stand,/cachedPublicStandings\(competition\.id\)\.catch/);});
check('Player/standings publication invalidates corresponding cache tags',()=>{assert.match(read('app/admin/players/actions.ts'),/updateTag\("fce-public-roster"\)/);assert.match(read('app/admin/standings/actions.ts'),/updateTag\("fce-public-standings"\)/);});
check('Homepage and match calendar remain dynamic',()=>{assert.match(home,/export const dynamic\s*=\s*"force-dynamic"/);assert.match(read('app/matches/page.tsx'),/export const dynamic\s*=\s*"force-dynamic"/);});
check('User locale and identity remain request-specific',()=>{assert.match(read('lib/locale.ts'),/await cookies\(\)/);assert.match(read('app/components/SiteHeader.tsx'),/supabase\.auth\.getClaims\(\)/);assert.match(read('lib/public-editor-role.ts'),/supabase\.auth\.getClaims\(\)/);});
check('New QA wired into existing release gates',()=>{const p=JSON.parse(read('package.json'));assert.equal(p.version,'2.30.28');assert.equal(p.dependencies.next,'16.4.6');assert.match(p.scripts['qa:all'],/qa:cost/);assert.match(p.scripts['deploy:check'],/qa:cost && npm run typecheck/);assert.match(read('.github/workflows/responsive-qa.yml'),/run: npm run qa:cost/);});
console.log(`Cost optimization: ${n}/${n} source checks passed.`);
