import type {SkillId} from "./character-model";

export const npcIds = ["eira", "lorne", "selene", "mira", "ori", "lucien"] as const;
export type NpcId = typeof npcIds[number];
export type QuestKind = "daily" | "npc";
export type QuestSource = {kind: QuestKind; npcId: NpcId; templateId: string; dayKey: string};
export type QuestStep = {title: string; alternative?: string};
export type QuestTemplate = {id: string; kind: QuestKind; npcId: NpcId; skill: SkillId; title: string; description: string; minutes: number; steps: QuestStep[]};
export type Npc = {id: NpcId; name: string; role: string; location: string; personality: string; greeting: string; thanks: string; color: string; portrait: number};

export const npcs: Npc[] = [
  {id: "eira", name: "艾菈", role: "巡路嚮導", location: "晨鐘鎮・風語路口", personality: "總把小小的發現畫進地圖。她相信，冒險可以從家門口開始。", greeting: "還沒決定目的地也沒關係。陪我找一個今天沒注意過的風景吧？", thanks: "你發現的那一小片世界，現在也在我們的地圖上了。", color: "#92b49a", portrait: 0},
  {id: "lorne", name: "洛恩", role: "巡衛教官", location: "晨鐘鎮・練習庭院", personality: "看起來嚴肅，卻總把練習劍換成最輕的一把。喜歡慢慢進步的人。", greeting: "不用急著變強。今天只要讓身體舒服地動一下，就算完成訓練。", thanks: "做得好。願意開始，就是今天最重要的一步。", color: "#d1a18b", portrait: 1},
  {id: "selene", name: "賽琳", role: "星頁書庫管理員", location: "晨鐘鎮・星頁書庫", personality: "替每一本書留下手寫索引，也願意耐心聽完每個新問題。", greeting: "不用讀完一本厚書。一段文字、一個新發現，就能點亮今天的星頁。", thanks: "這個小小的理解，會成為你下一次探索的光。", color: "#afa4d4", portrait: 2},
  {id: "mira", name: "米菈", role: "藥草照護師", location: "晨鐘鎮・薄荷小屋", personality: "照料藥草，也記得每個人的步調。她的茶桌永遠留著一個空位。", greeting: "先坐一會兒吧。照顧自己，也是一種值得修練的能力。", thanks: "謝謝你替自己留了這一點時間。今天的你，已經很努力了。", color: "#a9c2ac", portrait: 3},
  {id: "ori", name: "奧里", role: "木光工坊匠人", location: "晨鐘鎮・木光工坊", personality: "工具常常放錯地方，卻能從一小塊木頭看見很多可能。", greeting: "別擔心做得漂不漂亮。先動手試一點點，作品就有了開始。", thanks: "看，剛才還不存在的小改變，已經被你做出來了。", color: "#ccae79", portrait: 4},
  {id: "lucien", name: "露榭", role: "旅途樂師", location: "晨鐘鎮・黃昏廣場", personality: "收集旅人的一句話，把平凡日子寫成短短的歌。", greeting: "不用唱得準，也不用說得完美。讓一點心情有聲音，就很好。", thanks: "今天的旋律多了你的聲音。這一小段，我會記得。", color: "#c29ebc", portrait: 5},
];
export const npcOf = (id: string) => npcs.find(npc => npc.id === id);

export const npcQuests: QuestTemplate[] = [
  {id: "eira-first-map-v1", kind: "npc", npcId: "eira", skill: "exploration", title: "把今天畫進小地圖", description: "艾菈想替晨鐘鎮的地圖添上新的細節。從你身邊的風景開始，室內也能完成。", minutes: 3, steps: [{title: "看一眼窗外或身邊，停留 30 秒"}, {title: "找出一個以前沒留意的小細節"}, {title: "用一句話記下或說出你的發現"}]},
  {id: "lorne-first-training-v1", kind: "npc", npcId: "lorne", skill: "fitness", title: "巡衛的第一堂輕訓練", description: "洛恩把訓練調得很輕。每一步都能用坐姿完成，依今天身體舒服的幅度就好。", minutes: 3, steps: [{title: "用舒服的幅度，輕輕活動肩膀 30 秒"}, {title: "慢慢走動 2 分鐘", alternative: "坐著輕抬手臂或活動雙腳 1 分鐘"}, {title: "停下休息 30 秒，感受一下身體"}]},
  {id: "selene-first-page-v1", kind: "npc", npcId: "selene", skill: "knowledge", title: "星頁書庫的一點新知", description: "賽琳不要求你讀完厚書。只要留下今天的一個小理解，就是合格的見習魔法。", minutes: 4, steps: [{title: "讀一小段感興趣的文字", alternative: "聽 1 分鐘有興趣的知識內容"}, {title: "挑出一個想多知道的詞或想法"}, {title: "用自己的話寫下或說出一個重點"}]},
  {id: "mira-first-rest-v1", kind: "npc", npcId: "mira", skill: "mindfulness", title: "薄荷小屋的休息時間", description: "米菈替你留了一張椅子。不需要做到任何標準，只要給自己一小段安靜。", minutes: 2, steps: [{title: "找一個舒服的位置，放鬆雙手"}, {title: "安靜休息 1 分鐘，留意自然的呼吸"}, {title: "寫下或說出現在的一個心情"}]},
  {id: "ori-first-workshop-v1", kind: "npc", npcId: "ori", skill: "craft", title: "木光工坊的小小開工", description: "奧里的工作桌總是有點亂。一起用幾個小動作，替今天留出動手做事的空間。", minutes: 3, steps: [{title: "把身邊 3 件小物放回適合的位置"}, {title: "畫 3 筆小草圖，或摺出一個簡單形狀"}, {title: "看一眼剛才的小改變，留下一句感想"}]},
  {id: "lucien-first-song-v1", kind: "npc", npcId: "lucien", skill: "expression", title: "黃昏廣場的一小段旋律", description: "露榭正在收集今天的心情。你的旋律不需要觀眾，也不需要練得完美。", minutes: 2, steps: [{title: "選一段喜歡的旋律，或想一句想說的話"}, {title: "輕哼、輕敲節奏或朗讀 30 秒"}, {title: "留下一句今天想對自己說的話"}]},
];

export const dailyQuests: QuestTemplate[] = [
  {id: "daily-short-walk-v1", kind: "daily", npcId: "lorne", skill: "fitness", title: "兩分鐘的輕快出發", description: "洛恩邀你暫時離開原本的姿勢，讓身體換一個舒服的節奏。", minutes: 2, steps: [{title: "慢慢走動 2 分鐘", alternative: "坐姿活動手臂或雙腳 1 分鐘"}]},
  {id: "daily-shoulder-v1", kind: "daily", npcId: "lorne", skill: "fitness", title: "替肩膀鬆一下綁", description: "不需要運動器材，選一個今天舒服的活動幅度。", minutes: 1, steps: [{title: "輕輕活動肩膀與手腕 1 分鐘", alternative: "以自己舒服的姿勢活動雙手 30 秒"}]},
  {id: "daily-stretch-v1", kind: "daily", npcId: "lorne", skill: "fitness", title: "一小段活動時間", description: "洛恩今天的練習很短，坐著或站著都可以。", minutes: 2, steps: [{title: "做 2 分鐘適合自己的輕量伸展", alternative: "坐著伸展手指與腳踝 1 分鐘"}]},
  {id: "daily-read-v1", kind: "daily", npcId: "selene", skill: "knowledge", title: "讀完一小段就好", description: "翻開任何讓你好奇的內容，賽琳只需要你帶回一點新知。", minutes: 2, steps: [{title: "讀一小段文字，記住一個重點", alternative: "聽 1 分鐘知識內容並說出一個重點"}]},
  {id: "daily-word-v1", kind: "daily", npcId: "selene", skill: "knowledge", title: "今天的新詞條", description: "替你的星頁加上一個新詞，不限語言或領域。", minutes: 2, steps: [{title: "認識一個詞或概念，用一句話解釋它"}]},
  {id: "daily-question-v1", kind: "daily", npcId: "selene", skill: "knowledge", title: "收集一個小問題", description: "好的問題，也是知識旅程的一部分。", minutes: 1, steps: [{title: "寫下或說出一個今天想了解的問題"}]},
  {id: "daily-rest-v1", kind: "daily", npcId: "mira", skill: "mindfulness", title: "把一分鐘留給自己", description: "米菈替你留了安靜的位置，暫時放下手上的事就好。", minutes: 1, steps: [{title: "安靜休息 1 分鐘，留意自然呼吸"}]},
  {id: "daily-feeling-v1", kind: "daily", npcId: "mira", skill: "mindfulness", title: "今天的心情天氣", description: "晴天、陰天都能被好好記下，不需要評分。", minutes: 1, steps: [{title: "用一句話寫下或說出現在的心情"}]},
  {id: "daily-gratitude-v1", kind: "daily", npcId: "mira", skill: "mindfulness", title: "一件微小的好事", description: "為今天一個平凡的小片刻，留下一個位置。", minutes: 1, steps: [{title: "記下或說出一件今天還不錯的小事"}]},
  {id: "daily-tidy-v1", kind: "daily", npcId: "ori", skill: "craft", title: "三件小物的歸位", description: "奧里相信，動手整理一點點，也能為下一件作品開路。", minutes: 2, steps: [{title: "把身邊 3 件小物放回適合的位置"}]},
  {id: "daily-sketch-v1", kind: "daily", npcId: "ori", skill: "craft", title: "三筆也算小創作", description: "這不是畫技考試。讓一個想法從手裡出現就好。", minutes: 2, steps: [{title: "用 3 筆線條畫個小東西，或摺一個簡單形狀"}]},
  {id: "daily-make-v1", kind: "daily", npcId: "ori", skill: "craft", title: "替日常做個小改變", description: "挑一個很小的地方，試著讓它比剛才順手一點。", minutes: 3, steps: [{title: "調整一個桌面擺設、文件分類或小工具設定"}]},
  {id: "daily-melody-v1", kind: "daily", npcId: "lucien", skill: "expression", title: "哼一小段旅途歌", description: "露榭說，只有自己聽見的旋律，也值得被唱出來。", minutes: 1, steps: [{title: "輕哼、輕敲節奏或朗讀喜歡的句子 30 秒"}]},
  {id: "daily-kind-word-v1", kind: "daily", npcId: "lucien", skill: "expression", title: "寄給自己的一句話", description: "替自己的今天留一個溫柔的註腳。", minutes: 1, steps: [{title: "寫下或說出一句想鼓勵自己的話"}]},
  {id: "daily-share-v1", kind: "daily", npcId: "lucien", skill: "expression", title: "把一個想法說出來", description: "不需要公開發表，把想法說成完整一句就很好。", minutes: 2, steps: [{title: "向自己或願意聽的人，說出一個今天的想法"}]},
  {id: "daily-window-v1", kind: "daily", npcId: "eira", skill: "exploration", title: "窗邊的新風景", description: "今天不用走遠。你熟悉的地方，也藏著沒看過的小細節。", minutes: 1, steps: [{title: "觀察窗外或身邊 1 分鐘，找出一個新細節"}]},
  {id: "daily-colors-v1", kind: "daily", npcId: "eira", skill: "exploration", title: "尋找今天的三種顏色", description: "艾菈想替旅行日誌挑一組新配色。", minutes: 1, steps: [{title: "在身邊找到 3 種顏色，留意它們出現在哪裡"}]},
  {id: "daily-curiosity-v1", kind: "daily", npcId: "eira", skill: "exploration", title: "換個角度看日常", description: "小小的改變，也能讓熟悉的生活有新發現。", minutes: 2, steps: [{title: "換個位置或視角觀察身邊，記下一個發現"}]},
];

export const questTemplates = [...npcQuests, ...dailyQuests];
export const questOf = (id: string) => questTemplates.find(quest => quest.id === id);
export const questStepTitle = (step: QuestStep) => step.title + (step.alternative ? `（或${step.alternative}）` : "");
export const questCategory = (skill: SkillId) => ({fitness: "health", knowledge: "growth", mindfulness: "life", exploration: "travel", craft: "career", expression: "growth"})[skill];

/** One shared server clock: Taipei 04:00. No client-supplied date can reroll offers. */
export function questDay(now: Date) {
  const shifted = new Date(now.getTime() + 4 * 3600000);
  const dayKey = shifted.toISOString().slice(0, 10);
  const nextResetAt = new Date(Date.parse(dayKey + "T00:00:00Z") + 20 * 3600000).toISOString();
  return {dayKey, nextResetAt};
}

/** Stable daily variety: one accessible movement choice and two distinct other skills. */
export async function drawDailyQuests(ownerId: string, dayKey: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`daily-v1:${ownerId}:${dayKey}`));
  let state = new DataView(hash).getUint32(0);
  const random = () => {state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296;};
  const shuffle = <T,>(items: T[]) => {const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) {const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]];} return copy;};
  const select = (skill: SkillId) => {const pool = dailyQuests.filter(quest => quest.skill === skill); return pool[Math.floor(random() * pool.length)];};
  const other = shuffle<SkillId>(["knowledge", "mindfulness", "craft", "expression", "exploration"]).slice(0, 2);
  return shuffle([select("fitness"), ...other.map(select)]);
}

export type QuestOffer = QuestTemplate & {offerId: string; status: "available" | "active" | "complete" | "archived"; dreamId: string | null; completedSteps: number; xp: number; coins: number};
export type QuestBoardState = {dayKey: string; serverTime: string; nextResetAt: string; daily: QuestOffer[]; introductions: QuestOffer[]};
