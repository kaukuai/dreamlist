import type {SkillId} from "./character-model.ts";
import type {NpcId} from "./quest-model.ts";

export type RegionId = "morningbell" | "mistwood" | "archive" | "dawnrift";
export type MaterialId = "ember" | "fiber" | "ink";
export type Vow = "courage" | "curiosity" | "care";
export type StoryChoice = {id: string; label: string; npcId: NpcId; skill: SkillId; vow: Vow; response: string; steps: string[]};
export type StoryEpisode = {
  id: string; kind: "main" | "bond"; number: string; act: string; title: string; region: RegionId;
  summary: string; intro: {speaker: NpcId | "narrator"; text: string}[]; ending: string;
  choices: StoryChoice[]; requires?: string; bondNpc?: NpcId; enemyId?: string;
  reward: {gold: number; materials: Partial<Record<MaterialId, number>>; title?: string};
  memory: {title: string; text: string};
};

export const regions: {id: RegionId; name: string; subtitle: string; description: string; art: number; color: string; x: number; y: number; requires?: string}[] = [
  {id: "morningbell", name: "晨鐘鎮", subtitle: "一切回聲的起點", description: "每天喚醒小鎮的鐘，今天沒有響。六位夥伴各自握著一小段答案。", art: 0, color: "#d2ae74", x: 17, y: 70},
  {id: "mistwood", name: "風語霧林", subtitle: "第一幕・失落的路標", description: "霧不是敵人。失去方向的記憶，正在尋找願意停下來聽的人。", art: 1, color: "#86b8a5", x: 40, y: 43, requires: "bell-01"},
  {id: "archive", name: "星頁遺庫", subtitle: "第二幕・沒有名字的星星", description: "山巔書庫的文字逐漸褪去。被遺忘的事，也值得重新被理解。", art: 2, color: "#b2a0d7", x: 66, y: 24, requires: "bell-03"},
  {id: "dawnrift", name: "黎明裂隙", subtitle: "第三幕・把名字帶回來", description: "古老誓約停在斷橋另一端。這一次，不必獨自承擔整個世界。", art: 3, color: "#cc8c83", x: 85, y: 57, requires: "bell-06"},
];
export const materials: {id: MaterialId; name: string; description: string; color: string}[] = [
  {id: "ember", name: "餘燼晶屑", description: "仍記得溫度的小小晶石，用來刻下勇氣。", color: "#db9a75"},
  {id: "fiber", name: "晨露纖維", description: "夥伴們收集的柔韌纖維，編織守護的紋路。", color: "#8ebaa4"},
  {id: "ink", name: "星頁墨砂", description: "從褪色書頁留下的微光，承載被記住的事。", color: "#b1a0d5"},
];
export const runes = [
  {id: "bell-ward", name: "晨鐘守印", description: "出戰生命 +12、防禦 +3。讓站穩腳步成為一種力量。", gold: 35, materials: {fiber: 2, ember: 1}, hp: 12, armor: 3, attack: 0, healing: 0, motif: "shield"},
  {id: "star-flare", name: "星火刻印", description: "出戰攻擊 +5。把每一點新知，凝聚成清楚的一擊。", gold: 45, materials: {ember: 2, ink: 1}, hp: 0, armor: 0, attack: 5, healing: 0, motif: "flame"},
  {id: "moon-rest", name: "月泉刻印", description: "每次調息額外恢復 10 生命。休息也是冒險的一部分。", gold: 40, materials: {ink: 2, fiber: 1}, hp: 0, armor: 0, attack: 0, healing: 10, motif: "moon"},
] as const;
export type RuneId = typeof runes[number]["id"];

export const enemies = [
  {id: "lost-wisp", name: "失調的微光", kind: "wisp", hp: 72, attack: 12, boss: false, tell: "微光正在聚成一束；蓄力回合可用防禦減傷。", lore: "它不是被黑暗吞噬，只是不知道該為誰發光。"},
  {id: "briar-shadow", name: "迷路棘影", kind: "thorn", hp: 105, attack: 15, boss: false, tell: "枝條會先收攏，再猛烈展開。", lore: "所有指向出口的枝條，都曾是一條被忽略的小路。"},
  {id: "forest-warden", name: "霧林守望者", kind: "guardian", hp: 160, attack: 18, boss: true, tell: "守望者蓄力時握緊石杖，防禦能守住大部分傷害。", lore: "守了太久的門，也會忘記自己在等誰。"},
  {id: "page-eater", name: "噬頁之影", kind: "wisp", hp: 145, attack: 19, boss: false, tell: "墨影每隔三回合會收起書頁，適合調息。", lore: "它收集人們不敢再讀的那一頁。"},
  {id: "mirror-star", name: "倒映星靈", kind: "eye", hp: 180, attack: 21, boss: false, tell: "看清它的意圖，再決定出手或防禦。", lore: "它映照的從來不是失敗，而是人們看待失敗的方式。"},
  {id: "nameless-curator", name: "無名守庫者", kind: "guardian", hp: 230, attack: 24, boss: true, tell: "重擊後會展開護壁；可以趁護壁回合恢復生命。", lore: "最後一位抄書人，把自己的名字也借給了書庫。"},
  {id: "ember-sentinel", name: "餘燼巡衛", kind: "knight", hp: 225, attack: 25, boss: false, tell: "巡衛的重擊很沉，留一點專注給調息。", lore: "盔甲裡還留著一句來不及說完的『我會回來』。"},
  {id: "broken-echo", name: "斷橋回聲", kind: "thorn", hp: 265, attack: 28, boss: false, tell: "不要急著連續進攻，防禦同樣能恢復專注。", lore: "橋斷了，曾經一起走過橋的人卻沒有消失。"},
  {id: "silent-crown", name: "無聲王冠", kind: "crown", hp: 330, attack: 32, boss: true, tell: "它的蓄力傷害很高。觀察、防禦、調息，比一味進攻更重要。", lore: "沉默不是空無，而是太多沒有人願意聽完的聲音。"},
] as const;
export type EnemyId = typeof enemies[number]["id"];
export const enemyPatterns: Record<EnemyId, readonly ("strike" | "charge" | "guard")[]> = {
  "lost-wisp": ["strike", "charge", "guard"],
  "briar-shadow": ["guard", "strike", "charge"],
  "forest-warden": ["strike", "guard", "charge", "guard"],
  "page-eater": ["guard", "charge", "strike"],
  "mirror-star": ["strike", "guard", "strike", "charge"],
  "nameless-curator": ["guard", "charge", "guard", "strike"],
  "ember-sentinel": ["strike", "charge", "strike", "guard"],
  "broken-echo": ["charge", "guard", "strike", "guard"],
  "silent-crown": ["strike", "charge", "guard"],
};

const choice = (id: string, label: string, npcId: NpcId, skill: SkillId, vow: Vow, response: string, steps: string[]): StoryChoice => ({id, label, npcId, skill, vow, response, steps});
export const mainEpisodes: StoryEpisode[] = [
  {
    id: "bell-01", kind: "main", number: "01", act: "序章", title: "沒有響起的晨鐘", region: "morningbell",
    summary: "一封沒有署名的信，把你帶到停擺的鐘樓。", enemyId: "lost-wisp",
    intro: [{speaker: "narrator", text: "晨鐘鎮第一次在無聲中醒來。鐘樓下，一封信只寫著：『別讓他們忘記自己的名字。』"}, {speaker: "lorne", text: "我守了一整夜，沒有敵人經過。可那道光……像是在等一個回答。"}, {speaker: "selene", text: "也許我們該先決定，想用什麼方式靠近它。你的第一步，由你選。"}],
    choices: [choice("stand", "跟洛恩穩住腳步", "lorne", "fitness", "courage", "不需要現在就成為英雄。先感覺自己站在這裡。", ["輕輕活動肩膀 30 秒，坐著也可以", "用舒服的速度走動或坐姿活動 1 分鐘", "停下來，感覺自己的腳步與呼吸"]), choice("read", "與賽琳讀懂那封信", "selene", "knowledge", "curiosity", "想知道答案，是一種值得相信的力量。", ["讀一小段你感興趣的文字", "找出一個不熟悉的詞或想法", "用自己的話記下一個理解"])],
    ending: "微光安定下來，在你的掌心留下一枚鐘形印記。信紙背面慢慢顯出新的字：『第一聲回音，在霧林裡。』",
    reward: {gold: 40, materials: {ember: 2, fiber: 2, ink: 1}}, memory: {title: "一封沒有署名的信", text: "名字不一定寫在紙上。有時，它藏在一個人願意踏出的第一步裡。"},
  },
  {
    id: "bell-02", kind: "main", number: "02", act: "第一幕", title: "往回指的路標", region: "mistwood", requires: "bell-01", enemyId: "briar-shadow",
    summary: "霧林的路標全部指回同一個地方。",
    intro: [{speaker: "eira", text: "我昨天畫的路今天不見了。可你看，苔蘚的方向沒有變。"}, {speaker: "ori", text: "路標不是壞了，是卡在舊的榫口。要找新路，還是先把這一點修好？"}],
    choices: [choice("notice", "跟艾菈尋找新線索", "eira", "exploration", "curiosity", "不用走遠。換一個角度，路也許就出現了。", ["換一個位置觀察身邊的環境", "找出三個平常沒有留意的細節", "選一個細節，說出它讓你想到什麼"]), choice("repair", "幫奧里修好舊路標", "ori", "craft", "care", "修理不是讓它像新的一樣，是讓它還能陪人走一段。", ["找一個想整理的小角落", "把三件小物放回順手的位置", "調整一個擺設，讓接下來的行動更方便"])],
    ending: "棘影散去後，舊路標露出被刻掉的一行名字。艾菈把空白也畫進地圖：『這裡曾有人等過。』",
    reward: {gold: 45, materials: {fiber: 2, ember: 1}}, memory: {title: "朝向明天的路標", text: "一條路的價值，不只在於它能把人帶去哪裡，也在於誰曾陪你走過。"},
  },
  {
    id: "bell-03", kind: "main", number: "03", act: "第一幕終章", title: "守望者的空座位", region: "mistwood", requires: "bell-02", enemyId: "forest-warden",
    summary: "阻擋去路的守望者，守著一張空椅子。",
    intro: [{speaker: "mira", text: "那張椅子不是給敵人的。他等的人，也許早就想讓他休息。"}, {speaker: "lorne", text: "守護不該變成永遠不能放下的責任。我們可以先示範給他看。"}],
    choices: [choice("rest", "與米菈留一段休息", "mira", "mindfulness", "care", "先把手鬆開。現在不用證明任何事。", ["找一個舒服的坐姿，放鬆雙手", "安靜休息 1 分鐘，留意自然呼吸", "說一句現在想對自己說的話"]), choice("share", "跟洛恩分擔一點重量", "lorne", "fitness", "courage", "力量也可以是願意慢下來，和別人走同一個速度。", ["用舒服的幅度活動手腕或腳踝", "慢慢伸展 1 分鐘，隨時可以停下", "喝一口水，感覺身體現在的狀態"])],
    ending: "石杖落地時，守望者終於坐了下來。霧後的山巔亮起一扇窗，空椅子的主人，曾在那裡替星星取名字。",
    reward: {gold: 50, materials: {fiber: 3, ink: 1}, title: "霧路同行者"}, memory: {title: "留給歸人的椅子", text: "真正的守望，也包含相信有人會替自己接下一班。"},
  },
  {
    id: "bell-04", kind: "main", number: "04", act: "第二幕", title: "從書裡飄走的名字", region: "archive", requires: "bell-03", enemyId: "page-eater",
    summary: "星頁遺庫仍有成千上萬本書，卻沒有人記得作者。",
    intro: [{speaker: "selene", text: "我記得這個字跡……可我不記得寫下它的人。忘記，原來也會留下形狀。"}, {speaker: "lucien", text: "字消失了，節奏還在。要不要試著用另一種方式，把它記下來？"}],
    choices: [choice("index", "陪賽琳建立一頁索引", "selene", "knowledge", "curiosity", "不必把所有事都記住。先留下一個你不想忘記的重點。", ["選一段最近讀過或學過的內容", "從中整理出三個關鍵詞", "用一句自己的話連起這三個詞"]), choice("voice", "讓露榭把記憶唱回來", "lucien", "expression", "care", "聲音會替我們記住，有人曾經認真說過的話。", ["挑一句對你有意義的話", "用舒服的聲音朗讀或輕哼 30 秒", "記下一個這句話讓你想起的人或片刻"])],
    ending: "被吞走的文字化成一場細雨。一本空白冊子留下了抄寫人的手印，和一張通往觀星台的未完成星圖。",
    reward: {gold: 55, materials: {ink: 2, ember: 1}}, memory: {title: "一頁仍有溫度的手稿", text: "被記住的不一定是完整的句子，也可以是有人理解你的那個瞬間。"},
  },
  {
    id: "bell-05", kind: "main", number: "05", act: "第二幕", title: "星圖缺少的那一角", region: "archive", requires: "bell-04", enemyId: "mirror-star",
    summary: "每個人看到的星圖，都有不同的缺口。",
    intro: [{speaker: "ori", text: "我補了五次，還是不對。也許不該把缺口當成必須藏起來的地方。"}, {speaker: "mira", text: "你已經做了很多。先聽聽那個一直催促你的聲音，究竟在擔心什麼。"}],
    choices: [choice("try", "和奧里保留一次不完美", "ori", "craft", "courage", "這次不改掉重來。我們讓修改的痕跡留著。", ["畫一個很簡單的形狀，不需要擦掉重畫", "在旁邊加一筆你想到的新可能", "記下一個這次嘗試讓你發現的事"]), choice("allow", "跟米菈接受一個缺口", "mira", "mindfulness", "care", "還沒完成，不等於沒有成長。", ["安靜坐一會兒，留意身體的感覺", "想一件最近還沒完成的小事", "用一句不責備自己的話描述目前進度"])],
    ending: "倒映星靈不再模仿你的動作。它替缺口畫上一顆微小的星：『這裡，是下一次開始的地方。』",
    reward: {gold: 60, materials: {ink: 2, fiber: 1}}, memory: {title: "沒有被擦掉的修改", text: "留下來的痕跡，不只記錄錯誤，也記錄你沒有放棄理解。"},
  },
  {
    id: "bell-06", kind: "main", number: "06", act: "第二幕終章", title: "把自己的名字借出去的人", region: "archive", requires: "bell-05", enemyId: "nameless-curator",
    summary: "守庫者保住了所有人的故事，唯獨忘記自己的。",
    intro: [{speaker: "selene", text: "他不是沒有名字，是把最後一點記憶也留給別人了。"}, {speaker: "eira", text: "那我們就從他走過的路，把他慢慢找回來。"}],
    choices: [choice("understand", "用賽琳的方法理解他", "selene", "knowledge", "curiosity", "每一個問題，都能讓一個模糊的人變得清楚一點。", ["選一個今天想了解的小問題", "用可信任的內容找一個簡單答案", "寫下你還想繼續了解的一件事"]), choice("remember", "跟艾菈找回生活的線索", "eira", "exploration", "care", "一個人不只活在大事裡，也活在他每天注意的小地方。", ["看一眼一件陪伴你一段時間的小物", "回想它曾經出現在哪個生活片刻", "留下一句關於這個片刻的紀錄"])],
    ending: "守庫者摘下兜帽，想起自己曾是一位叫伊凡的抄書人。他把最後一頁交給你：『鐘聲沒有消失，它被封在黎明之前。』",
    reward: {gold: 65, materials: {ink: 3, ember: 1}, title: "拾星者"}, memory: {title: "抄書人伊凡", text: "照顧別人的故事時，也請替自己的名字留一頁。"},
  },
  {
    id: "bell-07", kind: "main", number: "07", act: "第三幕", title: "盔甲裡沒有寄出的信", region: "dawnrift", requires: "bell-06", enemyId: "ember-sentinel",
    summary: "巡衛的誓約只剩一句『我會回來』。",
    intro: [{speaker: "lorne", text: "這個結，和我師父教的一樣。他們不是為了不倒下才穿上盔甲，是為了有一天能脫下它回家。"}, {speaker: "ori", text: "我能修好裂縫。至於裡面那句沒說完的話，也許需要你。"}],
    choices: [choice("steadfast", "陪洛恩練習穩定前進", "lorne", "fitness", "courage", "不必用盡全力。能繼續走的步伐，就是今天合適的步伐。", ["輕輕活動身體 30 秒，坐姿也可以", "以舒服的節奏走動或活動四肢 2 分鐘", "休息一下，記住身體覺得合適的幅度"]), choice("mend", "讓奧里修復一道裂縫", "ori", "craft", "care", "修好的地方不用藏起來，它也可以成為新的紋路。", ["找一個可以小幅改善的生活角落", "用手邊材料整理或調整一處小細節", "留下一句關於這個小改變的紀錄"])],
    ending: "巡衛放下武器，盔甲裡落出一封沒有地址的信。洛恩把它收進胸前：『有人會替你把話帶回去。』",
    reward: {gold: 70, materials: {ember: 2, fiber: 1}}, memory: {title: "未寄出的歸途", text: "責任不是忘記自己，而是帶著重要的事，還記得回家的路。"},
  },
  {
    id: "bell-08", kind: "main", number: "08", act: "第三幕", title: "斷橋兩端的聲音", region: "dawnrift", requires: "bell-07", enemyId: "broken-echo",
    summary: "橋的另一端，傳來你曾經對自己說過的話。",
    intro: [{speaker: "lucien", text: "它一直在重複『還不夠好』。可你聽，後面還有一句被蓋住了。"}, {speaker: "mira", text: "也許是『但我願意再試一次』。我們不需要大聲贏過它，只要把後半句說完。"}],
    choices: [choice("say", "與露榭說完那句話", "lucien", "expression", "courage", "你的聲音，不需要先得到許可才值得被聽見。", ["想一件最近有點困難的事", "用完整一句話描述自己已經做到的部分", "說出一句你想帶去下一步的鼓勵"]), choice("listen", "跟米菈聽完自己的心情", "mira", "mindfulness", "care", "不用急著把心情變好。先讓它有一個可以待的位置。", ["把視線從螢幕移開，休息 30 秒", "用一個詞形容現在的心情", "為自己安排一個做得到的小照顧"])],
    ending: "回聲終於有了不同的結尾。橋沒有恢復原狀，卻長出一條足夠讓大家並肩走過的新路。",
    reward: {gold: 80, materials: {fiber: 2, ink: 2}}, memory: {title: "一句話的後半段", text: "『還不夠好』不一定是故事的結尾。你也可以替它接上下一句。"},
  },
  {
    id: "bell-09", kind: "main", number: "09", act: "第三幕終章", title: "為明天敲響的第一聲", region: "dawnrift", requires: "bell-08", enemyId: "silent-crown",
    summary: "所有被找回的名字，在黎明前聚成最後一束光。",
    intro: [{speaker: "narrator", text: "王冠下沒有君王，只有千百段沒說完的故事。六位夥伴站在你身後，等你決定最後一步。"}, {speaker: "eira", text: "地圖上還有很多空白。可現在，我們知道該怎麼一起畫下去了。"}, {speaker: "selene", text: "不是結束所有冒險，是替明天留下可以開始的聲音。"}],
    choices: [choice("tomorrow", "替明天留下新的方向", "eira", "exploration", "curiosity", "不用現在規劃完一生。挑一個你還願意好奇的小地方。", ["選一件接下來想嘗試的小事", "把它拆成一個 2 分鐘也能開始的行動", "記下你願意開始的理由"]), choice("light", "把一路學到的事帶回來", "selene", "knowledge", "care", "你帶回來的不只是一個答案，還有願意繼續理解的自己。", ["回想最近一個讓你成長的小片刻", "整理成一句可以分享給未來自己的話", "為下一段學習留下一個簡單的問題"])],
    ending: "晨鐘響起時，大家先聽見的不是宏大的勝利，而是彼此的名字。你帶回的勇氣、好奇與照顧，讓這個世界重新有了明天。第一卷《無聲晨鐘》完。",
    reward: {gold: 100, materials: {ember: 3, fiber: 3, ink: 3}, title: "喚鐘者"}, memory: {title: "為明天留下的鐘聲", text: "傳說沒有替你完成生活。它只是記住，你真的為自己踏出了那些小小的步伐。"},
  },
];

const bonds: {npc: NpcId; region: RegionId; title: string; summary: string; intro: string; ending: string; memory: string; choices: StoryChoice[]}[] = [
  {npc: "eira", region: "morningbell", title: "嚮導也會迷路", summary: "艾菈的私人地圖上，有一條她從沒敢走的路。", intro: "我總告訴別人不用怕迷路，卻把自己的那條路折進地圖裡了。你願意陪我，先看一小眼嗎？", ending: "艾菈在那條路旁畫了一個小圓點：『不是終點，是我願意開始的地方。』", memory: "帶路的人也可以說不知道。同行，並不要求誰先有完整答案。", choices: [choice("look", "陪她發現一個小細節", "eira", "exploration", "curiosity", "原來熟悉的地方，也會等人重新看見。", ["在熟悉的環境中找一個新細節", "用一句話記下它讓你想到的可能"]), choice("tell", "告訴她你也曾經猶豫", "eira", "expression", "care", "謝謝你讓我知道，不確定的時候也可以有人陪著。", ["想一件你曾經猶豫的小事", "說一句你願意給當時自己的話"])]},
  {npc: "lorne", region: "morningbell", title: "卸下盔甲的下午", summary: "洛恩難得沒有安排練習，卻不知道該怎麼休息。", intro: "今天沒有值勤。我想坐一會兒，可一坐下來，就覺得自己該做點什麼。", ending: "洛恩第一次把沙漏倒放：『原來沒有拿來證明自己的時間，也可以被好好度過。』", memory: "休息不是對努力的背叛，而是讓努力還能陪你走下去。", choices: [choice("ease", "一起做一點輕量放鬆", "lorne", "fitness", "care", "這一次，我們不把次數當成標準。", ["用舒服的幅度放鬆肩頸或手指", "停下來，感覺現在和剛才有什麼不同"]), choice("pause", "陪他安靜坐一會兒", "lorne", "mindfulness", "care", "有人在旁邊，休息好像也沒那麼不安了。", ["找一個舒服的位置安靜坐 1 分鐘", "記下一件今天可以暫時放下的事"])]},
  {npc: "selene", region: "archive", title: "沒有標準答案的書籤", summary: "賽琳保留了一頁她始終看不懂的筆記。", intro: "我一直以為，整理書的人應該什麼都知道。可是這一頁，我想了很久。", ending: "賽琳在書籤上寫下『還在理解中』，把它放進最常讀的那一本書。", memory: "不懂，也可以是一個誠實而有力量的開始。", choices: [choice("question", "替那一頁留一個問題", "selene", "knowledge", "curiosity", "我們不急著補上答案，先把問題問清楚。", ["選一個目前還沒完全理解的概念", "寫下一個具體、想繼續了解的問題"]), choice("picture", "用另一種方式表達它", "selene", "craft", "courage", "也許理解可以先從一張很簡單的圖開始。", ["選一個最近學到的想法", "用三筆草圖或簡單分類表達它"])]},
  {npc: "mira", region: "mistwood", title: "留給自己的那杯茶", summary: "米菈記得每位旅人的喜好，卻忘了替自己泡一杯。", intro: "我把大家的茶都備好了。你問我的？我好像很久沒認真想過，今天自己需要什麼。", ending: "米菈替自己的杯子加了一片薄荷：『下一次，也會把自己算進去。』", memory: "照顧別人的時候，也請讓自己成為值得被照顧的人。", choices: [choice("care", "一起做一個小小照顧", "mira", "mindfulness", "care", "先從現在這個做得到的小動作開始。", ["留意身體現在的一個需要", "喝水、休息或調整坐姿，回應這個需要"]), choice("word", "留一句話給今天的自己", "mira", "expression", "care", "我們也可以練習，用對待朋友的方式對待自己。", ["用一句不責備的話描述現在的自己", "再加上一句你願意給朋友的鼓勵"])]},
  {npc: "ori", region: "mistwood", title: "有裂縫的第一件作品", summary: "工坊最高的架子上，擺著奧里不肯賣的小木盒。", intro: "盒蓋總是合不上。我做過很多更好的，可這是第一次有人說，想看我做下一件。", ending: "奧里把木盒從高架搬到工作桌旁。裂縫沒有消失，故事卻更完整了一點。", memory: "第一件作品的價值，不只在於它做得多好，還在於它讓下一件成為可能。", choices: [choice("make", "替它加一點新的可能", "ori", "craft", "courage", "不是重做，是接著往下做。", ["選一個可以動手的小練習", "花 2 分鐘做一個不必完美的小成果"]), choice("notice", "看看一路留下的痕跡", "ori", "exploration", "curiosity", "你看，這些痕跡也在替我們記路。", ["看一件自己曾經做過或整理過的東西", "找出一個現在的自己會用不同方式處理的細節"])]},
  {npc: "lucien", region: "dawnrift", title: "只唱給自己聽的歌", summary: "露榭的歌本最後一頁，沒有寫給任何觀眾。", intro: "這一段太普通了吧。沒有冒險，也沒有大事……只是一個人，好好過完了一天。", ending: "黃昏時沒有掌聲，卻有人一起把那段很普通的旋律哼完。", memory: "平凡的一天，也值得被寫進自己的歌裡。", choices: [choice("sing", "替平凡的一天留個聲音", "lucien", "expression", "courage", "不需要觀眾，我們先唱給自己聽。", ["挑一小段喜歡的旋律或句子", "輕哼、敲節奏或朗讀 30 秒"]), choice("hear", "先安靜聽見今天", "lucien", "mindfulness", "care", "也許歌的第一個音，是願意聽見。", ["把注意力放在身邊的聲音 30 秒", "記下一個今天想留住的平凡片刻"])]},
];
export const bondEpisodes: StoryEpisode[] = bonds.map((bond, index) => ({
  id: `bond-${bond.npc}-01`, kind: "bond", number: `羈絆 ${String(index + 1).padStart(2, "0")}`, act: "夥伴篇", title: bond.title, region: bond.region, bondNpc: bond.npc,
  summary: bond.summary, intro: [{speaker: bond.npc, text: bond.intro}], ending: bond.ending, choices: bond.choices,
  reward: {gold: 25, materials: {fiber: 1, ink: 1, ember: 1}}, memory: {title: bond.title, text: bond.memory},
}));
export const storyEpisodes = [...mainEpisodes, ...bondEpisodes];
export const episodeOf = (id: string) => storyEpisodes.find(episode => episode.id === id);
export const enemyOf = (id: string) => enemies.find(enemy => enemy.id === id);
