import assert from 'node:assert/strict';
import test from 'node:test';
import {pixelCharacter,pixelEnemy,pixelLooks,facingFromVector,walkPose} from '../lib/pixel-actors.ts';
import {bindContact,bindTap,bindGround} from '../lib/touch-controls.ts';
class Target extends EventTarget {
 disabled=false;hidden=false;ownerDocument;defaultView=new EventTarget();
 constructor(doc){super();this.ownerDocument=doc??this;}
 getBoundingClientRect(){return {x:0,y:0,left:0,top:0,right:100,bottom:100,width:100,height:100};}
 closest(){return null;}
 setPointerCapture(){throw new Error('unsupported host');}
}
function fire(target,type,props={}){const event=new Event(type,{cancelable:true});Object.assign(event,props);target.dispatchEvent(event);return event;}
const touch=(identifier,x=20,y=20)=>({identifier,clientX:x,clientY:y});
test('13 identities have four distinct facing frames, three poses and anchored feet',()=>{
 assert.equal(Object.keys(pixelLooks).length,13);
 for(const look of Object.values(pixelLooks)){
  const facings=[];
  for(const direction of ['down','up','left','right']){
   const poses=[];
   for(const pose of [0,1,2]){
    const art=pixelCharacter(look,direction,pose,2);poses.push(JSON.stringify(art));
    assert.equal(Math.max(...art.map(p=>p.y+p.h)),48);
    for(const p of art){assert.ok([p.x,p.y,p.w,p.h].every(Number.isInteger));assert.ok(p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=32&&p.y+p.h<=48);}
   }
   assert.equal(new Set(poses).size,3);facings.push(poses[1]);
  }
  assert.equal(new Set(facings).size,4);
 }
});
test('six pixel enemies stay within their fixed foot anchor',()=>{
 for(const kind of ['wisp','thorn','guardian','eye','knight','crown'])for(const pose of [0,1,2])for(const p of pixelEnemy(kind,pose))assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=40&&p.y+p.h<=48);
 assert.equal(facingFromVector(0,-1),'up');assert.equal(facingFromVector(0,0,'left'),'left');assert.deepEqual([0,18,36,54,72].map(walkPose),[0,1,2,1,0]);
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
