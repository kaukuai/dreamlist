# 從背景貼圖走向分層 RPG 世界

2026-10-28。最新回饋優先：上一版方塊人物太粗糙、像貼紙，固定頂列／底部分頁破壞手機遊戲畫面。這輪重做場景呈現與入口，不把換皮說成已完成大型 RPG，也不假稱做過真人 UX 訪談。

## 實際研究

- [Square Enix：Final Fantasy Pixel Remaster](https://www.square-enix-games.com/en_US/games/final-fantasy-pixel-remaster)：已取得介紹正文、平台與截圖連結。其 CDN 的部分圖片回覆 403；沒有把未能讀取的圖當成證據。
- [Steam：Final Fantasy VI](https://store.steampowered.com/app/1173820/) 的官方商店 API 與原始宣傳截圖：實際檢視世界地圖／飛空艇場景對話／戰鬥／Abilities 選單。世界地圖主要保留場景與角落地圖；對話及養成是情境性介面。像素人物靠髮型、配色、服裝輪廓辨識，並與地面紋理、欄杆和場景比例一致。這些是畫面觀察，不能據此宣稱取得其內部引擎規則或手機觸控實測。
- [App Store：Stardew Valley](https://apps.apple.com/app/id1406710800) 與 [官方 Mobile 頁](https://www.stardewvalley.net/mobile/)：讀取商店資料及畫面，實際看見場景占據主要空間，工具與時間資訊在側邊。官方頁本次主要內容為行動版多人測試，未把它當成 UI 設計手冊。側邊常駐工具是該遊戲的一種取捨；本作依使用者要求，將養成入口收進手札。
- [App Store AFK Journey 搜尋資料](https://itunes.apple.com/search?term=AFK%20Journey&entity=software&country=us&limit=3) 與 [OCTOPATH TRAVELER: CotC](https://itunes.apple.com/search?term=octopath%20traveler&entity=software&country=us&limit=3)：取得並檢視商店宣傳圖。AFK 圖偏重 CG／世界氣氛，Octopath 圖顯示多人隊伍戰鬥；這些不等於完整操作手冊，沒有據此臆測所有手機 HUD 或控制方式。
- [LPC style guide](https://lpc.opengameart.org/static/LPC-Style-Guide/build/index.html)、[Universal LPC Character Generator](https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator) README／各圖署名，以及 [LPC Base Assets](https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles)：採用可相容的角色與地圖美術，保留來源 PNG 和逐檔授權。不是挪用 FF 或其他商業遊戲素材。

下載與觀察快取位於忽略的 `.sites-runtime/world-research/`。商業遊戲截圖只用於研究，沒有放入 public。前輪觸控相容研究仍見 PIXEL_TOUCH_RESEARCH.md。

## 具體診斷與改造

舊場景是一張完整透視插畫，角色另以 DOM 疊在最上層。即使腳底座標不變、相機會動，樹冠、牆面和人物仍無真正的前後順序。簡略矩形人物又和背景的比例、細節層級不同，因此看起來像貼紙。

現在以單一 Canvas 繪製地面與按腳底 y 排序的物件／人物。lib/world-map.ts 同時提供物件、腳底碰撞、地表和區域；尋徑使用同份障礙。可以走到樹前與樹後，建築屋頂、書架會遮住後方人物。陰影貼在腳底，角色自身有完整八步行走循環與六幀攻擊；每幀以原圖實際腳底像素校正。小鎮人物不再是 DOM 人物圖疊在背景上。

相機採中央活動範圍：角色先在畫面內走一段，再推動鏡頭；場景與角色使用相同相機矩陣、同一色調覆層。地面有短暫腳印、尋路目的點。Canvas 以裝置比例繪製並關閉平滑，行動版使用 1.5 場景縮放（DPR 2 時原像素對應三個裝置像素）；不是聲稱所有縮放／DPR 都完全整數。角色圖層先快取，避免每個動畫更新都重新執行多個色彩濾鏡。

## 本輪可玩的內容

- 晨鐘鎮：保留六 NPC、共鳴石、微光、回聲之門，重建地面、屋舍、植栽、座椅與前景遮擋。
- 星頁書庫：由鎮上書庫門進入，可走動的閱覽室、書架與書桌、賽琳及兩段鎮誌／頁邊筆記，可再從門走回小鎮。
- 月痕林：由東側路口進入，溪流與唯一可通行木橋、營火、巡路的艾菈、三段巡林記錄。依序尋訪文字後，舊鐘亭回應並亮起；可原路返回。
- 共八段探索文字（含鐘亭回應），保存已讀狀態。沒有為走地圖、撿頁面或解謎增加生活 XP／貨幣；原主線與生活成長規則延續。

不是新增四張開放世界或多人伺服器；目前為三個可走動區域與既有九主線試煉。NPC 尚無日夜行程、動態尋路或完整表情演出，裝備圖層依職業選擇，尚非每一件購買裝備即時反映。

## 手機入口

探索與試煉占滿可用網頁畫面，避開安全區的操作圖示浮在角落。移除瀏覽器試玩模式的永久品牌頂列、試玩橫幅和底部五分頁。角色簡介、角落地圖、可收合任務追蹤、操作與選單構成 HUD。聲音透過音量圖示自願開啟。

任務／角色／裝備／成長／故事等放進「旅人手札」；進入養成頁有返回冒險按鈕。試玩模式與本機保存說明、餘額、像素美術署名放在手札中。CG 留在角色／任務／對話，不以縮小 CG 充當行走動畫。戰鬥操作與生命資訊也浮在場景上，不再以厚重頁首與頁尾擠壓戰場。

「全螢幕」是網頁內容使用整個 viewport，不代表可以替使用者隱藏 ChatGPT／瀏覽器本身的導覽列；沒有強制全螢幕 API 或旋轉方向。

## 授權與保存

public/art/lpc/manifest.json 記錄每個圖檔的原始 URL、固定上游 revision、作者、所選授權、尺寸與 SHA256。全部 PNG 保留來源位元組；角色圖層／色調與地圖配置為執行時組合。署名及授權可由遊戲手札直接開啟 CREDITS.txt、BASE-CREDITS.txt 和 LICENSES.md。依個別來源採 OGA-BY 3.0 或 CC-BY-SA 3.0，沒有變更 app 原始碼的授權。

保留 dreamlist:browser-preview:v1。field 加入選用 zone／visitedZones；舊資料預設 town。若舊座標與新版障礙重疊，只重新安置位置，不重置收據、裝備、AP、錢包或劇情。區域轉換由實際出口互動決定，舊分頁在錯誤區域的保存會回覆衝突。未綁 Google／Turso，原 Sites 資料未操作。

## 驗證方式與界線

npm run test:field 包含素材校驗、四方向／八步態及腳底、所有區域互動點可達性、橋與河碰撞、深度順序、鏡頭活動範圍、區域保存與舊資料保留。原等級／職業／任務／獎勵測試仍需執行。

tests/mobile-play.browser.mjs 會實際在 iframe 開啟 app，操作觸控／點擊備援、走進書庫／森林、讀完記錄並啟動鐘亭、重載、開手札切頁、多尺寸及雙指戰鬥。原生 Touch 相容分支部分用注入事件，引擎 touchscreen tap 另驗；不能當作已在實體 iPhone、Android 或 ChatGPT 原生 App 驗收。畫面輸出在忽略的 outputs/world-redesign。沒有真人可用性測試或證明已達商業大型 RPG 品質。

本輪模型與素材／保存檢查共 59 項通過；TypeScript、改動模組 ESLint、Next Vercel 與 vinext Sites 兩套正式建置通過。Chromium／WebKit 開發版三區域流程通過，Chromium 正式建置三區域流程及舊回合轉換亦通過。正式網址需另核對最新 SHA 與互動，不能以本機建置代稱發布完成。

線上回歸補正：嵌入視窗更新頻率降低時，方向鍵短按原本的 160ms 定時器可能先於移動更新結束。改為同時滿足最低時間與四次畫面更新機會後釋放；進入背景／明確暫停仍會立即取消。新增低更新頻率的輸入測試（總計 60 項），不以固定 400ms 內必定顯示若干步態作為所有裝置的假設。
