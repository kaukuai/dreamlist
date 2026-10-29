import {equipment} from "./character-model.ts";
import type {HeroAppearance} from "./sprite-appearance.ts";
import type {Facing} from "./pixel-actors.ts";
export type SpriteIdentity = "wanderer"|"warrior"|"mage"|"ranger"|"artisan"|"bard"|"healer"|"lorne"|"selene"|"mira"|"ori"|"lucien"|"eira";
export type SpriteAction="walk"|"slash";
export type SpriteLayer={part:string;filter?:string;tint?:string};
export const spriteRows: Record<Facing,number>={up:0,left:1,down:2,right:3};
export const walkFrame=(travel:number)=>1+Math.floor(Math.max(0,travel)/7)%8;
export const spriteLooks: Record<SpriteIdentity,{body:"m"|"f";hair?:string;hairFilter?:string;armor?:string;cloth:string;cape?:string;hood?:boolean;weapon?:"sword"|"bow"|"staff"|"hammer"|"lute";shield?:boolean}>={
 wanderer:{body:"m",hairFilter:"brightness(.55)",cloth:"hue-rotate(125deg) saturate(.65)",cape:"hue-rotate(165deg) brightness(.7)",weapon:"sword"},
 warrior:{body:"m",hairFilter:"sepia(1) saturate(.5) brightness(.65)",cloth:"hue-rotate(320deg)",armor:"plate",cape:"hue-rotate(310deg) saturate(.7)",weapon:"sword",shield:true},
 mage:{body:"m",hairFilter:"brightness(.45)",cloth:"hue-rotate(175deg) saturate(.75)",cape:"hue-rotate(175deg)",hood:true,weapon:"staff"},
 ranger:{body:"m",hairFilter:"sepia(.8) brightness(.65)",cloth:"hue-rotate(75deg) saturate(.65)",armor:"leather",cape:"hue-rotate(70deg) brightness(.7)",weapon:"bow"},
 artisan:{body:"m",hairFilter:"sepia(1) saturate(2)",cloth:"hue-rotate(15deg) saturate(.65)",armor:"leather",weapon:"hammer"},
 bard:{body:"m",hairFilter:"brightness(.5)",cloth:"hue-rotate(245deg)",cape:"hue-rotate(255deg)",weapon:"lute"},
 healer:{body:"f",hair:"hair-long",hairFilter:"sepia(1) brightness(1.25)",cloth:"saturate(.1) brightness(1.5)",cape:"hue-rotate(95deg) saturate(.5) brightness(1.1)",weapon:"staff"},
 lorne:{body:"m",hairFilter:"sepia(1) saturate(2)",cloth:"hue-rotate(150deg)",armor:"plate",cape:"hue-rotate(315deg)",weapon:"sword",shield:true},
 selene:{body:"f",hair:"hair-long",hairFilter:"hue-rotate(190deg) brightness(.45)",cloth:"hue-rotate(175deg)",cape:"hue-rotate(185deg)",weapon:"staff"},
 mira:{body:"f",hair:"hair-long",hairFilter:"sepia(1) brightness(.6)",cloth:"hue-rotate(70deg) saturate(.7)",cape:"hue-rotate(70deg) brightness(.7)"},
 ori:{body:"m",hairFilter:"brightness(.45)",cloth:"sepia(.7) saturate(.8)",armor:"leather",weapon:"hammer"},
 lucien:{body:"m",hair:"hair-long",hairFilter:"saturate(0) brightness(1.7)",cloth:"hue-rotate(245deg)",cape:"hue-rotate(175deg)",weapon:"lute"},
 eira:{body:"f",hairFilter:"sepia(1) brightness(.65)",cloth:"hue-rotate(70deg) saturate(.6)",cape:"hue-rotate(65deg) brightness(.7)",weapon:"bow"},
};
export const npcPalette:Partial<Record<SpriteIdentity,{hair:string;cloth:string;cape?:string;ponytail?:boolean;robe?:boolean}>>={
 eira:{hair:"#795044",cloth:"#ece1b8",cape:"#526848",ponytail:true},
 lorne:{hair:"#a44e2f",cloth:"#354a57",cape:"#a43c38"},
 selene:{hair:"#27354e",cloth:"#e2d5af",cape:"#283c62",robe:true},
 mira:{hair:"#834738",cloth:"#67834f",cape:"#e8dcc0",robe:true},
 ori:{hair:"#392b24",cloth:"#c69645",cape:"#344c66"},
 lucien:{hair:"#cdd5df",cloth:"#6d4868",cape:"#4b999e"}
};
export function spriteWeapon(identity:SpriteIdentity,appearance?:HeroAppearance){
 if(appearance){const motif=equipment.find(e=>e.id===appearance.equipped.weapon)?.motif;return motif==="sword"||motif==="bow"||motif==="staff"||motif==="hammer"?motif:motif==="lute"?"lute":undefined;}
 return spriteLooks[identity]?.weapon;
}
export function spriteLayers(identity:SpriteIdentity,appearance?:HeroAppearance):SpriteLayer[]{
 const base=spriteLooks[identity]??spriteLooks.wanderer,look={...base},npc=npcPalette[identity];
 if(identity==="selene")look.weapon=undefined;
 if(appearance){look.weapon=spriteWeapon(identity,appearance);look.shield=appearance.equipped.offhand==="iron-buckler";look.armor=appearance.equipped.outfit==="vanguard-cuirass"?"plate":appearance.equipped.outfit==="craft-apron"?"leather":base.armor;look.cape=appearance.equipped.outfit==="moon-vestments"?"saturate(.2) brightness(1.6)":appearance.equipped.outfit==="linen-cloak"?"hue-rotate(90deg) saturate(.6)":base.cape;look.hood=base.hood&&!appearance.equipped.head;}

 return [
 ...(look.weapon==="bow"?[{part:"bow-bg",filter:appearance?.equipped.weapon==="hawk-bow"?"hue-rotate(135deg) saturate(.7) brightness(1.4)":undefined}]:look.weapon==="sword"?[{part:"sword-bg",tint:appearance?.equipped.weapon==="oath-blade"?"#e6d39e":undefined}]:[]),
 ...(look.cape||npc?.cape?[{part:"cape-bg",filter:npc?undefined:look.cape,tint:npc?.cape}]:[]),
 ...(npc?.ponytail?[{part:"pony-bg",tint:npc.hair}]:[]),
 ...(identity==="mira"?[{part:"hair-wave-bg",tint:npc!.hair}]:[]),
 {part:`body-${look.body}`},{part:`head-${look.body}`},{part:`pants-${look.body}`,filter:"saturate(.3) brightness(.65)"},{part:`boots-${look.body}`,tint:appearance?.equipped.boots==="scholar-boots"?"#68879d":appearance?.equipped.boots?"#9a7548":"#3b3330"},
 {part:`tunic-${look.body}`,filter:npc?undefined:"sepia(.9) saturate(2) brightness(.8) "+look.cloth,tint:appearance?{mint:"#607c83",lilac:"#736781",sunset:"#96754f"}[appearance.avatarColor]:npc?.cloth},...(npc?.robe?[{part:"robe-f",tint:npc.cloth}]:[]),...(look.armor?[{part:look.armor,filter:look.armor==="leather"?"brightness(.8)":"saturate(.5)",tint:appearance?.equipped.outfit==="vanguard-cuirass"?"#a3b7c5":undefined}]:[]),
 {part:identity==="mira"?"hair-wave-fg":look.hair??"hair",filter:npc?undefined:look.hairFilter,tint:npc?.hair},...(npc?.ponytail?[{part:"pony-fg",tint:npc.hair}]:[]),...(appearance?.equipped.head==="sentinel-helm"?[{part:"helmet"}]:[]),...(appearance?.equipped.head==="voyager-hood"?[{part:"hood",tint:"#677a52"}]:[]),...(look.hood?[{part:"hood",filter:"sepia(.9) saturate(2) brightness(.8) "+look.cloth}]:[]),
 ...(look.cape||npc?.cape?[{part:"cape-fg",filter:npc?undefined:look.cape,tint:npc?.cape}]:[]),...(look.shield?[{part:"shield",filter:"saturate(.6)"}]:[]),
 ...(look.weapon==="bow"?[{part:"bow-fg",filter:appearance?.equipped.weapon==="hawk-bow"?"hue-rotate(135deg) saturate(.7) brightness(1.4)":undefined}]:look.weapon==="sword"?[{part:"sword-fg",tint:appearance?.equipped.weapon==="oath-blade"?"#e6d39e":undefined}]:[]),
 ];
}
