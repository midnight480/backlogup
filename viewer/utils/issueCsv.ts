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

const CSV_HEADERS = [
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

function issueToRow(issue: backlog.Entity.Issue.Issue): string[] {
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

export function issuesToCsv(issues: backlog.Entity.Issue.Issue[]): string {
  const headerLine = CSV_HEADERS.map(escapeCsvField).join(",");
  const dataLines = issues.map((issue) => issueToRow(issue).map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export function downloadIssuesCsv(issues: backlog.Entity.Issue.Issue[], projectKey?: string): void {
  const prefix = projectKey ? `${projectKey}-` : "";
  const filename = `${sanitizeFilename(`${prefix}issues`)}.csv`;
  const csv = `\uFEFF${issuesToCsv(issues)}`;
  downloadText(csv, filename, "text/csv;charset=utf-8");
}
