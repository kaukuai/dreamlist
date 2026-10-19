import { env } from "cloudflare:workers";
import type { DreamDatabase } from "./contracts";

export function getD1(): DreamDatabase {
  if (!env.DB) throw new Error("Dream database is unavailable");
  return env.DB;
}
