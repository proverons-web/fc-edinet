/** Run on a computer with network access AFTER a successful Vercel deployment.
 * This is a non-authenticated, read-only smoke test; it cannot validate admin routes.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const expectedVersion=JSON.parse(fs.readFileSync(path.join(projectRoot,'package.json'),'utf8')).version;
const base = (process.env.FC_EDINET_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://fc-edinet.vercel.app').replace(/\/+$/,'');
const routes = [ '/', '/news', '/team', '/staff', '/matches', '/standings', '/statistics', '/media', '/club/about', '/api/version', '/sitemap.xml', '/robots.txt' ];
const results = [];
for (const pathname of routes) {
  try {
    const response = await fetch(`${base}${pathname}`, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
      headers: { 'user-agent': `FC-Edinet-Production-Audit/${expectedVersion}` },
    });
    const type=response.headers.get('content-type')||'';
    let ok = response.ok;
    let detail = `${response.status} ${type}`;
    if (ok && pathname === '/api/version') {
      const data = await response.json();
      ok = data?.version === expectedVersion;
      detail += ` version=${String(data?.version ?? '?')}`;
    } else if (ok && pathname === '/sitemap.xml') {
      const body=await response.text();
      ok = body.includes('<urlset') && body.includes('/matches') && body.includes('/team');
      detail += ` sitemap=${ok?'ok':'invalid'}`;
    } else if (ok && pathname === '/robots.txt') {
      const body=await response.text();
      ok = body.includes('Disallow: /admin');
    } else if (ok) {
      const body=await response.text();
      ok = type.includes('text/html') && /FC Edine[tțţ]/i.test(body);
      detail += ` branding=${ok?'ok':'missing'}`;
    }
    results.push({route:pathname,ok,detail});
    console.log(`${ok?'PASS':'FAIL'} ${pathname} ${detail}`);
  } catch(error) {
    results.push({route:pathname,ok:false,detail:String(error?.message||error)});
    console.error(`FAIL ${pathname}: ${error?.message||error}`);
  }
}
const failed=results.filter(x=>!x.ok);
console.log(`Live public routes: ${results.length - failed.length}/${results.length} passed at ${base}`);
if(failed.length) process.exitCode=1;
