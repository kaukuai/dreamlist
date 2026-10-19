# 更新現有 Vercel 專案

目標網址固定為 **https://kaukuai-dreamlist.vercel.app/**。先保留私人使用，不建立替代網站，不清除原 Sites 資料。

## 已確認的舊版原因與限制

2026-10-19 查核：GitHub `main` 為 `a4b7df75ad4428f99d562f107d5ceb794c49ea83`，後續 RPG、職業、NPC 委託都還是工作區的未提交變更。GitHub 的舊版也使用 Vinext／Cloudflare D1／Sites 登入，不能直接套用原 AI Studio 的 Vite 靜態站部署設定。

此環境請求正式網址與 Vercel API 均在代理 CONNECT 階段收到 403，尚未讀取 Vercel 實際部署紀錄、Git 綁定或環境變數。因此不能宣稱已確認 Vercel 最後成功的 commit，或把問題當作瀏覽器快取。

本次新增 Vercel 相容流程。原 Sites 與本機流程保留；`npm run build` 仍產生 Cloudflare 版本，Vercel 使用 `npm run build:vercel`。兩者由 TypeScript 路徑選擇不同資料庫與認證實作。公開的 `/api/version` 可查版本、commit 與功能集，不含任務或身分資料。

## 私人登入與持久化資料

Vercel 版使用 Google OAuth、加密的 HttpOnly session 與 Turso。只有 `DREAMLIST_OWNER_EMAIL` 指定、且 Google 已驗證信箱的帳號可以登入；每次 API 請求都重新比對私人帳號。玩家鍵使用 Google 穩定的 subject，不接受瀏覽器送來的 Sites 身分標頭。沒有公開假帳號或本機試玩登入。

Turso 是新後端，不能自動讀取原 Sites 私人 D1。原 Sites 正式資料與本機試玩資料均保持原狀；資料移轉須另外取得可用的匯出與確認來源身分，不能把登入後的空白角色當作舊資料遺失。Vercel 不使用暫存檔案系統或記憶體來保存進度。

## 上線設定

1. 在**原** Vercel 專案核對 Settings → Git：`kaukuai/dreamlist`，Production Branch `main`，Root Directory 為專案根目錄。`vercel.json` 指定 Next.js、`.next-vercel` 及 `npm run build:vercel`；移除舊 Vite `dist` 或其他 Dashboard 覆寫值。`.next-vercel` 與 Vinext 的 `.next` 分開，避免兩套生成型別互相覆寫。
2. 在你的 Turso 帳號建立獨立資料庫，取得 `libsql://…turso.io` 與寫入 token。在 Google Cloud 建立 Web OAuth client，授權回呼網址為 `https://kaukuai-dreamlist.vercel.app/api/auth/callback/google`；私人測試狀態把你的 Google 帳號列為測試使用者。
3. 在 **Vercel → Settings → Environment Variables** 設定下表。敏感值只在安全設定輸入，不放在聊天、Git 或命令參數。
4. 在可信任的終端載入 Turso 兩個環境變數，執行 `npm run db:migrate:vercel`，套用既有五個加法遷移。這是明確的資料庫更新步驟，不會在每次 build 偷改正式資料。已用新 runner 建立的資料庫可重跑；不要將它直接套到已有 D1 或未有遷移紀錄的匯入庫。
5. 合併經驗證的新版分支到 `main`，讓 Git 整合更新**原專案**。建置會檢查必要設定與遷移 checksum，缺少時失敗，保留前一個成功部署；不應略過此檢查。Preview 請使用獨立 Turso 與 OAuth client，不共用正式環境。
6. 確認原網域指向新的 Production deployment，再請求 `/api/version`，比對 `commit` 與 GitHub `main`、`release: npc-rpg-v1`。實際登入、接取委託與重新整理，確認 XP／裝備進度保存；確認未登入與其他帳號無法存取 API。

| Vercel 環境變數 | 用途 |
| --- | --- |
| `NEXTAUTH_URL` | `https://kaukuai-dreamlist.vercel.app` |
| `DREAMLIST_OWNER_EMAIL` | 你的私人 Google 信箱，只接受單一帳號 |
| `GOOGLE_CLIENT_ID` | Google Web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google Web OAuth client secret |
| `NEXTAUTH_SECRET` | 至少 32 字元的隨機 session 金鑰，透過可信任密碼工具產生 |
| `TURSO_DATABASE_URL` | Turso 的 `libsql://…turso.io` endpoint |
| `TURSO_AUTH_TOKEN` | 該資料庫的寫入 token |

Production 的 canonical URL 受檢查，避免部署成另一個替代專案。Preview 若要登入，需要自己正確的 HTTPS URL、對應 OAuth 回呼與上述完整設定。

## 讓雲端代理接續更新

已保留原網路規則，另存 `kaukuai-dreamlist.vercel.app`、`vercel.com`、`api.vercel.com`、`api.github.com` 與送往 `api.vercel.com` 的 `VERCEL_TOKEN` 授權需求至環境草稿。**草稿保存不會套用網路，也不會部署 Vercel**。需在雲端環境設定檢查、Save 並 Publish，將原專案可用的 Vercel token 安全填入；不要在聊天傳 token。若專案屬於 team，可另外設定非機密的 `VERCEL_ORG_ID`；若同名專案不在預設 scope，填入原專案 `VERCEL_PROJECT_ID`，不要另建專案。

之後執行：

```sh
python3 scripts/check-vercel-deployment.py
```

這是唯讀診斷，沿用既有代理與 TLS，查版本、Git 綁定、build 設定、正式 commit、必要變數的**名稱**。不輸出 token 或變數值；未能確認與目前 commit 一致時以非零狀態結束。401／404、代理 403 與沒有授權分開呈現，避免反覆要求已存在的 GitHub 憑證。GitHub Git 存取目前已成功，與 Vercel 授權是兩件事。

## 驗證紀錄

- `npm run build:vercel`：標準 Next.js 正式建置成功，包含 RPG API、OAuth route 與版本端點。
- `npm run build`：原 Vinext／Cloudflare 正式建置成功。
- `npm test`：18 項規則與遷移測試通過。
- `npm run test:vercel`：3 項測試通過，實際 libSQL 執行五個遷移／重跑保留進度、原子回滾、防重複收據與委託、帳號篩選、正式設定檢查。
- 本機 Next.js 正式 server：24 項 HTTP 斷言通過，涵蓋五個 API 拒絕假 Sites 標頭、登入／CSRF、加密測試 session、私人帳號限制、首頁和立繪。這使用拋棄式測試金鑰，未加入任何正式認證替代。
- 真正 Google OAuth 回呼、遠端 Turso 讀寫與 Vercel 正式網域仍需網路與正式設定後驗證，不能用本機成功代替上線成功。
