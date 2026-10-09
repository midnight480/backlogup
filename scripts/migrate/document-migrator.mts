import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type * as backlogjs from "backlog-js";

interface SourceDocumentTag {
  id: number;
  name: string;
}

interface SourceDocument {
  id: string;
  title: string;
  plain?: string;
  emoji?: string | null;
  tags?: SourceDocumentTag[];
  createdUser?: { id: number; name: string };
  updated?: string;
}

interface DocumentTreeNode {
  id: string;
  children?: DocumentTreeNode[];
}

interface DocumentTree {
  activeTree?: { id: string; children?: DocumentTreeNode[] };
}

// backlog-js に未実装のエンドポイント（ドキュメントタグの追加）用の直接REST呼び出し。
// apiKey はクエリではなく Backlog-API-Key ヘッダーで送る（URL・ログに残さないため）。
async function postBacklogApiForm<T>(
  host: string,
  apiKey: string,
  path: string,
  params: Record<string, string[]>,
  withRetry: <R>(fn: () => Promise<R>) => Promise<R>,
): Promise<T> {
  return withRetry(async () => {
    const body = new URLSearchParams();
    for (const [key, values] of Object.entries(params)) {
      for (const value of values) {
        body.append(key, value);
      }
    }
    const res = await fetch(`https://${host}/api/v2${path}`, {
      method: "POST",
      headers: {
        "Backlog-API-Key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = new Error(`Backlog API error: ${res.status} ${res.statusText} for ${path}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return res.json() as Promise<T>;
  });
}

export async function migrateDocuments(
  targetBacklog: backlogjs.Backlog,
  targetProjectId: number,
  documentsDir: string,
  targetHost: string,
  targetApiKey: string,
  withRetry: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<void> {
  console.log("--- ドキュメント (Documents) 移行開始 ---");

  // ツリー構造（activeTree）を深さ優先で辿り、(ドキュメントID, 親ID) の移行順リストを作る。
  // tree.json が無い／読めない場合はディレクトリ列挙順でルート直下に作成する。
  const orderedEntries: Array<{ id: string; parentId?: string }> = [];
  try {
    const treeJson = await readFile(resolve(documentsDir, "tree.json"), "utf-8");
    const tree = JSON.parse(treeJson) as DocumentTree;
    const walk = (nodes: DocumentTreeNode[] | undefined, parentId?: string) => {
      for (const node of nodes ?? []) {
        orderedEntries.push({ id: node.id, parentId });
        walk(node.children, node.id);
      }
    };
    walk(tree.activeTree?.children);
  } catch (_e) {
    console.log("ドキュメントツリーが読み込めないため、フラットな順序で移行します。");
  }

  let docIds: string[];
  try {
    const entries = await readdir(documentsDir, { withFileTypes: true });
    docIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (_e) {
    console.log("ドキュメントディレクトリが見つからないため、ドキュメントの移行をスキップします。");
    return;
  }

  const treeCoveredIds = new Set(orderedEntries.map((e) => e.id));
  for (const id of docIds) {
    if (!treeCoveredIds.has(id)) {
      orderedEntries.push({ id });
    }
  }

  if (orderedEntries.length === 0) {
    console.log("移行対象のドキュメントはありません。");
    return;
  }

  console.log(
    "注意: ドキュメントの本文はテキストのみ移行されます。書式・添付ファイル・コメント・編集履歴はドキュメントAPIの仕様上移行できません。",
  );

  // addLast で兄弟の末尾に追加するため、順序を保つには逐次実行が必要
  const documentIdMap = new Map<string, string>(); // sourceDocumentId -> targetDocumentId

  for (const entry of orderedEntries) {
    const docJsonPath = resolve(documentsDir, entry.id, "document.json");
    let doc: SourceDocument;
    try {
      doc = JSON.parse(await readFile(docJsonPath, "utf-8")) as SourceDocument;
    } catch (_e) {
      continue;
    }

    const docLogPrefix = `[Doc ${doc.title}]`;
    console.log(`${docLogPrefix} 移行開始...`);

    const creatorName = doc.createdUser?.name || "不明";
    const updatedDate = doc.updated || "不明";
    const metaHeader = `[元ドキュメント | 作成者: ${creatorName} | 最終更新: ${updatedDate}]\n----------------------------------------\n`;

    const parentId = entry.parentId ? documentIdMap.get(entry.parentId) : undefined;
    if (entry.parentId && parentId === undefined) {
      console.warn(`${docLogPrefix} 親ドキュメント (ID: ${entry.parentId}) が未移行のため、ルート直下に作成します。`);
    }

    let newDoc: { id: string };
    try {
      newDoc = (await withRetry(() =>
        targetBacklog.addDocument({
          projectId: targetProjectId,
          title: doc.title,
          content: metaHeader + (doc.plain || ""),
          emoji: doc.emoji || undefined,
          parentId,
          addLast: true,
        }),
      )) as unknown as { id: string };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`${docLogPrefix} ドキュメント作成失敗:`, errMsg);
      continue;
    }
    documentIdMap.set(doc.id, newDoc.id);
    console.log(`${docLogPrefix} 作成成功 (新ID: ${newDoc.id})`);

    // タグの移行（backlog-js 未対応のため REST で tagNames[] を送信）
    const tagNames = doc.tags?.map((t) => t.name).filter((name) => name.length > 0) ?? [];
    if (tagNames.length > 0) {
      try {
        await postBacklogApiForm<SourceDocumentTag[]>(
          targetHost,
          targetApiKey,
          `/documents/${newDoc.id}/tags`,
          { "tagNames[]": tagNames },
          withRetry,
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`${docLogPrefix} タグ追加失敗:`, errMsg);
      }
    }
  }

  console.log(`--- ドキュメント 移行完了 (${documentIdMap.size} 件) ---`);
}
