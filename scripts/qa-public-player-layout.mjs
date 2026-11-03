import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names=["globals.css","visual-polish.css","home-v215.css","mobile.css"].map(n=>path.join(root,"app",n));
names.push(path.join(root,"app/matches/[id]/match-report-v2298.css"),path.join(root,"app/matches/[id]/match-player-stats-v2299.css"));
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
const expr=`(()=>{const q=s=>document.querySelector(s), rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}, rows=[...document.querySelectorAll('.premiumLineupRow')].map(row=>({rect:rect(row),stats:rect(row.querySelector('.matchPlayerStatStrip')),cells:[...row.querySelectorAll('.matchPlayerStatCell')].map(rect),name:rect(row.querySelector('.premiumLineupName'))}));return {vw:innerWidth,width:document.documentElement.scrollWidth,rows,gridCols:getComputedStyle(q('.premiumLineupGrid')).gridTemplateColumns};})()`;
try{
 const port=await newPort();tmp=fs.mkdtempSync(path.join(os.tmpdir(),"fce-player-layout-"));const flags=["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-first-run",`--user-data-dir=${tmp}`,`--remote-debugging-port=${port}`,"--remote-allow-origins=*","about:blank"];
 if(process.platform==="linux")flags.push("--no-sandbox");child=spawn(browser,flags,{stdio:"ignore"});cdp=await connect(await endpoint(port,child));await cdp.send("Page.enable");await cdp.send("Runtime.enable");const frame=(await cdp.send("Page.getFrameTree")).frameTree.frame.id;
 for(const width of widths){await cdp.send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<=767});await cdp.send("Page.setDocumentContent",{frameId:frame,html});const answer=await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true});const d=answer.result.value;
  verify(d.width<=width+1,`${width}px no horizontal overflow (${d.width}px)`);
  verify(d.rows.length===3 && d.rows.every(r=>r.cells.length===5 && r.cells.every((c,i)=>i===0 || Math.abs(c.y-r.cells[0].y)<2)),`${width}px five aligned player statistics`);
  verify(d.rows.every(r=>r.stats.y>=r.name.bottom-3 && r.cells.every(c=>c.x>=r.rect.x-2 && c.right<=r.rect.right+2)),`${width}px indicators stay within player cards`);
  if(width<=767)verify(d.rows.every(r=>r.stats.w>=r.rect.w-22),`${width}px stats use full player card width`);
 }
}catch(err){fail.push(err.message);console.error("FAIL",err.stack??err);}finally{try{cdp?.close()}catch{}if(child&&child.exitCode===null)child.kill();if(tmp)try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:4,retryDelay:100})}catch{}}
console.log(`\nPublic player responsive: ${fail.length===0?"PASS":"FAIL"} — ${widths.length} widths`);
if(fail.length)process.exit(1);
