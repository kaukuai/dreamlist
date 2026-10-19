import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const root = path.dirname(fileURLToPath(import.meta.url));
const checkOnly = process.argv.includes('--check');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) throw new Error('請先安裝 Node.js 22.13 以上（建議 Node.js 24 LTS），再重新開啟試玩。');
process.chdir(root);
const runtime = path.join(root, '.sites-runtime');
const childEnv = {...process.env, CI: 'true', npm_config_cache: path.join(runtime, 'npm-cache')};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {cwd: root, env: childEnv, stdio: 'inherit', ...options});
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`準備失敗（exit ${code ?? signal}），請保留終端機中的錯誤訊息。`)));
  });
}

if (!existsSync(path.join(root, 'node_modules/vinext/dist/cli.js'))) {
  console.log('第一次試玩需要下載專案鎖定的依賴，請保持網路連線。');
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'install:ci'], {shell: process.platform === 'win32'});
}

const directory = path.join(runtime, 'cloud-onboarding');
const configFile = path.join(directory, 'wrangler.json');
mkdirSync(directory, {recursive: true});
const config = {
  name: 'dreamlist-local-onboarding',
  main: '../../build/sites-worker.ts',
  compatibility_date: '2026-05-15',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: [{binding: 'DB', database_name: 'site-creator-d1', database_id: '00000000-0000-4000-8000-000000000000', migrations_dir: '../../drizzle'}],
};
if (existsSync(configFile)) {
  if (JSON.stringify(JSON.parse(readFileSync(configFile, 'utf8'))) !== JSON.stringify(config)) throw new Error('已有不同的本機資料庫設定，請先檢查 .sites-runtime/cloud-onboarding/wrangler.json。');
} else writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n', {flag: 'wx'});

await run(process.execPath, ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', '.sites-runtime/cloud-onboarding/wrangler.json', '--persist-to', '.wrangler/state']);

const port = await new Promise((resolve, reject) => {
  const listener = createServer();
  listener.once('error', reject);
  listener.listen(0, '127.0.0.1', () => {
    const selected = listener.address().port;
    listener.close(error => error ? reject(error) : resolve(selected));
  });
});
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--import', './scripts/sites-env.mjs', './scripts/run-framework.mjs', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {cwd: root, env: childEnv, stdio: 'inherit'});
let ended = false;
const completion = new Promise((resolve, reject) => {
  server.once('error', error => {ended = true; reject(error);});
  server.once('exit', (code, signal) => {ended = true; resolve({code, signal});});
});
process.once('SIGINT', () => server.kill('SIGINT'));
process.once('SIGTERM', () => server.kill('SIGTERM'));

try {
  let ready = false;
  for (let attempt = 0; attempt < 90 && !ended; attempt++) {
    try {
      const login = await fetch(base + '/signin-with-chatgpt', {redirect: 'manual', signal: AbortSignal.timeout(5000)});
      const cookie = login.headers.get('set-cookie')?.split(';')[0];
      if (login.status === 302 && cookie) {
        const home = await fetch(base, {headers: {cookie}, signal: AbortSignal.timeout(15000)});
        if (home.status === 200 && (await home.text()).includes('DREAM ORBIT')) {
          const response = await fetch(base + '/api/character', {headers: {cookie}, signal: AbortSignal.timeout(5000)});
          const data = await response.json();
          if (response.status === 200 && Number.isInteger(data.character?.level) && Object.keys(data.character?.equipped ?? {}).length === 6 && data.character?.advancements?.warrior !== undefined) {
            const offers = await fetch(base + '/api/quests', {headers: {cookie}, signal: AbortSignal.timeout(5000)});
            const board = await offers.json();
            if (offers.status === 200 && board.daily?.length === 3 && board.introductions?.length === 6) {ready = true; break;}
          }
        }
      }
    } catch (error) {if (ended) throw error;}
    await delay(500);
  }
  if (!ready) throw new Error('試玩服務未完成啟動，請檢查上方錯誤訊息。');
  console.log('READY: 夢嶼 NPC 冒險版 · 首頁、登入、角色與每日／NPC 委託資料庫皆已通過檢查。');
  if (checkOnly) {
    server.kill('SIGTERM');
    await completion;
  } else {
    const url = base + '/signin-with-chatgpt';
    console.log(`試玩網址：${url}`);
    console.log('請保留此視窗；關閉或按 Ctrl+C 可停止試玩。資料會保存在解壓縮資料夾的 .wrangler/state。');
    let browser;
    if (process.platform === 'win32') browser = spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], {stdio: 'ignore'});
    else browser = spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], {stdio: 'ignore'});
    browser.on('error', () => console.log('無法自動開啟瀏覽器，請將上方試玩網址貼至這台電腦的瀏覽器。'));
    const result = await completion;
    if (result.code && result.code !== 0) process.exitCode = result.code;
  }
} catch (error) {
  if (!ended) server.kill('SIGTERM');
  await completion;
  throw error;
}
