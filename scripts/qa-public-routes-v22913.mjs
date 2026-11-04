/** Static check that literal internal navigation targets resolve to an actual App Router page.
 * Dynamic [param] segments are matched rather than incorrectly reported as missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.join(root,'app');
const pages=[];
function walk(dir) {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())walk(file);
    else if(/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      const relative=path.relative(app,path.dirname(file)).split(path.sep);
      pages.push('/'+relative.filter(x=>x!=='.').join('/'));
    }
  }
}
walk(app);
function validRoute(url) {
  if(!url.startsWith('/')||url.startsWith('//'))return true;
  if(/^\/(?:api|brand|_next)(?:\/|$)/.test(url))return true;
  if(['/robots.txt','/sitemap.xml','/manifest.webmanifest'].includes(url))return true;
  const actual=url.split(/[?#]/)[0].replace(/\/$/,'')||'/';
  return pages.some(route=>{
    const parts=(route==='/'?[]:route.slice(1).split('/'));
    const actualParts=(actual==='/'?[]:actual.slice(1).split('/'));
    let i=0;
    for(const part of parts){
      if(/^\[\.\.\..+\]$/.test(part))return actualParts.length>i;
      if(/^\[\[\.\.\..+\]\]$/.test(part))return true;
      if(i>=actualParts.length)return false;
      if(!/^\[[^\]]+\]$/.test(part) && part!==actualParts[i])return false;
      i++;
    }
    return i===actualParts.length;
  });
}
const issues=[];let count=0;
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const f=path.join(dir,entry.name);
 if(entry.isDirectory())scan(f);
 else if(/\.(tsx|jsx|ts|js)$/.test(entry.name)){
  const s=fs.readFileSync(f,'utf8');
  const pattern=/(?:\bhref\s*=\s*|\bhref\s*:\s*|\bredirect\s*\(\s*|\brouter\.push\s*\(\s*)["'](\/[^"']*)["']/g;
  for(const m of s.matchAll(pattern)){
   const value=m[1];count++;
   if(!validRoute(value))issues.push(`${path.relative(root,f)}: ${value}`);
  }
 }
}}
scan(app);
console.log(`App Router pages: ${pages.length}, literal internal links: ${count}`);
for(const issue of issues)console.error('FAIL',issue);
if(issues.length)process.exitCode=1;
else console.log('PASS all literal internal navigation targets resolve');
