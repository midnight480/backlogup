import { useDidMount, useWillUnmount } from "@better-hooks/lifecycle";
import Image from "@tiptap/extension-image";
import Heading from "@tiptap/extension-heading";
import TiptapLink from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor, Node, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import dayjs from "dayjs";
import { observer } from "mobx-react-lite";
import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExportButtons } from "../components/exportButtons";
import { useI18n } from "../i18n";
import { useStore } from "../stores";
import { downloadDocumentMarkdown } from "../utils/markdownExport";
import { exportElementToPdf } from "../utils/pdfExport";

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { id: attributes.id };
        },
      },
    };
  },
});

interface TocItem {
  id: string;
  level: number;
  text: string;
}

function extractHeadingsFromEditor(editor: any): TocItem[] {
  const headings: TocItem[] = [];
  if (!editor?.state?.doc) return headings;

  editor.state.doc.descendants((node: any) => {
    if (node.type.name === "heading") {
      const text = node.textContent || "";
      const level = node.attrs?.level || 1;
      const id = node.attrs?.id || `heading-${headings.length}`;
      headings.push({ id, level, text });
    }
  });

  return headings;
}

const TocNodeView: React.FC<any> = ({ editor }) => {
  const headings = useMemo(() => extractHeadingsFromEditor(editor), [editor?.state?.doc]);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <NodeViewWrapper className="toc-block my-6">
      <div className="p-5 bg-surface-container-low border border-outline-variant rounded-xl shadow-xs">
        <div className="font-bold text-xs uppercase tracking-wider text-outline mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">format_list_bulleted</span>
          TABLE OF CONTENTS
        </div>
        <ul className="space-y-1.5 pl-0 list-none m-0">
          {headings.map((h, idx) => {
            const indentLevel = Math.max(0, h.level - minLevel);
            return (
              <li
                key={`${h.id}-${idx}`}
                style={{ paddingLeft: `${indentLevel * 1.25}rem` }}
                className="text-body-sm flex items-start gap-2"
              >
                <span className="text-outline text-xs mt-1">•</span>
                <a
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(h.id);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="text-on-surface hover:text-primary hover:underline transition-colors leading-relaxed"
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </NodeViewWrapper>
  );
};

const TocExtension = Node.create({
  name: "toc",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: "toc" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["toc", HTMLAttributes];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TocNodeView);
  },
});

const OgpNodeView: React.FC<any> = ({ node }) => {
  const ogp = node.attrs?.ogp || {};
  const url = node.attrs?.url || ogp["og:url"] || "#";
  const title = ogp.title || ogp["og:title"] || url;
  const description = ogp["og:description"] || "";
  const siteName = ogp["og:site_name"] || "";
  const image = ogp["og:image"] || "";

  return (
    <NodeViewWrapper className="ogp-block my-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col sm:flex-row border border-outline-variant rounded-xl overflow-hidden hover:bg-surface-container-low transition-colors no-underline text-on-surface bg-surface-container-lowest max-w-2xl"
      >
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0 gap-3">
          <div className="space-y-1.5">
            <div className="font-bold text-body-md text-on-surface leading-snug break-words pt-1">{title}</div>
            {description && <div className="text-xs text-outline leading-relaxed line-clamp-2">{description}</div>}
          </div>
          <div className="text-xs text-primary font-medium truncate flex items-center gap-1 pb-1">
            <span className="material-symbols-outlined text-xs">link</span>
            <span>{siteName || url}</span>
          </div>
        </div>
        {image && (
          <div className="sm:w-44 h-32 sm:h-auto flex-shrink-0 bg-surface-variant relative overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          </div>
        )}
      </a>
    </NodeViewWrapper>
  );
};

const OgpExtension = Node.create({
  name: "ogp",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      ogp: { default: null },
      url: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "ogp" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["ogp", HTMLAttributes];
  },
  addNodeView() {
    return ReactNodeViewRenderer(OgpNodeView);
  },
});

const AttachmentBadgeView: React.FC<any> = ({ node }) => {
  const attrs = node.attrs || {};
  const filename = attrs.filename || "Attachment";
  const sizeKb = attrs.size ? (attrs.size / 1024).toFixed(1) : null;
  const docId = attrs.documentId;
  const attId = attrs.id;
  const fileUrl = docId && attId ? `/assets/documents/${docId}/attachments/${attId}` : "#";

  return (
    <NodeViewWrapper className="inline-block my-2">
      <a
        href={fileUrl}
        download={filename}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-outline-variant bg-surface-container-low hover:bg-surface-container rounded-lg text-body-sm text-primary font-medium no-underline transition-colors"
      >
        <span className="material-symbols-outlined text-base">attach_file</span>
        <span>{filename}</span>
        {sizeKb && <span className="text-xs text-outline font-mono">({sizeKb} KB)</span>}
      </a>
    </NodeViewWrapper>
  );
};

const AttachmentBadgeExtension = Node.create({
  name: "attachmentBadge",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      projectKey: { default: null },
      documentId: { default: null },
      uuid: { default: null },
      id: { default: null },
      attachmentUrl: { default: null },
      filename: { default: null },
      size: { default: null },
      created: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "attachmentBadge" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["attachmentBadge", HTMLAttributes];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AttachmentBadgeView);
  },
});

const IssueMentionExtension = Node.create({
  name: "issueMention",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      mentionType: { default: "inline" },
      projectKey: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "issueMention" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["a", { href: `/issues/${HTMLAttributes.id}`, class: "text-primary hover:underline font-medium" }, HTMLAttributes.label || HTMLAttributes.id];
  },
});

const DocumentMentionExtension = Node.create({
  name: "documentMention",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      mentionType: { default: "inline" },
      projectKey: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "documentMention" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["a", { href: `/documents/${HTMLAttributes.id}`, class: "text-primary hover:underline font-medium" }, HTMLAttributes.label || HTMLAttributes.id];
  },
});

const PeopleMentionExtension = Node.create({
  name: "peopleMention",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "peopleMention" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", { class: "inline-flex items-center px-1.5 py-0.5 rounded bg-primary-fixed text-primary text-xs font-semibold" }, `@${HTMLAttributes.label || HTMLAttributes.id}`];
  },
});

const EmojiExtension = Node.create({
  name: "emoji",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      id: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "emoji" }];
  },
  renderHTML({ HTMLAttributes }) {
    const char = HTMLAttributes.id?.c || "";
    return ["span", { class: "emoji" }, char];
  },
});

const CacooNodeView: React.FC<any> = ({ node }) => {
  const attrs = node.attrs || {};
  const src = attrs.src || "";
  return (
    <NodeViewWrapper className="cacoo-block my-4">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 p-3 border border-outline-variant bg-surface-container-low rounded-xl text-primary font-medium hover:underline"
      >
        <span className="material-symbols-outlined text-xl">palette</span>
        <span>Cacoo 図面を開く ({src})</span>
      </a>
    </NodeViewWrapper>
  );
};

const CacooExtension = Node.create({
  name: "cacoo",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "cacoo" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["cacoo", HTMLAttributes];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CacooNodeView);
  },
});

const YoutubeNodeView: React.FC<any> = ({ node }) => {
  const attrs = node.attrs || {};
  const src = attrs.src || "";
  let embedUrl = src;
  const match = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (match) {
    embedUrl = `https://www.youtube.com/embed/${match[1]}`;
  }

  return (
    <NodeViewWrapper className="youtube-block my-4 max-w-2xl">
      <div className="aspect-video w-full rounded-xl overflow-hidden border border-outline-variant bg-black">
        <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen title="YouTube video" />
      </div>
    </NodeViewWrapper>
  );
};

const YoutubeExtension = Node.create({
  name: "youtube",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      start: { default: 0 },
      width: { default: 640 },
      height: { default: 480 },
    };
  },
  parseHTML() {
    return [{ tag: "youtube" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["youtube", HTMLAttributes];
  },
  addNodeView() {
    return ReactNodeViewRenderer(YoutubeNodeView);
  },
});

const ChildlistExtension = Node.create({
  name: "childlist",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: "childlist" }];
  },
  renderHTML() {
    return ["div", { class: "childlist" }];
  },
});

const tiptapExtensions = [
  StarterKit.configure({ heading: false }),
  CustomHeading,
  TiptapLink.configure({ openOnClick: false }),
  Image,
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableCell,
  TableHeader,
  TocExtension,
  OgpExtension,
  AttachmentBadgeExtension,
  IssueMentionExtension,
  DocumentMentionExtension,
  PeopleMentionExtension,
  CacooExtension,
  YoutubeExtension,
  EmojiExtension,
  ChildlistExtension,
];

// Tiptapが認識するノードタイプ一覧
const knownNodeTypes = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "image",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "taskList",
  "taskItem",
  "toc",
  "ogp",
  "attachmentBadge",
  "issueMention",
  "documentMention",
  "peopleMention",
  "cacoo",
  "youtube",
  "emoji",
  "childlist",
]);

// Tiptapが認識するマークタイプ一覧
const knownMarkTypes = new Set(["bold", "italic", "strike", "code", "link"]);

/**
 * Backlog独自のノードタイプ（toc等）を保持し、画像パスをローカルアセットパスに書き換え、
 * 不明なマークを除去してTiptapがクラッシュしないようにする
 */
function sanitizeProseMirrorJson(node: Record<string, unknown>, docId?: string): Record<string, unknown> {
  if (!node || typeof node !== "object") return node;

  const nodeType = node.type as string;
  const sanitized = { ...node };

  // 画像ノードのsrcパス変換
  if (nodeType === "image" && sanitized.attrs && typeof sanitized.attrs === "object") {
    const attrs = { ...(sanitized.attrs as Record<string, unknown>) };
    const src = attrs.src as string;
    if (src && typeof src === "string") {
      const match = src.match(/\/file\/(\d+)/) || src.match(/file\/(\d+)/);
      if (match && docId) {
        attrs.src = `/assets/documents/${docId}/attachments/${match[1]}`;
      }
    }
    sanitized.attrs = attrs;
  }

  // 不明なノードタイプをparagraphに変換
  if (nodeType && !knownNodeTypes.has(nodeType)) {
    sanitized.type = "paragraph";
  }

  // マークのフィルタリング
  if (Array.isArray(sanitized.marks)) {
    sanitized.marks = (sanitized.marks as Array<Record<string, unknown>>).filter((mark) => knownMarkTypes.has(mark.type as string));
    if ((sanitized.marks as unknown[]).length === 0) {
      delete sanitized.marks;
    }
  }

  // 子ノードの再帰処理
  if (Array.isArray(sanitized.content)) {
    sanitized.content = (sanitized.content as Array<Record<string, unknown>>).map((child) => sanitizeProseMirrorJson(child, docId));
  }

  return sanitized;
}

interface TiptapViewerProps {
  content: string | Record<string, unknown> | null;
  docId?: string;
}

const TiptapViewer: React.FC<TiptapViewerProps> = ({ content, docId }) => {
  let jsonContent: Record<string, unknown> | null = null;
  if (content && typeof content === "object") {
    jsonContent = content as Record<string, unknown>;
  } else if (content && typeof content === "string") {
    try {
      jsonContent = JSON.parse(content);
    } catch {
      jsonContent = null;
    }
  }

  const sanitizedContent = useMemo(() => {
    if (!jsonContent) return null;
    return sanitizeProseMirrorJson(jsonContent, docId);
  }, [jsonContent, docId]);

  const contentKey = typeof content === "string" ? content : JSON.stringify(content);

  const editor = useEditor(
    {
      extensions: tiptapExtensions,
      content: sanitizedContent,
      editable: false,
    },
    [contentKey, docId],
  );

  if (!jsonContent) {
    const displayText = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    return (
      <div className="p-4 bg-surface-container-low border border-outline-variant rounded-lg">
        <pre className="whitespace-pre-wrap break-words font-mono text-body-sm m-0 text-on-surface">{displayText}</pre>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert ProseMirror-container">
      <style>{`
                .ProseMirror-container .ProseMirror {
                    outline: none;
                }
                .ProseMirror-container .ProseMirror ul:not([data-type='taskList']) {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin-top: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror-container .ProseMirror ul:not([data-type='taskList']) ul {
                    list-style-type: circle;
                    padding-left: 1.5rem;
                    margin-top: 0.25rem;
                    margin-bottom: 0.25rem;
                }
                .ProseMirror-container .ProseMirror ul:not([data-type='taskList']) ul ul {
                    list-style-type: square;
                }
                .ProseMirror-container .ProseMirror ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin-top: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror-container .ProseMirror li {
                    margin-top: 0.25rem;
                    margin-bottom: 0.25rem;
                }
                .ProseMirror-container .ProseMirror li > p {
                    margin: 0;
                    display: inline;
                }
                .ProseMirror-container .ProseMirror table {
                    border-collapse: collapse;
                    width: 100%;
                }
                .ProseMirror-container .ProseMirror th, 
                .ProseMirror-container .ProseMirror td {
                    border: 1px solid #e4e4e4;
                    padding: 8px;
                }
                .ProseMirror-container .ProseMirror th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                }
                .ProseMirror-container .ProseMirror p {
                    margin-top: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror-container .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    margin-top: 1rem;
                    margin-bottom: 1rem;
                    display: block;
                    border-radius: 0.375rem;
                }
                .ProseMirror-container .ProseMirror ul[data-type='taskList'] {
                    list-style: none;
                    padding: 0;
                }
                .ProseMirror-container .ProseMirror ul[data-type='taskList'] li {
                    display: flex;
                    align-items: flex-start;
                }
                .ProseMirror-container .ProseMirror ul[data-type='taskList'] li label {
                    margin-right: 8px;
                }
            `}</style>
      <EditorContent editor={editor} />
    </div>
  );
};

interface DocumentCommentItemProps {
  comment: any;
  docId?: string;
}

const DocumentCommentItem: React.FC<DocumentCommentItemProps> = ({ comment, docId }) => {
  return (
    <div className="mb-4">
      <div className="flex items-center mb-2 gap-2">
        <img
          alt={comment.createdUser?.name}
          src={`/assets/users/${comment.createdUser?.id}/icon`}
          className="w-7 h-7 rounded-full object-cover bg-surface-variant border border-outline-variant"
        />
        <span className="font-bold text-body-sm text-on-surface">{comment.createdUser?.name}</span>
        <span className="text-xs text-outline">{dayjs(comment.created).format("YYYY/MM/DD HH:mm:ss")}</span>
      </div>
      <div className="ml-9 mb-2">
        <TiptapViewer content={comment.content} docId={docId} />
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-9 pl-4 border-l-2 border-surface-variant flex flex-col gap-3">
          {comment.replies.map((reply: any) => (
            <div key={reply.id}>
              <div className="flex items-center mb-1 gap-2">
                <img
                  alt={reply.createdUser?.name}
                  src={`/assets/users/${reply.createdUser?.id}/icon`}
                  className="w-6 h-6 rounded-full object-cover bg-surface-variant border border-outline-variant"
                />
                <span className="font-bold text-body-sm text-on-surface">{reply.createdUser?.name}</span>
                <span className="text-xs text-outline">{dayjs(reply.created).format("YYYY/MM/DD HH:mm:ss")}</span>
              </div>
              <TiptapViewer content={reply.content} docId={docId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Tree Node
const DocumentTreeNodeView: React.FC<{ node: any; documents: any[]; currentDocId?: string; level?: number }> = ({
  node,
  documents,
  currentDocId,
  level = 0,
}) => {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const matchingDoc = documents.find((d: any) => d.id === node.id);
  const isCurrent = matchingDoc?.id?.toString() === currentDocId;

  const paddingLeftClass = "px-3";

  if (matchingDoc && hasChildren) {
    return (
      <div className={`mt-1 ${level > 0 ? "ml-4 border-l border-outline-variant" : ""}`}>
        <div
          className={`flex items-center gap-2 py-1.5 rounded-lg text-body-sm cursor-pointer ${paddingLeftClass} ${isCurrent ? "text-primary bg-primary-fixed font-bold" : "text-on-surface hover:bg-surface-container-low"}`}
          onClick={() => setOpen(!open)}
        >
          <span className="material-symbols-outlined text-sm">{open ? "folder_open" : "folder"}</span>
          {matchingDoc.emoji && <span className="mr-0.5">{matchingDoc.emoji}</span>}
          <span className="flex-1 truncate">{node.name}</span>
          <Link
            to={`/documents/${matchingDoc.id}`}
            className="material-symbols-outlined text-sm hover:text-primary px-1"
            onClick={(e) => e.stopPropagation()}
          >
            description
          </Link>
        </div>
        {open && (
          <div className="ml-4 mt-1 border-l border-outline-variant">
            {node.children.map((child: any) => (
              <DocumentTreeNodeView key={child.id} node={child} documents={documents} currentDocId={currentDocId} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (matchingDoc) {
    return (
      <div className={`mt-1 ${level > 0 ? "ml-4 border-l border-outline-variant" : ""}`}>
        <Link
          to={`/documents/${matchingDoc.id}`}
          className={`flex items-center gap-2 py-1.5 cursor-pointer text-body-sm rounded-lg ${paddingLeftClass} ${isCurrent ? "text-primary bg-primary-fixed font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"}`}
        >
          <span className="material-symbols-outlined text-sm">article</span>
          {matchingDoc.emoji && <span className="mr-0.5">{matchingDoc.emoji}</span>}
          <span className="truncate">{node.name}</span>
        </Link>
      </div>
    );
  }

  if (hasChildren) {
    return (
      <div className={`mt-1 ${level > 0 ? "ml-4 border-l border-outline-variant" : ""}`}>
        <div
          className={`flex items-center gap-2 py-1.5 rounded-lg text-body-sm cursor-pointer ${paddingLeftClass} text-on-surface hover:bg-surface-container-low`}
          onClick={() => setOpen(!open)}
        >
          <span className="material-symbols-outlined text-sm">{open ? "folder_open" : "folder"}</span>
          {node.emoji && <span className="mr-0.5">{node.emoji}</span>}
          <span className="truncate font-bold">{node.name}</span>
        </div>
        {open && (
          <div className="ml-4 mt-1 border-l border-outline-variant">
            {node.children.map((child: any) => (
              <DocumentTreeNodeView key={child.id} node={child} documents={documents} currentDocId={currentDocId} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`mt-1 ${level > 0 ? "ml-4 border-l border-outline-variant" : ""}`}>
      <div className={`flex items-center gap-2 py-1.5 text-body-sm rounded-lg opacity-50 cursor-not-allowed ${paddingLeftClass}`}>
        <span className="material-symbols-outlined text-sm">article</span>
        {node.emoji && <span className="mr-0.5">{node.emoji}</span>}
        <span className="truncate">{node.name}</span>
      </div>
    </div>
  );
};

export const Document: React.FC = observer(() => {
  const { t } = useI18n();
  const { documentStore } = useStore();
  const { id: documentId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = React.useRef<HTMLDivElement>(null);

  useDidMount(() => {
    documentStore.fetch();
  });

  React.useEffect(() => {
    if (documentId && documentId !== "root") {
      documentStore.fetchDetail(documentId);
    }
  }, [documentId, documentStore]);

  useWillUnmount(() => {
    documentStore.clearDetail();
  });

  const activeTree = documentStore.tree?.activeTree;

  const filteredTreeChildren = useMemo(() => {
    if (!activeTree || !activeTree.children) return [];
    if (!searchQuery) return activeTree.children;

    const filterDocumentTree = (nodes: any[], query: string): any[] => {
      const lowerQuery = query.toLowerCase();
      return nodes
        .map((node) => {
          const matchesName = node.name.toLowerCase().includes(lowerQuery);
          let filteredChildren: any[] = [];
          if (node.children && node.children.length > 0) {
            filteredChildren = filterDocumentTree(node.children, query);
          }

          if (matchesName || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter(Boolean);
    };

    return filterDocumentTree(activeTree.children, searchQuery);
  }, [activeTree, searchQuery]);

  const doc = documentStore.document;

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]" data-testid="document-detail">
      {/* Left Sidebar: Document Directory */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-white border border-outline-variant rounded-lg overflow-hidden">
        <div className="p-4 border-b border-surface-container-low flex justify-between items-center bg-surface-container-lowest">
          <h2 className="font-headline-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">folder_copy</span>
            Directory
          </h2>
        </div>
        <div className="p-4 border-b border-surface-container-low bg-surface-container-lowest">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Filter documents..."
              type="text"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 bg-surface-container-lowest">
          {documentStore.loadingList ? (
            <div className="flex justify-center p-4">
              <span className="material-symbols-outlined animate-spin text-outline">refresh</span>
            </div>
          ) : filteredTreeChildren.length > 0 ? (
            <div>
              {filteredTreeChildren.map((node: any) => (
                <DocumentTreeNodeView key={node.id} node={node} documents={documentStore.documents} currentDocId={documentId} level={0} />
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-outline text-body-sm">{t("noDocuments" as any)}</div>
          )}
        </div>
      </div>

      {/* Right Content Area: Detail */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border border-outline-variant rounded-lg overflow-hidden">
        {!documentId || documentId === "root" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-outline">
            <span className="material-symbols-outlined text-4xl mb-2">description</span>
            <p className="text-body-lg">{t("selectDocument")}</p>
          </div>
        ) : documentStore.loadingDetail ? (
          <div className="flex-1 flex justify-center items-center">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
          </div>
        ) : doc.id ? (
          <div ref={contentRef} className="flex-1 overflow-y-auto bg-white">
            {/* Header */}
            <div className="p-6 border-b border-surface-container-low bg-surface-container-lowest">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {doc.emoji && <span className="text-2xl">{doc.emoji}</span>}
                  <h1 className="text-2xl font-bold text-on-surface leading-tight">{doc.title}</h1>
                </div>
                <ExportButtons
                  disabled={!doc.id}
                  onExportMarkdown={() => downloadDocumentMarkdown(doc, documentStore.comments)}
                  onExportPdf={async () => {
                    if (!contentRef.current) {
                      return;
                    }
                    await exportElementToPdf({
                      element: contentRef.current,
                      filename: doc.title ?? "document",
                    });
                  }}
                />
              </div>

              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {doc.tags.map((tag: any) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 bg-surface-container border border-outline-variant rounded text-xs font-medium text-on-surface"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <img
                  alt={doc.createdUser?.name}
                  src={`/assets/users/${doc.createdUser?.id}/icon`}
                  className="w-8 h-8 rounded-full object-cover bg-surface-variant border border-outline-variant"
                />
                <div>
                  <p className="text-body-sm font-bold text-on-surface">{doc.createdUser?.name}</p>
                  <p className="text-xs text-outline">
                    作成日: {dayjs(doc.created).format("YYYY/MM/DD HH:mm:ss")}
                    {doc.updatedUser && ` / 更新日: ${dayjs(doc.updated).format("YYYY/MM/DD HH:mm:ss")}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Tiptap Editor Content */}
            <div className="p-8 bg-white min-h-[400px]">
              <TiptapViewer content={doc.json || ""} docId={documentId} />
            </div>

            {/* Attachments */}
            {doc.attachments && doc.attachments.length > 0 && (
              <div className="px-6 py-4 border-t border-surface-container-low bg-surface-container-lowest export-exclude">
                <h3 className="text-body-md font-bold text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">attach_file</span>
                  {t("attachment")} ({doc.attachments.length})
                </h3>
                <div className="border border-outline-variant rounded bg-white divide-y divide-outline-variant">
                  {doc.attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-outline">description</span>
                        <a
                          href={`/assets/documents/${documentId}/attachments/${attachment.id}`}
                          download={attachment.name}
                          className="text-primary hover:underline text-body-sm font-medium"
                        >
                          {attachment.name}
                        </a>
                      </div>
                      <span className="text-xs text-outline font-mono">{(attachment.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {documentStore.comments.length > 0 && (
              <div className="px-6 py-6 border-t border-surface-container-low bg-surface-container-lowest">
                <h3 className="text-body-md font-bold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">forum</span>
                  コメント ({documentStore.comments.length})
                </h3>
                <div className="space-y-4">
                  {documentStore.comments.map((comment: any, index: number) => (
                    <div key={comment.id}>
                      <DocumentCommentItem comment={comment} docId={documentId} />
                      {index < documentStore.comments.length - 1 && <hr className="border-outline-variant my-4" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-error">
            <span className="material-symbols-outlined text-4xl mb-2">error</span>
            <p className="text-body-lg">ドキュメントの読み込みに失敗しました</p>
          </div>
        )}
      </div>
    </div>
  );
});
