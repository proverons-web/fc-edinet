import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import net from "node:net";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";

// Lightweight Chromium responsive smoke test: no Playwright dependency,
// no Supabase credentials, no production requests. Node 22 + Chrome/Edge.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipMissing = process.argv.includes("--skip-if-missing");
const saveScreenshots = process.argv.includes("--screenshots");
const updateBaseline = process.argv.includes("--update-mobile-baseline");
const baselineMobile = path.join(root,"qa/baselines/mobile.css");
if (updateBaseline) {
  fs.mkdirSync(path.dirname(baselineMobile),{recursive:true});
  fs.copyFileSync(path.join(root,"app/mobile.css"),baselineMobile);
  console.log("Updated mobile screenshot regression CSS baseline; review this change before committing.");
}
const widths = [320, 360, 390, 430, 767, 768, 1280, 1920];
const failures = [];
const checks = [];
const verify = (name, passes, detail="") => {
  checks.push({ name, passes: Boolean(passes), detail });
  if (!passes) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

function findBrowser() {
  const candidates = [process.env.CHROME_PATH, process.env.CHROME_BIN, process.env.CHROMIUM_PATH].filter(Boolean);
  if (process.platform === "win32") {
    for (const base of [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]) {
      if (!base) continue;
      for (const suffix of ["Google/Chrome/Application/chrome.exe", "Microsoft/Edge/Application/msedge.exe", "Chromium/Application/chrome.exe"]) candidates.push(path.join(base,suffix));
    }
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome","/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
  } else {
    candidates.push("/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/opt/google/chrome/chrome");
  }
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  if (process.platform === "win32") {
    for (const cmd of ["chrome.exe","msedge.exe"]) {
      const result=spawnSync("where", [cmd], { encoding:"utf8",shell:true });
      if(result.status===0) return result.stdout.trim().split(/\r?\n/)[0];
    }
  }
  return null;
}
const browser = findBrowser();
if (!browser || typeof WebSocket !== "function") {
  const reason = !browser ? "Chrome/Edge/Chromium executable not found" : "Node 22+ native WebSocket is required";
  if(skipMissing) {console.log(`SKIP  Responsive browser QA: ${reason}`);process.exit(0);}
  console.error(`FAIL  Responsive browser QA: ${reason}. Set CHROME_PATH and use Node 22+.`);
  process.exit(1);
}

function openPort() {
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.once("error", reject);
    server.listen(0,"127.0.0.1",()=>{
      const port=server.address().port;
      server.close(()=>resolve(port));
    });
  });
}
function sleep(ms) {return new Promise((resolve)=>setTimeout(resolve,ms));}
async function findDebugger(port, child) {
  for (let tries=0;tries<60;tries++) {
    if(child.exitCode!==null) throw new Error(`Browser exited early with status ${child.exitCode}`);
    try {
      const res=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(550)});
      const pages=await res.json();
      const page=pages.find((x)=>x.type==="page");
      if(page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* Browser may still be starting. */ }
    await sleep(150);
  }
  throw new Error("Chromium DevTools did not become ready");
}
function makeCdp(url) {
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(url);
    const pending=new Map();let id=0;
    ws.addEventListener("error",(e)=>reject(new Error(`WebSocket error: ${e.message??"connect"}`)),{once:true});
    ws.addEventListener("open",()=>resolve({
      async send(method, params={}) {
        const next=++id;
        return new Promise((res,rej)=>{
          pending.set(next,{res,rej});
          ws.send(JSON.stringify({id:next,method,params}));
        });
      },
      close(){ws.close();}
    }),{once:true});
    ws.addEventListener("message",(event)=>{
      const obj=JSON.parse(event.data);
      const wait=pending.get(obj.id);
      if(!wait) return;
      pending.delete(obj.id);
      obj.error ? wait.rej(new Error(`${obj.error.message} (${obj.error.code})`)) : wait.res(obj.result??{});
    });
  });
}
function buildFixture(mobileOverride=null) {
  let html=fs.readFileSync(path.join(root,"qa/fixtures/home-mobile.html"),"utf8");
  const sources=["globals.css","visual-polish.css","home-v215.css","mobile.css"];
  const styles=sources.map((name)=>`<style data-source="${name}">${name==="mobile.css" && mobileOverride!==null ? mobileOverride : fs.readFileSync(path.join(root,"app",name),"utf8")}</style>`).join("\n")+"<style>html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}</style>";
  const crest=fs.readFileSync(path.join(root,"public/brand/fc-edinet-crest.png")).toString("base64");
  html=html.replace("<!-- Styles injected by scripts/qa-responsive.mjs -->",styles);
  html=html.replaceAll("{{CREST_DATA_URI}}",`data:image/png;base64,${crest}`);
  return html;
}

// This is a layout contract test, not a claim that the live Supabase pages
// were rendered. Structural assertions check the seven high-risk areas.
const expression=`(()=>{
  const one=(selector)=>document.querySelector(selector);
  const rect=(e)=>{if(!e)return null;let r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};};
  const style=(e)=>e?getComputedStyle(e):null;
  const kpi=[...one('.fcV215DashboardKpisFull').children].map(e=>({name:e.innerText.trim().split('\\n')[0],visible:style(e).display!=='none',rect:rect(e)}));
  const rail=one('.fcRefRecentMatchesGrid'), card=one('.fcRefRecentMatchCard');
  const foot=one('.globalFooterGrid'),columns=[...document.querySelectorAll('.globalFooterColumn')];
  const name=one('.teamStatisticsMobilePlayerName strong');
  const mobileTimeline=one('.mobileMatchTimeline'), desktopTimeline=one('.horizontalTimelineViewport');
  const overview=one('.premiumOverviewResultTitle');
  const playerMobile=one('.teamStatisticsMobile'), playerDesktop=one('.teamStatisticsTableWrap');
  return {
    viewport:innerWidth,docWidth:document.documentElement.scrollWidth,
    kpi,rail:rect(rail),card:rect(card),railAutoColumns:style(rail).gridAutoColumns,
    footer:rect(foot), footerCols:columns.map(rect),footerBrand:rect(one('.globalFooterBrand')),
    name:rect(name),mobilePlayerDisplay:style(playerMobile).display,desktopPlayerDisplay:style(playerDesktop).display,
    mobileTimelineDisplay:style(mobileTimeline).display,desktopTimelineDisplay:style(desktopTimeline).display,
    overview:rect(overview),overviewColumns:style(overview).gridTemplateColumns,
    mobileNavHidden:style(one('.mobileMenuOverlay'))?.display??'missing'
  };
})()`;
const portalExpression=`(()=>{
 const old=scrollY;
 document.body.insertAdjacentHTML('beforeend','<div class="mobileMenuOverlay" id="testOverlay"><div class="mobileMenuFixed"><div class="mobileMenuPanelHeading"><strong>МЕНЮ</strong></div><div class="mobileMenuInner">Сезон</div></div></div>');
 const e=document.querySelector('#testOverlay'),r=e.getBoundingClientRect(),css=getComputedStyle(e);
 const result={position:css.position,top:r.top,bottom:r.bottom,width:r.width,height:r.height,viewport:innerHeight,scrollBefore:old,scrollAfter:scrollY};
 e.remove();return result;
})()`;
let child, cdp, tmpDir;
try {
  const port=await openPort();
  tmpDir=fs.mkdtempSync(path.join(os.tmpdir(),"fce-responsive-"));
  const args=["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-first-run","--no-default-browser-check",`--user-data-dir=${tmpDir}`,`--remote-debugging-port=${port}`,"--remote-allow-origins=*","about:blank"];
  if(process.platform==="linux")args.push("--no-sandbox");
  child=spawn(browser,args,{stdio:"ignore"});
  cdp=await makeCdp(await findDebugger(port,child));
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  const frame=(await cdp.send("Page.getFrameTree")).frameTree.frame.id;
  if (!fs.existsSync(baselineMobile)) throw new Error("Missing mobile screenshot baseline: qa/baselines/mobile.css");
  const fixture=buildFixture();
  const baselineFixture=buildFixture(fs.readFileSync(baselineMobile,"utf8"));
  const stableFrame = async () => {
    await cdp.send("Runtime.evaluate",{
      expression:"(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true})()",
      awaitPromise:true,returnByValue:true
    });
  };
  for(const width of widths) {
    await cdp.send("Emulation.setDeviceMetricsOverride",{width,height:920,deviceScaleFactor:1,mobile:width<=767});
    await cdp.send("Page.setDocumentContent",{frameId:frame,html:fixture});
    await stableFrame();
    const res=await cdp.send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
    if(res.exceptionDetails)throw new Error(`Browser evaluation failed: ${res.exceptionDetails.text}`);
    const x=res.result.value;
    const mobile=width<=767;
    verify(`${width}px no document overflow`,x.docWidth<=width+1,`scrollWidth=${x.docWidth}`);
    if(mobile) {
      const first=x.kpi.filter(k=>["ИГРЫ","ПОБЕДЫ","НИЧЬИ","ПОРАЖЕНИЯ"].includes(k.name));
      const second=x.kpi.filter(k=>["МЕСТО","МЯЧИ","ОЧКИ"].includes(k.name));
      verify(`${width}px KPI 4+3 rows`,first.length===4 && second.length===3 && first.every(k=>k.visible && Math.abs(k.rect.y-first[0].rect.y)<2) && second.every(k=>k.visible && Math.abs(k.rect.y-second[0].rect.y)<2) && second[0].rect.y>first[0].rect.y+10);
      verify(`${width}px full-width recent match card`,Math.abs(x.card.w-x.rail.w)<3,`card=${x.card.w} rail=${x.rail.w}`);
      verify(`${width}px footer three equal columns`,x.footerCols.length===3 && Math.abs(x.footerCols[0].y-x.footerCols[2].y)<3 && x.footerCols.every((r,i,a)=>i===0 || r.x>a[i-1].x+5) && x.footerBrand.bottom < x.footerCols[0].bottom);
      verify(`${width}px readable player name`,x.name.w>=70 && x.name.h<65,`name width=${x.name.w.toFixed(0)}`);
      verify(`${width}px mobile player cards displayed`,x.mobilePlayerDisplay!=="none" && x.desktopPlayerDisplay==="none");
      verify(`${width}px vertical chronology displayed`,x.mobileTimelineDisplay!=="none" && x.desktopTimelineDisplay==="none");
      verify(`${width}px match result centered in three columns`,x.overviewColumns.split(' ').length===3, x.overviewColumns);
      await cdp.send("Runtime.evaluate",{expression:"scrollTo(0,1500)",returnByValue:true});
      const overlay=await cdp.send("Runtime.evaluate",{expression:portalExpression,returnByValue:true});
      const p=overlay.result.value;
      verify(`${width}px menu fixed after scroll`,p.position==="fixed" && Math.abs(p.top)<1 && Math.abs(p.height-p.viewport)<2 && p.scrollAfter===p.scrollBefore,JSON.stringify(p));
    } else {
      verify(`${width}px desktop statistics preserved`,x.desktopPlayerDisplay!=="none" && x.mobilePlayerDisplay==="none");
      verify(`${width}px desktop chronology preserved`,x.desktopTimelineDisplay!=="none" && x.mobileTimelineDisplay==="none");
    }
    if(saveScreenshots || [320,390,767,768,1280].includes(width)) {
      await cdp.send("Runtime.evaluate",{expression:"scrollTo({top:0,behavior:'instant'})"});
      await stableFrame();
      const current=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:true});
      if(saveScreenshots && [390,768,1280].includes(width)) {
        fs.mkdirSync(path.join(root,"qa-artifacts"),{recursive:true});
        fs.writeFileSync(path.join(root,"qa-artifacts",`responsive-${width}.png`),Buffer.from(current.data,"base64"));
      }
      if([320,390,767,768,1280].includes(width)) {
        await cdp.send("Page.setDocumentContent",{frameId:frame,html:baselineFixture});
        await stableFrame();
        const before=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:true});
        const hash=(png)=>createHash("sha256").update(Buffer.from(png.data,"base64")).digest("hex");
        verify(`${width}px mobile CSS visual baseline unchanged`,hash(current)===hash(before),"Rendering differs from approved v2.29.0 mobile baseline; review screenshot or update intentionally.");
      }
    }
  }
} catch(error) {
  failures.push(error.message);
} finally {
  try{cdp?.close();}catch{}
  if(child && child.exitCode===null)child.kill();
  if(tmpDir)try{fs.rmSync(tmpDir,{recursive:true,force:true,maxRetries:4,retryDelay:100});}catch{}
}
for(const failure of failures)console.error(`FAIL  ${failure}`);
console.log(`Responsive QA: ${checks.length-failures.filter((v)=>checks.some((c)=>v.startsWith(c.name))).length}/${checks.length} viewport assertions passed${failures.length?` (${failures.length} problems)`:""}.`);
if(failures.length)process.exit(1);
console.log(`PASS  Responsive smoke tests at ${widths.join(", ")} px`);
