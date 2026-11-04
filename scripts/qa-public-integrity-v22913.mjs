import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  hasRecordedScore, matchScoreText, matchVenue,
  clubMatchResultClass, isCalendarMatchRelevant,
} from '../lib/public-match-integrity.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
function check(name, fn) {
  try { fn(); console.log(`PASS ${name}`); passed++; }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}
function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }

check('finished 0:0 is preserved as a legitimate draw', () => {
  const match = { status: 'finished', home_score: 0, away_score: 0 };
  assert.equal(hasRecordedScore(match), true);
  assert.equal(matchScoreText(match), '0 : 0');
});
check('finished match with missing home score never becomes 0:0', () => {
  assert.equal(matchScoreText({status:'finished',home_score:null,away_score:0}), '— : —');
  assert.equal(matchScoreText({status:'finished',home_score:null,away_score:0}, ':'), '—:—');
});
check('missing away score and both missing score remain unknown', () => {
  assert.equal(matchScoreText({status:'finished',home_score:2,away_score:null}), '— : —');
  assert.equal(matchScoreText({status:'live',home_score:null,away_score:null}), '— : —');
});
check('scheduled matches use VS even if placeholder scores exist', () => {
  assert.equal(matchScoreText({status:'scheduled',home_score:0,away_score:0}), 'VS');
});
check('invalid negative and partial scoring values are not displayed', () => {
  assert.equal(hasRecordedScore({status:'finished',home_score:-1,away_score:2}), false);
  assert.equal(matchScoreText({status:'finished',home_score:1.5,away_score:2}), '— : —');
});
check('matches already live remain visible after their kickoff', () => {
  assert.equal(isCalendarMatchRelevant({status:'live',kickoff:'2020-01-01T00:00:00Z'},new Date('2026-11-04')),true);
});
check('postponed matches stay findable even when scheduled time is past', () => {
  assert.equal(isCalendarMatchRelevant({status:'postponed',kickoff:'2020-01-01T00:00:00Z'},new Date('2026-11-04')),true);
});
check('past scheduled and finished fixtures do not enter upcoming list', () => {
  assert.equal(isCalendarMatchRelevant({status:'scheduled',kickoff:'2020-01-01T00:00:00Z'},new Date('2026-11-04')),false);
  assert.equal(isCalendarMatchRelevant({status:'finished',kickoff:'2026-12-01T00:00:00Z'},new Date('2026-11-04')),false);
});
check('future scheduled fixtures remain in upcoming list', () => {
  assert.equal(isCalendarMatchRelevant({status:'scheduled',kickoff:'2026-12-01T00:00:00Z'},new Date('2026-11-04')),true);
});
check('specific match stadium overrides default home stadium', () => {
  assert.equal(matchVenue({stadium:'Stadionul Edineț',home:{home_stadium:'Default Stadium'}}),'Stadionul Edineț');
  assert.equal(matchVenue({stadium:null,home:{home_stadium:'Default Stadium'}}),'Default Stadium');
});
check('unknown result cannot be marked as a draw or a win', () => {
  assert.equal(clubMatchResultClass({status:'finished',home_score:null,away_score:null,home:{is_club:true}}),'');
});
check('real win draw and loss classification still works', () => {
  const base={status:'finished',home:{is_club:true},away:{is_club:false}};
  assert.equal(clubMatchResultClass({...base,home_score:2,away_score:1}),' result-win');
  assert.equal(clubMatchResultClass({...base,home_score:1,away_score:1}),' result-draw');
  assert.equal(clubMatchResultClass({...base,home_score:0,away_score:1}),' result-loss');
});
check('calendar query explicitly retains live after kickoff', () => {
  const s=read('app/matches/page.tsx');
  assert.match(s,/status\.eq\.live,status\.eq\.postponed,and\(status\.eq\.scheduled,kickoff\.gte/);
  assert.doesNotMatch(s,/\.in\("status",\["scheduled","live","postponed"\]\)\.gte\("kickoff",now\)/);
});
check('public calendar uses shared score and stadium policies', () => {
  const s=read('app/matches/page.tsx');
  for(const name of ['clubMatchResultClass(match)','matchScoreText(match)','matchVenue(match)']) assert.ok(s.includes(name),name);
});
check('public protocol does not invent zero scores in key summary blocks', () => {
  const s=read('app/matches/[id]/page.tsx');
  assert.ok(s.includes('matchScoreText(match, ":")'));
  assert.ok(s.includes('matchVenue(match)'));
  assert.ok(s.includes('home={match.home_score} away={match.away_score}'));
});
check('favorite cards and social preview use shared score policies', () => {
  assert.ok(read('app/account/favorites/page.tsx').includes('matchScoreText(match, ":")'));
  assert.ok(read('app/matches/[id]/opengraph-image.tsx').includes('matchScoreText(match || {})'));
});
check('public back button falls back on direct external arrival', () => {
  const s=read('app/components/PublicBackLink.tsx');
  assert.ok(s.includes('document.referrer'));
  assert.ok(s.includes('new URL(document.referrer).origin === window.location.origin'));
  assert.ok(s.includes('router.push(fallbackHref)'));
});
check('match result integrity does not modify lineup event calculations', () => {
  assert.ok(read('app/matches/[id]/page.tsx').includes('publicRunningScoreByEvent(events, match)'));
  assert.ok(read('app/matches/[id]/page.tsx').includes('lineupEventsForPlayer'));
});
check('release metadata matches package.json', () => {
  const expected = JSON.parse(read('package.json')).version;
  assert.match(expected, /^\d+\.\d+\.\d+$/);
  assert.ok(read('lib/release.ts').includes(`RELEASE_VERSION = \"${expected}\"`));
});

console.log(`Public Integrity QA: ${passed}/19 checks passed.`);
if(process.exitCode) process.exit(1);
