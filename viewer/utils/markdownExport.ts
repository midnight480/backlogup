import type * as backlog from "backlog-js";
import dayjs from "dayjs";
import { downloadText, sanitizeFilename } from "./download";

function buildFrontMatter(fields: Record<string, string | undefined>): string {
  const lines = Object.entries(fields)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  if (lines.length === 0) {
    return "";
  }
  return `---\n${lines.join("\n")}\n---\n\n`;
}

export function buildWikiMarkdown(wiki: backlog.Entity.Wiki.Wiki, formattingRule: string): string {
  const tags = wiki.tags?.map((tag) => tag.name).join(", ");
  const frontMatter = buildFrontMatter({
    title: wiki.name,
    format: formattingRule,
    created: wiki.created ? dayjs(wiki.created).format("YYYY/MM/DD HH:mm:ss") : undefined,
    updated: wiki.updated ? dayjs(wiki.updated).format("YYYY/MM/DD HH:mm:ss") : undefined,
    author: wiki.createdUser?.name,
    tags,
  });
  const content = wiki.content ?? "";
  return `${frontMatter}${content}`;
}

export function downloadWikiMarkdown(wiki: backlog.Entity.Wiki.Wiki, formattingRule: string): void {
  const markdown = buildWikiMarkdown(wiki, formattingRule);
  const filename = `${sanitizeFilename(wiki.name ?? "wiki")}.md`;
  downloadText(markdown, filename, "text/markdown;charset=utf-8");
}

export function buildDocumentMarkdown(doc: BacklogDocument, comments: BacklogDocumentComment[]): string {
  const tags = doc.tags?.map((tag) => tag.name).join(", ");
  const frontMatter = buildFrontMatter({
    title: doc.title,
    emoji: doc.emoji ?? undefined,
    created: doc.created ? dayjs(doc.created).format("YYYY/MM/DD HH:mm:ss") : undefined,
    updated: doc.updated ? dayjs(doc.updated).format("YYYY/MM/DD HH:mm:ss") : undefined,
    author: doc.createdUser?.name,
    tags,
  });

  const sections = [`${frontMatter}${doc.plain ?? ""}`];

  if (comments.length > 0) {
    sections.push("\n\n---\n\n## コメント\n");
    for (const comment of comments) {
      sections.push(`\n### ${comment.createdUser?.name ?? "Unknown"} (${dayjs(comment.created).format("YYYY/MM/DD HH:mm:ss")})\n\n`);
      sections.push(comment.plain ?? "");
      if (comment.replies?.length) {
        for (const reply of comment.replies) {
          sections.push(
            `\n#### ${reply.createdUser?.name ?? "Unknown"} (${dayjs(reply.created).format("YYYY/MM/DD HH:mm:ss")})\n\n`,
          );
          sections.push(reply.plain ?? "");
        }
      }
    }
  }

  return sections.join("");
}

export function downloadDocumentMarkdown(doc: BacklogDocument, comments: BacklogDocumentComment[]): void {
  const markdown = buildDocumentMarkdown(doc, comments);
  const filename = `${sanitizeFilename(doc.title ?? "document")}.md`;
  downloadText(markdown, filename, "text/markdown;charset=utf-8");
}
