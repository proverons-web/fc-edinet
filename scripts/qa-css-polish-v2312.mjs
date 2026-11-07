import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CSS source integrity only: screenshot QA verifies the rendered result separately.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const cssFiles = ['globals.css', 'visual-polish.css', 'home-v215.css', 'mobile.css'];
let passed = 0;
function check(title, fn) {
  try { fn(); ++passed; console.log(`PASS  ${title}`); }
  catch (error) { console.error(`FAIL  ${title}: ${error.message}`); process.exitCode = 1; }
}

function checkBraces(source, name) {
  let depth = 0, quote = null, comment = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (comment) { if (c === '*' && next === '/') { comment = false; i++; } continue; }
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === '/' && next === '*') { comment = true; i++; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; assert.ok(depth >= 0, `${name}: unexpected closing brace at ${i}`); }
  }
  assert.equal(depth, 0, `${name}: unclosed CSS block`);
  assert.equal(quote, null, `${name}: unclosed string`);
  assert.equal(comment, false, `${name}: unclosed comment`);
}

check('v2.30.13 release and single installer instruction', () => {
  assert.equal(JSON.parse(read('package.json')).version, '2.30.13');
  assert.match(read('lib/release.ts'), /RELEASE_VERSION = "2\.30\.13"/);
  assert.deepEqual(fs.readdirSync(root).filter(x => /^STEP-.*\.txt$/.test(x)), ['STEP-2.30.13.txt']);
});
check('CSS stylesheets have balanced braces, strings, and comments', () => {
  for (const name of cssFiles) checkBraces(read(`app/${name}`), name);
});
check('39 legacy empty selectors were removed without changing CSS cascade order', () => {
  for (const name of cssFiles) {
    const css = read(`app/${name}`).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /(?:\.|#)[^{};]*\{\s*\}/, `${name} contains an empty selector`);
  }
  const cssImports = [...read('app/layout.tsx').matchAll(/import "\.\/([^"\n]+\.css)";/g)].map(m => m[1]);
  assert.deepEqual(cssImports, cssFiles);
});
check('Focus outlines appear only with keyboard focus', () => {
  const css = read('app/visual-polish.css');
  assert.match(css, /a:focus-visible,button:focus-visible,\[role="button"\]:focus-visible\{outline:3px solid #1357a6/);
  assert.match(css, /\.globalHeader a:focus-visible/);
  assert.doesNotMatch(css.slice(css.lastIndexOf('v2.30.12')), /(^|\n)\s*a:focus\s*\{/m);
});
check('Reduced-motion preference disables smooth scrolling', () => {
  const css = read('app/visual-polish.css');
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\s*html\{scroll-behavior:auto\}/);
  assert.match(css, /\.fcRefLeadNewsMedia img,\.canvasVirtualViewport/);
});
check('CSS footprint remains within the reviewed budget', () => {
  const totalBytes = cssFiles.reduce((n, f) => n + Buffer.byteLength(read(`app/${f}`)), 0);
  assert.ok(totalBytes <= 885481, `CSS grew beyond v2.30.11 baseline: ${totalBytes}`);
  console.log(`INFO  active CSS source bytes: ${totalBytes.toLocaleString('en-US')}`);
});
check('QA and deployment pipeline include the source guard', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.match(packageJson.scripts['qa:all'], /qa:css:polish/);
  assert.match(packageJson.scripts['deploy:check'], /qa-css-polish-v2312\.mjs/);
  assert.match(read('.github/workflows/responsive-qa.yml'), /node scripts\/qa-css-polish-v2312\.mjs/);
});
console.log(`\nCSS Final Polish: ${passed}/7 checks passed.`);
