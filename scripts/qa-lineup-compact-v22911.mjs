import assert from "node:assert/strict";
import fs from "node:fs";
const match=fs.readFileSync("app/matches/[id]/page.tsx","utf8");
const css=fs.readFileSync("app/matches/[id]/match-player-navigation-v22910.css","utf8");
const profile=fs.readFileSync("app/team/[slug]/page.tsx","utf8");
const matchMobileCss=fs.readFileSync("app/matches/[id]/match-lineup-mobile-v22912.css","utf8");
const checks=[
 ["no five-column strip or additional legend",()=>{ assert.doesNotMatch(match,/matchPlayerStatStrip|PlayerMatchStatStrip|matchPlayerStatLegend/); }],
 ["no redundant season link inside every roster row",()=>{ assert.doesNotMatch(match,/matchPlayerSeasonLink|seasonHref/); }],
 ["both teams use the same lineup component",()=>{ assert.equal((match.match(/<PublicLineup side=/g)||[]).length,2); }],
 ["profile navigation retains match / player context",()=>{ assert.match(match,/playerProfileHref\(profileSlug, \{ seasonId, fromMatchId: matchId, fromLineupId: row.id \}\)/); assert.match(profile,/matchReturnHref\(fromMatchId, fromLineupId\)/); }],
 ["identity, shirt number and position remain visible",()=>{ for(const cls of ["premiumLineupAvatar","premiumLineupName","premiumLineupPlayerLink","premiumLineupBadges"])assert.ok(match.includes(cls)); assert.match(match,/row.shirt_number/); assert.match(match,/localizedPosition/); }],
 ["goals/cards/captain/substitutions remain represented",()=>{ for(const cls of ["goal","own-goal","yellow-card","red-card","captain"])assert.ok(match.includes(`className="${cls}"`)||match.includes(`className="${cls} "`)||match.includes(`className="${cls}"`)); assert.ok(match.includes("<LineupSubstitutionBadge")); }],
 ["per-player statistics request is removed",()=>{ assert.doesNotMatch(match,/from\("player_match_stats"\)/); }],
 ["narrow-layout patch is route-only",()=>{assert.match(match,/import "\.\/match-lineup-mobile-v22912\.css"/);assert.match(matchMobileCss,/@media \(max-width:420px\)/);assert.match(matchMobileCss,/flex:0 0 30px!important/);}],
 ["obsolete route CSS no longer imported",()=>{ assert.doesNotMatch(match,/match-player-stats-v2299\.css/); assert.doesNotMatch(css,/matchPlayerSeasonLink|matchPlayerStatStrip/); }],
];
let pass=0;
for(const [label,fn] of checks){try{fn();console.log("PASS",label);pass++;}catch(err){console.error("FAIL",label,err.message);}}
console.log(`\n${pass}/${checks.length} compact lineup checks passed`);
if(pass!==checks.length)process.exitCode=1;
