import type {Facing} from "./pixel-actors.ts";
export type SpriteIdentity = "wanderer"|"warrior"|"mage"|"ranger"|"artisan"|"bard"|"healer"|"lorne"|"selene"|"mira"|"ori"|"lucien"|"eira";
export type SpriteAction="walk"|"slash";
export type SpriteLayer={part:string;filter?:string};
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
export function spriteLayers(identity:SpriteIdentity):SpriteLayer[]{
 const look=spriteLooks[identity]??spriteLooks.wanderer;
 return [
 ...(look.weapon==="bow"?[{part:"bow-bg"}]:look.weapon==="sword"?[{part:"sword-bg"}]:[]),
 ...(look.cape?[{part:"cape-bg",filter:look.cape}]:[]),
 {part:`body-${look.body}`},{part:`head-${look.body}`},{part:`pants-${look.body}`,filter:"saturate(.3) brightness(.65)"},{part:`boots-${look.body}`,filter:"brightness(.65)"},
 {part:`tunic-${look.body}`,filter:"sepia(.9) saturate(2) brightness(.8) "+look.cloth},...(look.armor?[{part:look.armor,filter:look.armor==="leather"?"brightness(.8)":"saturate(.5)"}]:[]),
 {part:look.hair??"hair",filter:look.hairFilter},...(look.hood?[{part:"hood",filter:"sepia(.9) saturate(2) brightness(.8) "+look.cloth}]:[]),
 ...(look.cape?[{part:"cape-fg",filter:look.cape}]:[]),...(look.shield?[{part:"shield",filter:"saturate(.6)"}]:[]),
 ...(look.weapon==="bow"?[{part:"bow-fg"}]:look.weapon==="sword"?[{part:"sword-fg"}]:[]),
 ];
}
