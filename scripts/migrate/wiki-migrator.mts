import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type * as backlogjs from "backlog-js";

interface WikiListItem {
  id: number;
  name: string;
  [key: string]: unknown;
}

interface WikiDetail {
  id: number;
  name: string;
  content?: string;
  [key: string]: unknown;
}

interface TargetWiki {
  id: number;
  name: string;
  [key: string]: unknown;
}

export async function migrateWikis(
  targetBacklog: backlogjs.Backlog,
  targetProjectId: number,
  wikisDir: string,
  withRetry: <T>(fn: () => Promise<T>) => Promise<T>,
  limit: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<void> {
  console.log("--- Wiki 移行開始 ---");
  let wikisList: WikiListItem[] = [];
  try {
    const listContent = await readFile(resolve(wikisDir, "list.json"), "utf-8");
    wikisList = JSON.parse(listContent);
  } catch (_e) {
    console.log("Wiki リストが存在しないか読み込めないため、Wiki 移行をスキップします。");
    return;
  }

  if (!wikisList || wikisList.length === 0) {
    console.log("移行対象の Wiki ページはありません。");
    return;
  }

  // ターゲットプロジェクトの既存 Wiki 一覧を取得
  let targetWikis: TargetWiki[] = [];
  try {
    targetWikis = (await withRetry(() => targetBacklog.getWikis({ projectIdOrKey: targetProjectId }))) as TargetWiki[];
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("ターゲットスペースの Wiki 一覧取得に失敗しました（Wiki機能が無効の可能性があります）。", errMsg);
    return;
  }

  const targetWikiByName = new Map<string, TargetWiki>(targetWikis.map((w) => [w.name.trim(), w]));

  for (const wikiListItem of wikisList) {
    await limit(async () => {
      const srcWikiDir = resolve(wikisDir, `${wikiListItem.id}`);
      const wikiJsonPath = resolve(srcWikiDir, "wiki.json");
      let wikiData: WikiDetail | null = null;
      try {
        const wikiJson = await readFile(wikiJsonPath, "utf-8");
        wikiData = JSON.parse(wikiJson);
      } catch (_e) {
        return;
      }

      if (!wikiData) return;

      const wikiName = wikiData.name;
      console.log(`[Wiki] 移行中: '${wikiName}'...`);

      // 添付ファイルのアップロード
      const attachmentIds: number[] = [];
      const attachmentsDir = resolve(srcWikiDir, "attachments");
      try {
        const attFiles = await readdir(attachmentsDir);
        for (const file of attFiles) {
          const filePath = resolve(attachmentsDir, file);
          const fileBuffer = await readFile(filePath);
          const uploaded = (await withRetry(() =>
            targetBacklog.postSpaceAttachment({
              filename: file,
              file: fileBuffer,
            }),
          )) as { id: number };
          attachmentIds.push(uploaded.id);
        }
      } catch (_e) {
        // 添付ファイルが無い場合はスルー
      }

      let wikiId: number;
      const existing = targetWikiByName.get(wikiName.trim());
      if (existing) {
        wikiId = existing.id;
        await withRetry(() =>
          targetBacklog.patchWiki(wikiId, {
            name: wikiName,
            content: wikiData?.content || "",
            mailNotify: false,
          }),
        );
        console.log(`[Wiki] 既存更新: '${wikiName}' (ID: ${wikiId})`);
      } else {
        const created = (await withRetry(() =>
          targetBacklog.postWiki({
            projectId: targetProjectId,
            name: wikiName,
            content: wikiData?.content || "",
            mailNotify: false,
          }),
        )) as { id: number };
        wikiId = created.id;
        console.log(`[Wiki] 新規作成: '${wikiName}' (ID: ${wikiId})`);
      }

      // 添付ファイルの紐付け
      for (const attId of attachmentIds) {
        try {
          await withRetry(() => targetBacklog.postWikiAttachment(wikiId, attId));
        } catch (_e) {
          console.warn(`[Wiki] 添付ファイル紐付け失敗: Wiki '${wikiName}', AttID: ${attId}`);
        }
      }
    });
  }
}
