import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = p => fs.readFileSync(p, 'utf8');
const sql=read('database/068_atomic_match_lineup_save.sql');
const actions=read('app/admin/match-center/[matchId]/actions.ts');
const lineups=read('app/admin/match-center/[matchId]/LineupEditor.tsx');
const squad=read('app/admin/match-center/[matchId]/ClubSquadStatsEditor.tsx');
const page=read('app/admin/match-center/[matchId]/page.tsx');
let passed=0;
const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name)}catch(error){process.exitCode=1;console.error('FAIL '+name+': '+error.message)}};
const section=(start,end)=>actions.slice(actions.indexOf(start),actions.indexOf(end));
const ordinary=section('export async function saveMatchLineup','export async function importClubLineupFromPlayerStats');
const imported=section('export async function importClubLineupFromPlayerStats','async function ensureTemporaryClubPlayer');
const club=section('export async function saveClubSquadAndStats','const MATCH_CENTER_STATUSES');
for(const [name,body] of [['ordinary lineup',ordinary],['imported lineup',imported],['club lineup',club]]){
  check(name+' uses atomic RPC',()=>assert.match(body,/await persistLineupAtomically\(/));
  check(name+' does not delete lineup separately',()=>assert.doesNotMatch(body,/\.from\("match_lineup_entries"\)\s*\.delete\(\)/));
  check(name+' does not upsert lineup settings separately',()=>assert.doesNotMatch(body,/\.from\("match_lineup_settings"\)\s*\.upsert\(/));
}
check('atomic RPC is restricted to authenticated editors',()=>{
 assert.match(sql,/security invoker/);assert.match(sql,/auth\.uid\(\)/);assert.match(sql,/public\.is_editor_or_admin\(\)/);
 assert.match(sql,/revoke all on function public\.save_match_lineup_atomic[\s\S]*?from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.save_match_lineup_atomic[\s\S]*?to authenticated/);
});
check('team is derived from match, not supplied by client',()=>{
 assert.match(sql,/select home_team_id,away_team_id/);assert.match(sql,/v_team_id := case when p_side='home'/);
 assert.match(sql,/values \(p_match_id,v_team_id,p_side/);
});
check('match lock serializes parallel writes',()=>assert.match(sql,/where id=p_match_id for update/));
check('optimistic concurrency detects stale editor forms',()=>{
 assert.match(sql,/v_updated_at is distinct from p_expected_updated_at/);
 assert.match(sql,/errcode='40001'/);
 assert.match(actions,/p_compare_revision: compareRevision/);
 assert.match(ordinary,/"lineup_revision", 80\), true/);
 assert.match(club,/"lineup_revision", 80\), true/);
});
check('editor forms carry loaded revision token',()=>{
 assert.match(lineups,/name="lineup_revision" value=\{setting\?\.updated_at \?\? ""\}/);
 assert.match(squad,/name="lineup_revision" value=\{lineupUpdatedAt \?\? ""\}/);
 assert.match(page,/lineupUpdatedAt=\{clubLineupSetting\?\.updated_at \?\? null\}/);
});
check('API failure stops save and does not return success',()=>{
 assert.match(actions,/if \(error\) \{/);assert.match(actions,/База не подтвердила сохранение всего состава/);
});
check('whole lineup is validated before any delete',()=>{
 const validate=sql.indexOf('-- Prevalidate the entire payload');const write=sql.indexOf('insert into public.match_lineup_settings');
 const del=sql.indexOf('delete from public.match_lineup_entries');
 assert.ok(validate>=0 && validate<write && write<del);
});
check('record count and captain count validated',()=>{
 assert.match(sql,/jsonb_array_length\(p_rows\) > 23/);assert.match(sql,/v_captains<>1/);
 assert.match(sql,/v_role not in/);assert.match(sql,/v_player_id=any\(v_players\)/);
});
check('player ID is verified in database',()=>assert.match(sql,/from public\.players where id=v_player_id/));
check('event and season-stat sync still exist',()=>{
 assert.match(club,/await syncClubPlayerStatsFromEvents/);
 assert.match(club,/\.from\("match_statistics_status"\)\.upsert/);
});
check('migration cannot be executed by anonymous users',()=>assert.doesNotMatch(sql,/grant execute [\s\S]*?to anon/));
console.log(`\n${passed}/20 atomic lineup checks passed.`);
if(passed!==20)process.exitCode=1;
