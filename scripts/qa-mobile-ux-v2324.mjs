import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

/** Mobile UX v2.30.24. Source contracts + Chromium geometry on simplified real-class fixtures.
 * No production credentials, no claims about authenticated live page rendering. */
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
let passed=0;
const check=(label,fn)=>{try{fn();passed++;console.log('PASS',label);}catch(e){console.error('FAIL',label,e.message);process.exitCode=1;}};
const app=read('app/layout.tsx'),admin=read('app/admin/layout.tsx'),calendar=read('app/matches/page.tsx');
const css=read('app/mobile-ux-v23024.css'),acss=read('app/admin-mobile-v23024.css'),gallery=read('app/components/media-viewer-v2305.css');
const pkg=JSON.parse(read('package.json'));
check('Version consistency',()=>{assert.equal(pkg.version,'2.30.26');assert.match(read('lib/release.ts'),/2\.30\.26/);});
check('Public CSS is imported only in public shell',()=>{assert.match(app,/mobile-ux-v23024\.css/);assert.doesNotMatch(admin,/mobile-ux-v23024\.css/);});
check('Admin CSS is scoped to admin shell',()=>{assert.match(admin,/admin-mobile-v23024\.css/);assert.doesNotMatch(app,/admin-mobile-v23024\.css/);assert.match(acss,/\.adminAppShell/);});
check('Competition filters expose current choice',()=>{assert.match(calendar,/competitionTypeTabs/);assert.match(calendar,/aria-current=\{type===t\?"page":undefined\}/);assert.match(calendar,/aria-label=\{locale==="ro"\?"Competiții":"Выбор соревнования"\}/);});
check('Competition edition strips scroll within themselves',()=>{assert.match(css,/\.competitionEditionTabs\s*\{[^}]*overflow-x:\s*auto/s);assert.match(css,/overscroll-behavior-inline:\s*contain/);});
check('Match actions have 44px minimum targets',()=>{assert.match(css,/matchFavoriteAction[^}]+min-height:44px!important/s);});
check('Small-phone team names wrap without fixed min-width',()=>{assert.match(css,/\.publicMatchCard \.publicTeams strong\s*\{[^}]*overflow-wrap:\s*anywhere/s);});
check('Mobile Safari inputs avoid focus-zoom',()=>{assert.match(acss,/font-size:16px/);assert.match(acss,/input:not\(\[type="checkbox"\]\)/);});
check('Player season tables are keyboard accessible',()=>{const p=read('app/team/[slug]/page.tsx');assert.equal((p.match(/className="playerCompetitionStatsWrap" role="region"/g)||[]).length,2);assert.equal((p.match(/tabIndex=\{0\}/g)||[]).length>=2,true);});
check('Gallery navigation keeps large touch controls',()=>{assert.match(gallery,/v2\.30\.24/);assert.match(gallery,/\.mediaViewer2305Nav \{ width:44px/);});
check('QA participates in local, release, CI',()=>{assert.match(pkg.scripts['qa:all'],/qa:mobile-24/);assert.match(pkg.scripts['deploy:check'],/qa:mobile-24/);assert.match(read('.github/workflows/responsive-qa.yml'),/qa-mobile-ux-v2324/);});

const browserCandidates=[process.env.CHROME_PATH,process.env.CHROME_BIN,process.env.CHROMIUM_PATH,'/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
let browser=browserCandidates.find(x=>fs.existsSync(x));
if(!browser && process.platform==='win32'){
  const bases=[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean);
  browser=bases.flatMap(b=>['Google/Chrome/Application/chrome.exe','Microsoft/Edge/Application/msedge.exe'].map(s=>path.join(b,s))).find(x=>fs.existsSync(x));
}
const skip=process.argv.includes('--skip-if-missing');
if(!browser || typeof WebSocket!=='function'){
  if(skip){console.log('SKIP Chromium mobile fixture checks (no browser/WebSocket)');console.log(`Mobile UX v2.30.26: ${passed} source checks passed`);process.exit(process.exitCode||0);}
  throw Error('Chromium and Node22+ required for geometry checks.');
}
function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const x=s.address().port;s.close(()=>resolve(x));});});}
const sleep=n=>new Promise(r=>setTimeout(r,n));
async function target(port,child){for(let i=0;i<75;i++){
  if(child.exitCode!==null)throw Error('Chromium exited early');
  try{let r=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(500)});let j=await r.json();let x=j.find(p=>p.type==='page');if(x?.webSocketDebuggerUrl)return x.webSocketDebuggerUrl;}catch{}
  await sleep(130);
}throw Error('Chromium remote debugging did not become ready');}
async function connect(url){const w=new WebSocket(url),pending=new Map();let counter=0;
  await new Promise((res,rej)=>{w.addEventListener('open',res,{once:true});w.addEventListener('error',rej,{once:true});});
  w.addEventListener('message',e=>{const o=JSON.parse(e.data),x=pending.get(o.id);if(x){pending.delete(o.id);o.error?x.reject(new Error(o.error.message)):x.resolve(o.result||{});}});
  return {send(method,params={}){return new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});w.send(JSON.stringify({id,method,params}));});},close(){w.close();}};
}
const tags=['globals.css','visual-polish.css','home-v215.css','mobile.css','mobile-ux-v23024.css','matches/competition-filters.css','admin-workflow-v2294.css','admin-unified-v23021.css','admin-mobile-v23024.css'].map(n=>`<style>${read('app/'+n).replaceAll('</style','<\\/style')}</style>`).join('');
const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${tags}<style>*{animation:none!important;transition:none!important}</style></head><body>
<main class="matchPublicSection"><section class="container"><nav class="competitionTypeTabs"><a href="#" class="active">Все матчи</a><a>Товарищеские матчи</a><a>Кубок Молдовы</a><a>Liga 2</a></nav><nav class="competitionEditionTabs"><a href="#">Все соревнования</a><a href="#">Очень длинное название соревнования для проверки горизонтального скролла и слов</a><a href="#">Liga 2 2026/27</a></nav><article class="publicMatchCard"><div class="publicMatchDateBadge"><strong>24</strong><span>НОЯ</span></div><div class="publicMatchMeta"><div class="publicMatchCompetitionLine"><span>LIGA 2</span><span class="matchPostponedChip">ПЕРЕНЕСЁН</span></div><strong>24 ноября 2026 года</strong><small>Другая дата</small></div><div class="publicTeams"><div><div class="publicTeamBadge">FCE</div><strong>FC Edineț Moldova</strong></div><div class="publicScore"><b>—</b><span>Перенесён</span></div><div><div class="publicTeamBadge">TEST</div><strong>Спортивная команда с очень длинным названием</strong></div></div><div class="matchFavoriteAction"><a class="publicMatchDetailsButton">Протокол</a><a class="fanMatchAction">В календарь</a><form><button class="favoriteButton">Следить за матчем</button></form></div></article></section></main>
<div class="adminAppShell"><div class="adminShellMain"><div class="adminTopbar"><button class="adminMobileMenu" aria-label="Меню">☰</button><div class="adminTopbarUser"><a href="#">А</a></div></div><main class="adminPage"><section class="adminSurface"><div class="container"><div class="adminHeroActions"><a class="rowAction">Добавить матч</a><a class="rowAction">Управление командами</a></div><article class="adminMatchRow"><div class="adminMatchDate"><strong>24</strong><span>ноя</span></div><div class="adminMatchMain"><h2>FC EDINEȚ — СПОРТИВНЫЙ КЛУБ С ОЧЕНЬ ДЛИННЫМ НАЗВАНИЕМ</h2><span>Перенесён</span></div><div class="adminNewsActions"><a class="rowAction">Изменить</a><a class="rowAction">Протокол</a></div></article><div class="fieldGroup"><label for="phoneInput">Название</label><input id="phoneInput" value="Длинное название"></div></div></section></main></div></div>
</body></html>`;
let child,cdp,tmp;
try{
 const port=await freePort();tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fce-mobile24-'));
 const args=['--headless=new','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',`--user-data-dir=${tmp}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','about:blank'];if(process.platform==='linux')args.push('--no-sandbox');
 child=spawn(browser,args,{stdio:'ignore'});cdp=await connect(await target(port,child));await cdp.send('Page.enable');await cdp.send('Runtime.enable');const frame=(await cdp.send('Page.getFrameTree')).frameTree.frame.id;
 for(const width of [320,360,390,430,768]){
   await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
   await cdp.send('Page.setDocumentContent',{frameId:frame,html:fixture});
   const res=await cdp.send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{const c=s=>document.querySelector(s),r=e=>{let x=e.getBoundingClientRect();return {left:x.left,right:x.right,width:x.width,height:x.height}};let a=[...document.querySelectorAll('.matchFavoriteAction a,.matchFavoriteAction button')].map(r);let admin=[...document.querySelectorAll('.adminMatchRow .adminNewsActions a')].map(r);return {vw:innerWidth,doc:document.documentElement.scrollWidth,card:r(c('.publicMatchCard')),nav:r(c('.competitionEditionTabs')),navScroll:c('.competitionEditionTabs').scrollWidth,navClient:c('.competitionEditionTabs').clientWidth,match:a,admin,adminRow:r(c('.adminMatchRow')),inputFont:getComputedStyle(c('#phoneInput')).fontSize};})()`});
   const v=res.result.value;
   check(`Chromium ${width}px has no page-wide overflow`,()=>assert.ok(v.doc<=v.vw+1,`document ${v.doc}px viewport ${v.vw}px`));
   check(`Chromium ${width}px match and admin cards fit`,()=>{for(let x of [v.card,v.adminRow])assert.ok(x.left>=-1 && x.right<=width+1,JSON.stringify(x));});
   if(width<768){
     check(`Chromium ${width}px touch targets >=44px`,()=>{for(let x of [...v.match,...v.admin])assert.ok(x.height>=43.5,JSON.stringify(x));});
     check(`Chromium ${width}px horizontal filter isolated`,()=>assert.ok(v.navScroll>v.navClient,v.navScroll+' <= '+v.navClient));
     check(`Chromium ${width}px admin inputs >=16px`,()=>assert.ok(parseFloat(v.inputFont)>=16,v.inputFont));
   }
 }
}finally{try{cdp?.close();}catch{}if(child&&child.exitCode===null)child.kill();if(tmp)try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:4,retryDelay:150});}catch{}}
console.log(`Mobile UX v2.30.26: ${passed} checks passed.`);
