import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const fixture=fs.readFileSync(path.join(root,"qa/fixtures/history-timeline.html"),"utf8");
const cssFiles=["app/globals.css","app/visual-polish.css","app/mobile.css","app/club/history/history-timeline.css"];
const styles=cssFiles.map(name=>`<style>${fs.readFileSync(path.join(root,name),"utf8").replaceAll("</style","<\\/style")}</style>`).join("\n");
const crest=fs.readFileSync(path.join(root,"public/brand/fc-edinet-crest.png")).toString("base64");
const html=fixture.replace("<!-- CSS_INJECT -->",styles).replaceAll("{{CREST_DATA_URI}}",`data:image/png;base64,${crest}`);
const browser=[process.env.CHROME_PATH,process.env.CHROME_BIN,"/usr/bin/chromium","/usr/bin/google-chrome"].find(p=>p&&fs.existsSync(p));
const skip=process.argv.includes("--skip-if-missing");
if(!browser||typeof WebSocket!=="function"){console.log(skip?"SKIP history browser QA (Chromium missing)":"FAIL history browser QA (Chromium missing)");process.exit(skip?0:1)}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){return await new Promise(resolve=>{const server=net.createServer();server.listen(0,"127.0.0.1",()=>{const p=server.address().port;server.close(()=>resolve(p))})})}
async function waitForDebugger(p,ch){for(let i=0;i<70;i++){if(ch.exitCode!==null)throw Error("Chromium exited");try{const r=await fetch(`http://127.0.0.1:${p}/json/list`);const j=await r.json();const tab=j.find(x=>x.type==="page");if(tab?.webSocketDebuggerUrl)return tab.webSocketDebuggerUrl}catch{}await sleep(150)}throw Error("CDP unavailable")}
async function connect(url){const ws=new WebSocket(url),pending=new Map();let seq=0;await new Promise((res,rej)=>{ws.addEventListener("open",res,{once:true});ws.addEventListener("error",rej,{once:true})});ws.addEventListener("message",e=>{const m=JSON.parse(e.data),done=pending.get(m.id);if(done){pending.delete(m.id);done(m)}});return {send(method,params={}){return new Promise((res,rej)=>{const id=++seq;pending.set(id,x=>x.error?rej(Error(x.error.message)):res(x.result));ws.send(JSON.stringify({id,method,params}))})},close(){ws.close()}}}
let processRef,cdp,temp;const errors=[];const check=(good,msg)=>{console.log(good?"PASS":"FAIL",msg);if(!good)errors.push(msg)};
try{
  const port=await freePort();temp=fs.mkdtempSync(path.join(os.tmpdir(),"fce-history-"));
  const flags=["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-first-run",`--user-data-dir=${temp}`,`--remote-debugging-port=${port}`,"--remote-allow-origins=*","about:blank"];
  if(process.platform==="linux")flags.push("--no-sandbox");
  processRef=spawn(browser,flags,{stdio:"ignore"});cdp=await connect(await waitForDebugger(port,processRef));await cdp.send("Page.enable");await cdp.send("Runtime.enable");
  const frame=(await cdp.send("Page.getFrameTree")).frameTree.frame.id;
  for(const width of [320,390,768,1440]){
    await cdp.send("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:width<=610});
    await cdp.send("Page.setDocumentContent",{frameId:frame,html});
    await cdp.send("Runtime.evaluate",{expression:"document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))",awaitPromise:true});
    const expression=`(()=>{const q=s=>document.querySelector(s),xs=s=>[...document.querySelectorAll(s)],r=e=>{const b=e.getBoundingClientRect();return {l:b.left,r:b.right,w:b.width,h:b.height}},entries=xs('.clubTimelineEntry'),cards=xs('.clubTimelineCard');return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,entries:entries.map(r),cards:cards.map(r),img:r(q('.clubTimelineImage')),filters:r(q('.clubChronologyFilters')),head:r(q('.clubChronologyIntro')),titles:xs('.clubTimelineCard h3').map(r)}})()`;
    const reply=await cdp.send("Runtime.evaluate",{expression,returnByValue:true});const data=reply.result.value;
    check(data.scroll<=width+1,`${width}px: no page horizontal overflow (${data.scroll}px)`);
    check(data.entries.length===2&&data.cards.every(x=>x.w>=185&&x.l>=0&&x.r<=width+1),`${width}px: event cards visible and inside viewport`);
    check(data.titles.every((x,i)=>x.l>=data.cards[i].l-2&&x.r<=data.cards[i].r+2),`${width}px: titles remain inside cards`);
    check(data.img.w>0&&data.filters.r<=width+1&&data.head.r<=width+1,`${width}px: media and filters remain visible`);
    if(process.argv.includes("--screenshots")){const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:true});const dest=path.join(root,"qa-artifacts");fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,`history-v2307-${width}.png`),Buffer.from(shot.data,"base64"));}
  }
}catch(error){console.error("FAIL",error.stack||error);errors.push(String(error))}
finally{try{cdp?.close()}catch{}if(processRef&&processRef.exitCode===null)processRef.kill();if(temp)try{fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}
console.log(`Club history browser layout: ${errors.length?"FAIL":"PASS"} (4 widths)`);
if(errors.length)process.exit(1);
