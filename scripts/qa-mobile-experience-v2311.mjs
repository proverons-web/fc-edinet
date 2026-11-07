import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const pkg = JSON.parse(read('package.json'));
const nav = read('app/components/HeaderNavClient.tsx');
const matches = read('app/matches/page.tsx');
const standings = read('app/components/StandingsTable.tsx');
const media = read('app/components/ClubArchiveGallery.tsx');
const youtube = read('app/components/YouTubePlayer.tsx');
const carousel = read('app/components/RecentMatchesCarousel.tsx');
const hero = read('app/components/PageHeroShell.tsx');
const header = read('app/components/SiteHeader.tsx');
const home = read('app/page.tsx');
const checks = [];
function check(name, task) {
  try {task();checks.push(true);console.log('PASS',name);}
  catch (e) {checks.push(false);console.error('FAIL',name,e.message);}
}
check('Release metadata matches v2.30.16', () => {
  assert.equal(pkg.version, '2.30.16');
  assert.match(read('lib/release.ts'), /RELEASE_VERSION = "2\.30\.16"/);
});
check('Mobile dialog is portalled above the sticky header', () => {
  assert.match(nav,/createPortal\(/);
  assert.match(nav,/className="mobileMenuOverlay"/);
  assert.match(nav,/role="dialog" aria-modal="true"/);
});
check('Mobile menu locks body scroll only while open', () => {
  assert.match(nav,/if \(!menuOpen\) return;/);
  assert.match(nav,/document\.body\.style\.overflow = "hidden"/);
  assert.match(nav,/document\.body\.style\.overflow = previousOverflow/);
});
check('Mobile dialog takes focus when opened', () => {
  assert.match(nav,/mobileDialogRef\.current/);
  assert.match(nav,/\.mobileMenuPanelClose"\)\?\.focus\(\)/);
});
check('Tab and Shift+Tab do not leave dialog', () => {
  assert.match(nav,/event\.key !== "Tab"/);
  assert.match(nav,/event\.shiftKey/);
  assert.match(nav,/last\.focus\(\)/);
  assert.match(nav,/first\.focus\(\)/);
});
check('Escape closes mobile menu', () => {
  assert.match(nav,/event\.key === "Escape"/);
  assert.match(nav,/setMenuOpen\(false\)/);
  assert.match(nav,/mobileToggleRef\.current\?\.focus\(\)/);
});
check('Mobile toggle exposes correct expanded and controlled state', () => {
  assert.match(nav,/ref=\{mobileToggleRef\}/);
  assert.match(nav,/aria-expanded=\{menuOpen\}/);
  assert.match(nav,/aria-controls="mobile-site-menu"/);
});
check('Mobile menu retains RU/RO close labels', () => {
  assert.ok(nav.includes('Închide meniul'));
  assert.ok(nav.includes('Закрыть меню'));
});
check('Match list logos use bounded optimized public image loading', () => {
  assert.match(matches,/import PublicImage from/);
  assert.match(matches,/<PublicImage className="publicTeamLogo"[^>]*width=\{62\} height=\{62\}[^>]*sizes=/);
});
check('Long match list does not prefetch every match protocol', () => {
  assert.match(matches,/publicMatchDetailsButton" prefetch=\{false\}/);
});
check('Standings logos have responsive optimized dimensions', () => {
  assert.match(standings,/import PublicImage from/);
  assert.equal((standings.match(/<PublicImage className="standingLogo"/g)||[]).length,2);
  assert.match(standings,/sizes="\(max-width: 767px\) 20px, 40px"/);
});
check('Archive thumbnails use optimized responsive lazy image delivery', () => {
  assert.match(media, /import PublicImage from/);
  assert.match(media, /<PublicImage src=\{p\.image_url\}/);
  assert.match(media, /sizes="\(max-width: 767px\) 100vw/);
  assert.match(media, /<img src=\{photos\[active\]\.image_url\}/);
});
check('YouTube thumbnail occupies a 16:9 intrinsic rectangle', () => {
  assert.match(youtube, /width=\{640\}/);
  assert.match(youtube, /height=\{360\}/);
  assert.match(youtube, /loading="lazy"/);
});
check('YouTube fallback cannot retry forever if missing', () => {
  assert.match(youtube, /if \(thumbnail !== fallback\) setThumbnail\(fallback\)/);
});
check('YouTube iframe still mounts only after visitor clicks', () => {
  assert.match(youtube, /\{playing \? \(/);
  assert.match(youtube, /onClick=\{\(\) => setPlaying\(true\)\}/);
});
check('Carousel respects system reduced-motion setting', () => {
  assert.match(carousel, /prefers-reduced-motion: reduce/);
  assert.match(carousel, /reducedMotion \? "auto" : "smooth"/);
});
check('Hero has intrinsic dimensions and remains high priority', () => {
  assert.match(hero, /width=\{1600\}[\s\S]*height=\{900\}[\s\S]*loading="eager"/);
  assert.match(home, /width=\{1920\} height=\{1080\} loading="eager"/);
  assert.match(header, /height=\{Math\.round\(Math\.max\(design\.logo_width, 42\) \* 1\.17\)\}/);
});
check('Historical mobile contracts survive new monitoring migration', () => {
  assert.match(read('STEP-2.30.16.txt'), /SQL-МИГРАЦИИ: ДА/);
  assert.equal(fs.readdirSync(path.join(root,'database')).filter(n=>/^078_/.test(n)).length,1);
});
check('Mobile regression checks run in deploy, QA and CI', () => {
  assert.match(pkg.scripts['deploy:check'], /qa-mobile-experience-v2311\.mjs/);
  assert.match(pkg.scripts['qa:all'], /qa:mobile/);
  assert.match(read('.github/workflows/responsive-qa.yml'),/qa-mobile-experience-v2311\.mjs/);
  assert.match(pkg.scripts['deploy:check'], /npm run typecheck && next build/);
  assert.match(read('.github/workflows/responsive-qa.yml'),/npm run typecheck/);
});
const passes = checks.filter(Boolean).length;
console.log(`\nMobile Experience v2.30.16: ${passes}/${checks.length} source checks passed. These checks do not measure field Core Web Vitals.`);
if(passes!==checks.length) process.exitCode=1;
