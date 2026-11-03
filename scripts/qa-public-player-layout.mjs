import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names=["globals.css","visual-polish.css","home-v215.css","mobile.css"].map(n=>path.join(root,"app",n));
names.push(path.join(root,"app/matches/[id]/match-report-v2298.css"));
names.push(path.join(root,"app/matches/[id]/match-player-navigation-v22910.css"));
names.push(path.join(root,"app/matches/[id]/match-lineup-mobile-v22912.css"));
const template=fs.readFileSync(path.join(root,"qa/fixtures/public-player-stats.html"),"utf8");
const html=template.replace("<!-- CSS_INJECT -->",names.map(n=>`<style>${fs.readFileSync(n,"utf8").replaceAll("</style", "<\\/style")}</style>`).join("\n"));
const browser=[process.env.CHROME_PATH,process.env.CHROME_BIN,"/usr/bin/chromium","/usr/bin/google-chrome","/usr/bin/chromium-browser",
 process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES,"Google/Chrome/Application/chrome.exe"),
 process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"],"Microsoft/Edge/Application/msedge.exe")].filter(Boolean).find(v=>fs.existsSync(v));
const skip=process.argv.includes("--skip-if-missing");
if(!browser||typeof WebSocket!=="function") { if(skip){console.log("SKIP  public player layout QA — Chrome not installed");process.exit(0);} console.error("Chrome/Edge and Node 22+ are required");process.exit(1); }
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function newPort(){return new Promise(resolve=>{const server=net.createServer();server.listen(0,"127.0.0.1",()=>{const port=server.address().port;server.close(()=>resolve(port))})})}
async function endpoint(port,child){for(let i=0;i<65;i++){if(child.exitCode!==null)throw Error("Chromium exited");try{const res=await fetch(`http://127.0.0.1:${port}/json/list`);const j=await res.json();const x=j.find(e=>e.type==="page");if(x?.webSocketDebuggerUrl)return x.webSocketDebuggerUrl;}catch{}await sleep(140);}throw Error("Chromium CDP unavailable");}
async function connect(url){const ws=new WebSocket(url),waiting=new Map();let id=0;await new Promise((res,rej)=>{ws.addEventListener("open",res,{once:true});ws.addEventListener("error",rej,{once:true});});ws.addEventListener("message",e=>{const m=JSON.parse(e.data),w=waiting.get(m.id);if(w){waiting.delete(m.id);w(m);}});return{send(method,params={}){return new Promise((res,rej)=>{const n=++id;waiting.set(n,m=>m.error?rej(Error(m.error.message)):res(m.result));ws.send(JSON.stringify({id:n,method,params}));});},close(){ws.close()}}}
const widths=[320,360,390,767,768,1280],fail=[];let child,cdp,tmp;
const verify=(condition,message)=>{if(condition)console.log("PASS",message);else{fail.push(message);console.error("FAIL",message)}};
const expr=`(()=>{const q=s=>document.querySelector(s),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}},rows=[...document.querySelectorAll('.premiumLineupRow')].map(row=>({rect:rect(row),name:rect(row.querySelector('.premiumLineupName')),badges:rect(row.querySelector('.premiumLineupBadges')),avatar:rect(row.querySelector('.premiumLineupAvatar')),strips:row.querySelectorAll('.matchPlayerStatStrip,.matchPlayerSeasonLink').length}));return {vw:innerWidth,width:document.documentElement.scrollWidth,rows};})()`;
try{
 const port=await newPort();tmp=fs.mkdtempSync(path.join(os.tmpdir(),"fce-player-layout-"));const flags=["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-first-run",`--user-data-dir=${tmp}`,`--remote-debugging-port=${port}`,"--remote-allow-origins=*","about:blank"];
 if(process.platform==="linux")flags.push("--no-sandbox");child=spawn(browser,flags,{stdio:"ignore"});cdp=await connect(await endpoint(port,child));await cdp.send("Page.enable");await cdp.send("Runtime.enable");const frame=(await cdp.send("Page.getFrameTree")).frameTree.frame.id;
 for(const width of widths){await cdp.send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<=767});await cdp.send("Page.setDocumentContent",{frameId:frame,html});await cdp.send("Runtime.evaluate",{expression:"document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))",awaitPromise:true});
  const answer=await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true});const d=answer.result.value;
  verify(d.width<=width+1,`${width}px no horizontal overflow (${d.width}px)`);
  verify(d.rows.length===3&&d.rows.every(r=>r.strips===0),`${width}px no extra statistic strip or action`);
  // Long names can wrap differently in Windows Chrome vs Linux Chromium.
  // Check the actual boundaries, not a brittle single-font fixed height.
  const bad=d.rows.flatMap((r,i)=>{const why=[];
    if(r.rect.h>(width<=360?124:110))why.push(`height ${r.rect.h.toFixed(1)}px`);
    if(r.avatar.x<r.rect.x-2||r.avatar.right>r.rect.right+2)why.push(`avatar x=${r.avatar.x.toFixed(1)}..${r.avatar.right.toFixed(1)}`);
    if(r.avatar.w<28)why.push(`avatar shrunk to ${r.avatar.w.toFixed(1)}px`);
    if(r.badges.x<r.rect.x-2||r.badges.right>r.rect.right+2)why.push(`badges x=${r.badges.x.toFixed(1)}..${r.badges.right.toFixed(1)}`);
    return why.length?[`row ${i+1} (${r.rect.x.toFixed(1)}..${r.rect.right.toFixed(1)}): ${why.join(", ")}`]:[];
  });
  verify(bad.length===0,`${width}px compact roster cards with icons within borders${bad.length?" — "+bad.join("; "):""}`);
  if(width===320) verify(d.rows.every(r=>r.rect.w>=240),`${width}px lineup has usable text width (min row ${Math.min(...d.rows.map(r=>r.rect.w)).toFixed(1)}px)`);
  verify(d.rows.every(r=>r.name.x>=r.rect.x-2 && r.name.right<=r.rect.right+2),`${width}px player names remain within cards`);
 }
}catch(err){fail.push(err.message);console.error("FAIL",err.stack??err);}finally{try{cdp?.close()}catch{}if(child&&child.exitCode===null)child.kill();if(tmp)try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:4,retryDelay:100})}catch{}}
console.log(`\nPublic player responsive: ${fail.length===0?"PASS":"FAIL"} — ${widths.length} widths`);
if(fail.length)process.exit(1);
