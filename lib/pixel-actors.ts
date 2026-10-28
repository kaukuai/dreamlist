export type Facing="down"|"left"|"right"|"up";
export function facingFromVector(x:number,y:number,previous:Facing="down"):Facing{
 if(Math.hypot(x,y)<.01)return previous;
 return Math.abs(x)>Math.abs(y)?x>0?"right":"left":y>0?"down":"up";
}
export const snapPixel=(value:number)=>Math.round(value);
