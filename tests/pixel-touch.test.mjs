import assert from 'node:assert/strict';
import test from 'node:test';
import {facingFromVector} from '../lib/pixel-actors.ts';
import {spriteLooks,spriteLayers,spriteRows,walkFrame} from '../lib/sprite-catalog.ts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('../public/art/lpc/manifest.json',import.meta.url)));
import {bindContact,bindDirection,bindTap,bindGround} from '../lib/touch-controls.ts';
class Target extends EventTarget {
 disabled=false;hidden=false;ownerDocument;defaultView=new EventTarget();
 constructor(doc){super();this.ownerDocument=doc??this;}
 getBoundingClientRect(){return {x:0,y:0,left:0,top:0,right:100,bottom:100,width:100,height:100};}
 closest(){return null;}
 setPointerCapture(){throw new Error('unsupported host');}
}
function fire(target,type,props={}){const event=new Event(type,{cancelable:true});Object.assign(event,props);target.dispatchEvent(event);return event;}
const touch=(identifier,x=20,y=20)=>({identifier,clientX:x,clientY:y});
test('all 13 identities have licensed walk and attack layers, with four directions and measured feet',()=>{
 assert.equal(Object.keys(spriteLooks).length,13);assert.deepEqual(Object.values(spriteRows).sort(),[0,1,2,3]);
 for(const identity of Object.keys(spriteLooks))for(const layer of spriteLayers(identity))for(const action of ['walk','slash']){
  const record=manifest.assets.find(a=>a.file===`${layer.part}-${action}.png`)??manifest.assets.find(a=>a.file===`${layer.part}-walk.png`);assert.ok(record,`${identity} ${layer.part} ${action}`);assert.ok(record.cell>=64&&record.columns>=6);assert.ok(record.authors&&record.license&&record.source);
 }
 for(const body of ['body-m','body-f'])for(const action of ['walk','slash']){const a=manifest.assets.find(a=>a.file===`${body}-${action}.png`);assert.equal(a.feet.length,4);for(const row of a.feet){assert.equal(row.length,a.columns);assert.ok(row.every(y=>y>48&&y<=64));}}
 assert.deepEqual(Array.from({length:8},(_,i)=>walkFrame(i*7)),[1,2,3,4,5,6,7,8]);assert.equal(facingFromVector(0,-1),'up');
});
test('all imported PNGs match their recorded source hashes and have valid sprite dimensions',()=>{
 for(const asset of manifest.assets){const bytes=readFileSync(new URL('../public/art/lpc/'+asset.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.readUInt32BE(16),asset.width);assert.equal(bytes.readUInt32BE(20),asset.height);}
});
test('document tracking works when pointer capture throws',()=>{
 const doc=new Target(),el=new Target(doc),positions=[],ends=[];const off=bindContact(el,{start:p=>positions.push(p),move:p=>positions.push(p),end:c=>ends.push(c)});
 fire(el,'pointerdown',{button:0,pointerId:4,clientX:2,clientY:3});fire(doc,'pointermove',{pointerId:4,clientX:8,clientY:9});fire(doc,'pointerup',{pointerId:4});assert.deepEqual(positions,[{x:2,y:3},{x:8,y:9}]);assert.deepEqual(ends,[false]);off();
});
test('native contact owns one finger; unrelated release cannot stop it; empty cancellation clears it',()=>{
 const doc=new Target(),el=new Target(doc),ends=[];const off=bindContact(el,{start:()=>{},move:()=>{},end:c=>ends.push(c)});
 fire(el,'touchstart',{changedTouches:[touch(10)]});fire(doc,'touchend',{changedTouches:[touch(20)]});assert.equal(ends.length,0);fire(doc,'touchcancel',{changedTouches:[]});assert.deepEqual(ends,[true]);off();
});
test('second-finger action works while first finger moves, compatibility click never double fires',()=>{
 const doc=new Target(),move=new Target(doc),button=new Target(doc);let active=false,actions=0;
 const a=bindContact(move,{start:()=>active=true,move:()=>{},end:()=>active=false}),b=bindTap(button,()=>actions++);
 fire(move,'touchstart',{changedTouches:[touch(1)]});fire(button,'touchstart',{changedTouches:[touch(2)]});fire(doc,'touchend',{changedTouches:[touch(2)]});assert.equal(actions,1);assert.equal(active,true);fire(button,'click');assert.equal(actions,1);fire(doc,'touchend',{changedTouches:[touch(1)]});assert.equal(active,false);a();b();
});
test('click-only host activates controls and ground; drag or cancellation never navigates',()=>{
 const doc=new Target(),el=new Target(doc),points=[];let taps=0;const a=bindGround(el,p=>points.push(p)),b=bindTap(new Target(doc),()=>taps++);
 fire(el,'click',{clientX:7,clientY:9});assert.deepEqual(points,[{x:7,y:9}]);fire(el,'touchstart',{changedTouches:[touch(1)]});fire(doc,'touchmove',{changedTouches:[touch(1,80,80)]});fire(doc,'touchend',{changedTouches:[touch(1,80,80)]});fire(el,'click',{clientX:80,clientY:80});assert.equal(points.length,1);
 fire(el,'touchstart',{changedTouches:[touch(2)]});fire(doc,'touchcancel',{changedTouches:[]});fire(doc,'touchend',{changedTouches:[touch(2)]});assert.equal(points.length,1);assert.equal(taps,0);a();b();
 const button=new Target(doc),c=bindTap(button,()=>taps++);fire(button,'click');assert.equal(taps,1);c();
});
test('touch action cancellation resets ownership for a new contact',()=>{
 const doc=new Target(),button=new Target(doc);let taps=0;const off=bindTap(button,()=>taps++);
 fire(button,'touchstart',{changedTouches:[touch(1)]});fire(doc,'touchcancel',{changedTouches:[]});fire(button,'touchstart',{changedTouches:[touch(2)]});fire(doc,'touchend',{changedTouches:[touch(2)]});assert.equal(taps,1);off();
});

test('backgrounding and explicit pause discard unfinished action and ground contacts',()=>{
 for(const cause of ['hidden','pause']){
  const doc=new Target(),ground=new Target(doc),button=new Target(doc);let moved=0,tapped=0;
  const a=bindGround(ground,()=>moved++),b=bindTap(button,()=>tapped++);
  fire(ground,'touchstart',{changedTouches:[touch(1)]});fire(button,'touchstart',{changedTouches:[touch(2)]});
  if(cause==='hidden'){doc.hidden=true;fire(doc,'visibilitychange');doc.hidden=false;}else fire(doc.defaultView,'reverie:pause');
  fire(doc,'touchend',{changedTouches:[touch(1),touch(2)]});assert.equal(moved,0);assert.equal(tapped,0);
  fire(button,'touchstart',{changedTouches:[touch(3)]});fire(doc,'touchend',{changedTouches:[touch(3)]});assert.equal(tapped,1);a();b();
 }
});

test('short direction tap survives a delayed paint and pending movement cancels on background',async t=>{
 let time=0,seq=0;const callbacks=new Map();t.mock.method(performance,'now',()=>time);
 const doc=new Target(),element=new Target(doc);doc.defaultView.requestAnimationFrame=callback=>{callbacks.set(++seq,callback);return seq;};doc.defaultView.cancelAnimationFrame=id=>callbacks.delete(id);
 const axes=[];const off=bindDirection(element,{x:1,y:0},axis=>axes.push(axis),()=>{});
 fire(element,'touchstart',{changedTouches:[touch(1)]});time=5;fire(doc,'touchend',{changedTouches:[touch(1)]});time=1000;
 const paint=()=>{const batch=[...callbacks.values()];callbacks.clear();for(const callback of batch)callback();};
 assert.equal(axes.at(-1).x,1);paint();assert.equal(axes.at(-1).x,1,'one late paint cannot swallow a tap');paint();paint();paint();assert.equal(axes.at(-1).x,0);
 fire(element,'click');doc.hidden=true;fire(doc,'visibilitychange');assert.equal(axes.at(-1).x,0);assert.equal(callbacks.size,0);off();
});

test('original scene atlases are present, versioned and every crop fits its source',async()=>{
 const {sceneryFrames}=await import('../app/scenery-art.ts');
 const art=JSON.parse(readFileSync(new URL('../public/art/scenery/generation.json',import.meta.url)));
 for(const asset of art.assets){const bytes=readFileSync(new URL('../public/art/scenery/'+asset.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(asset.width>0&&asset.height>0);}
 for(const frame of Object.values(sceneryFrames)){const asset=art.assets.find(a=>a.file===frame.sheet+'.webp'),[x,y,w,h]=frame.box;assert.ok(asset&&x>=0&&y>=0&&w>0&&h>0&&x+w<=asset.width&&y+h<=asset.height);}
});

test('all twenty-three owned equipment appearances, every level step and NPC identity palettes remain distinct',async()=>{
 const {appearanceKey}=await import('../lib/sprite-appearance.ts');const{equipment}=await import('../lib/character-model.ts');const{npcPalette,spriteWeapon}=await import('../lib/sprite-catalog.ts');
 const base={level:1,avatarColor:'mint',equipped:{weapon:null,head:null,offhand:null,outfit:null,boots:null,charm:null}},original=appearanceKey(base);
 for(const item of equipment){const worn={...base,equipped:{...base.equipped,[item.slot]:item.id}};assert.notEqual(appearanceKey(worn),original,item.id);assert.equal(appearanceKey(base),original,'preview cannot mutate actual gear');}
 for(let level=1;level<200;level++)assert.notEqual(appearanceKey({...base,level}),appearanceKey({...base,level:level+1}));
 assert.equal(spriteWeapon('warrior',base),undefined);assert.equal(spriteWeapon('wanderer',{...base,equipped:{...base.equipped,weapon:'oak-staff'}}),'staff');assert.equal(npcPalette.selene.hair,'#27354e');assert.equal(npcPalette.lucien.hair,'#cdd5df');assert.equal(Object.keys(npcPalette).length,6);
});
