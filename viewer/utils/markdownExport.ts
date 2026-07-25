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

function extractHeadingsFromMarkdown(plainText: string): Array<{ level: number; text: string; slug: string }> {
  const lines = plainText.split("\n");
  const headings: Array<{ level: number; text: string; slug: string }> = [];
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = text.toLowerCase().replace(/[^\w\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g, "-");
      headings.push({ level, text, slug });
    }
  }
  return headings;
}

function generateMarkdownToc(headings: Array<{ level: number; text: string; slug: string }>): string {
  if (headings.length === 0) return "";
  const minLevel = Math.min(...headings.map((h) => h.level));
  const lines = ["## TABLE OF CONTENTS\n"];
  for (const h of headings) {
    const indent = "  ".repeat(Math.max(0, h.level - minLevel));
    lines.push(`${indent}- [${h.text}](#${h.slug})`);
  }
  return `${lines.join("\n")}\n\n`;
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

  let body = doc.plain ?? "";

  // Rewrite /file/:id attachment image links in markdown plain text
  body = body.replace(/\/file\/(\d+)/g, `./attachments/$1`);

  // Check if doc.json contains a TOC node
  const jsonStr = doc.json ? (typeof doc.json === "string" ? doc.json : JSON.stringify(doc.json)) : "";
  const hasToc = jsonStr.includes('"type":"toc"');

  let tocBlock = "";
  if (hasToc && !body.includes("TABLE OF CONTENTS") && !body.includes("目次")) {
    const headings = extractHeadingsFromMarkdown(body);
    tocBlock = generateMarkdownToc(headings);
  }

  const sections = [`${frontMatter}${tocBlock}${body}`];

  if (comments.length > 0) {
    sections.push("\n\n---\n\n## コメント\n");
    for (const comment of comments) {
      sections.push(`\n### ${comment.createdUser?.name ?? "Unknown"} (${dayjs(comment.created).format("YYYY/MM/DD HH:mm:ss")})\n\n`);
      let commentBody = comment.plain ?? "";
      commentBody = commentBody.replace(/\/file\/(\d+)/g, `./attachments/$1`);
      sections.push(commentBody);
      if (comment.replies?.length) {
        for (const reply of comment.replies) {
          sections.push(
            `\n#### ${reply.createdUser?.name ?? "Unknown"} (${dayjs(reply.created).format("YYYY/MM/DD HH:mm:ss")})\n\n`,
          );
          let replyBody = reply.plain ?? "";
          replyBody = replyBody.replace(/\/file\/(\d+)/g, `./attachments/$1`);
          sections.push(replyBody);
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
