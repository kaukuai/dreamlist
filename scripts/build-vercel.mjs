import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { vercelConfigurationIssues } from "../lib/vercel-config.ts";
import { createClient } from "@libsql/client/web";
import { databaseConfig } from "../lib/vercel-config.ts";
import { verifyVercelMigrations } from "./vercel-migrations.mjs";

process.env.DREAMLIST_DEPLOY_TARGET = "vercel";

// Refuse a production deployment that would replace the working site with a
// build whose authentication or persistent database has not been configured.
if (process.env.VERCEL && process.env.DREAMLIST_MODE === "cloud") {
  const issues = vercelConfigurationIssues(process.env);
  if (issues.length) {
    console.error("\nDreamlist：部署設定尚未完成，缺少或無效的項目如下：");
    for (const issue of issues) console.error(`  - ${issue}`);
    console.error("\n請在原 Vercel 專案 Settings → Environment Variables 設定，並選取這次部署的 Production 或 Preview 環境。");
    console.error("請勿將憑證貼在聊天。完整步驟：VERCEL_DEPLOYMENT.md");
    console.error("設定完成後先執行 npm run db:migrate:vercel 初始化專用資料庫，再重新部署。\n");
    process.exit(1);
  }
  const client = createClient(databaseConfig(process.env));
  try {
    await verifyVercelMigrations(client, new URL("../drizzle/", import.meta.url));
  } catch (error) {
    console.error("\nDreamlist：Turso 連線或資料庫遷移檢查未通過。");
    if (error instanceof Error && /^Database migration required before deployment: \d{4}_[a-z0-9_]+\.sql$/.test(error.message)) {
      console.error(error.message);
    }
    console.error("請確認 Turso URL／寫入 token；新資料庫須先執行 npm run db:migrate:vercel，再重新部署。\n");
    process.exitCode = 1;
  } finally {
    client.close();
  }
  if (process.exitCode) process.exit(process.exitCode);
}
if (process.env.DREAMLIST_MODE !== "cloud") console.log("Dreamlist：免登入試看版，進度只存於目前瀏覽器，不需要 Google 或 Turso。");
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)), "build", "--webpack",
], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
