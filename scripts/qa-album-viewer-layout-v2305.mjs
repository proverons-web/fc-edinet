/** Chromium fixture: ensure the new fullscreen viewer centers a complete photograph. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const css=fs.readFileSync(path.join(root,'app/components/media-viewer-v2305.css'),'utf8');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#4b7658"/><path d="M0 700H1600" stroke="#eee" stroke-width="6"/></svg>';
const imageSrc=`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>*{box-sizing:border-box}body{margin:0}${css}</style></head><body>
<div class="mediaViewer2305"><header class="mediaViewer2305Bar"><div class="mediaViewer2305Heading"><span class="mediaViewer2305Counter">1 / 6</span><span class="mediaViewer2305Album">FC EDINEȚ — FC LOCOMOTIVA</span></div><button class="mediaViewer2305Close">×</button></header>
<div class="mediaViewer2305Stage"><div class="mediaViewer2305Canvas"><img src="${imageSrc}"/></div><button class="mediaViewer2305Nav isPrevious">‹</button><button class="mediaViewer2305Nav isNext">›</button></div>
<footer class="mediaViewer2305Footer"><div class="mediaViewer2305Details"><div class="mediaViewer2305Caption">FC EDINEȚ — FC LOCOMOTIVA</div><small>Foto: FC Edineț</small></div><div class="mediaViewer2305Actions"><button>Share</button><a href="#">Open photo</a></div></footer>
<div class="mediaViewer2305Filmstrip">${Array.from({length:6},(_,i)=>`<button${i===0?' class="isActive"':''}><img src="${imageSrc}"/></button>`).join('')}</div></div></body></html>`;
const browser=[process.env.CHROME_PATH,'/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean).find(p=>fs.existsSync(p));
if(!browser||typeof WebSocket!=='function'){console.log('SKIP Media viewer layout — browser missing');process.exit(0)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){return new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const value=s.address().port;s.close(()=>resolve(value));})})}
async function endpoint(p,child){for(let k=0;k<70;k++){if(child.exitCode!==null)throw Error('Chromium exited');try{const r=await fetch(`http://127.0.0.1:${p}/json/list`,{signal:AbortSignal.timeout(500)});const j=await r.json();const v=j.find(x=>x.type==='page');if(v?.webSocketDebuggerUrl)return v.webSocketDebuggerUrl}catch{}await sleep(120)}throw Error('Chromium CDP timeout')}
async function cdp(url){let seq=0;const callbacks=new Map();const ws=new WebSocket(url);await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true})});ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(callbacks.has(r.id)){const c=callbacks.get(r.id);callbacks.delete(r.id);r.error?c.fail(Error(r.error.message)):c.ok(r.result)}});return{send(method,params={}){return new Promise((ok,fail)=>{const id=++seq;callbacks.set(id,{ok,fail});ws.send(JSON.stringify({id,method,params}))})},close(){ws.close()}}}
let proc,client,profile;const bad=[];
try{
  const p=await port();profile=fs.mkdtempSync(path.join(os.tmpdir(),'fce-viewer-'));
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run',`--user-data-dir=${profile}`,`--remote-debugging-port=${p}`,'--remote-allow-origins=*','about:blank'];
  proc=spawn(browser,args,{stdio:'ignore'});client=await cdp(await endpoint(p,proc));await client.send('Page.enable');await client.send('Runtime.enable');const frame=(await client.send('Page.getFrameTree')).frameTree.frame.id;
  for(const width of [320,390,768,1440]){
    await client.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<700});await client.send('Page.setDocumentContent',{frameId:frame,html});
    const script=`(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const img=document.querySelector('.mediaViewer2305Canvas>img').getBoundingClientRect();const stage=document.querySelector('.mediaViewer2305Stage').getBoundingClientRect();const arrows=[...document.querySelectorAll('.mediaViewer2305Nav')].map(el=>el.getBoundingClientRect());return {page:document.documentElement.scrollWidth,viewport:innerWidth,img:{x:img.x,y:img.y,w:img.width,h:img.height},stage:{x:stage.x,y:stage.y,w:stage.width,h:stage.height},nav:arrows.map(a=>({x:a.x,right:a.right,top:a.top,bottom:a.bottom}))}})()`;
    const data=(await client.send('Runtime.evaluate',{expression:script,awaitPromise:true,returnByValue:true})).result.value;
    const ok=data.page<=width+1 && data.img.w>0 && data.img.h>0 && data.img.x>=data.stage.x-1 && data.img.x+data.img.w<=data.stage.x+data.stage.w+1 && Math.abs((data.img.x+data.img.w/2)-(data.stage.x+data.stage.w/2))<=1.6 && data.nav.every(n=>n.x>=-1 && n.right<=width+1);
    console.log(ok?'PASS':'FAIL',`${width}px centered image and visible navigation`);if(!ok){bad.push(width);console.log(data)}
  }
}catch(error){console.error(error);bad.push('Chromium error')}
finally{try{client?.close()}catch{}if(proc&&proc.exitCode===null)proc.kill();if(profile)try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:50})}catch{}}
if(bad.length)process.exitCode=1;else console.log('Album viewer browser layout: 4/4 viewport sizes passed.');
