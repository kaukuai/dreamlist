# 夢嶼專案接續

開始工作前閱讀 CLOUD_HANDOFF.md 和 README.md，確認這份程式為 reverie 夢嶼，而非先前的 AI Studio 專案。

依使用者最新方向，採手機直式 RPG 介面，角色介於韓漫線條與日系冒險遊戲的賽璐璐風格，保留成人比例和戰鬥職業辨識；任務、角色、裝備、天賦、職業為主入口，小島為選用營地。保留繁體中文與既有資料保存機制。接續閱讀 GAME_DESIGN.md 與 RPG_REFERENCES.md；不要把尚未取得的官方資料寫成研究結論。開發與測試使用獨立的本機 D1；原 Sites 網址、project_id 與正式資料保持延續。

iPhone PWA 安裝功能目前尚未實作，需依使用者後續需求安排。雲端程式保存不等同於網站已發布，也不代表 Codex Cloud 環境已建立。

沒有自訂夢想的玩家也要能從每日輕量委託與 NPC 初識修練開始成長。接取不發獎，跨日保留任務，既有收據與職業進度不可清空。

使用者最新明確要求 Vercel 只用於檢視開發中的 app：不綁 Google、不需要跨裝置資料。這取代先前私人 Google／Turso 部署方向。閱讀 VERCEL_DEPLOYMENT.md。原 Vercel 網址 https://kaukuai-dreamlist.vercel.app/ 採免登入瀏覽器試看模式（DREAMLIST_MODE=browser，預設值），資料只存於各瀏覽器的獨立 localStorage，不上傳伺服器；介面要清楚標示，不宣稱雲端同步或提供假玩家排名。此模式公開的是 app 介面，每個瀏覽器有自己的進度，不是共享假帳號。原 Sites 認證與 D1 仍保留；未來只有在使用者要求正式雲端版時才設定 DREAMLIST_MODE=cloud 與 Google／Turso。不要再要求試看版建立那些服務。

擴充第一卷《無聲晨鐘》時閱讀 ENGAGEMENT_RESEARCH.md、lib/adventure-catalog.ts 和 adventure-model.ts。保留既有 localStorage 鍵與成長，只加法初始化 adventure；完整篇章與固定首次獎勵不能重複領取。用生活行動賺角色 XP，戰鬥不提供無限灌 XP；玩家可以自由休息，不能為留存加上斷簽扣分、錯過就消失的收藏或虛假玩家。當前四區是節點地圖，回合戰鬥只在瀏覽器試看版，勿宣稱已具備開放世界／多人或已證明留存提升。

使用者最新回饋是遊玩像只按下一步、缺少直接操控及沉浸，並要求配樂／音效。接續先讀 PLAY_EXPERIENCE_RESEARCH.md。瀏覽器版預設可探索晨鐘鎮，主入口為冒險／任務／角色／裝備／成長；成長包含原天賦／職業／技能，這取代上方舊五入口方向。新主線試煉有走位、閃避及預警，舊回合存檔仍保留。音訊須先明確開啟，音樂／音效／環境聲獨立控制，關閉聲音也能遊玩；開設定、明確暫停或 document.hidden 時需暫停戰鬥；可見內嵌視窗的 blur 只清除鍵盤，不清觸控／路徑。不要把按鈕減少、合成音樂或模擬尺寸檢查說成已完成真人 UX／真機聽感評測。新增 test:field，保存採加法；原 Sites 尚未連上新場景與即時戰鬥。

接續觸控及地圖角色先讀 PIXEL_TOUCH_RESEARCH.md。地圖／即時戰鬥用獨立四方向像素人物（非 CG 縮圖或整張漂浮動畫），任務／角色／對話用精美 CG。可見十字鍵為預設，搖桿可切換。不得只測 PointerEvent；須保留 TouchEvent、click 備援、多指追蹤與取消復原。tests/mobile-play.browser.mjs 可驗證 Chromium／WebKit 嵌入頁框，不能當作 ChatGPT 原生 App 真機已測。
