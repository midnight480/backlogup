import "isomorphic-form-data";
import "isomorphic-fetch";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { mkdir, rm, writeFile } from "fs/promises";
import { setTimeout as sleepAsync } from "timers/promises";
import * as backlogjs from "backlog-js";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dist = resolve(__dirname, "dist", "assets");
const distConfigs = resolve(dist, "configs");
const distUsers = resolve(dist, "users");
const distIssuePages = resolve(dist, "pages");
const distIssues = resolve(dist, "issues");
const distWikis = resolve(dist, "wikis");
const distDocuments = resolve(dist, "documents");

try {
  await rm(dist, {
    force: true,
    recursive: true,
  });
} catch (e) { }
await mkdir(distConfigs, {
  recursive: true,
});
await mkdir(distUsers, {
  recursive: true,
});
await mkdir(distIssuePages, {
  recursive: true,
});
await mkdir(distIssues, {
  recursive: true,
});
await mkdir(distWikis, {
  recursive: true,
});
await mkdir(distDocuments, {
  recursive: true,
});

config({
  override: true,
});

const host = process.env.BACKLOG_HOST;
if (!host) {
  throw new Error("環境変数 'BACKLOG_HOST' が設定されていません");
}
const apiKey = process.env.BACKLOG_API_KEY;
if (!apiKey) {
  throw new Error("環境変数 'BACKLOG_API_KEY' が設定されていません");
}
const projectKey = process.env.BACKLOG_PROJECT_KEY;
if (!projectKey) {
  throw new Error("環境変数 'BACKLOG_PROJECT_KEY' が設定されていません");
}

const backlog = new backlogjs.Backlog({ host, apiKey });

// TODO: レートリミットを確認する　できればいい感じにwaitを調整する

// Document API用ヘルパー（backlog-jsに未実装のため直接REST呼び出し）
const backlogApiBase = `https://${host}/api/v2`;
async function fetchBacklogApi<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${backlogApiBase}${path}`);
  url.searchParams.set("apiKey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Backlog API error: ${res.status} ${res.statusText} for ${path}`);
  }
  return res.json() as Promise<T>;
}

const project = await backlog.getProject(projectKey);
const { id: projectId } = project;

// プロジェクト情報保存（textFormattingRule含む）
await writeFile(
  resolve(distConfigs, "project.json"),
  JSON.stringify(project),
  { encoding: "utf-8" }
);

const issueTypes = await backlog.getIssueTypes(projectId);
await writeFile(
  resolve(distConfigs, "issue-types.json"),
  JSON.stringify(issueTypes),
  { encoding: "utf-8" }
);
const categories = await backlog.getCategories(projectId);
await writeFile(
  resolve(distConfigs, "categories.json"),
  JSON.stringify(categories),
  { encoding: "utf-8" }
);
const versions = await backlog.getVersions(projectId);
await writeFile(
  resolve(distConfigs, "versions.json"),
  JSON.stringify(versions),
  { encoding: "utf-8" }
);
const users = await backlog.getProjectUsers(projectId);
await writeFile(resolve(distConfigs, "users.json"), JSON.stringify(users), {
  encoding: "utf-8",
});
for (const [index, user] of users.entries()) {
  await sleepAsync(1000);

  console.log("getProjectUser:", index + 1, "/", users.length);
  await mkdir(resolve(distUsers, `${user.id}`), {
    recursive: true,
  })
  try {
    const userIcon = await backlog.getUserIcon(user.id);
    const fileName = resolve(distUsers, `${user.id}`, "icon");
    await writeFile(fileName, userIcon.body, {
      encoding: "binary",
    });
  } catch (e) {
    console.warn("icon not found:", user.id, user.name);
  }
}

const { count: totalIssues } = await backlog.getIssuesCount({
  projectId: [projectId],
});
for (let fetched = 0, page = 0; fetched < totalIssues; page++) {
  await writeFile(resolve(distConfigs, "pages.json"), JSON.stringify({ start: 0, end: page }), {
    encoding: "utf-8",
  });

  await sleepAsync(1000);
  const issues = await backlog.getIssues({
    projectId: [projectId],
    count: 20,
    offset: fetched,
  });
  fetched += issues.length;

  const fileName = resolve(distIssuePages, `${page}.json`);
  await writeFile(fileName, JSON.stringify(issues), {
    encoding: "utf-8",
  });

  for (const [index, issue] of issues.entries()) {
    const distIssue = resolve(distIssues, `${issue.id}`);
    const distIssueAttachments = resolve(distIssue, "attachments");
    await mkdir(distIssueAttachments, {
      recursive: true,
    });

    await writeFile(resolve(distIssue, "issue.json"), JSON.stringify(issue), {
      encoding: "utf-8",
    });

    console.log("getIssue:", page * 20 + index + 1, "/", totalIssues);

    await sleepAsync(1000);
    const { count: totalIssueComments } = await backlog.getIssueCommentsCount(issue.id);

    const allIssueComments = [];
    let maxIssueComment: backlogjs.Entity.Issue.Comment | undefined;
    for (let fetchedComments = 0, fetchedPages = 0; fetchedComments < totalIssueComments; fetchedPages++) {
      console.log("getIssueComments:", fetchedPages + 1);

      const option: backlogjs.Option.Issue.GetIssueCommentsParams = {};
      if (maxIssueComment) {
        option.maxId = maxIssueComment.id;
      }
      await sleepAsync(250);
      const issueComments = await backlog.getIssueComments(issue.id, option);
      fetchedComments += issueComments.length;
      if (issueComments.length > 0) {
        maxIssueComment = issueComments[issueComments.length - 1];
        allIssueComments.push(...issueComments);
      }
    }
    await writeFile(resolve(distIssue, "comments.json"), JSON.stringify(allIssueComments), {
      encoding: "utf-8",
    });

    const attachments = await backlog.getIssueAttachments(issue.id);
    for (const [index, { id: attachmentId }] of attachments.entries()) {
      console.log("getIssueAttachments", index + 1, "/", attachments.length);
      await sleepAsync(250);
      const attachment = await backlog.getIssueAttachment(issue.id, attachmentId);
      await writeFile(resolve(distIssueAttachments, `${attachmentId}`), attachment.body, {
        encoding: "binary",
      });
    }
  }
}


// ========================================
// Wiki バックアップ
// ========================================

console.log("--- Wiki バックアップ開始 ---");

await sleepAsync(1000);
const wikiTags = await backlog.getWikisTags(projectKey);
await writeFile(
  resolve(distConfigs, "wiki-tags.json"),
  JSON.stringify(wikiTags),
  { encoding: "utf-8" }
);

await sleepAsync(1000);
const wikis = await backlog.getWikis({ projectIdOrKey: projectKey });
await writeFile(
  resolve(distWikis, "list.json"),
  JSON.stringify(wikis),
  { encoding: "utf-8" }
);

for (const [index, wikiListItem] of wikis.entries()) {
  console.log("getWiki:", index + 1, "/", wikis.length);

  await sleepAsync(1000);
  const wiki = await backlog.getWiki(wikiListItem.id);

  const distWiki = resolve(distWikis, `${wikiListItem.id}`);
  await mkdir(distWiki, { recursive: true });

  await writeFile(
    resolve(distWiki, "wiki.json"),
    JSON.stringify(wiki),
    { encoding: "utf-8" }
  );

  await sleepAsync(250);
  const stars = await backlog.getWikisStars(wikiListItem.id);
  await writeFile(
    resolve(distWiki, "stars.json"),
    JSON.stringify(stars),
    { encoding: "utf-8" }
  );

  // Wiki添付ファイルダウンロード
  if (wiki.attachments && wiki.attachments.length > 0) {
    const distWikiAttachments = resolve(distWiki, "attachments");
    await mkdir(distWikiAttachments, { recursive: true });

    for (const [attIndex, attachment] of wiki.attachments.entries()) {
      console.log("  getWikiAttachment:", attIndex + 1, "/", wiki.attachments.length);
      await sleepAsync(250);
      try {
        const fileData = await backlog.getWikiAttachment(wikiListItem.id, attachment.id);
        await writeFile(
          resolve(distWikiAttachments, `${attachment.id}`),
          fileData.body,
          { encoding: "binary" }
        );
      } catch (e) {
        console.warn("  wiki attachment download failed:", attachment.id, attachment.name, e);
      }
    }
  }
}

console.log("--- Wiki バックアップ完了 ---");

// ========================================
// ドキュメント バックアップ
// ========================================

console.log("--- ドキュメント バックアップ開始 ---");

interface DocumentListItem {
  id: string;
  projectId: number;
  title: string;
  plain: string;
  json: string;
  statusId: number;
  emoji: string | null;
  attachments: Array<{
    id: number;
    name: string;
    size: number;
    createdUser: { id: number; name: string };
    created: string;
  }>;
  tags: Array<{ id: number; name: string }>;
  createdUser: { id: number; userId: string; name: string; roleType: number; lang: string; mailAddress: string };
  created: string;
  updatedUser: { id: number; userId: string; name: string; roleType: number; lang: string; mailAddress: string };
  updated: string;
}

interface DocumentTree {
  projectId: number;
  activeTree: { id: string; children: DocumentTreeNode[] };
  trashTree: { id: string; children: DocumentTreeNode[] };
}

interface DocumentTreeNode {
  id: string;
  name: string;
  children: DocumentTreeNode[];
  emoji?: string;
}

interface DocumentComment {
  id: string;
  documentId: string;
  statusId: number;
  content: string;
  plain: string;
  commentType: string;
  createdUserId: number;
  created: string;
  updatedUserId: number;
  updated: string;
  createdUser: { id: number; userId: string; name: string; mailAddress: string; roleType: number };
  replies: DocumentCommentReply[];
}

interface DocumentCommentReply {
  id: string;
  documentId: string;
  commentId: string;
  content: string;
  plain: string;
  createdUserId: number;
  created: string;
  updatedUserId: number;
  updated: string;
  createdUser: { id: number; userId: string; name: string; mailAddress: string; roleType: number };
}

// ドキュメントツリー取得
await sleepAsync(1000);
const documentTree = await fetchBacklogApi<DocumentTree>("/documents/tree", {
  projectIdOrKey: projectKey,
});
await writeFile(
  resolve(distDocuments, "tree.json"),
  JSON.stringify(documentTree),
  { encoding: "utf-8" }
);

// ドキュメント一覧取得（ページネーション対応）
const allDocuments: DocumentListItem[] = [];
let docOffset = 0;
const docCount = 100;

while (true) {
  await sleepAsync(1000);
  const docs = await fetchBacklogApi<DocumentListItem[]>("/documents", {
    projectId: String(projectId),
    count: String(docCount),
    offset: String(docOffset),
  });

  if (docs.length === 0) break;

  allDocuments.push(...docs);
  docOffset += docs.length;
  console.log("getDocuments:", allDocuments.length, "件取得済み");

  if (docs.length < docCount) break;
}

await writeFile(
  resolve(distDocuments, "list.json"),
  JSON.stringify(allDocuments),
  { encoding: "utf-8" }
);

// 各ドキュメントの詳細・コメント取得
for (const [index, doc] of allDocuments.entries()) {
  console.log("getDocument:", index + 1, "/", allDocuments.length);

  const distDoc = resolve(distDocuments, doc.id);
  await mkdir(distDoc, { recursive: true });

  await sleepAsync(1000);
  const documentDetail = await fetchBacklogApi<DocumentListItem>(`/documents/${doc.id}`);
  await writeFile(
    resolve(distDoc, "document.json"),
    JSON.stringify(documentDetail),
    { encoding: "utf-8" }
  );

  await sleepAsync(500);
  try {
    const comments = await fetchBacklogApi<DocumentComment[]>(`/documents/${doc.id}/comments`);
    await writeFile(
      resolve(distDoc, "comments.json"),
      JSON.stringify(comments),
      { encoding: "utf-8" }
    );
  } catch (e) {
    console.warn("document comments fetch failed:", doc.id, doc.title, e);
    await writeFile(
      resolve(distDoc, "comments.json"),
      JSON.stringify([]),
      { encoding: "utf-8" }
    );
  }

  // ドキュメント添付ファイルダウンロード
  if (documentDetail.attachments && documentDetail.attachments.length > 0) {
    const distDocAttachments = resolve(distDoc, "attachments");
    await mkdir(distDocAttachments, { recursive: true });

    for (const [attIndex, attachment] of documentDetail.attachments.entries()) {
      console.log("  getDocumentAttachment:", attIndex + 1, "/", documentDetail.attachments.length);
      await sleepAsync(250);
      try {
        const url = new URL(`${backlogApiBase}/documents/${doc.id}/attachments/${attachment.id}`);
        url.searchParams.set("apiKey", apiKey);
        const attRes = await fetch(url.toString());
        if (attRes.ok) {
          const buffer = await attRes.arrayBuffer();
          await writeFile(
            resolve(distDocAttachments, `${attachment.id}`),
            Buffer.from(buffer),
          );
        } else {
          console.warn("  document attachment download failed:", attachment.id, attachment.name, attRes.status);
        }
      } catch (e) {
        console.warn("  document attachment download failed:", attachment.id, attachment.name, e);
      }
    }
  }
}

console.log("--- ドキュメント バックアップ完了 ---");
