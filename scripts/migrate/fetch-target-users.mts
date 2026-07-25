import "isomorphic-form-data";
import "isomorphic-fetch";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as backlogjs from "backlog-js";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dist = resolve(__dirname, "..", "backlog", "dist", "assets");
const distConfigs = resolve(dist, "configs");

config({ override: true });

async function fetchTargetUsers() {
  console.log("========================================");
  console.log(" 移行先ユーザー一覧取得 (Fetch Target Users)");
  console.log("========================================");

  const targetHost = process.env.TARGET_BACKLOG_HOST;
  if (!targetHost) throw new Error("環境変数 'TARGET_BACKLOG_HOST' が設定されていません。.env を確認してください。");
  const targetApiKey = process.env.TARGET_BACKLOG_API_KEY;
  if (!targetApiKey) throw new Error("環境変数 'TARGET_BACKLOG_API_KEY' が設定されていません。.env を確認してください。");
  const targetProjectKey = process.env.TARGET_BACKLOG_PROJECT_KEY;
  if (!targetProjectKey) throw new Error("環境変数 'TARGET_BACKLOG_PROJECT_KEY' が設定されていません。.env を確認してください。");

  console.log(`移行先 Backlog: ${targetHost}`);
  console.log(`移行先 プロジェクトキー: ${targetProjectKey}`);

  const targetBacklog = new backlogjs.Backlog({ host: targetHost, apiKey: targetApiKey });

  // 1. 接続確認
  const myself = await targetBacklog.getMyself();
  console.log(`移行先 API 接続ユーザー: ${myself.name} (ID: ${myself.id})`);

  // 2. 移行先プロジェクトの取得
  let targetProject: any;
  try {
    targetProject = await targetBacklog.getProject(targetProjectKey);
    console.log(`移行先プロジェクト確認: ${targetProject.name} (ID: ${targetProject.id})`);
  } catch (_e) {
    console.error(`[エラー] 移行先プロジェクト '${targetProjectKey}' が存在しないか、権限がありません。`);
    process.exit(1);
  }

  // 3. 参加ユーザーの取得
  console.log("--- 移行先プロジェクトの参加ユーザー一覧を取得中 ---");
  const targetUsers = await targetBacklog.getProjectUsers(targetProject.id);
  console.log(`✓ 移行先ユーザー ${targetUsers.length} 件を取得しました。`);

  // 4. 保存
  await mkdir(distConfigs, { recursive: true });
  const outputPath = resolve(distConfigs, "users_list.json");
  await writeFile(outputPath, JSON.stringify(targetUsers, null, 2), "utf-8");

  console.log(`✅ 移行先ユーザー一覧を保存しました: ${outputPath}`);
  console.log("これでビューワの「ユーザーマッピング」画面を開くと、移行元・移行先ユーザーが自動的に読み込まれます。");
}

fetchTargetUsers().catch((e) => {
  console.error("\n[エラー] 移行先ユーザーの取得に失敗しました:", e.message || e);
  process.exit(1);
});
