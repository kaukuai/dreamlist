# 原 Vercel 專案的免登入試看版

使用者目前只需要 https://kaukuai-dreamlist.vercel.app/ 方便檢視開發中的 app，**不綁 Google、不使用 Turso、不做跨裝置資料同步**。這取代先前私人雲端版的部署計畫。

## 目前模式

- Vercel 預設 `DREAMLIST_MODE=browser`。直接開啟網址，不需要登入或建立資料庫。
- 任務、角色 XP、技能、天賦、職業進化、裝備、星露和營地都保存在目前瀏覽器的 `dreamlist:browser-preview:v1`。
- 重新整理與再次開啟同一網址會保留；不同裝置、瀏覽器、網域或清除網站資料有不同進度。任務內容不會送往伺服器，也不會變成其他玩家的進度。
- 每日與 NPC 任務可以實際接取／完成；使用原成長規則，只發首次獎勵。職業門檻、AP、共享錢包與裝備條件照常運作。
- 原排行榜入口在此模式顯示個人成長紀錄，不提供假玩家或跨玩家名次。頁面明示試看版與瀏覽器保存。
- 原 Sites 的登入、D1 與正式個人資料保留；這個試看版沒有匯入或覆寫那些資料。

## Vercel 設定

使用**原專案** `kaukuai-dreamlist`，Git 為 `kaukuai/dreamlist`，Production Branch 為 `main`，Root Directory 為專案根目錄。

| 項目 | 設定 |
| --- | --- |
| Framework | Next.js |
| Node | 24.x |
| Install Command | `npm ci --include=dev --include=optional --no-audit --no-fund` |
| Build Command | `npm run build:vercel` |
| Output Directory | `.next-vercel` |
| Environment Variable | `DREAMLIST_MODE=browser`，Production 與 Preview |

`DREAMLIST_MODE` 未設定時也預設為 browser。不需要 `NEXTAUTH_URL`、`NEXTAUTH_SECRET`、`DREAMLIST_OWNER_EMAIL`、Google 或 Turso 變數。build 不會因缺少那些憑證而失敗，也不會連線或遷移雲端資料庫。

更新 `main` 後在原專案部署 Production，確認 alias 仍為原網址。`/api/version` 應回傳 `mode: browser`、`release: morningbell-chronicles-v1` 與最新 commit。原專案需維持 `autoAssignCustomDomains=true`，否則成功的 Production build 也可能停在待指定網域狀態。由於這是瀏覽器試看版，API 的雲端角色／任務端點仍拒絕未登入請求；頁面操作透過瀏覽器保存實作，不使用公開假帳號。

第一卷《無聲晨鐘》的主線、支線、戰況、材料與收藏加在同一份瀏覽器存檔，舊進度不需重建。從任務大廳「展開冒險」進入。

Vercel 的 Preview 與 Production 是不同網址，因此瀏覽器試玩進度也不同。要檢視固定進度，使用上面的原正式網址。

## 本機驗證

```sh
npm run test:preview
npm run test:vercel
npm run test:adventure
VERCEL=1 npm run build:vercel
npm run start:vercel -- --hostname 127.0.0.1
```

本機瀏覽器驗證用於內部測試；雲端 localhost 不能直接當使用者網址。試玩測試驗證重新開啟保存、不同儲存區隔離、每日跨日、接取防重複、首次獎勵、轉職、天賦、裝備錢包、進化、衝突與儲存失敗。冒險測試另涵蓋九主線與六支線通關、戰鬥續接、敗退、共享錢包、稱號與刻印防重領。

原 Sites／D1 本機流程仍是 `npm run dev`／`npm run build`，使用預設 `tsconfig.json`；Vercel wrapper 選取 `tsconfig.vercel.json`，輸出 `.next-vercel`，避免與 Vinext `.next` 互相覆寫。

## 之後要正式雲端版時

保留的選用 `DREAMLIST_MODE=cloud` 才會啟動指定 Google 帳號認證與 Turso。只有未來使用者明確需要時再配置七個憑證／變數與五個加法遷移；現在不需要建立那些服務。正式雲端 build 仍檢查所有缺少項目與遷移，不把瀏覽器試看紀錄當成已同步的正式資料。

## 已查明的先前失敗

使用者提供的 165a58d Vercel 日誌顯示 Git 已抓到新版，但舊建置流程無條件要求 Turso，因環境變數空白而中止。另已透過 API 確認 Dashboard 舊框架為 Vite、Git 綁定為 main、最後成功 Production 仍為 a4b7df7。這不是瀏覽器快取問題。

目前網路與 Vercel API 授權已可用，Dashboard 框架與建置設定已修正。先前試設的登入變數已移除，保留 browser 模式；不需要再要求同一個 Vercel token。部署是否成功必須以真實 build 狀態、原網址版本和瀏覽器操作判定。
