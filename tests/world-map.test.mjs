import test from 'node:test';import assert from 'node:assert/strict';
import {worldProps,worldWalkable,solidProp,groundAt,sortByFeet,followCamera,zoneInfo} from '../lib/world-map.ts';
import {placesIn,fieldPath,moveField,distance,normalizeField} from '../lib/field-engine.ts';
import {createBrowserPreviewStore,PREVIEW_STORAGE_KEY} from '../lib/browser-preview-store.ts';
test('every interaction in all three areas is reachable around the rendered foot obstacles',()=>{
 for(const zone of ['town','woods','library'])for(const place of placesIn(zone)){
  let p={...zoneInfo[zone].spawn};const route=fieldPath(p,place,zone);assert.ok(route.length,zone+':'+place.id);
  for(const target of route){let i=0;while(distance(p,target)>5&&i++<100){const dx=target.x-p.x,dy=target.y-p.y,length=Math.hypot(dx,dy);p=moveField(p,{x:dx/length,y:dy/length},1/60,zone);assert.ok(worldWalkable(p,zone));}assert.ok(i<100,place.id+' route stuck');}
  assert.ok(distance(p,place)<10,zone+':'+place.id);
 }
});
test('river can be crossed on the visible bridge; tree and building depth use the same foot anchors',()=>{
 assert.equal(worldWalkable({x:600,y:300},'woods'),false);assert.equal(worldWalkable({x:600,y:460},'woods'),true);assert.equal(groundAt({x:600,y:460},'woods'),'bridge');
 const tree=worldProps.town.find(p=>p.kind==='tree'),house=worldProps.town.find(p=>p.kind==='house');assert.ok(solidProp(tree,{x:tree.x,y:tree.y-4}));assert.ok(solidProp(house,{x:house.x+50,y:house.y-20}));assert.equal(solidProp(house,{x:house.x+50,y:house.y-130}),false);
 assert.deepEqual(sortByFeet([{id:'front',y:tree.y+1},{id:'tree',y:tree.y},{id:'behind',y:tree.y-1}]).map(i=>i.id),['behind','tree','front']);
});
test('camera allows screen-space travel before following, then clamps within the map',()=>{
 const view={width:390,height:844,zoom:1.5},camera={x:400,y:200};assert.deepEqual(followCamera(camera,{x:520,y:460},view,.016),camera);assert.ok(followCamera(camera,{x:650,y:460},view,.016).x>camera.x);assert.deepEqual(followCamera(camera,{x:0,y:0},{width:2600,height:1800,zoom:1},1),{x:0,y:0});
});
test('area transition, exploration notes and restored shrine persist without life XP or stale-area writes',async()=>{
 const values=new Map(),store=createBrowserPreviewStore({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)});
 const req=async(body)=>{const r=await store.request('/api/adventure',body?'POST':'GET',body);return{status:r.status,...await r.json()};};
 await req();const before=JSON.parse(values.get(PREVIEW_STORAGE_KEY));let r=await req({action:'fieldInteract',placeId:'forest-gate',x:1100,y:480,zone:'town'});assert.equal(r.status,200);assert.equal(r.adventure.field.zone,'woods');assert.equal((await req({action:'saveField',x:580,y:605,zone:'town'})).status,409);assert.equal((await req({action:'saveField',x:600,y:300,zone:'woods'})).status,400);
 assert.equal((await req({action:'fieldInteract',placeId:'grove-restored',x:944,y:608,zone:'woods'})).status,400);
 for(const id of ['woods-page-1','woods-page-2','woods-page-3']){const p=placesIn('woods').find(p=>p.id===id);assert.equal((await req({action:'fieldInteract',placeId:id,x:p.x,y:p.y,zone:'woods'})).status,200);}
 r=await req({action:'fieldInteract',placeId:'grove-restored',x:944,y:608,zone:'woods'});assert.equal(r.status,200);assert.ok(r.adventure.field.discovered.includes('grove-restored'));
 const reopened=createBrowserPreviewStore({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)});const saved=(await(await reopened.request('/api/adventure')).json()).adventure;assert.equal(saved.field.zone,'woods');assert.deepEqual(saved.field.discovered,r.adventure.field.discovered);const after=JSON.parse(values.get(PREVIEW_STORAGE_KEY));assert.deepEqual(after.receipts,before.receipts);assert.equal(after.adventure.goldEarned,before.adventure.goldEarned);
});
test('legacy placement that overlaps new scenery is rehomed while discoveries remain',()=>{
 const p={x:200,y:280,discovered:['echo'],bellSequence:['bell-low'],bellSolved:false};normalizeField(p);assert.ok(worldWalkable(p));assert.deepEqual(p.discovered,['echo']);assert.deepEqual(p.bellSequence,['bell-low']);assert.equal(p.zone,'town');
});
