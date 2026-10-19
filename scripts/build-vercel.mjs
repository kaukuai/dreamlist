import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertVercelConfiguration } from "../lib/vercel-config.ts";
import { createClient } from "@libsql/client";
import { databaseConfig } from "../lib/vercel-config.ts";
import { verifyVercelMigrations } from "./vercel-migrations.mjs";

process.env.DREAMLIST_DEPLOY_TARGET = "vercel";

// Refuse a production deployment that would replace the working site with a
// build whose authentication or persistent database has not been configured.
if (process.env.VERCEL) {
  assertVercelConfiguration(process.env);
  const client = createClient(databaseConfig(process.env));
  try {
    await verifyVercelMigrations(client, new URL("../drizzle/", import.meta.url));
  } finally {
    client.close();
  }
}
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)), "build", "--webpack",
], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
