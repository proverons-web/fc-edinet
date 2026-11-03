import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseAttentionFocus, matchNeedsStadium, matchNeedsScore, playerNeedsPhoto, matchNeedsReport, matchNeedsLineups, mediaMatchesPublication } from '../lib/admin-attention.ts';
import { adminListHref } from '../lib/admin-list-search.ts';

const root=path.resolve(import.meta.dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const checks=[];
function verify(name,fn){try{fn();checks.push(true);console.log(`PASS  ${name}`);}catch(error){checks.push(false);console.error(`FAIL  ${name}: ${error.message}`);}}

verify('focus parser restricts values by screen',()=>{
  assert.equal(parseAttentionFocus(['unpublished','lineups'],['all','unpublished']),'unpublished');
  assert.equal(parseAttentionFocus('missing_photo',['all','unpublished']),'all');
  assert.equal(parseAttentionFocus('gibberish',['all','lineups']),'all');
});
verify('focus filter safely persists as encoded query parameter',()=>{
  assert.equal(adminListHref('/admin/players',{status:'active',sort:'last',focus:'missing_photo',q:'Ion Ștefan'}),'/admin/players?status=active&sort=last&focus=missing_photo&q=Ion+%C8%98tefan');
  assert.equal(adminListHref('/admin/media',{focus:'all',q:''}),'/admin/media');
});
verify('missing stadium excludes cancelled matches',()=>{
  assert.equal(matchNeedsStadium({status:'scheduled',stadium:null}),true);
  assert.equal(matchNeedsStadium({status:'finished',stadium:'   '}),true);
  assert.equal(matchNeedsStadium({status:'scheduled',stadium:'Stadionul Orășenesc'}),false);
  assert.equal(matchNeedsStadium({status:'cancelled',stadium:null}),false);
});
verify('missing score applies only to finished matches and handles legitimate zero',()=>{
  assert.equal(matchNeedsScore({status:'finished',home_score:0,away_score:0}),false);
  assert.equal(matchNeedsScore({status:'finished',home_score:0,away_score:null}),true);
  assert.equal(matchNeedsScore({status:'scheduled',home_score:null,away_score:null}),false);
});
verify('missing player photo applies only to active player',()=>{
  assert.equal(playerNeedsPhoto({is_active:true,photo_url:''}),true);
  assert.equal(playerNeedsPhoto({is_active:true,photo_url:' https://img.example/logo.jpg '}),false);
  assert.equal(playerNeedsPhoto({is_active:false,photo_url:null}),false);
});
verify('only finished matches missing published report are actionable',()=>{
  assert.equal(matchNeedsReport({status:'finished'},false),true);
  assert.equal(matchNeedsReport({status:'finished'},true),false);
  assert.equal(matchNeedsReport({status:'live'},false),false);
});
verify('lineup filter checks each team and excludes upcoming matches',()=>{
  assert.equal(matchNeedsLineups({status:'finished'},{home_starters:11,away_starters:11}),false);
  assert.equal(matchNeedsLineups({status:'finished'},{home_starters:11,away_starters:10}),true);
  assert.equal(matchNeedsLineups({status:'finished'},undefined),true);
  assert.equal(matchNeedsLineups({status:'scheduled'},undefined),false);
});
verify('media status filter is symmetric',()=>{
  assert.equal(mediaMatchesPublication('all',true),true);
  assert.equal(mediaMatchesPublication('all',false),true);
  assert.equal(mediaMatchesPublication('published',true),true);
  assert.equal(mediaMatchesPublication('published',false),false);
  assert.equal(mediaMatchesPublication('draft',false),true);
  assert.equal(mediaMatchesPublication('draft',true),false);
});
for(const [page,label] of [['app/admin/players/page.tsx','players'],['app/admin/matches/page.tsx','matches'],['app/admin/match-center/page.tsx','match center']]){
  verify(`${label} reads focus server-side and retains it in the search form`,()=>{
    const s=read(page);assert.match(s,/parseAttentionFocus\(params\.focus,/);assert.match(s,/<AdminListSearch[^>]*focus=\{focus\}/);assert.match(s,/className="adminAttentionFilters"/);
  });
}
verify('players attention filter is non-mutating and visible',()=>{
  const s=read('app/admin/players/page.tsx');assert.match(s,/playerNeedsPhoto\(player\)/);assert.match(s,/noPhotoCount/);assert.match(s,/Нет фото/);
});
verify('match list attention filters handle missing score without zero fallback',()=>{
  const s=read('app/admin/matches/page.tsx');assert.match(s,/matchNeedsScore\(match\)/);assert.match(s,/matchNeedsStadium\(match\)/);assert.match(s,/home_score \?\? "—"/);
});
verify('match center does not treat report query error as unpublished',()=>{
  const s=read('app/admin/match-center/page.tsx');assert.match(s,/unpublishedCount = reportsResult\.error \? null/);assert.match(s,/!reportsResult\.error && matchNeedsReport/);assert.match(s,/Не удалось загрузить публикации протоколов/);
});
verify('media list retains GET search and status filters for both album and video',()=>{
  const s=read('app/admin/media/page.tsx');assert.match(s,/searchParams: Promise/);assert.match(s,/mediaMatchesPublication\(status, album\.is_published\)/);assert.match(s,/mediaMatchesPublication\(status, video\.is_published\)/);assert.match(s,/<AdminListSearch path="\/admin\/media"/);
});
verify('media remains editable and does not bypass destructive confirmation',()=>{
  const s=read('app/admin/media/page.tsx');assert.match(s,/<MediaAlbumCreateForm/);assert.match(s,/<MediaVideoForm/);assert.match(s,/<MediaHomepageToggle/);assert.match(s,/<ConfirmSubmitButton/);assert.match(s,/href=\{`\/admin\/media\/\$\{album\.id\}\/edit`\}/);
});
verify('all new styles are admin scoped without important overrides',()=>{
  const css=read('app/admin-workflow-v2294.css').split('FC Edineț v2.29.5')[1];assert.ok(css);assert.doesNotMatch(css,/!important/);assert.match(css,/\.adminAppShell \.adminAttentionFilters/);assert.match(css,/@media\(max-width:600px\)/);
});
verify('dashboard attention cards open pre-filtered worklists',()=>{
  const s=read('app/admin/page.tsx');
  assert.match(s,/\/admin\/players\?status=active&focus=missing_photo/);
  assert.match(s,/\/admin\/match-center\?status=finished&focus=unpublished/);
});
verify('new QA wired into deploy and GitHub CI',()=>{
  assert.match(read('package.json'),/qa:admin-attention/);assert.match(read('package.json'),/qa-admin-attention\.mjs/);assert.match(read('.github/workflows/responsive-qa.yml'),/qa-admin-attention\.mjs/);
});
verify('no Supabase migration added for read-only UI features',()=>{
  const db=fs.readdirSync(path.join(root,'database'));
  assert.equal(db.some(x=>x.startsWith('068_')),false);
});
const pass=checks.filter(Boolean).length;console.log(`\n${pass}/${checks.length} admin attention checks passed.`);if(pass!==checks.length)process.exitCode=1;
