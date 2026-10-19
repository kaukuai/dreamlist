import { createClient } from "@libsql/client/web";
import { createLibsqlDatabase } from "./libsql-adapter";
import { databaseConfig } from "../lib/vercel-config";
import type { DreamDatabase } from "./contracts";
import { browserPreview } from "../lib/app-mode";

let database: DreamDatabase | undefined;

export function getD1(): DreamDatabase {
  if (browserPreview) throw new Error("Browser preview does not use a cloud database");
  if (!database) database = createLibsqlDatabase(createClient(databaseConfig(process.env)));
  return database;
}
