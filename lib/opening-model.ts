export const openingScenes=[
 {id:'morning',art:'town',eyebrow:'THE CHRONICLE OF REVERIE',title:'世界曾以鐘聲，記住每一次成長。',speaker:'旅人手記',text:'很久以前，晨鐘不是用來報時的。有人學會第一個字，有人走完一段害怕的路，有人終於願意好好休息——鐘樓便為他們響一聲。',after:'那些微小的改變，化成星露，照亮通往遠方的道路。每個人的名字，都被好好記在回聲裡。'},
 {id:'silence',art:'library',eyebrow:'THE SILENT MORNING BELL',title:'直到某一天，鐘不再響。',speaker:'賽琳 · 星頁書庫',text:'「書還在，字卻開始消失。先是路標上的名字，接著是歌裡的某一句……我們記得失去了什麼，卻說不出失去的是誰。」',after:'巡衛守住了城門，學者翻遍了書庫。沒有入侵者，也沒有一場能夠解決一切的戰爭。被遺忘的，是人們曾經前進的理由。'},
 {id:'invitation',art:'letter',eyebrow:'A LETTER WITHOUT A NAME',title:'一封沒有署名的信，找到了你。',speaker:'信上的微光',text:'「如果你仍願意開始，請來晨鐘鎮。別讓他們忘記自己的名字。」',after:'你還沒有傳說中的武器，也不必先知道自己想成為誰。那道光只認出一件事：你願意為自己的生活，踏出下一小步。'},
 {id:'covenant',art:'promise',eyebrow:'YOUR LIFE, YOUR ADVENTURE',title:'你的日常，將成為這個世界的力量。',speaker:'晨鐘的約定',text:'閱讀與理解，可以點亮法師的星火；活動身體，能鍛鍊戰士的步伐。創作、探索、表達與自我照顧，也都有自己的道路。',after:'完成真實生活中的小行動，再回來記錄，你會得到經驗、技能熟練與星露。你可以學會許多技能，改變職業；已走過的路都會留下。'},
 {id:'arrival',art:'town',eyebrow:'VOLUME I · THE SILENT BELL',title:'第一卷《無聲晨鐘》',speaker:'你的第一頁',text:'先在鎮上走走，與願意傾聽的人說話。洛恩在廣場巡守，賽琳守著書庫，奧里的工坊也亮著燈。還沒想好夢想，就從他們的小委託開始。',after:'生活修練帶來成長，星露能購買裝備，職業與天賦讓你選擇自己的戰法。當你準備好了，再走進回聲之門，用觀察、走位與戰技尋回故事。'}
] as const;
export const guideIds=['walk','talk','life','equip','growth','trial'] as const;
export type GuideId=typeof guideIds[number];
export type OpeningProgress={version:1;scene:number;seen:boolean;guideDismissed:boolean;completed:GuideId[]};
export const initialOpening=(returning=false):OpeningProgress=>({version:1,scene:0,seen:returning,guideDismissed:returning,completed:[]});
export const guideSteps=[
 {id:'walk',title:'先親自走一段',text:'按住左下方向鍵、切換搖桿，或點地面移動。右上地圖也能選擇地點，角色會沿路走過去。',page:'explore',action:'回到場景走走'},
 {id:'talk',title:'找一位願意聊聊的夥伴',text:'點地圖上的人物可走近交談；也能靠近後按右下交談。先問職業、聽故事，或看看可以接取的委託。',page:'explore',action:'回到場景交談'},
 {id:'life',title:'把一個小行動帶進生活',text:'向 NPC 接修練，或從任務大廳選每日委託。實際完成後再記錄；每步首次給40 XP、20熟練與25星露，整份首次再給100 XP與100星露。',page:'quests',action:'開啟任務大廳'},
 {id:'equip',title:'讓成長成為看得見的裝備',text:'手札或奧里對話可進星露商店。先試穿，選購後再穿戴；購買和穿戴是兩個步驟，像素外觀會同步更新。',page:'shop',action:'前往星露商店'},
 {id:'growth',title:'選擇你的成長道路',text:'每次升級獲得1 AP，可投入永久天賦。Lv.2起依技能與屬性轉職，Lv.10／25／50再進化。轉職不重置已學技能。',page:'talents',action:'查看成長與天賦'},
 {id:'trial',title:'準備好，再迎向回聲',text:'主線生活修練完成後，回聲之門會開啟試煉。移動避開預警，閃避穿過危險，靠近對手開啟普攻，再搭配職業戰技。失敗不扣成長，也能暫停保存。',page:'world',action:'查看故事與試煉'}
] as const;
export function advanceOpening(progress:OpeningProgress,action:{scene?:number;finish?:boolean;dismissGuide?:boolean}){
 if(action.scene!==undefined)progress.scene=action.scene;
 if(action.finish)progress.seen=true;
 if(action.dismissGuide!==undefined)progress.guideDismissed=action.dismissGuide;
}
