import type * as backlog from "backlog-js";
import dayjs from "dayjs";
import { downloadText, sanitizeFilename } from "./download";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "";
  }
  return dayjs(value).format("YYYY/MM/DD HH:mm:ss");
}

function joinNames(items: Array<{ name?: string }> | undefined): string {
  if (!items || items.length === 0) {
    return "";
  }
  return items.map((item) => item.name ?? "").filter(Boolean).join("; ");
}

/** リスト・複数選択など、オブジェクト/配列で返るカスタム属性値を表示用文字列に正規化する */
function normalizeCustomFieldOption(item: unknown): string {
  if (item == null) {
    return "";
  }
  if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
    return String(item);
  }
  if (typeof item === "object") {
    const option = item as Record<string, unknown>;
    if (option.name != null && option.name !== "") {
      return String(option.name);
    }
    if (typeof option.value === "string" || typeof option.value === "number") {
      return String(option.value);
    }
    return JSON.stringify(item);
  }
  return String(item);
}

function formatCustomFieldValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(normalizeCustomFieldOption).filter(Boolean).join("; ");
  }
  return normalizeCustomFieldOption(value);
}

function formatCustomFields(customFields: backlog.Entity.Issue.Issue["customFields"]): string {
  if (!customFields || customFields.length === 0) {
    return "";
  }
  return customFields
    .map((field) => {
      const name = field.name ?? field.id;
      return `${name}: ${formatCustomFieldValue(field.value)}`;
    })
    .join(" | ");
}

const CHANGE_LOG_FIELD_LABELS: Record<string, string> = {
  notification: "お知らせ",
  limitDate: "期限日",
  assigner: "担当者",
  parentIssue: "親課題",
  description: "詳細",
  component: "カテゴリー",
  resolution: "完了理由",
  milestone: "マイルストーン",
  priority: "優先度",
  issueType: "種別",
  estimatedHours: "予定時間",
  actualHours: "実績時間",
  status: "状態",
  attachment: "添付ファイル",
  summary: "件名",
};

function formatNotificationType(type: string): string {
  if (type === "issue.create") {
    return "課題の追加";
  }
  return type;
}

function formatChangeLogLine(changeLog: backlog.Entity.Issue.ChangeLog): string {
  const label = CHANGE_LOG_FIELD_LABELS[changeLog.field] ?? changeLog.field;
  if (changeLog.field === "notification") {
    const type = changeLog.notificationInfo?.type;
    return `${label}: ${type ? formatNotificationType(type) : ""}`;
  }
  const original = changeLog.originalValue ?? "未設定";
  const next = changeLog.newValue ?? (changeLog.field === "attachment" ? "削除" : "未設定");
  return `${label}: ${original} → ${next}`;
}

export function sortIssueComments(comments: backlog.Entity.Issue.Comment[]): backlog.Entity.Issue.Comment[] {
  return comments.slice().sort((a, b) => (a.id > b.id ? 1 : -1));
}

export function formatCommentForCsv(comment: backlog.Entity.Issue.Comment): string {
  const lines: string[] = [];
  const author = comment.createdUser?.name ?? "";
  lines.push(`${author} (${formatDate(comment.created)})`);
  if (comment.changeLog && comment.changeLog.length > 0) {
    for (const changeLog of comment.changeLog) {
      lines.push(formatChangeLogLine(changeLog));
    }
  }
  if (comment.content) {
    lines.push(comment.content);
  }
  if (comment.created !== comment.updated) {
    lines.push("（編集済み）");
  }
  return lines.join("\n");
}

async function fetchIssueComments(issueId: string | number): Promise<backlog.Entity.Issue.Comment[]> {
  try {
    const res = await fetch(`/assets/issues/${issueId}/comments.json`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch {
    return [];
  }
}

export async function loadCommentsByIssueId(
  issues: backlog.Entity.Issue.Issue[],
): Promise<Map<string, backlog.Entity.Issue.Comment[]>> {
  const entries = await Promise.all(
    issues.map(async (issue) => {
      const id = String(issue.id);
      const comments = sortIssueComments(await fetchIssueComments(id));
      return [id, comments] as const;
    }),
  );
  return new Map(entries);
}

function maxCommentCount(commentsByIssueId: Map<string, backlog.Entity.Issue.Comment[]>): number {
  let max = 0;
  for (const comments of commentsByIssueId.values()) {
    if (comments.length > max) {
      max = comments.length;
    }
  }
  return max;
}

const CSV_BASE_HEADERS = [
  "課題キー",
  "種別",
  "件名",
  "詳細",
  "状態",
  "優先度",
  "担当者",
  "カテゴリー",
  "マイルストーン",
  "発生バージョン",
  "完了理由",
  "開始日",
  "期限日",
  "予定時間",
  "実績時間",
  "登録者",
  "登録日",
  "更新者",
  "更新日",
  "カスタム属性",
] as const;

function buildCsvHeaders(maxComments: number): string[] {
  const headers: string[] = [...CSV_BASE_HEADERS];
  for (let i = 1; i <= maxComments; i++) {
    headers.push(`コメント${i}`);
  }
  return headers;
}

function issueToBaseRow(issue: backlog.Entity.Issue.Issue): string[] {
  return [
    issue.issueKey ?? "",
    issue.issueType?.name ?? "",
    issue.summary ?? "",
    issue.description ?? "",
    issue.status?.name ?? "",
    issue.priority?.name ?? "",
    issue.assignee?.name ?? "",
    joinNames(issue.category),
    joinNames(issue.milestone),
    joinNames(issue.versions),
    issue.resolution?.name ?? "",
    issue.startDate ? dayjs(issue.startDate).format("YYYY/MM/DD") : "",
    issue.dueDate ? dayjs(issue.dueDate).format("YYYY/MM/DD") : "",
    issue.estimatedHours != null ? String(issue.estimatedHours) : "",
    issue.actualHours != null ? String(issue.actualHours) : "",
    issue.createdUser?.name ?? "",
    formatDate(issue.created),
    issue.updatedUser?.name ?? "",
    formatDate(issue.updated),
    formatCustomFields(issue.customFields),
  ];
}

function issueToRow(
  issue: backlog.Entity.Issue.Issue,
  comments: backlog.Entity.Issue.Comment[],
  maxComments: number,
): string[] {
  const row = issueToBaseRow(issue);
  for (let i = 0; i < maxComments; i++) {
    const comment = comments[i];
    row.push(comment ? formatCommentForCsv(comment) : "");
  }
  return row;
}

export function issuesToCsv(
  issues: backlog.Entity.Issue.Issue[],
  commentsByIssueId: Map<string, backlog.Entity.Issue.Comment[]>,
  maxComments: number,
): string {
  const headers = buildCsvHeaders(maxComments);
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = issues.map((issue) => {
    const comments = commentsByIssueId.get(String(issue.id)) ?? [];
    return issueToRow(issue, comments, maxComments).map(escapeCsvField).join(",");
  });
  return [headerLine, ...dataLines].join("\n");
}

export async function downloadIssuesCsv(issues: backlog.Entity.Issue.Issue[], projectKey?: string): Promise<void> {
  const commentsByIssueId = await loadCommentsByIssueId(issues);
  const maxComments = maxCommentCount(commentsByIssueId);
  const prefix = projectKey ? `${projectKey}-` : "";
  const filename = `${sanitizeFilename(`${prefix}issues`)}.csv`;
  const csv = `\uFEFF${issuesToCsv(issues, commentsByIssueId, maxComments)}`;
  downloadText(csv, filename, "text/csv;charset=utf-8");
}
