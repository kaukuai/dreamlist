import assert from 'node:assert/strict';
import test from 'node:test';
import {createBrowserPreviewStore,PREVIEW_STORAGE_KEY as key} from '../lib/browser-preview-store.ts';
import {openingScenes,guideIds} from '../lib/opening-model.ts';
import {attributeIds,equipment,professions,progression,canLearnTalent,talents,SKILL_RANK_XP} from '../lib/character-model.ts';
import {masteryStage} from '../lib/profession-mastery.ts';
import {createArena,stepArena,emptyArenaInput,hazardContains,laneHalfWidth} from '../lib/arena-engine.ts';
function fixture(){const values=new Map();let quota=false;const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('quota');values.set(k,v);}};const store=createBrowserPreviewStore(storage);const req=async(path,method='GET',body)=>{const r=await store.request(path,method,body);return{status:r.status,...await r.json()};};return{values,storage,req,quota:v=>quota=v};}
const profile={hp:200,maxHp:200,foeHp:1000,foeMaxHp:1000,attack:20,armor:0,healing:0,profession:'warrior',focus:3};
const frame=(state,input={})=>stepArena(state,{...emptyArenaInput(),...input});
test('five opening scenes persist location, skip once, and never grant progression or rewards',async()=>{
 const f=fixture();assert.equal(openingScenes.length,5);let o=(await f.req('/api/opening')).opening;assert.equal(o.seen,false);
 await f.req('/api/opening','POST',{scene:2});const again=createBrowserPreviewStore(f.storage);assert.equal((await(await again.request('/api/opening')).json()).opening.scene,2);
 o=(await f.req('/api/opening','POST',{finish:true})).opening;assert.equal(o.seen,true);assert.equal(o.guideDismissed,false);
 await f.req('/api/opening','POST',{finish:true,dismissGuide:true});assert.equal((await f.req('/api/character')).character.totalXp,0);assert.equal((await f.req('/api/island')).island.balance,100);
 for(const action of [{scene:5},{scene:-1},{scene:1.5},{finish:'yes'},{completed:['life']},{version:2}])assert.equal((await f.req('/api/opening','POST',action)).status,400);
});
test('guide checks actual life receipts, gear and profession, and stale tabs preserve earned data',async()=>{
 const f=fixture();await f.req('/api/opening','POST',{finish:true});const other=createBrowserPreviewStore(f.storage);
 assert.deepEqual((await f.req('/api/opening')).opening.completed,[]);
 const board=await f.req('/api/quests'),q=board.introductions.find(q=>q.npcId==='lorne');const {dream}=await f.req('/api/quests','POST',{offerId:q.offerId});
 await f.req('/api/dreams/'+dream.id,'PUT',{...dream,tasks:dream.tasks.map(t=>({...t,done:true}))});await f.req('/api/character','POST',{action:'profession',profession:'warrior'});await f.req('/api/character','POST',{action:'purchase',itemId:'training-sword'});await f.req('/api/character','POST',{action:'equip',slot:'weapon',itemId:'training-sword'});
 await other.request('/api/opening','POST',{dismissGuide:true});const progress=(await f.req('/api/opening')).opening;assert.ok(['life','equip','growth'].every(id=>progress.completed.includes(id)));assert.equal(progress.completed.includes('talk'),false);assert.equal(progress.completed.includes('trial'),false);
 assert.equal((await f.req('/api/character')).character.totalXp,220);assert.equal((await f.req('/api/island')).island.balance,230);assert.equal(new Set(progress.completed).size,progress.completed.length);assert.ok(progress.completed.every(id=>guideIds.includes(id)));
});
test('opening migrates progressed saves silently, untouched old saves receive story, and quota failures keep the original record',async()=>{
 const f=fixture();await f.req('/api/character','POST',{action:'purchase',itemId:'training-sword'});let raw=JSON.parse(f.values.get(key));delete raw.opening;const original=structuredClone(raw);f.values.set(key,JSON.stringify(raw));const o=(await f.req('/api/opening')).opening;assert.equal(o.seen,true);assert.equal(o.guideDismissed,true);raw=JSON.parse(f.values.get(key));delete raw.opening;assert.deepEqual(raw,original);
 const fresh=fixture();await fresh.req('/api/character');raw=JSON.parse(fresh.values.get(key));delete raw.opening;fresh.values.set(key,JSON.stringify(raw));assert.equal((await fresh.req('/api/opening')).opening.seen,false);const before=fresh.values.get(key);fresh.quota(true);assert.equal((await fresh.req('/api/opening','POST',{finish:true})).status,503);assert.equal(fresh.values.get(key),before);
});
test('each class mastery requires all its real training ranks; changing class retains other advancement',()=>{
 for(const job of professions){const player={level:5,profession:job.id,skillXp:Object.fromEntries(job.training.map(id=>[id,SKILL_RANK_XP*2])),advancements:Object.fromEntries(professions.map(p=>[p.id,0]))};assert.equal(masteryStage(player),1,job.id);player.advancements[job.id]=1;assert.equal(masteryStage(player),2,job.id);player.skillXp[job.training.at(-1)]--;assert.equal(masteryStage(player),0);player.level=4;assert.equal(masteryStage(player),0);}
});
test('six combat resonance talents enforce level, root rank, AP and cap while old nodes remain available',()=>{
 assert.equal(talents.length,24);
 for(const a of attributeIds){const node=talents.find(t=>t.id===a+'-resonance'),player={level:12,talents:{[a]:3,[node.id]:0},availableTalentPoints:1};assert.equal(canLearnTalent(node,player),true);assert.equal(canLearnTalent(node,{...player,level:11}),false);assert.equal(canLearnTalent(node,{...player,talents:{[a]:2}}),false);assert.equal(canLearnTalent(node,{...player,availableTalentPoints:0}),false);assert.equal(canLearnTalent(node,{...player,talents:{[a]:3,[node.id]:2}}),false);assert.ok(talents.find(t=>t.id===a+'-awakening'));}
 const before=progression([],{}),after=progression([],{"spirit-resonance":2});assert.equal(after.attributes.spirit,before.attributes.spirit+4);
});
test('new equipment has unique identities and level gates, with no duplicate charges or invalid equipping',async()=>{
 const f=fixture();assert.equal(equipment.length,23);assert.equal(new Set(equipment.map(x=>x.id)).size,23);
 assert.equal((await f.req('/api/character','POST',{action:'purchase',itemId:'echo-lute'})).status,400);
 const {dream}=await f.req('/api/dreams','POST',{title:'持續修練',category:'growth',tasks:Array.from({length:150},(_,i)=>({id:'p'+i,title:'生活行動'+i,training:'knowledge',done:false}))});await f.req('/api/dreams/'+dream.id,'PUT',{...dream,tasks:dream.tasks.map(t=>({...t,done:true}))});
 for(const item of equipment.slice(13)){const bought=await f.req('/api/character','POST',{action:'purchase',itemId:item.id});assert.equal(bought.status,200,item.id);const balance=bought.island.balance;assert.equal((await f.req('/api/character','POST',{action:'purchase',itemId:item.id})).island.balance,balance);const worn=await f.req('/api/character','POST',{action:'equip',slot:item.slot,itemId:item.id});assert.equal(worn.character.equipped[item.slot],item.id);}
});
test('lane telegraphs use exact rotated geometry and sideways movement actually avoids damage',()=>{
 assert.equal(laneHalfWidth,34);const hazard={id:1,kind:'lane',x:200,y:200,radius:240,remaining:.02,angle:Math.PI/2};assert.equal(hazardContains(hazard,200,350),true);assert.equal(hazardContains(hazard,235,350),false);assert.equal(hazardContains(hazard,200,450),false);
 const still=createArena(profile,20);Object.assign(still,{x:200,y:350,hazards:[hazard]});const evade=structuredClone(still);evade.x=235;frame(still);frame(evade);assert.ok(still.hp<200);assert.equal(evade.hp,200);
});
test('enemy patterns differ, boss second phase accelerates fairly, and legacy snapshots retain prior behavior',()=>{
 for(const [kind,expected]of [['guardian','ring'],['thorn','lane'],['knight','lane'],['crown','lane'],['wisp','circle']]){const state=createArena({...profile,enemyKind:kind},20);state.nextHazard=0;frame(state);assert.equal(state.hazards[0].kind,expected,kind);}
 const eye=createArena({...profile,enemyKind:'eye'},20);eye.hazardCount=1;eye.nextHazard=0;frame(eye);assert.equal(eye.hazards.length,2);
 const boss=createArena({...profile,enemyKind:'crown',boss:true},20);boss.enemyHp=boss.enemyMaxHp/2;boss.nextHazard=0;frame(boss);assert.equal(boss.nextHazard,2.1);const assist=structuredClone(boss);assist.nextHazard=0;assist.assist=true;frame(assist);assert.equal(assist.nextHazard,3.2);
 const legacy=createArena(profile,20);legacy.nextHazard=0;frame(legacy);assert.equal(legacy.hazards[0].kind,'circle');legacy.hazardCount=2;legacy.nextHazard=0;frame(legacy);assert.equal(legacy.hazards.at(-1).kind,'ring');
});
test('mastery and combat resonance apply actual motion, cooldowns, defense, reach and healing',()=>{
 const base=createArena(profile,20),improved=createArena({...profile,combat:{mastery:2,resonance:{agility:2,luck:2,charisma:2,vitality:2,spirit:2,intellect:2}}},20);
 const a=structuredClone(base),b=structuredClone(improved);frame(a,{x:1});frame(b,{x:1});assert.ok(b.x>a.x);frame(a,{dash:true});frame(b,{dash:true});assert.ok(b.dashCd<a.dashCd);
 for(const s of[base,improved]){s.x=s.enemyX-240;s.y=s.enemyY;frame(s,{skill:true});}assert.ok(improved.enemyHp<base.enemyHp);assert.ok(improved.invulnerable>0);assert.ok(improved.skillCd<base.skillCd);
 const plain=createArena(profile,20),ward=createArena({...profile,combat:{mastery:0,resonance:{vitality:2}}},20);for(const s of[plain,ward]){s.hazards=[{id:1,kind:'circle',x:s.x,y:s.y,radius:82,remaining:.02}];frame(s);}assert.ok(ward.hp>plain.hp);
 const m=createArena({...profile,hp:10,profession:'healer',combat:{mastery:2,resonance:{spirit:2}}},20),old=createArena({...profile,hp:10,profession:'healer'},20);frame(m,{mend:true});frame(old,{mend:true});assert.equal(m.hp-old.hp,14);
 const ranger=createArena({...profile,profession:'ranger',combat:{mastery:2,resonance:{}}},20);frame(ranger,{attack:true});assert.ok(Math.abs(ranger.attackCd-.5)<1e-10);
});
test('earned mastery and resonance are snapshotted into a battle and survive reload or later class changes',async()=>{
 const f=fixture();const {dream}=await f.req('/api/dreams','POST',{title:'持續的生活練習',category:'health',tasks:Array.from({length:180},(_,i)=>({id:'s'+i,title:'完成自己的練習'+i,training:'fitness',done:false}))});assert.equal((await f.req('/api/dreams/'+dream.id,'PUT',{...dream,tasks:dream.tasks.map(t=>({...t,done:true}))})).status,200);
 for(const action of[{action:'profession',profession:'warrior'},{action:'advance'},...Array(3).fill({action:'talent',talentId:'vitality'}),...Array(2).fill({action:'talent',talentId:'vitality-resonance'})])assert.equal((await f.req('/api/character','POST',action)).status,200);
 await f.req('/api/adventure','POST',{action:'beginEpisode',episodeId:'bell-01',choiceId:'stand'});const mission=(await f.req('/api/dreams')).dreams.find(d=>d.id!==dream.id);await f.req('/api/dreams/'+mission.id,'PUT',{...mission,tasks:mission.tasks.map(t=>({...t,done:true}))});const r=await f.req('/api/adventure','POST',{action:'startBattle',episodeId:'bell-01',mode:'action'});assert.equal(r.status,200);const battle=r.adventure.battle;assert.equal(battle.arena.combat.mastery,2);assert.equal(battle.arena.combat.resonance.vitality,2);assert.equal(battle.arena.enemyKind,'wisp');
 await f.req('/api/character','POST',{action:'profession',profession:'wanderer'});const reopened=createBrowserPreviewStore(f.storage);assert.deepEqual((await(await reopened.request('/api/adventure')).json()).adventure.battle.arena,battle.arena);
 const advanced=await f.req('/api/adventure','POST',{action:'arenaAdvance',battleId:battle.id,fromTick:0,frames:[emptyArenaInput()]});assert.equal(advanced.adventure.battle.arena.combat.mastery,2);assert.equal(advanced.adventure.battle.arena.profession,'warrior');
});
test('opening CG and expanded equipment artwork match recorded hashes and referenced cells',async()=>{
 const{readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');const root=new URL('../public/art/',import.meta.url),opening=JSON.parse(readFileSync(new URL('prologue/generation.json',root))),atlas=JSON.parse(readFileSync(new URL('equipment-expansion.json',root)));
 assert.equal(opening.assets.length,4);for(const asset of opening.assets){const bytes=readFileSync(new URL('prologue/'+asset.file,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.toString('ascii',8,12),'WEBP');}assert.ok(openingScenes.every(s=>opening.assets.some(a=>a.file===s.art+'.webp')));
 assert.deepEqual(atlas.items,equipment.slice(13).map(e=>e.id));assert.ok(atlas.items.length<=atlas.columns*atlas.rows);assert.equal(createHash('sha256').update(readFileSync(new URL('equipment-expansion.webp',root))).digest('hex'),atlas.sha256);
});
