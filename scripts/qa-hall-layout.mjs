import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const templates=fs.readFileSync(path.join(root,'qa/fixtures/hall-of-fame.html'),'utf8');
const css=['app/globals.css','app/visual-polish.css','app/home-v215.css','app/mobile.css','app/club/hall-of-fame/hall-of-fame.css'];
const crest=fs.readFileSync(path.join(root,'public/brand/fc-edinet-crest.png')).toString('base64');
const html=templates.replace('<!-- CSS_INJECT -->',css.map(c=>`<style>${fs.readFileSync(path.join(root,c),'utf8').replaceAll('</style','<\\/style')}</style>`).join('\n')+'<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>').replaceAll('{{CREST_DATA_URI}}',`data:image/png;base64,${crest}`);
const candidates=[process.env.CHROME_PATH,process.env.CHROME_BIN,'/usr/bin/chromium','/usr/bin/google-chrome',process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe')].filter(Boolean);
const browser=candidates.find(c=>fs.existsSync(c));
const skip=process.argv.includes('--skip-if-missing');
if(!browser||typeof WebSocket!=='function'){console.log(skip?'SKIP Hall browser QA — Chromium not installed':'FAIL Hall browser QA — Chromium and Node 22 required');process.exit(skip?0:1)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){return await new Promise(res=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p))})})}
async function endpoint(p,ch){for(let i=0;i<65;i++){if(ch.exitCode!==null)throw Error('Chromium exited');try{const r=await fetch(`http://127.0.0.1:${p}/json/list`);const j=await r.json();const t=j.find(x=>x.type==='page');if(t?.webSocketDebuggerUrl)return t.webSocketDebuggerUrl}catch{}await sleep(140)}throw Error('CDP unavailable')}
async function connect(url){const ws=new WebSocket(url),waiting=new Map();let id=0;await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});ws.addEventListener('message',e=>{const m=JSON.parse(e.data),fn=waiting.get(m.id);if(fn){waiting.delete(m.id);fn(m)}});return{send(method,params={}){return new Promise((res,rej)=>{const n=++id;waiting.set(n,m=>m.error?rej(Error(m.error.message)):res(m.result));ws.send(JSON.stringify({id:n,method,params}))})},close(){ws.close()}}}
const widths=[320,360,390,768,1280],fails=[];let ch,cdp,temp;
const check=(good,label)=>{console.log(good?'PASS':'FAIL',label);if(!good)fails.push(label)};
try{
 const p=await port();temp=fs.mkdtempSync(path.join(os.tmpdir(),'fce-hall-'));
 const flags=['--headless=new','--disable-gpu','--disable-dev-shm-usage','--no-first-run',`--user-data-dir=${temp}`,`--remote-debugging-port=${p}`,'--remote-allow-origins=*','about:blank'];if(process.platform==='linux')flags.push('--no-sandbox');
 ch=spawn(browser,flags,{stdio:'ignore'});cdp=await connect(await endpoint(p,ch));await cdp.send('Page.enable');await cdp.send('Runtime.enable');const frame=(await cdp.send('Page.getFrameTree')).frameTree.frame.id;
 for(const w of widths){await cdp.send('Emulation.setDeviceMetricsOverride',{width:w,height:1000,deviceScaleFactor:1,mobile:w<=590});await cdp.send('Page.setDocumentContent',{frameId:frame,html});await cdp.send('Runtime.evaluate',{expression:'document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))',awaitPromise:true});
  const expression=`(()=>{const q=s=>document.querySelector(s),xs=s=>[...document.querySelectorAll(s)],r=e=>{const x=e.getBoundingClientRect();return{left:x.left,right:x.right,width:x.width,height:x.height}},cards=xs('.hallV2Card');return{viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:cards.map(c=>({r:r(c),title:r(c.querySelector('h3'))})),columns:getComputedStyle(q('.hallV2Grid')).gridTemplateColumns.split(' ').length,hero:r(q('.hallV2Hero')),search:r(q('.hallV2Search'))}})()`;
  const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true});const d=result.result.value;
  check(d.scrollWidth<=w+1,`${w}px: no horizontal page overflow (${d.scrollWidth}px)`);
  check(d.cards.length===4&&d.cards.every(c=>c.r.width>100&&c.title.left>=c.r.left-2&&c.title.right<=c.r.right+2),`${w}px: cards and long names within borders`);
  const expected=w<=340?1:w<=850?2:w<=1150?3:4;
  check(d.columns===expected,`${w}px: ${expected} columns (observed ${d.columns})`);
  check(d.hero.width<=w+1&&d.search.width<=w+1,`${w}px: header and search within viewport`);
  if(process.argv.includes('--screenshots')){const out=path.join(root,'qa-artifacts');fs.mkdirSync(out,{recursive:true});const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(out,`hall-v22917-${w}.png`),Buffer.from(shot.data,'base64'));}
 }
}catch(e){console.error('FAIL',e.stack||e);fails.push(e.message)}finally{try{cdp?.close()}catch{}if(ch&&ch.exitCode===null)ch.kill();if(temp)try{fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}
console.log(`Hall of Fame browser QA: ${fails.length?'FAIL':'PASS'} (${widths.length} widths)`);if(fails.length)process.exit(1);
