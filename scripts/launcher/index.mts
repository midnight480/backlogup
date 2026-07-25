/**
 * BacklogUp かんたんメニュー（非エンジニア向けランチャー）
 *
 * ダブルクリックした start-windows.bat / start-mac.command から呼び出され、
 * 「.env の準備 → 番号を選ぶだけ」でバックアップ・共有ファイルDL・ビューア起動が
 * できるようにするための対話メニューです。
 *
 * このスクリプト自体は tsx 経由で実行されます（package.json の "start" を参照）。
 */
import { spawnSync } from "child_process";
import { copyFileSync, existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// scripts/launcher/ から見たリポジトリのルート
const root = resolve(__dirname, "..", "..");
const envPath = resolve(root, ".env");
const sampleEnvPath = resolve(root, "sample.env");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (question: string): Promise<string> => new Promise((res) => rl.question(question, (answer) => res(answer.trim())));

function print(line = ""): void {
  console.log(line);
}

/** OS ごとに「ファイルを既定アプリで開く」コマンドを返す */
function openCommand(target: string): { cmd: string; args: string[] } {
  if (process.platform === "win32") {
    // notepad で .env を開く（メモ帳）
    return { cmd: "notepad", args: [target] };
  }
  if (process.platform === "darwin") {
    // macOS はテキストエディットで開く
    return { cmd: "open", args: ["-t", target] };
  }
  return { cmd: "xdg-open", args: [target] };
}

function openFile(target: string): void {
  const { cmd, args } = openCommand(target);
  try {
    spawnSync(cmd, args, { stdio: "ignore" });
  } catch {
    print(`このファイルを手動で開いてください: ${target}`);
  }
}

/** npm スクリプトを実行（進捗をそのまま画面に表示） */
function runNpm(args: string[], extraEnv: Record<string, string> = {}): number {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npm, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  return result.status ?? 1;
}

/** .env がまだ未設定（サンプルのまま）かどうかをざっくり判定 */
function envLooksUnconfigured(): boolean {
  if (!existsSync(envPath)) return true;
  let body: string;
  try {
    body = readFileSync(envPath, "utf8");
  } catch {
    return true;
  }
  // sample.env のプレースホルダーがそのまま残っていないか
  const placeholders = ["hogehoge.backlog.com", "XXXXXXXXXX", "PROJ_HOGE"];
  return placeholders.some((p) => body.includes(p));
}

/**
 * .env を準備する。なければ sample.env からコピーし、エディタで開いて
 * 入力を促す。サンプルのままなら編集を促す。
 * @returns 設定が完了していれば true
 */
async function ensureEnv(): Promise<boolean> {
  if (!existsSync(envPath)) {
    if (!existsSync(sampleEnvPath)) {
      print("⚠️  sample.env が見つかりませんでした。リポジトリが壊れている可能性があります。");
      return false;
    }
    copyFileSync(sampleEnvPath, envPath);
    print("");
    print("📝 設定ファイル「.env」を新しく作成しました。");
    print("   メモ帳／テキストエディットで開きますので、次の3つを入力して保存してください:");
    print("     - BACKLOG_HOST        … Backlog のドメイン（例: xxx.backlog.com）");
    print("     - BACKLOG_API_KEY     … APIキー（Backlog の 個人設定 → API から取得）");
    print("     - BACKLOG_PROJECT_KEY … プロジェクトキー");
    print("");
    openFile(envPath);
    await ask("入力して保存したら、Enter キーを押してください... ");
  }

  if (envLooksUnconfigured()) {
    print("");
    print("⚠️  設定ファイル「.env」がまだ初期状態（サンプルのまま）のようです。");
    const answer = await ask("今すぐ開いて編集しますか？ (y/N): ");
    if (answer.toLowerCase() === "y") {
      openFile(envPath);
      await ask("入力して保存したら、Enter キーを押してください... ");
    }
    if (envLooksUnconfigured()) {
      print("⚠️  まだ初期値が残っているようです。あとで「6) 設定ファイルを開く」から編集できます。");
      return false;
    }
  }
  return true;
}

/** .env の移行先設定（TARGET_BACKLOG_*）がまだ未設定かどうか判定 */
function targetEnvLooksUnconfigured(): boolean {
  if (!existsSync(envPath)) return true;
  let body: string;
  try {
    body = readFileSync(envPath, "utf8");
  } catch {
    return true;
  }
  const placeholders = ["target.backlog.com", "YYYYYYYYYYYYYYYYYYYYYYYYYYY", "TARGET_PROJ"];
  return placeholders.some((p) => body.includes(p));
}

/**
 * 移行先環境変数の準備を確認する。
 * @returns 設定が完了していれば true
 */
async function ensureTargetEnv(): Promise<boolean> {
  if (targetEnvLooksUnconfigured()) {
    print("");
    print("⚠️  移行先設定（TARGET_BACKLOG_*）が未設定または初期状態（サンプルのまま）です。");
    print("   .env ファイルに移行先 Backlog の情報を入力してください:");
    print("     - TARGET_BACKLOG_HOST        … 移行先の Backlog ドメイン（例: target.backlog.com）");
    print("     - TARGET_BACKLOG_API_KEY     … 移行先の APIキー");
    print("     - TARGET_BACKLOG_PROJECT_KEY … 移行先の プロジェクトキー");
    print("");
    const answer = await ask("今すぐ .env を開いて編集しますか？ (y/N): ");
    if (answer.toLowerCase() === "y") {
      openFile(envPath);
      await ask("入力して保存したら、Enter キーを押してください... ");
    }
    if (targetEnvLooksUnconfigured()) {
      print("⚠️  移行先の設定が更新されていないようです。「6) 設定ファイルを開く」からも編集できます。");
      return false;
    }
  }
  return true;
}

function showMenu(): void {
  print("");
  print("==================================================");
  print("   BacklogUp かんたんメニュー");
  print("==================================================");
  print("   1) バックアップを実行する");
  print("   2) 共有ファイルをすべてダウンロードする");
  print("   3) ビューア（閲覧画面）を起動する");
  print("   4) データを全消去してからバックアップし直す");
  print("   5) バックアップデータを別のBacklogへ移行(マイグレーション)する");
  print("   6) 設定ファイル(.env)を開いて編集する");
  print("   0) 終了する");
  print("==================================================");
}

async function handleChoice(choice: string): Promise<boolean> {
  switch (choice) {
    case "1": {
      print("");
      print("▶ バックアップを開始します。プロジェクトの規模により時間がかかります...");
      const code = runNpm(["run", "backup"]);
      print(code === 0 ? "✅ バックアップが完了しました。" : "❌ バックアップ中にエラーが発生しました。");
      return true;
    }
    case "2": {
      print("");
      print("▶ 共有ファイルのダウンロードを開始します（中断しても再実行で続きから取得できます）...");
      const code = runNpm(["run", "download:sharedfiles", "--", "--all"]);
      print(
        code === 0
          ? "✅ 共有ファイルのダウンロードが完了しました。"
          : "❌ 一部のファイルの取得に失敗しました。再実行すると続きから取得します。",
      );
      return true;
    }
    case "3": {
      print("");
      print("▶ ビューアを起動します。ブラウザが自動で開きます。");
      print("   ※ 閲覧を終了するときは、この画面で Ctrl + C を押してください。");
      runNpm(["run", "dev", "--", "--open"]);
      return true;
    }
    case "4": {
      print("");
      const confirm = await ask("⚠️ 既存のバックアップデータをすべて削除して取り直します。よろしいですか？ (y/N): ");
      if (confirm.toLowerCase() !== "y") {
        print("中止しました。");
        return true;
      }
      const code = runNpm(["run", "backup"], { CLEAN_BACKUP: "true" });
      print(code === 0 ? "✅ クリーンバックアップが完了しました。" : "❌ バックアップ中にエラーが発生しました。");
      return true;
    }
    case "5": {
      print("");
      print("▶ バックアップデータを別の Backlog プロジェクトへ移行します。");
      const ready = await ensureTargetEnv();
      if (!ready) return true;

      const confirm = await ask("⚠️ バックアップデータを移行先プロジェクトへ投入します。実行しますか？ (y/N): ");
      if (confirm.toLowerCase() !== "y") {
        print("中止しました。");
        return true;
      }

      print("\n▶ 移行処理を開始します...");
      const code = runNpm(["run", "migrate"]);
      print(code === 0 ? "✅ 移行が完了しました。" : "❌ 移行中にエラーが発生しました。");
      return true;
    }
    case "6": {
      if (!existsSync(envPath)) {
        await ensureEnv();
      } else {
        openFile(envPath);
        await ask("編集して保存したら、Enter キーを押してください... ");
      }
      return true;
    }
    case "0":
    case "q":
    case "exit":
      return false;
    default:
      print("⚠️ 0〜6 の番号を入力してください。");
      return true;
  }
}

async function main(): Promise<void> {
  print("");
  print("ようこそ！ BacklogUp のかんたんメニューです。");

  await ensureEnv();

  let running = true;
  while (running) {
    showMenu();
    const choice = await ask("番号を入力して Enter: ");
    running = await handleChoice(choice);
  }

  print("");
  print("ご利用ありがとうございました。ウィンドウを閉じて終了できます。");
  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exitCode = 1;
});
