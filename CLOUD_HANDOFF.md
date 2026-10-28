# 夢嶼 reverie — 雲端開發交接

## 2026-10-28：直接操控與聲音重做

最新使用者要求深入調整整體 UI／UX，不要只是按下一步，並加入配樂與音效。先讀 PLAY_EXPERIENCE_RESEARCH.md。已讀 NN/g、Microsoft XAG 103／105／107、MDN、Chrome、W3C，並檢視 XAG 中的 Grounded 音量畫面、COD Mobile 控制配置與虛構 RPG 留白示意；不是最新遊戲實機評測，沒有真人 UX／留存實驗。

Vercel 瀏覽器版預設可走動晨鐘鎮，五導覽為冒險／任務／角色／裝備／成長；成長保留天賦／職業／技能。點地面尋徑、碰撞、搖桿與鍵盤並行，NPC 近距互動、微光／共鳴石環境解謎、單一當前目標，生活任務一次聚焦一個行動。九主線新增即時走位試煉，30Hz 模擬、範圍預警／閃避／職業戰技／調息／從容模式；控制批次約半秒保存，暫停排完輸入後保存。強制關頁可能退回最近保存。設定／更多／切頁／失焦暫停，舊回合存檔仍可接續，不清空舊進度。

新增 lib/field-engine.ts、arena-engine.ts、game-audio.ts 與 app/explore-scene.tsx、action-arena.tsx、field-controls.tsx、field-game.css、game-sound.tsx、life-focus.tsx。原 v1 存檔只加 adventure.field／battle.arena。遊戲內操作不給生活 XP，勝利與一次性劇情獎勵仍驗證生活收據。原 Sites 認證／D1 未接新場景，也未操作正式資料。

public/audio 有兩首原創無外部採樣的配樂，來源腳本 scripts/compose-soundtrack.py（僅作者工具需 numpy／ffmpeg）。聲音須明確開啟，Web Audio、探索／交戰切換、三類音量、環境／行動提示與背景暫停；不假稱有人聲或管弦錄製。四份新場景／NPC／敵人美術來源在 public/art/generation-notes-playfields.json，圖集僅轉格式，不使用競品圖片。

46 項規則測試（新增 test:field 8項）、型別與改動模組 ESLint、Vercel／Sites 兩套正式 build 均通過。新瀏覽器驗證在 .sites-runtime/field-validation/browser.mjs，Next 正式 server 已以 exit0 完成：實際觸控搖桿、畫面位置／比例、尋徑、微光／三音解謎、NPC、生活修練、即時戰鬥／閃避、配樂解碼與三類音量、設定暫停、重載續接／首次獎勵、五寬度及320×640、聲音按鈕不覆蓋控制、零RPG伺服器API、無瀏覽器錯誤。手機為 Chromium 模擬，非 iOS／Android 真機。上線後仍需對原網址重做版本及互動查核。舊 island-game lint 基線仍保留，勿說全專案 lint 通過。

預期 /api/version.release 為 direct-play-audio-v1。推 main 後核對原網址 SHA 才報告部署；前輪 token 對 team 的 API scope 403 仍可透過 Git 自動部署、公開版本與 GitHub commit status 完成發布，不要重複索取同一 token。雲端環境草稿／Publish 與 Vercel app 發布分開。

## 2026-10-28：晨鐘編年史擴充

本輪使用者要求持續研究留存、擴充劇情與內容規模。先讀 ENGAGEMENT_RESEARCH.md；已實際查核瑪奇官方介紹（單角色全技能／生活與戰鬥並存）、Nintendo 官方頁與 Ryan 等人 2006 原論文，沒有把關聯研究當成本作留存成效。部分 guide 空殼仍未取得詳細資料，不聲稱看過那些規則。遊戲採自主路線、可理解成長與 NPC 故事，不加斷簽懲罰、倒數體力或抽獎付費。

瀏覽器版新增第一卷《無聲晨鐘》：4 區、9 主線、6 夥伴篇，各兩路線；9 種對手、3 守關者、職業差異的回合戰鬥；3 刻印、15 回聲與3稱號。生活行動給 XP，戰鬥與故事只給一次固定素材／星露；工坊／裝備／營地共用同一餘額。戰況可保存，敗退不扣成長，戰鬥回合防重複。每週自選方向僅計新收據時間，不推算舊收據日期，也不扣既有成長。

新增 lib/adventure-catalog.ts、adventure-model.ts 與 app/adventure-world.tsx／adventure.css。現有 v1 localStorage 保留並加 adventure 子資料；故事修練在 Dream.story，不能改內容或刪除，個人旅誌排除故事任務。只有瀏覽器試看模式開啟此功能，原 Sites D1 未修改。新目錄可擴充下一卷，尚無 3D 自由走動、多人公會或雲端同步。

npm run test:adventure 驗證九主線＋六支線完整通關、舊存檔、戰術、防重領、共享錢包、跨週與保存失敗；先跑舊 test:preview／test:vercel／npm test。檢查型別、改動檔案 ESLint、兩套 build；瀏覽器測試腳本在忽略的 .sites-runtime/adventure-validation。推送 main 後必須核對 Vercel READY、原網域 /api/version 與最新 Git SHA，再宣稱已部署。

本輪上述 38 項測試、型別、改動模組 ESLint、兩套正式 build 均通過。Next 正式 server 的 Chromium 驗證完成前三主線與守關者、戰士戰技、跨重載／分頁戰況、夥伴篇、稱號及刻印；五尺寸 × 四分頁／故事共 25 組檢查通過，無瀏覽器錯誤、無 RPG 伺服器 API 請求。2026-10-28 現有 Vercel API token 對原 team 回應 scope forbidden 403（不是代理阻擋），不要輸出或重複索取值；main Git 自動部署與公開版本查核仍可獨立運作。原 autoAssignCustomDomains 已於前輪設 true。優先推 main 並查原網址；需要改 Dashboard 才另處理該 scope。

## 最新要求：免登入的 Vercel 試看版

使用者已取消這階段的 Google 綁定與跨裝置儲存，只要原 Vercel 網址方便檢視開發 app。此要求取代下方先前的私人 Google／Turso 設定計畫。Vercel 的 DREAMLIST_MODE=browser（亦為預設）使用 localStorage，無需任何 Google／Turso 憑證；原 Sites 模式維持認證及 D1，未操作正式資料。只有明確選 cloud 模式才需要先前的七個設定與遷移。

瀏覽器試玩有真實的每日／NPC 接取、首次獎勵、共享錢包、六裝備欄、天賦與職業進化，沿用原成長模型；不做假跨玩家排行。資料鍵 dreamlist:browser-preview:v1，各瀏覽器隔離；Web Locks 序列化跨分頁寫入、revision 保護舊任務，儲存失敗不覆寫先前進度。頁面顯示只存此瀏覽器。瀏覽器不會把任務內容送至 API，預覽模式伺服器也不啟動雲端身分或資料庫。

網路與 VERCEL_TOKEN 現已可用，已讀取原專案並修正 Dashboard 框架為 Next.js、建置 npm run build:vercel、輸出 .next-vercel、Node 24。專案 Git 已連 kaukuai/dreamlist main。曾建立的三個 Google 登入相關變數已依新要求移除，現在 Production／Preview 只需 DREAMLIST_MODE=browser。不要繼續聲稱 Vercel 仍遭代理 403 或要求使用者再提供同一個 token。真正部署結果依後續原網域的 /api/version 和瀏覽器驗證判定。

## 2026-10-19 Vercel 接續

使用者現在要求更新原 Vercel 網址 https://kaukuai-dreamlist.vercel.app/，且選擇先保留私人使用。閱讀 VERCEL_DEPLOYMENT.md；此要求授權增加 Vercel 相容流程，原 Sites 與正式資料仍保留。已新增標準 Next.js 建置、Google 單帳號登入與 Turso D1 相容介面；兩套建置成功，原 18 項及新 3 項規則測試通過，Next.js 正式 server 的 24 項 HTTP 驗證通過。真正 Google／遠端 Turso／Vercel 上線仍待正式設定。

GitHub main 查核停在 a4b7df75ad4428f99d562f107d5ceb794c49ea83，先前 RPG 未提交也未部署。Vercel 網域與 API 在環境代理 CONNECT 階段遭 403，沒有 VERCEL_TOKEN 或專案綁定，因此尚不能核對 Vercel 最後成功部署或宣稱修復正式網站。已在原草稿保留研究白名單，新增原網站、vercel.com、api.vercel.com、api.github.com 和只送至 api.vercel.com 的 VERCEL_TOKEN 需求；保存不等於套用，仍需環境 Save／Publish。GitHub Git 原生讀取已成功，不要重複索取 GitHub token。後續先用 python3 scripts/check-vercel-deployment.py 唯讀查核，再在原專案設定 Git／環境變數／五個加法遷移並更新部署。

## 目前方向

使用者最新要求為手機 RPG：降低小島、韓漫線條與日系冒險賽璐璐風格的成人職業角色、獨立任務／人物裝備／天賦介面，角色持續升級與轉職進化。這項明確要求取代先前「保留可愛生活模擬美術」的限制。保留繁體中文及所有原有資料機制。新增輕量每日任務和不同 NPC 委託，讓尚未建立夢想的人也能開始。

接續先閱讀 README.md、GAME_DESIGN.md、RPG_REFERENCES.md、DESIGN_REVIEW.md。官方瑪奇與主流手機 RPG 資料查核遭環境代理 403 阻擋；官方域名、Nintendo 及 Nexon 子網域已存入環境設定草稿，仍未確認套用。新增 `python3 scripts/check-research-network.py` 以提供的代理與 TLS 驗證診斷。6 個官方入口均在 CONNECT 階段遭拒；同代理對 npm 回覆 200，工具也驗證能區分真正的網站 HTTP 錯誤。遊戲本身不依賴官方研究網路。不要把待核實入口或既有設計知識說成已完成官方研究。

## 專案與正式網站

- GitHub：https://github.com/kaukuai/dreamlist ，目前為 Vinext／React 19／Sites 專案，不是舊 AI Studio 專案。
- 既有正式網址：https://dream-orbit-life.holyman0405.chatgpt.site/
- Sites project_id：`appgprj_6abf4597d31c8191b75ecb4f00c6c183`，保留 `.openai/hosting.json`。
- 正式站為擁有者私人存取；本機開發不改變受眾。正式資料在原 Sites D1，不在來源包。
- 歷史 Windows 來源：`D:\聖\ai\DREAM\dream-orbit`，來源 commit `2623c047133ed05d1acd51e6241f9da2a0a6f901`。

本輪僅實作及驗證本機版本，未推送或部署。雲端環境草稿保存、Publish 環境、GitHub 保存及正式網站發布是不同步驟，不能互相代稱。

## 本輪實作

- 手機直式深色 RPG：任務／角色／裝備／天賦／職業五入口；原小島位於更多選單。
- 韓漫與日系冒險之間的六職業／旅人及進階原創立繪；原裝備圖集保留，新 NPC 圖集與生成摘要位於 `public/art/`。
- 3 份每日隨機委託（台北 04:00 更新、1～3 分鐘）和 6 位原創 NPC 初識委託（2～4 分鐘）；接取不發獎，跨日可完成。選項快照與接取防重複保存在 D1。
- 六種生活修練、六項永久屬性、不封頂角色 XP 和每級 1 AP。
- 六職業的基礎門檻為 Lv.2 加技能／屬性；各自保存 Lv.10／25／50 進化，轉職不清空進度。
- 18 個有等級和前置條件的天賦節點；保留舊根節點投入。
- 六部位裝備與 13 件軍需裝備、背包／商店詳情、共享星露餘額。
- 預設不公開的排行榜；沒有假玩家，不輸出任務內容。
- 首次完成收據、任務版本衝突、帳號隔離、防重複領取及條件扣款延續。

戰力是養成評級，尚無戰鬥引擎。立繪依職業與是否進化切換，三階目前共用進階立繪；逐件換裝、混合職業、子技能、劇情與 PWA 未實作。

## 本機環境與遷移

Node.js >=22.13（本環境為 24.19.0）、npm 11.9.0、鎖定安裝；不需要 Gemini 或 Cloudflare 金鑰。

使用現有 `/workspace/dreamlist` 和 portable execution profile。完整環境安裝腳本已保存為草稿；`.sites-runtime/cloud-onboarding/wrangler.json` 使用獨立虛擬 D1 ID `00000000-0000-4000-8000-000000000000`、DB binding `DB`、遷移目錄 `../../drizzle`。設定是忽略檔，全新環境的格式見 README。

```sh
npm run install:ci
CI=true node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config .sites-runtime/cloud-onboarding/wrangler.json --persist-to .wrangler/state
npm run dev -- --hostname 127.0.0.1
```

必須套用全部五個遷移，包含 `0002_character_journey.sql`、`0003_mobile_rpg_advancement.sql` 和 `0004_npc_daily_quests.sql`；沿用 `.wrangler/state`，不清庫、不改舊遷移、不用 `--remote`。正式更新前也須在原 Sites 正式流程套用新遷移。

本機以 `/signin-with-chatgpt` 取得專案內建的 loopback 試玩登入。雲端 localhost 不能直接當使用者的公開網址。曾嘗試的預覽面板工具未提供可用 handler；目前交付本機試玩包與實際畫面，沒有建立公開認證替代或外部 tunnel。

## 驗證與試玩

- `npm test`：18 項規則與加法遷移通過，不改動個人資料。
- `npx tsc --noEmit --incremental false`、`npm run build`。
- `npm run test:api`：21 組情境通過（含外層共 23 tests），涵蓋舊角色及每日／NPC 委託。讀 GAME_DESIGN 後才對拋棄式本機資料庫執行。跨日 fixture 需 `DREAMLIST_TEST_SQLITE_PATH`；本輪有指定且無跳過。
- Chromium 完整驗證新玩家不建立個人目標，靠每日委託和 3 位 NPC 修練升級與轉職；六位 NPC 對話與 45 組尺寸／頁面檢查通過。詳見 DESIGN_REVIEW；不等同手機真機測試。
- 舊 `app/island-game.tsx` 仍有已確認的 ESLint 基線問題，不能宣稱全專案 lint 通過。

試玩包必須包含最新原始碼、原創美術、`preview.mjs` 和 Windows／Mac 啟動器；排除 `.env`、`.git`、node_modules、`.wrangler`、`.sites-runtime`、憑證與測試資料。啟動器只建立本機資料庫，保留後續個人進度；確認全新解壓與再次執行都能通過 `node preview.mjs --check`。

## 正式發布與保存

使用現有專案 Git 歷史，不強制覆寫。換裝置接續前應把成果提交到 GitHub；未提交變更只存在此任務工作區。若另建立 PR，必須附回聊天。

正式網站發布需使用當前 Sites skill、原 project_id 和原網址。GitHub 與 Sites 發布來源歷史不同，必要時在另一個空資料夾取得原 Site checkout，再套用修改；不要強推覆蓋任一歷史，也不要建立替代 Site。不要把憑證寫入程式、文件、Git 或命令參數。

雲端設定需在 Settings 的環境頁檢查、Save 並 Publish 才會生效。這也不會自動部署正式網站。
