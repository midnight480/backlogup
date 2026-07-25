import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type * as backlogjs from "backlog-js";

interface SourceIssueAttachment {
  id: number;
  name: string;
}

interface SourceIssueCategory {
  id: number;
  name: string;
}

interface SourceIssueVersion {
  id: number;
  name: string;
}

interface SourceIssue {
  id: number;
  issueKey: string;
  summary: string;
  description?: string;
  created?: string;
  createdUser?: { id: number; name: string };
  assignee?: { id: number; name: string };
  issueType?: { id: number; name: string };
  priority?: { id: number; name: string };
  status?: { id: number; name: string };
  resolution?: { id: number; name: string };
  category?: SourceIssueCategory[];
  versions?: SourceIssueVersion[];
  milestone?: SourceIssueVersion[];
  attachments?: SourceIssueAttachment[];
  parentIssueId?: number;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
}

interface CommentChangeLog {
  field: string;
  newValue?: string;
}

interface SourceComment {
  id: number;
  content?: string;
  created?: string;
  createdUser?: { id: number; name: string };
  notifications?: unknown[];
  changeLog?: CommentChangeLog[];
}

export async function migrateIssues(
  targetBacklog: backlogjs.Backlog,
  targetProjectId: number,
  issuesDir: string,
  userMap: Map<number, number>,
  typeMap: Map<number, number>,
  categoryMap: Map<number, number>,
  versionMap: Map<number, number>,
  defaultTargetUserId: number,
  withRetry: <T>(fn: () => Promise<T>) => Promise<T>,
  _limit: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<void> {
  console.log("--- 課題 (Issues) 移行開始 ---");

  let issueDirs: string[] = [];
  try {
    const entries = await readdir(issuesDir, { withFileTypes: true });
    issueDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (_e) {
    console.log("課題ディレクトリが見つからないため、課題の移行をスキップします。");
    return;
  }

  // 全課題データを読み込んで古い順（ID順）にソート
  const issueItems: Array<{ id: number; dirPath: string; issue: SourceIssue }> = [];

  for (const dirName of issueDirs) {
    const dirPath = resolve(issuesDir, dirName);
    const issueJsonPath = resolve(dirPath, "issue.json");
    try {
      const issueJson = await readFile(issueJsonPath, "utf-8");
      const issue = JSON.parse(issueJson) as SourceIssue;
      issueItems.push({ id: issue.id, dirPath, issue });
    } catch (_e) {
      // 読み込み失敗時はスキップ
    }
  }

  issueItems.sort((a, b) => a.id - b.id);
  console.log(`全 ${issueItems.length} 件の課題を古い順に移行します。`);

  const issueIdMap = new Map<number, number>(); // sourceIssueId -> targetIssueId

  for (const item of issueItems) {
    const oldIssue = item.issue;
    const issueLogPrefix = `[課題 ${oldIssue.issueKey}]`;
    console.log(`${issueLogPrefix} 移行開始...`);

    // 1. 添付ファイルのアップロード
    const attachmentIds: number[] = [];
    const attachmentsDir = resolve(item.dirPath, "attachments");
    try {
      const attFiles = await readdir(attachmentsDir);
      for (const attFile of attFiles) {
        const filePath = resolve(attachmentsDir, attFile);
        const fileBuffer = await readFile(filePath);
        // 元の添付ファイル情報を特定するための検索
        const originalAtt = oldIssue.attachments?.find((a) => String(a.id) === attFile);
        const filename = originalAtt ? originalAtt.name : attFile;

        const uploaded = (await withRetry(() =>
          targetBacklog.postSpaceAttachment({
            filename,
            file: fileBuffer,
          }),
        )) as { id: number };
        attachmentIds.push(uploaded.id);
      }
    } catch (_e) {
      // 添付ファイルが無い場合は無視
    }

    // 2. メタデータヘッダー付き本文の構築
    const creatorName = oldIssue.createdUser?.name || "不明";
    const createdDate = oldIssue.created || "不明";
    const metaHeader = `[元課題: ${oldIssue.issueKey} | 登録者: ${creatorName} | 登録日: ${createdDate}]\n----------------------------------------\n`;
    const formattedDescription = metaHeader + (oldIssue.description || "");

    // 3. ID変換とパラメータ作成
    const mappedTypeId = (oldIssue.issueType?.id ? typeMap.get(oldIssue.issueType.id) : undefined) || Array.from(typeMap.values())[0];
    const mappedAssigneeId = oldIssue.assignee ? userMap.get(oldIssue.assignee.id) || defaultTargetUserId : undefined;

    const mappedCategoryIds = oldIssue.category?.map((c) => categoryMap.get(c.id)).filter((id): id is number => typeof id === "number");

    const mappedVersionIds = oldIssue.versions?.map((v) => versionMap.get(v.id)).filter((id): id is number => typeof id === "number");

    const mappedMilestoneIds = oldIssue.milestone?.map((m) => versionMap.get(m.id)).filter((id): id is number => typeof id === "number");

    const parentIssueId = oldIssue.parentIssueId ? issueIdMap.get(oldIssue.parentIssueId) : undefined;

    const postParams: Record<string, unknown> = {
      projectId: targetProjectId,
      summary: oldIssue.summary,
      description: formattedDescription,
      issueTypeId: mappedTypeId,
      priorityId: oldIssue.priority?.id || 3,
      assigneeId: mappedAssigneeId,
      categoryId: mappedCategoryIds?.length ? mappedCategoryIds : undefined,
      versionId: mappedVersionIds?.length ? mappedVersionIds : undefined,
      milestoneId: mappedMilestoneIds?.length ? mappedMilestoneIds : undefined,
      parentIssueId,
      attachmentId: attachmentIds.length > 0 ? attachmentIds : undefined,
      startDate: oldIssue.startDate || undefined,
      dueDate: oldIssue.dueDate || undefined,
      estimatedHours: oldIssue.estimatedHours || undefined,
      actualHours: oldIssue.actualHours || undefined,
      mailNotify: false,
    };

    let newIssue: { id: number; issueKey: string } | null = null;
    try {
      newIssue = (await withRetry(() => targetBacklog.postIssue(postParams as never))) as { id: number; issueKey: string };
      issueIdMap.set(oldIssue.id, newIssue.id);
      console.log(`${issueLogPrefix} 新課題作成成功: ${newIssue.issueKey} (ID: ${newIssue.id})`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`${issueLogPrefix} 新課題作成失敗:`, errMsg);
      continue;
    }

    // 4. コメントの移行
    const commentsPath = resolve(item.dirPath, "comments.json");
    let comments: SourceComment[] = [];
    try {
      const commentsJson = await readFile(commentsPath, "utf-8");
      comments = JSON.parse(commentsJson);
    } catch (_e) {
      // コメント読み込みスキップ
    }

    // 古い順にコメントを投稿
    comments.sort((a, b) => a.id - b.id);

    for (const comment of comments) {
      const cAuthor = comment.createdUser?.name || "不明";
      const cDate = comment.created || "不明";
      const commentMeta = `[元コメント | 投稿者: ${cAuthor} | 投稿日: ${cDate}]`;

      const contentText = comment.content ? `${commentMeta}\n${comment.content}` : `${commentMeta} (変更ログ/通知のみ)`;

      // コメント添付ファイル処理
      const commentAttIds: number[] = [];

      try {
        const commentParams: Record<string, unknown> = {
          content: contentText,
          attachmentId: commentAttIds.length > 0 ? commentAttIds : undefined,
          mailNotify: false,
        };

        // 状態変更が含まれている場合
        if (comment.changeLog) {
          const statusChange = comment.changeLog.find((cl) => cl.field === "status");
          if (statusChange?.newValue) {
            const statusId = Number(statusChange.newValue);
            if ([1, 2, 3, 4].includes(statusId)) {
              commentParams.statusId = statusId;
            }
          }
        }

        await withRetry(() => targetBacklog.postComment(newIssue.id, commentParams as never));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`${issueLogPrefix} コメント投稿失敗 (ID: ${comment.id}):`, errMsg);
      }
    }

    // 元の課題の状態が「完了」(4)などの場合、最終状態を同調
    if (oldIssue.status && oldIssue.status.id !== 1) {
      try {
        await withRetry(() =>
          targetBacklog.patchIssue(newIssue.id, {
            statusId: oldIssue.status.id,
            resolutionId: oldIssue.resolution?.id || undefined,
            comment: "[移行補足] 最終ステータス同調",
          }),
        );
      } catch (_e) {
        // ステータス調整の失敗は軽微としてスルー
      }
    }
  }

  console.log("--- 課題 移行完了 ---");
}
