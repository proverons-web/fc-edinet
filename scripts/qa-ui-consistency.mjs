import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

// v2.29.14: render baseline and current CSS in the SAME Chromium process.
// This is a visual safety net for conservative cascade cleanup, not a claim
// that an authenticated production page has been tested.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const baselinePath=path.join(root,"qa/baselines/ui-v2.29.13-css.json.gz");
const cssNames=["globals.css","visual-polish.css","home-v215.css","mobile.css"];
const update=process.argv.includes("--update-baseline");
const skipMissing=process.argv.includes("--skip-if-missing");
const current=Object.fromEntries(cssNames.map(n=>[n,fs.readFileSync(path.join(root,"app",n),"utf8")]));
if(update){
  fs.writeFileSync(baselinePath,gzipSync(JSON.stringify(current),{mtime:0}));
  console.log("Updated UI CSS visual baseline. Review this change and rerun the entire UI QA before committing.");
  process.exit(0);
}
if(!fs.existsSync(baselinePath)){console.error("FAIL  UI baseline file is missing");process.exit(1);}
const original=JSON.parse(gunzipSync(fs.readFileSync(baselinePath)).toString("utf8"));
const fixtures=[
  {file:"home-mobile.html",placeholder:"<!-- Styles injected by scripts/qa-responsive.mjs -->"},
  {file:"public-player-stats.html",placeholder:"<!-- CSS_INJECT -->"},
  {file:"player-navigation.html",placeholder:"<!-- CSS_INJECT -->"},
  {file:"profile-hero.html",placeholder:"<!-- CSS_INJECT -->"},
  {file:"admin-attention.html",placeholder:"<!-- CSS_INJECT -->"},
];
const widths=[320,390,768,1280];
const crest=fs.readFileSync(path.join(root,"public/brand/fc-edinet-crest.png")).toString("base64");
const lockAnimations="<style>*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}</style>";
function renderHtml(fix, styles){
  const tpl=fs.readFileSync(path.join(root,"qa/fixtures",fix.file),"utf8");
  if(!tpl.includes(fix.placeholder))throw Error(`Fixture injection marker not found: ${fix.file}`);
  const tags=cssNames.map(n=>`<style data-css-file="${n}">${styles[n].replaceAll("</style", "<\\/style")}</style>`).join("\n")+(fix.file==="admin-attention.html"?`<style>${fs.readFileSync(path.join(root,"app/admin-workflow-v2294.css"),"utf8")}</style>`:"");
  return tpl.replace(fix.placeholder,tags+lockAnimations).replaceAll("{{CREST_DATA_URI}}",`data:image/png;base64,${crest}`);
}
const candidates=[process.env.CHROME_PATH,process.env.CHROME_BIN,process.env.CHROMIUM_PATH];
if(process.platform==="win32")for(const base of [process.env.PROGRAMFILES,process.env["PROGRAMFILES(X86)"],process.env.LOCALAPPDATA]){
  if(!base)continue;
  for(const suffix of ["Google/Chrome/Application/chrome.exe","Microsoft/Edge/Application/msedge.exe","Chromium/Application/chrome.exe"])
    candidates.push(path.join(base,suffix));
}
else if(process.platform==="darwin")candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
else candidates.push("/usr/bin/chromium","/usr/bin/google-chrome","/usr/bin/chromium-browser");
let browser=candidates.filter(Boolean).find(p=>fs.existsSync(p));
if(!browser && process.platform==="win32")for(const cmd of ["chrome.exe","msedge.exe"]){
  const r=spawnSync("where",[cmd],{encoding:"utf8",shell:true});
  if(r.status===0){browser=r.stdout.trim().split(/\r?\n/)[0];break;}
}
if(!browser || typeof WebSocket!=="function"){
  const reason="Chromium/Edge and Node 22+ are needed (set CHROME_PATH)";
  if(skipMissing){console.log(`SKIP  UI consistency: ${reason}`);process.exit(0);}
  console.error(`FAIL  ${reason}`);process.exit(1);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function newPort(){return new Promise((resolve,reject)=>{
  const server=net.createServer();server.once("error",reject);
  server.listen(0,"127.0.0.1",()=>{const port=server.address().port;server.close(()=>resolve(port));});
});}
async function endpoint(port,child){
  for(let i=0;i<70;i++){
    if(child.exitCode!==null)throw Error(`Chromium exited: ${child.exitCode}`);
    try{
      const res=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(500)});
      const x=(await res.json()).find(p=>p.type==="page");
      if(x?.webSocketDebuggerUrl)return x.webSocketDebuggerUrl;
    }catch{/* browser starting */}
    await sleep(140);
  }
  throw Error("Chromium DevTools connection timeout");
}
async function connect(url){
  const ws=new WebSocket(url),pending=new Map();let count=0;
  await new Promise((ok,fail)=>{ws.addEventListener("open",ok,{once:true});ws.addEventListener("error",fail,{once:true});});
  ws.addEventListener("message",event=>{
    const r=JSON.parse(event.data),entry=pending.get(r.id);
    if(entry){pending.delete(r.id);r.error?entry.reject(Error(r.error.message)):entry.resolve(r.result??{});}
  });
  return {
    send(method,params={}){return new Promise((resolve,reject)=>{
      const id=++count;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
    });},
    close(){ws.close();}
  };
}
const hash=png=>createHash("sha256").update(Buffer.from(png.data,"base64")).digest("hex");
let child,cdp,tmpDir,failures=[],passed=0;
try{
  const port=await newPort();tmpDir=fs.mkdtempSync(path.join(os.tmpdir(),"fce-ui-consistency-"));
  const args=["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-first-run","--hide-scrollbars",`--user-data-dir=${tmpDir}`,`--remote-debugging-port=${port}`,"--remote-allow-origins=*","about:blank"];
  if(process.platform==="linux")args.push("--no-sandbox");
  child=spawn(browser,args,{stdio:"ignore"});cdp=await connect(await endpoint(port,child));
  await cdp.send("Page.enable");await cdp.send("Runtime.enable");
  const frameId=(await cdp.send("Page.getFrameTree")).frameTree.frame.id;
  async function capture(html){
    await cdp.send("Page.setDocumentContent",{frameId,html});
    const res=await cdp.send("Runtime.evaluate",{
      expression:"(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return document.documentElement.scrollWidth})()",
      awaitPromise:true,returnByValue:true
    });
    if(res.exceptionDetails)throw Error(res.exceptionDetails.text);
    const png=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    return {digest:hash(png),width:res.result.value};
  }
  for(const fixture of fixtures){
    const before=renderHtml(fixture,original),after=renderHtml(fixture,current);
    for(const width of widths){
      await cdp.send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<768});
      const originalShot=await capture(before),newShot=await capture(after);
      if(originalShot.digest!==newShot.digest || originalShot.width!==newShot.width){
        failures.push(`${fixture.file} at ${width}px: screenshot or document width differs (before ${originalShot.width}px, after ${newShot.width}px)`);
      }else{passed++;console.log(`PASS  ${fixture.file} @ ${width}px — visual snapshot identical`);}
    }
  }
}catch(e){failures.push(e.stack??String(e));}finally{
  try{cdp?.close();}catch{}
  if(child && child.exitCode===null)child.kill();
  if(tmpDir)try{fs.rmSync(tmpDir,{recursive:true,force:true,maxRetries:4,retryDelay:100});}catch{}
}
for(const f of failures)console.error("FAIL ",f);
console.log(`UI Consistency QA: ${passed}/${fixtures.length*widths.length} baseline comparisons passed.`);
if(failures.length)process.exit(1);
