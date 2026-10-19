import { fileURLToPath } from "node:url";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "start"].includes(command)) throw new Error("Expected dev or start");
process.env.DREAMLIST_DEPLOY_TARGET = "vercel";
const cli = new URL("../node_modules/next/dist/bin/next", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(command === "dev" ? ["--webpack"] : []), ...args];
await import(cli.href);
