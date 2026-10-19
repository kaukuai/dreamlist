# 夢嶼專案接續

開始工作前閱讀 CLOUD_HANDOFF.md 和 README.md，確認這份程式為 reverie 夢嶼，而非先前的 AI Studio 專案。

依使用者最新方向，採手機直式 RPG 介面，角色介於韓漫線條與日系冒險遊戲的賽璐璐風格，保留成人比例和戰鬥職業辨識；任務、角色、裝備、天賦、職業為主入口，小島為選用營地。保留繁體中文與既有資料保存機制。接續閱讀 GAME_DESIGN.md 與 RPG_REFERENCES.md；不要把尚未取得的官方資料寫成研究結論。開發與測試使用獨立的本機 D1；原 Sites 網址、project_id 與正式資料保持延續。

iPhone PWA 安裝功能目前尚未實作，需依使用者後續需求安排。雲端程式保存不等同於網站已發布，也不代表 Codex Cloud 環境已建立。

沒有自訂夢想的玩家也要能從每日輕量委託與 NPC 初識修練開始成長。接取不發獎，跨日保留任務，既有收據與職業進度不可清空。

使用者要求串接現有 Vercel 專案 https://kaukuai-dreamlist.vercel.app/，並明確選擇先保留私人使用。閱讀 VERCEL_DEPLOYMENT.md。Vercel 以標準 Next.js、指定 Google 信箱與 Turso 運作，`tsconfig.vercel.json` 選取專用認證與資料庫；本機／Sites 保留原綁定。不要在 Vercel 信任 Sites 身分標頭或開放試玩假登入。維持原 Vercel 專案、網址及原 Sites 資料；新 Turso 不等於已移轉 D1。確認網路、專案授權、設定與遷移後才更新正式部署，不因本機成功宣稱已上線。
