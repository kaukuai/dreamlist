import { createClient } from "@libsql/client";
import { databaseConfig } from "../lib/vercel-config.ts";
import { applyVercelMigrations } from "./vercel-migrations.mjs";

const client = createClient(databaseConfig(process.env));
try {
  const applied = await applyVercelMigrations(client, new URL("../drizzle/", import.meta.url));
  console.log(applied.length ? `Applied ${applied.length} additive migrations: ${applied.join(", ")}` : "Database migrations are current");
} finally {
  client.close();
}
