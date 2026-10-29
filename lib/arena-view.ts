/** One uniform camera transform for drawing, touch navigation and feedback. */
export type ArenaView = {zoom:number;x:number;y:number};
export function arenaView(width:number,height:number,playerX:number):ArenaView {
 const zoom=Math.max(.65,Math.min(1.5,(height-140)/650));
 const visible=width/zoom;
 return {zoom,x:visible>=600?(600-visible)/2:Math.max(-16,Math.min(616-visible,playerX-visible/2)),y:-70/zoom};
}
export const arenaToScreen=(view:ArenaView,p:{x:number;y:number})=>({x:(p.x-view.x)*view.zoom,y:(p.y-view.y)*view.zoom});
export const screenToArena=(view:ArenaView,p:{x:number;y:number})=>({x:p.x/view.zoom+view.x,y:p.y/view.zoom+view.y});
/** Safe center matches stepArena's real ring radius. */
export const arenaSafeRadius=83;
