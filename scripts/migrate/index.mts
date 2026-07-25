import "isomorphic-form-data";
import "isomorphic-fetch";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as backlogjs from "backlog-js";
import { config } from "dotenv";
import { syncAttributes } from "./attribute-sync.mts";
import { migrateIssues } from "./issue-migrator.mts";
import { matchUsers } from "./user-matcher.mts";
import { migrateWikis } from "./wiki-migrator.mts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dist = resolve(__dirname, "..", "backlog", "dist", "assets");
const distConfigs = resolve(dist, "configs");
const distIssues = resolve(dist, "issues");
const distWikis = resolve(dist, "wikis");

config({ override: true });

// ========================================
// 移行先環境変数の確認
// ========================================

const targetHost = process.env.TARGET_BACKLOG_HOST;
if (!targetHost) throw new Error("環境変数 'TARGET_BACKLOG_HOST' が設定されていません");
const targetApiKey = process.env.TARGET_BACKLOG_API_KEY;
if (!targetApiKey) throw new Error("環境変数 'TARGET_BACKLOG_API_KEY' が設定されていません");
const targetProjectKey = process.env.TARGET_BACKLOG_PROJECT_KEY;
if (!targetProjectKey) throw new Error("環境変数 'TARGET_BACKLOG_PROJECT_KEY' が設定されていません");

const allowExistingIssues = process.env.ALLOW_EXISTING_ISSUES === "true";

const targetBacklog = new backlogjs.Backlog({ host: targetHost, apiKey: targetApiKey });

// --- Concurrency & Retry Utilities ---

function pLimit(concurrency: number) {
  const queue: Array<() => void> = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const task = queue.shift();
      if (task) task();
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
    } catch (err: unknown) {
      const e = err as { response?: { status?: number }; status?: number; _status?: number; message?: string };
      const status = e.response?.status || e.status || e._status || 0;
      const isRateLimit = status === 429 || e.message?.includes("429");
      if (isRateLimit) {
        retries++;
        if (retries > 5) throw err;
        const waitMs = 60000;
        const newResetTime = Date.now() + waitMs;
        if (newResetTime > rateLimitResetTime) {
          rateLimitResetTime = newResetTime;
          console.warn(`[Rate Limit 429] 60秒間の一時停止中... (再試行 ${retries})`);
        }
        await sleepAsync(rateLimitResetTime - Date.now() + 1000);
      } else {
        throw err;
      }
    }
  }
}

// ========================================
// メイン移行パイプライン
// ========================================

async function runMigration() {
  console.log("========================================");
  console.log(" Backlog データ移行 (Migration) 開始 ");
  console.log("========================================");

  // 1. 事前検証（Pre-flight Check 1: 接続＆ユーザー確認）
  console.log("--- 移行先環境・権限チェック中 ---");
  const myself = await withRetry(() => targetBacklog.getMyself());
  console.log(`移行先API実行ユーザー: ${myself.name} (ID: ${myself.id})`);

  let targetProject: { id: number; name: string; projectKey: string } | null = null;
  try {
    targetProject = (await withRetry(() => targetBacklog.getProject(targetProjectKey))) as { id: number; name: string; projectKey: string };
    console.log(`移行先プロジェクト確認: ${targetProject.name} (キー: ${targetProject.projectKey}, ID: ${targetProject.id})`);
  } catch (_e) {
    console.error(`[エラー] 移行先プロジェクト '${targetProjectKey}' が存在しないか、実行ユーザーが参加していません。`);
    process.exit(1);
  }

  // 1.5. 事前検証（同一プロジェクトチェック）
  const sourceHost = process.env.BACKLOG_HOST;
  const sourceProjectKey = process.env.BACKLOG_PROJECT_KEY;
  if (sourceHost && sourceProjectKey && sourceHost === targetHost && sourceProjectKey === targetProjectKey) {
    console.error(
      `[エラー] 移行元と移行先が同一プロジェクト (${targetHost} / ${targetProjectKey}) です。同一プロジェクトへの移行はできません。`,
    );
    process.exit(1);
  }

  // 2. 事前検証（Pre-flight Check 2: 既存課題チェック）
  const { count: existingIssuesCount } = await withRetry(() => targetBacklog.getIssuesCount({ projectId: [targetProject.id] }));

  if (existingIssuesCount > 0) {
    console.warn(`\n[注意] 移行先プロジェクト '${targetProjectKey}' に既に ${existingIssuesCount} 件の課題が存在します。`);
    if (!allowExistingIssues) {
      console.error("[中断] 既存課題が存在するため移行を中止します。");
      console.error("課題キー番号を無視して登録を継続する場合は、.env に ALLOW_EXISTING_ISSUES=true を設定して再実行してください。\n");
      process.exit(1);
    } else {
      console.log("ALLOW_EXISTING_ISSUES=true が指定されているため、番号を気にせず登録を継続します。\n");
    }
  }

  // 3. バックアップデータの読み込み
  let sourceUsers = [];
  let sourceIssueTypes = [];
  let sourceCategories = [];
  let sourceVersions = [];

  try {
    sourceUsers = JSON.parse(await readFile(resolve(distConfigs, "users.json"), "utf-8"));
    sourceIssueTypes = JSON.parse(await readFile(resolve(distConfigs, "issueTypes.json"), "utf-8"));
    sourceCategories = JSON.parse(await readFile(resolve(distConfigs, "categories.json"), "utf-8"));
    sourceVersions = JSON.parse(await readFile(resolve(distConfigs, "versions.json"), "utf-8"));
  } catch (err) {
    console.error("[エラー] バックアップデータ（configs/）の読み込みに失敗しました。先に 'npm run backup' を実行してください。", err);
    process.exit(1);
  }

  // 4. ターゲットユーザーの取得 & ユーザー自動照合
  const targetProjectUsers = await withRetry(() => targetBacklog.getProjectUsers(targetProject.id));
  const { userMap } = await matchUsers(sourceUsers, targetProjectUsers, distConfigs, myself.id);

  // 5. 属性（種別・カテゴリー・バージョン）の自動同期
  const { typeMap, categoryMap, versionMap } = await syncAttributes(
    targetBacklog,
    targetProject.id,
    sourceIssueTypes,
    sourceCategories,
    sourceVersions,
    withRetry,
  );

  // 6. Wiki ページの移行
  await migrateWikis(targetBacklog, targetProject.id, distWikis, withRetry, limit);

  // 7. 課題およびコメント・添付ファイルの移行
  await migrateIssues(targetBacklog, targetProject.id, distIssues, userMap, typeMap, categoryMap, versionMap, myself.id, withRetry, limit);

  console.log("\n========================================");
  console.log(" 🎉 Backlog データの移行が完了しました！ ");
  console.log("========================================");
}

runMigration().catch((e) => {
  console.error("\n[致命的エラー] 移行処理中にエラーが発生しました:", e);
  process.exit(1);
});
