# reverie 夢嶼 · DREAM ORBIT

繁體中文的生活 RPG。把現實中的閱讀、學習、運動與創作化為角色成長；還沒想好個人目標，也能從每日委託與 NPC 的小修練開始。

Vercel 原專案 `kaukuai-dreamlist.vercel.app` 現在以**免登入試看版**為目標，不需要 Google 或 Turso。角色、任務、裝備與天賦只保存在目前瀏覽器；重新整理保留，更換裝置／網域或清除網站資料則有不同進度。詳見 [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)。Vercel 使用 `npm run build:vercel`；本機／Sites 仍使用下方原流程。建置成功不等於正式網域已更新。

## 目前可以玩

Vercel 試看版新增第一卷《無聲晨鐘》：4 個區域、9 段主線、6 篇夥伴故事、各篇兩條生活修練路線、9 個回合試煉對手、3 種刻印製作、15 頁回聲與 3 個稱號。從任務大廳的「展開冒險」進入；舊瀏覽器存檔會保留後加上冒險進度。設計研究與限制見 [ENGAGEMENT_RESEARCH.md](ENGAGEMENT_RESEARCH.md)。

- 手機直式介面，底部五個入口：任務、角色、裝備、天賦、職業。小島移到「更多 → 營地與小島」。
- 原創韓漫線條與日系冒險賽璐璐風格的成人職業立繪，保留武器、護甲辨識；進化後切換進階立繪。
- 每日抽出 3 份 1～3 分鐘的輕量委託，台北時間 04:00 更新；選項保存、重新整理不重抽，接下後跨日保留。活動任務提供坐姿替代。
- 晨鐘鎮的 6 位原創 NPC、對話與各自的初識修練（約 2～4 分鐘），不用先建立個人目標也能升級與解鎖職業。
- 自訂目標、行動步驟、修練方向與日期；任務大廳顯示進行中、已完成及目標旅誌。
- 首次完成行動獲得 40 XP、20 技能熟練與 25 星露；首次完成整個目標額外獲得 100 XP 和 100 星露。取消完成、重新勾選或刪除目標不會重複領取。
- 角色持續升級，每級 1 AP。六種生活技能可同時學習，六個職業各有 Lv.10／25／50 進化，免費轉職並保留各條路線的進度。
- 六屬性、18 個有等級及前置條件的天賦節點；六部位裝備欄、真實背包與 13 件軍需裝備，使用同一個星露錢包。
- 可命名的角色、三種靈魂光暈、自願加入的成長排行榜；不公開生活任務內容，也沒有假玩家。
- D1 持續保存、依登入身分隔離、版本衝突保護；原有目標、小島建設、星露和首次完成收據延續。

目前有角色養成與瀏覽器版回合試煉；綜合戰力仍是屬性評級，實際試煉使用出戰能力、職業戰技與預告意圖。職業立繪會隨轉職與進化改變，裝備尚未逐件疊到立繪上。完整規則及後續路線見 [GAME_DESIGN.md](GAME_DESIGN.md)，競品查核進度見 [RPG_REFERENCES.md](RPG_REFERENCES.md)。

## 快速試玩

先安裝 Node.js 24 LTS，將整份來源或試玩 ZIP 解壓縮，Windows 雙擊「開始試玩-Windows.cmd」，Mac 開啟「開始試玩-Mac.command」；也可以在資料夾執行 `npm run preview`。啟動器自動安裝鎖定依賴、套用本機遷移並開啟瀏覽器，不需要 API 金鑰。資料保存在同一資料夾的 `.wrangler/state`，停止後再開仍保留。完整說明見「先讀我-試玩說明.txt」。

## 本機開發

使用 Node.js 22.13 以上（建議 24 LTS）與 npm。安裝鎖定的依賴：

```sh
npm run install:ci
```

全新環境先建立以下**獨立本機**設定 `.sites-runtime/cloud-onboarding/wrangler.json`。不要使用正式資料庫 ID：

```json
{
  "name": "dreamlist-local-onboarding",
  "main": "../../build/sites-worker.ts",
  "compatibility_date": "2026-05-15",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [{
    "binding": "DB",
    "database_name": "site-creator-d1",
    "database_id": "00000000-0000-4000-8000-000000000000",
    "migrations_dir": "../../drizzle"
  }]
}
```

啟動前套用全部 SQL 遷移，包含 `0002_character_journey.sql`、`0003_mobile_rpg_advancement.sql` 和 `0004_npc_daily_quests.sql`。沿用相同 persist 路徑，重複執行會保留資料：

```sh
CI=true node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config .sites-runtime/cloud-onboarding/wrangler.json --persist-to .wrangler/state
npm run dev -- --hostname 127.0.0.1
```

本機瀏覽器經 `/signin-with-chatgpt` 進入專案原有的試玩登入；正式網站仍使用平台認證。這個本機服務不能直接當成雲端公開試玩網址。

驗證命令：

```sh
npx tsc --noEmit --incremental false
npm test
npm run build
```

`npm run test:api` 需要另外指定可寫入的拋棄式本機資料庫，詳見 [GAME_DESIGN.md](GAME_DESIGN.md)。一般 `npm test` 不會改動個人資料。

## 主要原始碼

- `lib/adventure-catalog.ts`／`lib/adventure-model.ts`：世界、故事、戰鬥、刻印與回聲規則；`app/adventure-world.tsx`／`app/adventure.css`：冒險介面。`npm run test:adventure` 驗證完整第一卷與舊存檔延續。
- `app/quest-board.tsx`：任務頁；`app/quest-hub.tsx`／`app/quest-hub.css`：每日委託與 NPC 對話；`app/character-journey.tsx`：角色、裝備、技能、設定與排行榜。
- `app/class-progression.tsx`：職業進化、天賦樹；`app/rpg-ui.tsx`、`app/character-avatar.tsx`：裝備欄及立繪；`app/mobile-rpg.css`：手機 RPG 視覺。
- `lib/character-model.ts`：成長規則；`lib/character-store.ts`：首次完成收據與彙總；`lib/wallet-store.ts`：共用錢包。
- `lib/quest-model.ts`／`lib/quest-store.ts`／`app/api/quests/route.ts`：委託目錄、每日快照與接取。
- `db/schema.ts`、`drizzle/`：加法遷移；`app/api/`：身分、條件與原子寫入驗證。
- `app/island-game.tsx`：保留的選用營地；`DESIGN_REVIEW.md`：美術與介面紀錄。

原 Sites 網址、project_id 與正式資料維持延續。程式修改、雲端環境設定保存、GitHub 保存及正式網站發布是不同步驟。Vercel 試看站與原 Sites 發布狀態分開核對。`node_modules`、`.wrangler`、`.sites-runtime`、`.env` 與驗證資料不應加入來源封裝。

## 官方研究網路

遊戲與每日任務不依賴外部遊戲網站；官方查核另外使用 `python3 scripts/check-research-network.py`。它沿用雲端代理與 TLS 驗證，區分代理拒絕、官方 HTTP 錯誤及連線問題，成功時把頁面保存到忽略的 `.sites-runtime/research/` 供閱讀。此命令需要雲端的 Python 3，不是啟動遊戲的必要步驟。

先前的代理 403 限制已解除。2026-10-28 已實際載入瑪奇官方介紹、Nintendo 官方頁與玩家動機原論文；部分動態 guide 網址仍只有外框，不能當作詳細規則證據。各來源取得內容與限制見 ENGAGEMENT_RESEARCH.md。診斷工具仍保留供日後網路變動時使用。
