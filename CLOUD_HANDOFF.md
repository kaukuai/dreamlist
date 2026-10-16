# 夢嶼 reverie — 雲端開發交接

更新日期：2026-10-16（Asia/Taipei）

## 要完成的工作

使用者希望將目前 Windows 本機的夢嶼開發作業移至 Codex Cloud，方便在不同電腦與地點繼續。已明確授權以本專案取代 GitHub kaukuai/dreamlist 的現有內容；保留 Git 歷史，不強制改寫既有提交。Codex Cloud 環境仍需另行建立、測試與發布，不能把程式上傳等同於雲端環境已完成。

## 目前版本與線上網站

- 專案名稱：夢嶼 reverie · DREAM ORBIT。
- 已上線網址：https://dream-orbit-life.holyman0405.chatgpt.site/
- 本機來源：D:\聖\ai\DREAM\dream-orbit。
- 來源 Git commit：2623c047133ed05d1acd51e6241f9da2a0a6f901。
- Sites project_id：appgprj_6abf4597d31c8191b75ecb4f00c6c183。
- 目前正式版為現代生活模擬遊戲美術：圓潤漂浮島、鮮明草地、湖水色與珊瑚色建物。保留這個方向。
- 原網站為擁有者私人存取。開發環境移轉不應改變網站受眾。

## 已完成的功能

- 繁體中文夢想新增與編輯，描述、類型、日期，以及小目標新增、改名與完成勾選。
- 首頁目標進度、下一步任務、五階島嶼成長、六種建物商店、放置、移動與交換。
- 初始 100 星露；小目標首次完成 +25，夢想首次完整完成額外 +100；重複勾選不重複領取。
- 每累積獲得 150 星露成長一階，最高第五階。購買建物不會降低島嶼成長。
- 成就收藏、晨光／月夜、動畫暫停、可選音效、減少動態效果與手機版。
- D1 持續保存夢想、獎勵收據、小島名稱與建設；資料依登入使用者隔離。
- 版本衝突、重複獎勵、同時購買超支、移動與交換一致性已有本機驗證。
- 最近通過 TypeScript 檢查與正式 build；現代版另檢查 1280×720、1440×1000、390×844、320×740 的介面。

## 尚未執行的方向

使用者曾詢問 iPhone 安裝方式，已說明 PWA 和 App Store 的差別。目前尚未實作專用 iPhone 圖示、web app manifest、完整 PWA 安裝引導或離線寫入。不要把這些列為已完成，也不要因交接自動擴大實作範圍。

## 原始碼與資料的區分

程式與美術在來源包中。正式使用者的夢想與小島資料仍在原 Sites 的 D1；不在來源包中。保持 .openai/hosting.json 與既有 project_id。不要建立替代 Site、重設正式資料庫、改動原有 0000 遷移，或把本機示範資料匯入正式環境。

來源包透過 git archive 從上述 commit 產生，只包含 Git 追蹤的檔案；不包含 .env、node_modules、.wrangler、本機資料庫、.sites-runtime 或憑證。美術位於 public/art/，生成提示詞也已保存。

## GitHub 與 Codex Cloud 接續

已連接的 GitHub 帳號為 kaukuai，目標儲存庫為 https://github.com/kaukuai/dreamlist 。它原先是 AI Studio/Vite/React 18 專案；使用者已明確指定直接取代，故將 main 更新為這份 Vinext/React 19/Sites 專案，沿用原有公開可見性並保留舊提交以便回復。不要同時保留舊 AI Studio 的 package.json、GEMINI_API_KEY 設定或部署腳本作為本專案的啟動方式。

在 Codex 的 Settings > Codex Cloud > Environments > Create environment 選取該儲存庫。檢查依賴與預覽設定，完成測試後 Publish。換裝置後，使用同一帳號，選 Work in > Cloud 與已發布環境；開啟同一個雲端任務接續。不同新任務有各自的工作檔案，長期成果應提交至 GitHub。

官方流程：https://learn.chatgpt.com/docs/environments/cloud-environments

## 技術與啟動

- Node.js >=22.13、npm 與 package-lock.json。保留現有依賴與鎖定檔。
- React 19、TypeScript、Vinext/Vite、Tailwind、Cloudflare Worker、D1、Drizzle。
- 安裝：npm ci。
- 型別檢查：npx tsc --noEmit --incremental false。
- 建置：npm run build。
- 預覽：npm run dev。攜帶的預設設定使用 5173；雲端預覽若需要對外綁定，依實際環境調整啟動參數與允許主機，不能假設 127.0.0.1 可被外部存取。
- scripts/execution-profile.mjs 在沒有本機 profile 檔時使用 portable。若環境提供 Sites，先閱讀當前版本的 Sites skill，讓它配置適用的執行 profile。
- 預覽需建立獨立本機 D1，僅對本機套用 drizzle/0000_classy_thunderball.sql、drizzle/0001_colorful_hulk.sql。沿用相同的 Wrangler persist-to 路徑。本機可產生空資料，不要連正式 D1 測試。
- 正式認證由 Sites 注入；預覽登入依執行 profile 提供。不要偽造或停用正式驗證。
- 這不是 Gemini API 專案，不需要現有 dreamlist 中的 GEMINI_API_KEY。

## 主要檔案

- app/dream-app.tsx：夢想管理、旅誌、成就與資料整合。
- app/island-game.tsx：小島、建造、商店、日夜與動畫。
- app/modern-game.css：現代遊戲視覺方向；app/globals.css：共用與原有版型。
- lib/island-model.ts：建物目錄、位置與等級；lib/island-store.ts：獎勵與建設保存。
- app/api/dreams/、app/api/island/：伺服器驗證與寫入。
- db/schema.ts、drizzle/：資料庫模型與遷移。
- DESIGN_REVIEW.md：設計迭代與驗證紀錄。

## 發布既有網站

後續修改網站時，使用當前安裝的 Sites skill 與原 project_id。必須保存並推送相符來源、建立正式封裝，再部署到原有網址。GitHub 程式保存與 Sites 正式發布是兩個不同步驟；不要將 GitHub push 當成網站已更新。憑證只能臨時取得，不要放入來源、交接檔、GitHub 或 shell 參數。

GitHub 儲存庫與 Sites 的發布來源有不同的 Git 歷史。若 Sites 工作流程需要還原既有 Site，請在另一個空資料夾開啟原 Site checkout，再把此 GitHub 專案的修改套用過去。保留兩邊各自的 .git 與來源紀錄，不要用強制推送把其中一邊的歷史覆蓋到另一邊。
