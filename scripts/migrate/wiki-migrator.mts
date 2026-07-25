import type * as backlogjs from "backlog-js";
import { readdir, readFile } from "fs/promises";
import { resolve } from "path";

export async function migrateWikis(
  targetBacklog: backlogjs.Backlog,
  targetProjectId: number,
  wikisDir: string,
  withRetry: <T>(fn: () => Promise<T>) => Promise<T>,
  limit: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<void> {
  console.log("--- Wiki 移行開始 ---");
  let wikisList: Array<any> = [];
  try {
    const listContent = await readFile(resolve(wikisDir, "list.json"), "utf-8");
    wikisList = JSON.parse(listContent);
  } catch (e) {
    console.log("Wiki リストが存在しないか読み込めないため、Wiki 移行をスキップします。");
    return;
  }

  if (!wikisList || wikisList.length === 0) {
    console.log("移行対象の Wiki ページはありません。");
    return;
  }

  // ターゲットプロジェクトの既存 Wiki 一覧を取得
  let targetWikis: Array<any> = [];
  try {
    targetWikis = await withRetry(() => targetBacklog.getWikis({ projectIdOrKey: targetProjectId }));
  } catch (e) {
    console.warn("ターゲットスペースの Wiki 一覧取得に失敗しました（Wiki機能が無効の可能性があります）。", e);
    return;
  }

  const targetWikiByName = new Map<string, any>(targetWikis.map((w: any) => [w.name.trim(), w]));

  for (const wikiListItem of wikisList) {
    await limit(async () => {
      const srcWikiDir = resolve(wikisDir, `${wikiListItem.id}`);
      const wikiJsonPath = resolve(srcWikiDir, "wiki.json");
      let wikiData: any = null;
      try {
        const wikiJson = await readFile(wikiJsonPath, "utf-8");
        wikiData = JSON.parse(wikiJson);
      } catch (e) {
        return;
      }

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
          const uploaded = await withRetry(() =>
            targetBacklog.postSpaceAttachment({
              filename: file,
              file: fileBuffer,
            }),
          );
          attachmentIds.push(uploaded.id);
        }
      } catch (e) {
        // 添付ファイルが無い場合はスルー
      }

      let wikiId: number;
      if (targetWikiByName.has(wikiName.trim())) {
        const existing = targetWikiByName.get(wikiName.trim())!;
        wikiId = existing.id;
        await withRetry(() =>
          targetBacklog.patchWiki(wikiId, {
            name: wikiName,
            content: wikiData.content || "",
            mailNotify: false,
          }),
        );
        console.log(`[Wiki] 既存更新: '${wikiName}' (ID: ${wikiId})`);
      } else {
        const created = await withRetry(() =>
          targetBacklog.postWiki({
            projectId: targetProjectId,
            name: wikiName,
            content: wikiData.content || "",
            mailNotify: false,
          }),
        );
        wikiId = created.id;
        console.log(`[Wiki] 新規作成: '${wikiName}' (ID: ${wikiId})`);
      }

      // 添付ファイルの紐付け
      for (const attId of attachmentIds) {
        try {
          await withRetry(() => targetBacklog.postWikiAttachment(wikiId, attId));
        } catch (e) {
          console.warn(`[Wiki] 添付ファイル紐付け失敗: Wiki '${wikiName}', AttID: ${attId}`);
        }
      }
    });
  }
}
