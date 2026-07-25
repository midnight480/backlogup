import type * as backlogjs from "backlog-js";
import { readdir, readFile } from "fs/promises";
import { resolve } from "path";

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
  limit: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<void> {
  console.log("--- 課題 (Issues) 移行開始 ---");

  let issueDirs: string[] = [];
  try {
    const entries = await readdir(issuesDir, { withFileTypes: true });
    issueDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {
    console.log("課題ディレクトリが見つからないため、課題の移行をスキップします。");
    return;
  }

  // 全課題データを読み込んで古い順（ID順）にソート
  const issueItems: Array<{ id: number; dirPath: string; issue: any }> = [];

  for (const dirName of issueDirs) {
    const dirPath = resolve(issuesDir, dirName);
    const issueJsonPath = resolve(dirPath, "issue.json");
    try {
      const issueJson = await readFile(issueJsonPath, "utf-8");
      const issue = JSON.parse(issueJson);
      issueItems.push({ id: issue.id, dirPath, issue });
    } catch (e) {
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
        const originalAtt = oldIssue.attachments?.find((a: any) => String(a.id) === attFile);
        const filename = originalAtt ? originalAtt.name : attFile;

        const uploaded = await withRetry(() =>
          targetBacklog.postSpaceAttachment({
            filename,
            file: fileBuffer,
          }),
        );
        attachmentIds.push(uploaded.id);
      }
    } catch (e) {
      // 添付ファイルが無い場合は無視
    }

    // 2. メタデータヘッダー付き本文の構築
    const creatorName = oldIssue.createdUser?.name || "不明";
    const createdDate = oldIssue.created || "不明";
    const metaHeader = `[元課題: ${oldIssue.issueKey} | 登録者: ${creatorName} | 登録日: ${createdDate}]\n----------------------------------------\n`;
    const formattedDescription = metaHeader + (oldIssue.description || "");

    // 3. ID変換とパラメータ作成
    const mappedTypeId = typeMap.get(oldIssue.issueType?.id) || Array.from(typeMap.values())[0];
    const mappedAssigneeId = oldIssue.assignee ? userMap.get(oldIssue.assignee.id) || defaultTargetUserId : undefined;

    const mappedCategoryIds = oldIssue.category
      ?.map((c: any) => categoryMap.get(c.id))
      .filter((id: any): id is number => typeof id === "number");

    const mappedVersionIds = oldIssue.versions
      ?.map((v: any) => versionMap.get(v.id))
      .filter((id: any): id is number => typeof id === "number");

    const mappedMilestoneIds = oldIssue.milestone
      ?.map((m: any) => versionMap.get(m.id))
      .filter((id: any): id is number => typeof id === "number");

    const parentIssueId = oldIssue.parentIssueId ? issueIdMap.get(oldIssue.parentIssueId) : undefined;

    const postParams: any = {
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

    let newIssue: any = null;
    try {
      newIssue = await withRetry(() => targetBacklog.postIssue(postParams));
      issueIdMap.set(oldIssue.id, newIssue.id);
      console.log(`${issueLogPrefix} 新課題作成成功: ${newIssue.issueKey} (ID: ${newIssue.id})`);
    } catch (e: any) {
      console.error(`${issueLogPrefix} 新課題作成失敗:`, e?.message || e);
      continue;
    }

    // 4. コメントの移行
    const commentsPath = resolve(item.dirPath, "comments.json");
    let comments: Array<any> = [];
    try {
      const commentsJson = await readFile(commentsPath, "utf-8");
      comments = JSON.parse(commentsJson);
    } catch (e) {
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
      if (comment.notifications && comment.notifications.length > 0) {
        // 必要に応じて処理
      }

      try {
        const commentParams: any = {
          content: contentText,
          attachmentId: commentAttIds.length > 0 ? commentAttIds : undefined,
          mailNotify: false,
        };

        // 状態変更が含まれている場合
        if (comment.changeLog) {
          const statusChange = comment.changeLog.find((cl: any) => cl.field === "status");
          if (statusChange && statusChange.newValue) {
            // ステータスIDの適用
            const statusId = Number(statusChange.newValue);
            if ([1, 2, 3, 4].includes(statusId)) {
              commentParams.statusId = statusId;
            }
          }
        }

        await withRetry(() => targetBacklog.postComment(newIssue.id, commentParams));
      } catch (e: any) {
        console.warn(`${issueLogPrefix} コメント投稿失敗 (ID: ${comment.id}):`, e?.message || e);
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
      } catch (e) {
        // ステータス調整の失敗は軽微としてスルー
      }
    }
  }

  console.log("--- 課題 移行完了 ---");
}
