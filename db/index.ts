import {env} from "cloudflare:workers";
export function getD1(){ if(!env.DB) throw new Error("Dream database is unavailable");return env.DB; }

