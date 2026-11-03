import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parseAdminQuery, adminListHref, adminTextMatches } from '../lib/admin-list-search.ts';

const root = path.resolve(import.meta.dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const checks = [];
function verify(description, fn) {
  try { fn(); checks.push(true); console.log(`PASS  ${description}`); }
  catch (error) { checks.push(false); console.error(`FAIL  ${description}: ${error.message}`); }
}

verify('query collapses whitespace and accepts array input', () => assert.equal(parseAdminQuery(['  FC  Edineț  ', 'ignored']), 'FC Edineț'));
verify('query caps input at 80 characters', () => assert.equal(parseAdminQuery('n'.repeat(150)).length, 80));
verify('missing query is empty, never matches malformed value', () => assert.equal(parseAdminQuery(undefined), ''));
verify('status + sort + search persist in generated links', () => assert.equal(adminListHref('/admin/players', { status:'active', sort:'last', q:'Mihai Ion' }), '/admin/players?status=active&sort=last&q=Mihai+Ion'));
verify('default statuses and sorts yield canonical paths', () => assert.equal(adminListHref('/admin/players', { status:'all', sort:'number', q:'  ' }), '/admin/players'));
verify('query is safely URL-encoded (no raw ampersand)', () => assert.equal(adminListHref('/admin/news', { q:'Meci & Știri' }), '/admin/news?q=Meci+%26+%C8%98tiri'));
verify('text matching works with Cyrillic and Romanian', () => { assert.equal(adminTextMatches('мар', 'Marian', 'Мария'), true); assert.equal(adminTextMatches('ȘTE', 'FC Ștefan'), true); });
verify('text matching accepts shirt number as numeric', () => assert.equal(adminTextMatches('19', 'Ion', 19), true));
verify('unmatched query is false', () => assert.equal(adminTextMatches('Steaua', 'FC Edineț', 'Milan'), false));
verify('empty query matches any record', () => assert.equal(adminTextMatches('', null), true));

for (const [page, desc] of [
  ['app/admin/news/page.tsx','news'],
  ['app/admin/players/page.tsx','players'],
  ['app/admin/matches/page.tsx','matches'],
  ['app/admin/match-center/page.tsx','match-center'],
]) {
  verify(`${desc} list has server search with persistent filters`, () => {
    const source = read(page);
    assert.match(source, /parseAdminQuery\(params\.q\)/);
    assert.match(source, /adminTextMatches\(search,/);
    assert.match(source, /<AdminListSearch/);
    assert.match(source, /adminListHref\(/);
  });
}
verify('search works without JavaScript and is keyboard accessible', () => {
  const source = read('app/components/AdminListSearch.tsx');
  assert.match(source, /method="get"/);
  assert.match(source, /type="search"/);
  assert.match(source, /maxLength=\{80\}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /<label/);
});
verify('news list does not fetch full article content', () => {
  const source = read('app/admin/news/page.tsx');
  assert.doesNotMatch(source, /id,title,slug,excerpt,content,/);
});
verify('task list is restricted to staff with edit permission', () => {
  const source = read('app/admin/page.tsx');
  assert.match(source, /await requireStaff\(\)/);
  assert.match(source, /\{canEdit && \(/);
  assert.match(source, /operationsAvailable/);
});
verify('task list does not mistake failed requests for zero', () => {
  const source = read('app/admin/page.tsx');
  assert.match(source, /!draftsResult\.error && !photoResult\.error && !finishedResult\.error && !reportsResult\.error/);
  assert.match(source, /Не удалось загрузить все задачи/);
});
verify('match report worklist is scoped to latest fifty matches', () => {
  const source = read('app/admin/page.tsx');
  assert.match(source, /\.limit\(50\)/);
  assert.match(source, /\!publishedMatchIds\.has\(String\(match\.id\)\)/);
  assert.match(source, /Среди последних 50 завершённых матчей/);
});
verify('all admin UX rules are scoped without !important', () => {
  const css = read('app/admin-workflow-v2294.css');
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /\.adminAppShell \.adminOperationsGrid/);
  assert.match(css, /@media\(max-width:520px\)/);
});
verify('search and task list do not require a new Supabase migration', () => {
  assert.equal(fs.readdirSync(path.join(root,'database')).filter((s)=>s.startsWith('068_')).length,0);
});

const passed = checks.filter(Boolean).length;
console.log(`\n${passed}/${checks.length} admin operations checks passed.`);
if (passed!==checks.length) process.exitCode=1;
