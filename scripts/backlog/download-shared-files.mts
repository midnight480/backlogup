import "isomorphic-form-data";
import "isomorphic-fetch";
import * as backlogjs from "backlog-js";
import { config } from "dotenv";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve, sep } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dist = resolve(__dirname, "dist", "assets");
const distSharedFiles = resolve(dist, "shared-files");

config({ override: true });

const host = process.env.BACKLOG_HOST;
if (!host) throw new Error("環境変数 'BACKLOG_HOST' が設定されていません");
const apiKey = process.env.BACKLOG_API_KEY;
if (!apiKey) throw new Error("環境変数 'BACKLOG_API_KEY' が設定されていません");
const projectKey = process.env.BACKLOG_PROJECT_KEY;
if (!projectKey) throw new Error("環境変数 'BACKLOG_PROJECT_KEY' が設定されていません");

const backlog = new backlogjs.Backlog({ host, apiKey });

// --- Concurrency & Retry Utilities (index.mts と同じ仕組み) ---

function pLimit(concurrency: number) {
  const queue: Array<() => void> = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  };

  return <T,>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        activeCount++;
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          next();
        }
      };

      if (activeCount < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

const limit = pLimit(5);
const sleepAsync = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let rateLimitResetTime = 0;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let retries = 0;
  while (true) {
    if (Date.now() < rateLimitResetTime) {
      await sleepAsync(rateLimitResetTime - Date.now() + 1000);
    }
    try {
      return await fn();
    } catch (e: any) {
      const status = e.response?.status || e.status || e._status || 0;
      const isRateLimit = status === 429 || (e.message && e.message.includes("429"));
      if (isRateLimit) {
        retries++;
        if (retries > 5) throw e;
        // Backlog API rate limits reset every minute.
        // We pause globally for 60 seconds when a 429 is encountered.
        const waitMs = 60000;
        const newResetTime = Date.now() + waitMs;
        if (newResetTime > rateLimitResetTime) {
          rateLimitResetTime = newResetTime;
          console.warn(`[Rate Limit 429] Global pause for 60 seconds... (retry ${retries})`);
        }
        await sleepAsync(rateLimitResetTime - Date.now() + 1000);
      } else {
        throw e;
      }
    }
  }
}

// --- 共有ファイル ---

interface SharedFileMeta {
  id: number;
  type: string;
  dir: string;
  name: string;
  size: number;
  updated: string;
}

// dir + name から、余分なスラッシュを畳んで先頭スラッシュを除いた相対パスを作る。
function relPathOf(f: SharedFileMeta): string {
  return `${f.dir}/${f.name}`.replace(/\/+/g, "/").replace(/^\//, "");
}

// 共有ファイルの相対パスを distSharedFiles 配下に安全に解決する
// （パストラバーサルを防止し、ベースディレクトリ外への書き込みを拒否する）
function resolveSharedFilePath(relPath: string): string {
  const segments = relPath.split("/").filter((s) => s && s !== "." && s !== "..");
  const target = resolve(distSharedFiles, ...segments);
  if (target !== distSharedFiles && !target.startsWith(distSharedFiles + sep)) {
    throw new Error(`不正なパスのためスキップします: ${relPath}`);
  }
  return target;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function printList(files: SharedFileMeta[]): void {
  console.log(`共有ファイル ${files.length} 件:`);
  for (const f of files) {
    console.log(`  [${f.id}] ${relPathOf(f)} (${formatSize(f.size)})`);
  }
}

function printUsage(): void {
  console.log(`使い方:
  npm run download:sharedfiles -- --list          一覧を表示する
  npm run download:sharedfiles -- --all           すべてダウンロードする（途中再開可）
  npm run download:sharedfiles -- 123 456         指定したIDのファイルをダウンロードする
  npm run download:sharedfiles -- --id 123,456    指定したIDのファイルをダウンロードする（カンマ区切り）
  npm run download:sharedfiles -- --path 設計書   パスに指定文字列を含むファイルをまとめてダウンロードする
オプション:
  --force   既にダウンロード済みのファイルも再取得する（既定では存在するものはスキップ）`);
}

// --- 引数解析 ---

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const downloadAll = flags.has("--all");
const listOnly = flags.has("--list");
const force = flags.has("--force");

const pathArgIndex = argv.indexOf("--path");
const pathFilter = pathArgIndex >= 0 ? argv[pathArgIndex + 1] : undefined;

const ids = argv.filter((a) => /^\d+$/.test(a)).map(Number);
const idsArgIndex = argv.indexOf("--id");
if (idsArgIndex >= 0 && argv[idsArgIndex + 1]) {
  for (const s of argv[idsArgIndex + 1].split(",")) {
    const n = Number(s.trim());
    if (Number.isFinite(n)) ids.push(n);
  }
}

// --- list.json 読み込み ---

let list: SharedFileMeta[];
try {
  const raw = await readFile(resolve(distSharedFiles, "list.json"), { encoding: "utf-8" });
  list = JSON.parse(raw) as SharedFileMeta[];
} catch (e) {
  throw new Error("共有ファイルの一覧 (shared-files/list.json) が見つかりません。先に 'npm run backup' を実行して一覧を作成してください。");
}

if (listOnly) {
  printList(list);
  process.exit(0);
}

// --- ダウンロード対象の決定 ---

let targets: SharedFileMeta[];
if (downloadAll) {
  targets = list;
} else if (pathFilter) {
  targets = list.filter((f) => relPathOf(f).includes(pathFilter));
} else if (ids.length > 0) {
  const idSet = new Set(ids);
  targets = list.filter((f) => idSet.has(f.id));
  const found = new Set(targets.map((f) => f.id));
  for (const id of ids) {
    if (!found.has(id)) console.warn(`ID ${id} は一覧に存在しません。`);
  }
} else {
  printUsage();
  console.log("");
  printList(list);
  process.exit(0);
}

if (targets.length === 0) {
  console.log("ダウンロード対象のファイルがありません。");
  process.exit(0);
}

// --- ダウンロード実行 ---

console.log(`--- 共有ファイル ダウンロード開始 (${targets.length} 件) ---`);
let done = 0;
let skipped = 0;
let failed = 0;

await Promise.all(
  targets.map((f) =>
    limit(async () => {
      const rel = relPathOf(f);

      let targetPath: string;
      try {
        targetPath = resolveSharedFilePath(rel);
      } catch (e: any) {
        console.warn(`[${f.id}] ${e.message || e}`);
        failed++;
        return;
      }

      try {
        // 既にダウンロード済み（ファイルが存在）ならスキップ。
        // 中断後の再実行でそのまま続きから取得できる。--force で再取得。
        if (!force && (await fileExists(targetPath))) {
          console.log(`[${rel}] 取得済み (スキップ)`);
          skipped++;
          return;
        }
        await mkdir(dirname(targetPath), { recursive: true });
        const data = await withRetry(() => backlog.getSharedFile(projectKey!, f.id));
        await writeFile(targetPath, data.body, { encoding: "binary" });
        done++;
        console.log(`[${rel}] 完了`);
      } catch (e) {
        failed++;
        console.warn(`[${rel}] ダウンロード失敗:`, f.id, e);
      }
    }),
  ),
);

console.log(`--- 共有ファイル ダウンロード完了: 成功 ${done} / スキップ ${skipped} / 失敗 ${failed} ---`);
