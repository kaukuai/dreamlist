import { createClient } from "@libsql/client";
import { createLibsqlDatabase } from "./libsql-adapter";
import { databaseConfig } from "../lib/vercel-config";
import type { DreamDatabase } from "./contracts";

let database: DreamDatabase | undefined;

export function getD1(): DreamDatabase {
  if (!database) database = createLibsqlDatabase(createClient(databaseConfig(process.env)));
  return database;
}
