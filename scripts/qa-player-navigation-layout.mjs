import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const styles=["app/globals.css","app/visual-polish.css","app/home-v215.css","app/mobile.css","app/matches/[id]/match-player-navigation-v22910.css","app/team/[slug]/player-navigation-v22910.css"];
const fixture=fs.readFileSync(path.join(root,"qa/fixtures/player-navigation.html"),"utf8");
const html=fixture.replace("<!-- CSS_INJECT -->",styles.map(file=>`<style>${fs.readFileSync(path.join(root,file),"utf8").replaceAll("</style","<\\/style")}</style>`).join("\n"));
const browser=[process.env.CHROME_PATH,process.env.CHROME_BIN,"/usr/bin/chromium","/usr/bin/google-chrome","/usr/bin/chromium-browser",process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES,"Google/Chrome/Application/chrome.exe"),process.env["PROGRAMFILES(X86)"]&&path.join(process.env["PROGRAMFILES(X86)"],"Microsoft/Edge/Application/msedge.exe")].filter(Boolean).find(p=>fs.existsSync(p));
const skip=process.argv.includes("--skip-if-missing");
if(!browser || typeof WebSocket!=="function") {if(skip){console.log("SKIP player navigation layout — Chromium/Edge unavailable");process.exit(0)}console.error("Chrome/Edge and Node 22+ required");process.exit(1)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function newPort(){return new Promise(resolve=>{const s=net.createServer();s.listen(0,"127.0.0.1",()=>{const port=s.address().port;s.close(()=>resolve(port));})})}
async function endpoint(port,child){for(let i=0;i<65;i++){if(child.exitCode!==null)throw Error("Chrome exited early");try{const res=await fetch(`http://127.0.0.1:${port}/json/list`), arr=await res.json();const p=arr.find(e=>e.type==="page");if(p?.webSocketDebuggerUrl)return p.webSocketDebuggerUrl;}catch{}await sleep(120);}throw Error("Chromium CDP unavailable");}
async function connect(url){const ws=new WebSocket(url),pending=new Map();let count=0;await new Promise((ok,fail)=>{ws.addEventListener("open",ok,{once:true});ws.addEventListener("error",fail,{once:true});});ws.addEventListener("message",e=>{const m=JSON.parse(e.data),fn=pending.get(m.id);if(fn){pending.delete(m.id);fn(m)}});return {send(method,params={}){return new Promise((ok,fail)=>{const id=++count;pending.set(id,m=>m.error?fail(Error(m.error.message)):ok(m.result));ws.send(JSON.stringify({id,method,params}))})},close(){ws.close()}}}
const widths=[320,360,390,430,767,768,1280],failed=[];let child,cdp,tmp;
function verify(pass,msg){if(pass)console.log("PASS",msg);else{console.error("FAIL",msg);failed.push(msg)}}
const expression=`(()=>{const q=s=>document.querySelector(s),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,w:r.width}},nav=q('.playerProfileQuickNav'),links=[...document.querySelectorAll('.playerProfileQuickLinks a')],panel=q('.premiumLineupRow'),action=q('.premiumLineupPlayerLink');return {vw:innerWidth,full:document.documentElement.scrollWidth,nav:rect(nav),links:links.map(rect),panel:rect(panel),action:rect(action),scrollMargin:getComputedStyle(q('#player-season-stats')).scrollMarginTop,returnLink:q('.playerReturnToMatch')?.getAttribute('href')};})()`;
try{
 const port=await newPort();tmp=fs.mkdtempSync(path.join(os.tmpdir(),"fce-nav-v22910-"));const flags=["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-first-run",`--user-data-dir=${tmp}`,`--remote-debugging-port=${port}`,"--remote-allow-origins=*","about:blank"];
 if(process.platform==="linux")flags.push("--no-sandbox");child=spawn(browser,flags,{stdio:"ignore"});cdp=await connect(await endpoint(port,child));await cdp.send("Page.enable");await cdp.send("Runtime.enable");const frame=(await cdp.send("Page.getFrameTree")).frameTree.frame.id;
 for(const width of widths){await cdp.send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<=767});await cdp.send("Page.setDocumentContent",{frameId:frame,html});const r=await cdp.send("Runtime.evaluate",{expression,returnByValue:true});const d=r.result.value;
  verify(d.full<=width+1,`${width}px no horizontal overflow (actual ${d.full})`);
  verify(d.links.length===4&&d.links.every(t=>t.x>=-1&&t.right<=width+1),`${width}px all quick-navigation links remain visible`);
  verify(d.action.x>=d.panel.x-1 && d.action.right<=d.panel.right+1,`${width}px player link fits within the compact roster row`);
  verify(d.scrollMargin==="100px"&&d.returnLink==="/matches/11#lineup-player-17",`${width}px correct target offset and contextual return`);
 }
}catch(e){console.error("FAIL",e.stack??e);failed.push(e.message)}finally{try{cdp?.close()}catch{}if(child&&child.exitCode===null)child.kill();if(tmp)try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch{}}
console.log(`\nPlayer navigation layout: ${failed.length===0?"PASS":"FAIL"} — ${widths.length} widths`);
if(failed.length)process.exitCode=1;
