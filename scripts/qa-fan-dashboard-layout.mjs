/** Real Chromium geometry check for v2.30.1 fan account (isolated static fixture). */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stylesheet=['app/globals.css','app/visual-polish.css','app/home-v215.css','app/mobile.css','app/account/fan-dashboard-v2301.css'];
const template=fs.readFileSync(path.join(root,'qa/fixtures/fan-dashboard-v2301.html'),'utf8');
const html=template.replace('<!-- CSS_INJECT -->',stylesheet.map(name=>`<style>${fs.readFileSync(path.join(root,name),'utf8').replaceAll('</style','<\\/style')}</style>`).join('\n'));
const browser=[process.env.CHROME_PATH,process.env.CHROME_BIN,'/usr/bin/chromium','/usr/bin/google-chrome',process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe')].filter(Boolean).find(p=>fs.existsSync(p));
const skip=process.argv.includes('--skip-if-missing');
if(!browser || typeof WebSocket!=='function'){
  console.log(skip?'SKIP Fan layout QA — Chromium unavailable':'FAIL Fan layout QA — Chromium unavailable');
  process.exit(skip?0:1);
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function findPort(){return new Promise(resolve=>{const srv=net.createServer();srv.listen(0,'127.0.0.1',()=>{const p=srv.address().port;srv.close(()=>resolve(p));});});}
async function getEndpoint(port,child){for(let i=0;i<70;i++){if(child.exitCode!==null)throw Error('Browser exited');try{const r=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(600)});const j=await r.json();const p=j.find(x=>x.type==='page');if(p?.webSocketDebuggerUrl)return p.webSocketDebuggerUrl;}catch{}await sleep(120);}throw Error('Browser CDP timeout');}
async function openCdp(endpoint){let n=0;const pending=new Map();const ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(pending.has(msg.id)){const cb=pending.get(msg.id);pending.delete(msg.id);msg.error?cb.reject(Error(msg.error.message)):cb.resolve(msg.result);}});return{send(method,params={}){return new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});},close(){ws.close()}};}
const widths=[320,360,390,430,768,1280],fail=[];let child,cdp,profile;
const check=(good,label)=>{console.log(good?'PASS':'FAIL',label);if(!good)fail.push(label);};
try{
  const port=await findPort();profile=fs.mkdtempSync(path.join(os.tmpdir(),'fce-fan-account-'));
  const args=['--headless=new','--disable-gpu','--no-first-run','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','about:blank'];
  if(process.platform==='linux')args.push('--no-sandbox');
  child=spawn(browser,args,{stdio:'ignore'});cdp=await openCdp(await getEndpoint(port,child));
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');
  const frameId=(await cdp.send('Page.getFrameTree')).frameTree.frame.id;
  for(const width of widths){
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=430});
    await cdp.send('Page.setDocumentContent',{frameId,html});
    const expression=`(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const selectors=['.fanV2301Card','.fanV2301Match','.fanV2301MatchInfo','.fanV2301MatchActions','.fanV2301Filters','.fanV2301Filter','.fanV2301Player'];const elements=selectors.flatMap(s=>[...document.querySelectorAll(s)]);return{pageWidth:document.documentElement.scrollWidth,viewport:innerWidth, boxes:elements.map(el=>{const b=el.getBoundingClientRect();return{selector:el.className,left:b.left,right:b.right,width:b.width,height:b.height}}),players:document.querySelectorAll('.fanV2301Player').length,actions:document.querySelectorAll('.fanV2301Action,.fanV2301Remove').length}})()`;
    const result=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    const d=result.result.value;
    check(d.pageWidth<=width+1,`${width}px: no horizontal page overflow (${d.pageWidth})`);
    check(d.boxes.every(b=>b.left>=-1&&b.right<=width+1&&b.width>0),`${width}px: all account cards and controls inside viewport`);
    check(d.players===3&&d.actions===4,`${width}px: players, calendar and favorite actions present`);
  }
}catch(error){console.error('FAIL',error.stack??error);fail.push('Browser test failed');}
finally{try{cdp?.close();}catch{}if(child&&child.exitCode===null)child.kill();if(profile)try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:4,retryDelay:50});}catch{}}
console.log(`Fan Dashboard layout QA: ${fail.length?'FAIL':'PASS'} (${widths.length} widths)`);
if(fail.length)process.exit(1);
