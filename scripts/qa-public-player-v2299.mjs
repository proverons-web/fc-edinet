import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { lineupEventParticipant, lineupEventsForPlayer, publicPlayerMatchFacts } from "../lib/public-match-player-stats.ts";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("app/matches/[id]/page.tsx");
const css = read("app/matches/[id]/match-player-navigation-v22910.css");
const results = [];
function check(name, action) {
  try { action(); console.log("PASS", name); results.push(true); }
  catch (error) { console.error("FAIL", name, error.message); results.push(false); }
}
const row = (changes = {}) => ({id: 1, match_id: 31, team_id: 1, side: "home", lineup_role: "starter", slot_number: 1, player_id: "p1", player_name: "Ivan Petrov", shirt_number: 9, position: "forward", is_captain: false, sort_order: 1, ...changes});
const event = (changes = {}) => ({id: "e1", match_id: 31, team_id: 1, player_id: "p1", player_name: "Ivan Petrov", related_player_id: null, related_player_name: null, event_type: "goal", minute: 42, stoppage_minute: 0, description: null, sort_order: 1, ...changes});
const full = {player_id: "p1", team_id: 1, appearance: "starter", minutes_played: 90, goals: 2, assists: 1, yellow_cards: 1, red_cards: 0};
check("completed statistics take precedence over inferred events", () => assert.deepEqual(publicPlayerMatchFacts(row(), [event()], full, new Set()), {minutes:90,goals:2,assists:1,yellow:1,red:0,source:"completed"}));
check("absence of completed data never becomes a synthetic zero", () => assert.deepEqual(publicPlayerMatchFacts(row(), [], null, new Set()), {minutes:null,goals:null,assists:null,yellow:null,red:null,source:"missing"}));
check("a real goal is visible without complete stats, but minutes and assists remain missing", () => assert.deepEqual(publicPlayerMatchFacts(row(), [event()], null, new Set()), {minutes:null,goals:1,assists:null,yellow:null,red:null,source:"events"}));
check("opponent with identical name is not attributed events", () => assert.equal(lineupEventsForPlayer([event()], row({team_id:2,player_id:null})).length,0));
check("player ID beats same name within team", () => assert.equal(lineupEventParticipant(event(),row({player_id:"p2"})),false));
check("manual opponent matching only works within its team", () => assert.equal(lineupEventParticipant(event({player_id:null,team_id:4}), row({team_id:4,player_id:null})),true));
check("event without team cannot be guessed by a player name", () => assert.equal(lineupEventParticipant(event({player_id:null,team_id:null}),row()),false));
check("separate red card and second yellow do not double-count dismissal", () => {
  const cards=[event({id:"y",event_type:"yellow_card"}),event({id:"r",event_type:"red_card"})];
  assert.equal(publicPlayerMatchFacts(row(),cards,null,new Set(["y"])).red,1);
});
check("manual opponent cannot inherit an identified player event", () => assert.equal(lineupEventParticipant(event(),row({player_id:null})),false));
check("substitution tracks both outgoing and incoming players", () => {
  const sub = event({event_type:"substitution", related_player_id:"p2", related_player_name:"Maria Ionescu"});
  assert.equal(lineupEventsForPlayer([sub],row()).length,1);
  assert.equal(lineupEventsForPlayer([sub],row({player_id:"p2",player_name:"Maria Ionescu"})).length,1);
});
check("second yellow event is counted as a dismissal", () => {
  const yellow=event({event_type:"yellow_card"});
  assert.deepEqual(publicPlayerMatchFacts(row(),[yellow],null,new Set(["e1"])),{minutes:null,goals:null,assists:null,yellow:1,red:1,source:"events"});
});
check("wrong-team stat row is ignored", () => assert.equal(publicPlayerMatchFacts(row(),[],{...full,team_id:2},new Set()).source,"missing"));
check("invalid numeric stats become missing rather than misleading values", () => {
  const facts = publicPlayerMatchFacts(row(),[],{...full,minutes_played:-1,assists:Number.NaN},new Set());
  assert.equal(facts.minutes,null); assert.equal(facts.assists,null);
});
check("public protocol does not query per-player match statistics", () => {
  assert.doesNotMatch(page, /from\("player_match_stats"\)/);
  assert.doesNotMatch(page, /PublicPlayerMatchStat/);
});
check("lineup rows remain compact and show identity plus event badges", () => {
  assert.match(page, /className="publicLineupRow premiumLineupRow"/);
  assert.match(page, /className="premiumLineupBadges"/);
  assert.match(page, /premiumLineupAvatar/);
  assert.match(page, /premiumLineupName/);
  assert.doesNotMatch(page, /PlayerMatchStatStrip|matchPlayerStatStrip|matchPlayerStatLegend/);
});
check("profile navigation remains available on player name", () => {
  assert.match(page, /href={profileHref}/);
  assert.match(page, /playerProfileHref\(profileSlug, \{ seasonId, fromMatchId: matchId, fromLineupId: row.id \}\)/);
  assert.doesNotMatch(page, /matchPlayerSeasonLink|seasonHref/);
});
check("retired statistics stylesheet cannot affect roster", () => {
  assert.doesNotMatch(page, /match-player-stats-v2299\.css/);
  assert.doesNotMatch(css, /matchPlayerStatStrip|matchPlayerSeasonLink/);
  assert.ok(!fs.existsSync(path.join(root,"app/matches/[id]/match-player-stats-v2299.css")));
});
const passed=results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} public player stats QA passed.`);
if(passed!==results.length)process.exitCode=1;
