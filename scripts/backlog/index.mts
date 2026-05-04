import "isomorphic-form-data";
import "isomorphic-fetch";
import * as backlogjs from "backlog-js";
import { config } from "dotenv";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dist = resolve(__dirname, "dist", "assets");
const distConfigs = resolve(dist, "configs");
const distUsers = resolve(dist, "users");
const distIssuePages = resolve(dist, "pages");
const distIssues = resolve(dist, "issues");
const distWikis = resolve(dist, "wikis");
const distDocuments = resolve(dist, "documents");

if (process.env.CLEAN_BACKUP === "true") {
  try {
    await rm(dist, { force: true, recursive: true });
  } catch (e) {}
}
await mkdir(distConfigs, { recursive: true });
await mkdir(distUsers, { recursive: true });
await mkdir(distIssuePages, { recursive: true });
await mkdir(distIssues, { recursive: true });
await mkdir(distWikis, { recursive: true });
await mkdir(distDocuments, { recursive: true });

config({ override: true });

const host = process.env.BACKLOG_HOST;
if (!host) throw new Error("環境変数 'BACKLOG_HOST' が設定されていません");
const apiKey = process.env.BACKLOG_API_KEY;
if (!apiKey) throw new Error("環境変数 'BACKLOG_API_KEY' が設定されていません");
const projectKey = process.env.BACKLOG_PROJECT_KEY;
if (!projectKey) throw new Error("環境変数 'BACKLOG_PROJECT_KEY' が設定されていません");

const backlog = new backlogjs.Backlog({ host, apiKey });

// --- Concurrency & Retry Utilities ---

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

// Document API用ヘルパー（backlog-jsに未実装のため直接REST呼び出し）
const backlogApiBase = `https://${host}/api/v2`;
async function fetchBacklogApi<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  return withRetry(async () => {
    const url = new URL(`${backlogApiBase}${path}`);
    url.searchParams.set("apiKey", apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      const err: any = new Error(`Backlog API error: ${res.status} ${res.statusText} for ${path}`);
      err.status = res.status;
      throw err;
    }
    return res.json() as Promise<T>;
  });
}

// ========================================
// 初期設定 バックアップ
// ========================================

const project = await withRetry(() => backlog.getProject(projectKey));
const { id: projectId } = project;

await writeFile(resolve(distConfigs, "project.json"), JSON.stringify(project), { encoding: "utf-8" });

try {
  const licence = await withRetry(() => backlog.getLicence());
  await writeFile(resolve(distConfigs, "licence.json"), JSON.stringify(licence), { encoding: "utf-8" });
} catch (e) {
  console.warn("space licence fetch failed", e);
}

try {
  const myself = await withRetry(() => backlog.getMyself());
  if (myself.roleType === 1) {
    const diskUsage = await fetchBacklogApi<any>("/space/diskUsage");
    await writeFile(resolve(distConfigs, "space-disk-usage.json"), JSON.stringify({ available: true, data: diskUsage }), { encoding: "utf-8" });
  } else {
    await writeFile(resolve(distConfigs, "space-disk-usage.json"), JSON.stringify({ available: false }), { encoding: "utf-8" });
  }
} catch (e) {
  console.warn("space disk usage fetch failed", e);
}

if (project.useGit) {
  try {
    const gitRepos = await fetchBacklogApi<any>(`/projects/${projectKey}/git/repositories`);
    await writeFile(resolve(distConfigs, "git-repositories.json"), JSON.stringify(gitRepos), { encoding: "utf-8" });
  } catch (e) {
    console.warn("git repositories fetch failed", e);
  }
}

// ========================================
// 属性・設定 バックアップ
// ========================================

const issueTypes = await withRetry(() => backlog.getIssueTypes(projectId));
await writeFile(resolve(distConfigs, "issueTypes.json"), JSON.stringify(issueTypes), { encoding: "utf-8" });

const categories = await withRetry(() => backlog.getCategories(projectId));
await writeFile(resolve(distConfigs, "categories.json"), JSON.stringify(categories), { encoding: "utf-8" });

const versions = await withRetry(() => backlog.getVersions(projectId));
await writeFile(resolve(distConfigs, "versions.json"), JSON.stringify(versions), { encoding: "utf-8" });

const users = await withRetry(() => backlog.getProjectUsers(projectId));
await writeFile(resolve(distConfigs, "users.json"), JSON.stringify(users), { encoding: "utf-8" });

console.log("--- ユーザーアイコン ダウンロード開始 ---");
await Promise.all(
  users.map((user) =>
    limit(async () => {
      await mkdir(resolve(distUsers, `${user.id}`), { recursive: true });
      try {
        const userIcon = await withRetry(() => backlog.getUserIcon(user.id));
        const fileName = resolve(distUsers, `${user.id}`, "icon");
        await writeFile(fileName, userIcon.body, { encoding: "binary" });
      } catch (e) {
        console.warn("icon not found:", user.id, user.name);
      }
    }),
  ),
);

// ========================================
// 課題 バックアップ
// ========================================

console.log("--- 課題 バックアップ開始 ---");
const { count: totalIssues } = await withRetry(() => backlog.getIssuesCount({ projectId: [projectId] }));
for (let fetched = 0, page = 0; fetched < totalIssues; page++) {
  await writeFile(resolve(distConfigs, "pages.json"), JSON.stringify({ start: 0, end: page }), { encoding: "utf-8" });

  const issues = await withRetry(() => backlog.getIssues({ projectId: [projectId], count: 20, offset: fetched }));
  fetched += issues.length;

  const fileName = resolve(distIssuePages, `${page}.json`);
  await writeFile(fileName, JSON.stringify(issues), { encoding: "utf-8" });

  await Promise.all(
    issues.map((issue) =>
      limit(async () => {
        const distIssue = resolve(distIssues, `${issue.id}`);
        const distIssueAttachments = resolve(distIssue, "attachments");
        const issueJsonPath = resolve(distIssue, "issue.json");

        try {
          const existingJson = await readFile(issueJsonPath, { encoding: "utf-8" });
          const existingIssue = JSON.parse(existingJson);
          if (existingIssue.updated === issue.updated) {
            console.log(`[Issue ${issue.issueKey}] 変更なし (スキップ)`);
            return;
          }
        } catch (e) {}

        await mkdir(distIssueAttachments, { recursive: true });

        await writeFile(issueJsonPath, JSON.stringify(issue), { encoding: "utf-8" });
        console.log(`[Issue ${issue.issueKey}] 取得開始...`);

        const { count: totalIssueComments } = await withRetry(() => backlog.getIssueCommentsCount(issue.id));

        const allIssueComments = [];
        let maxIssueComment: backlogjs.Entity.Issue.Comment | undefined;
        for (let fetchedComments = 0; fetchedComments < totalIssueComments; ) {
          const option: backlogjs.Option.Issue.GetIssueCommentsParams = {};
          if (maxIssueComment) option.maxId = maxIssueComment.id;

          const issueComments = await withRetry(() => backlog.getIssueComments(issue.id, option));
          if (issueComments.length === 0) break;
          fetchedComments += issueComments.length;
          maxIssueComment = issueComments[issueComments.length - 1];
          allIssueComments.push(...issueComments);
        }
        await writeFile(resolve(distIssue, "comments.json"), JSON.stringify(allIssueComments), { encoding: "utf-8" });

        const attachments = await withRetry(() => backlog.getIssueAttachments(issue.id));
        for (const [attIndex, { id: attachmentId }] of attachments.entries()) {
          const attachment = await withRetry(() => backlog.getIssueAttachment(issue.id, attachmentId));
          await writeFile(resolve(distIssueAttachments, `${attachmentId}`), attachment.body, { encoding: "binary" });
        }
        console.log(`[Issue ${issue.issueKey}] 完了`);
      }),
    ),
  );
}

// ========================================
// Wiki バックアップ
// ========================================

console.log("--- Wiki バックアップ開始 ---");
if (project.useWiki === false) {
  console.log("Wiki機能が無効になっています。スキップします。");
} else {
  try {
  const wikiTags = await withRetry(() => backlog.getWikisTags(projectKey));
  await writeFile(resolve(distConfigs, "wiki-tags.json"), JSON.stringify(wikiTags), { encoding: "utf-8" });

  const wikis = await withRetry(() => backlog.getWikis({ projectIdOrKey: projectKey }));
  await writeFile(resolve(distWikis, "list.json"), JSON.stringify(wikis), { encoding: "utf-8" });

  await Promise.all(
    wikis.map((wikiListItem) =>
      limit(async () => {
        const wikiLogPrefix = `[Wiki ${wikiListItem.name}]`;
        const distWiki = resolve(distWikis, `${wikiListItem.id}`);
        const wikiJsonPath = resolve(distWiki, "wiki.json");

        try {
          const existingJson = await readFile(wikiJsonPath, { encoding: "utf-8" });
          const existingWiki = JSON.parse(existingJson);
          if (existingWiki.updated === wikiListItem.updated) {
            console.log(`${wikiLogPrefix} 変更なし (スキップ)`);
            return;
          }
        } catch (e) {}

        console.log(`${wikiLogPrefix} 取得開始...`);

        const wiki = await withRetry(() => backlog.getWiki(wikiListItem.id));
        await mkdir(distWiki, { recursive: true });

        await writeFile(wikiJsonPath, JSON.stringify(wiki), { encoding: "utf-8" });

        const stars = await withRetry(() => backlog.getWikisStars(wikiListItem.id));
        await writeFile(resolve(distWiki, "stars.json"), JSON.stringify(stars), { encoding: "utf-8" });

        if (wiki.attachments && wiki.attachments.length > 0) {
          const distWikiAttachments = resolve(distWiki, "attachments");
          await mkdir(distWikiAttachments, { recursive: true });

          for (const [attIndex, attachment] of wiki.attachments.entries()) {
            try {
              const fileData = await withRetry(() => backlog.getWikiAttachment(wikiListItem.id, attachment.id));
              await writeFile(resolve(distWikiAttachments, `${attachment.id}`), fileData.body, { encoding: "binary" });
            } catch (e) {
              console.warn(`${wikiLogPrefix} attachment download failed:`, attachment.id, attachment.name, e);
            }
          }
        }
        console.log(`${wikiLogPrefix} 完了`);
      }),
    ),
  );
  console.log("--- Wiki バックアップ完了 ---");
} catch (e: any) {
  const status = e.response?.status || e.status || e._status || 0;
  if (status === 403 || status === 404) {
    console.log("Wiki機能が無効になっているか権限がないため、スキップします。");
  } else {
    console.error("Wikiバックアップ中にエラーが発生しました:", e.message || e);
  }
}
}

// ========================================
// ドキュメント バックアップ
// ========================================

console.log("--- ドキュメント バックアップ開始 ---");
if (project.useDocument === false) {
  console.log("ドキュメント機能が無効になっています。スキップします。");
} else {

interface DocumentListItem {
  id: string;
  projectId: number;
  title: string;
  plain: string;
  json: string;
  statusId: number;
  emoji: string | null;
  attachments: Array<{ id: number; name: string; size: number; createdUser: any; created: string }>;
  tags: Array<{ id: number; name: string }>;
  createdUser: any;
  created: string;
  updatedUser: any;
  updated: string;
}

try {
  const documentTree = await fetchBacklogApi<any>("/documents/tree", { projectIdOrKey: projectKey });
  await writeFile(resolve(distDocuments, "tree.json"), JSON.stringify(documentTree), { encoding: "utf-8" });

  const allDocuments: DocumentListItem[] = [];
  let docOffset = 0;
  const docCount = 100;

  while (true) {
    const docs = await fetchBacklogApi<DocumentListItem[]>("/documents", {
      projectId: String(projectId),
      count: String(docCount),
      offset: String(docOffset),
    });
    if (docs.length === 0) break;
    allDocuments.push(...docs);
    docOffset += docs.length;
    console.log(`[Documents] ${allDocuments.length} 件リスト取得済み`);
    if (docs.length < docCount) break;
  }

  await writeFile(resolve(distDocuments, "list.json"), JSON.stringify(allDocuments), { encoding: "utf-8" });

  await Promise.all(
    allDocuments.map((doc) =>
      limit(async () => {
        const docLogPrefix = `[Doc ${doc.title}]`;
        const distDoc = resolve(distDocuments, doc.id);
        const docJsonPath = resolve(distDoc, "document.json");

        try {
          const existingJson = await readFile(docJsonPath, { encoding: "utf-8" });
          const existingDoc = JSON.parse(existingJson);
          if (existingDoc.updated === doc.updated) {
            console.log(`${docLogPrefix} 変更なし (スキップ)`);
            return;
          }
        } catch (e) {}

        console.log(`${docLogPrefix} 取得開始...`);

        await mkdir(distDoc, { recursive: true });

        const documentDetail = await fetchBacklogApi<DocumentListItem>(`/documents/${doc.id}`);
        await writeFile(docJsonPath, JSON.stringify(documentDetail), { encoding: "utf-8" });

        try {
          const comments = await fetchBacklogApi<any[]>(`/documents/${doc.id}/comments`);
          await writeFile(resolve(distDoc, "comments.json"), JSON.stringify(comments), { encoding: "utf-8" });
        } catch (e) {
          console.warn(`${docLogPrefix} comments fetch failed:`, e);
          await writeFile(resolve(distDoc, "comments.json"), JSON.stringify([]), { encoding: "utf-8" });
        }

        if (documentDetail.attachments && documentDetail.attachments.length > 0) {
          const distDocAttachments = resolve(distDoc, "attachments");
          await mkdir(distDocAttachments, { recursive: true });

          for (const [attIndex, attachment] of documentDetail.attachments.entries()) {
            try {
              const url = new URL(`${backlogApiBase}/documents/${doc.id}/attachments/${attachment.id}`);
              url.searchParams.set("apiKey", apiKey);

              // Wrap regular fetch in retry manually for custom binary attachments
              const attRes = await withRetry(async () => {
                const res = await fetch(url.toString());
                if (!res.ok) {
                  const err: any = new Error(`Backlog API error: ${res.status}`);
                  err.status = res.status;
                  throw err;
                }
                return res;
              });

              const buffer = await attRes.arrayBuffer();
              await writeFile(resolve(distDocAttachments, `${attachment.id}`), Buffer.from(buffer));
            } catch (e) {
              console.warn(`${docLogPrefix} attachment download failed:`, attachment.id, attachment.name, e);
            }
          }
        }
        console.log(`${docLogPrefix} 完了`);
      }),
    ),
  );

  console.log("--- ドキュメント バックアップ完了 ---");
} catch (e: any) {
  const status = e.response?.status || e.status || e._status || 0;
  if (status === 403 || status === 404) {
    console.log("ドキュメント機能が無効になっているか権限がないため、スキップします。");
  } else {
    console.error("ドキュメントバックアップ中にエラーが発生しました:", e.message || e);
  }
}
}
