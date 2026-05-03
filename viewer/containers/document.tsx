import React, { useState, useMemo } from "react";
import { useStore } from "../stores";
import { useDidMount, useWillUnmount } from "@better-hooks/lifecycle";
import { observer } from "mobx-react-lite";
import dayjs from "dayjs";
import { Link, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table";
import { TableHeader } from "@tiptap/extension-table";

const tiptapExtensions = [
    StarterKit.configure({
        link: { openOnClick: false },
    }),
    Image,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
];

// Tiptapが認識するノードタイプ一覧
const knownNodeTypes = new Set([
    "doc", "paragraph", "text", "heading", "bulletList", "orderedList",
    "listItem", "blockquote", "codeBlock", "hardBreak", "horizontalRule",
    "image", "table", "tableRow", "tableCell", "tableHeader",
    "taskList", "taskItem",
]);

// Tiptapが認識するマークタイプ一覧
const knownMarkTypes = new Set([
    "bold", "italic", "strike", "code", "link", "underline",
    "textStyle", "highlight", "subscript", "superscript",
]);

/**
 * Backlog独自のノードタイプ（toc等）をparagraphに変換し、
 * 不明なマークを除去してTiptapがクラッシュしないようにする
 */
function sanitizeProseMirrorJson(node: Record<string, unknown>): Record<string, unknown> {
    if (!node || typeof node !== "object") return node;

    const nodeType = node.type as string;
    const sanitized = { ...node };

    // 不明なノードタイプをparagraphに変換
    if (nodeType && !knownNodeTypes.has(nodeType)) {
        sanitized.type = "paragraph";
    }

    // マークのフィルタリング
    if (Array.isArray(sanitized.marks)) {
        sanitized.marks = (sanitized.marks as Array<Record<string, unknown>>).filter(
            (mark) => knownMarkTypes.has(mark.type as string)
        );
        if ((sanitized.marks as unknown[]).length === 0) {
            delete sanitized.marks;
        }
    }

    // 子ノードの再帰処理
    if (Array.isArray(sanitized.content)) {
        sanitized.content = (sanitized.content as Array<Record<string, unknown>>).map(
            (child) => sanitizeProseMirrorJson(child)
        );
    }

    return sanitized;
}

interface TiptapViewerProps {
    content: string | Record<string, unknown> | null;
}

const TiptapViewer: React.FC<TiptapViewerProps> = ({ content }) => {
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

    const contentKey = typeof content === "string" ? content : JSON.stringify(content);

    const editor = useEditor(
        {
            extensions: tiptapExtensions,
            content: jsonContent ? sanitizeProseMirrorJson(jsonContent) : null,
            editable: false,
        },
        [contentKey]
    );

    if (!jsonContent) {
        const displayText = typeof content === "string" ? content : JSON.stringify(content, null, 2);
        return (
            <div className="p-4 bg-surface-container-low border border-outline-variant rounded-lg">
                <pre className="whitespace-pre-wrap break-words font-mono text-body-sm m-0 text-on-surface">
                    {displayText}
                </pre>
            </div>
        );
    }

    return (
        <div className="prose prose-sm max-w-none dark:prose-invert ProseMirror-container">
            <style>{`
                .ProseMirror-container .ProseMirror {
                    outline: none;
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
                .ProseMirror-container .ProseMirror img {
                    max-width: 100%;
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
}

const DocumentCommentItem: React.FC<DocumentCommentItemProps> = ({ comment }) => {
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
                <TiptapViewer content={comment.content} />
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
                            <TiptapViewer content={reply.content} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Tree Node
const DocumentTreeNodeView: React.FC<{ node: any; documents: any[]; currentDocId?: string; level?: number }> = ({ node, documents, currentDocId, level = 0 }) => {
    const [open, setOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const matchingDoc = documents.find((d: any) => d.id === node.id);
    const isCurrent = matchingDoc?.id?.toString() === currentDocId;

    const paddingLeftClass = "px-3";

    if (matchingDoc && hasChildren) {
        return (
            <div className={`mt-1 ${level > 0 ? "ml-4 border-l border-outline-variant" : ""}`}>
                <div 
                    className={`flex items-center gap-2 py-1.5 rounded-lg text-body-sm cursor-pointer ${paddingLeftClass} ${isCurrent ? 'text-primary bg-primary-fixed font-bold' : 'text-on-surface hover:bg-surface-container-low'}`}
                    onClick={() => setOpen(!open)}
                >
                    <span className="material-symbols-outlined text-sm">{open ? "folder_open" : "folder"}</span>
                    {matchingDoc.emoji && <span className="mr-0.5">{matchingDoc.emoji}</span>}
                    <span className="flex-1 truncate">{node.name}</span>
                    <Link to={`/documents/${matchingDoc.id}`} className="material-symbols-outlined text-sm hover:text-primary px-1" onClick={e => e.stopPropagation()}>description</Link>
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
                <Link to={`/documents/${matchingDoc.id}`} className={`flex items-center gap-2 py-1.5 cursor-pointer text-body-sm rounded-lg ${paddingLeftClass} ${isCurrent ? 'text-primary bg-primary-fixed font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'}`}>
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
    const { documentStore } = useStore();
    const { id: documentId } = useParams();

    useDidMount(() => {
        documentStore.fetch();
    });

    React.useEffect(() => {
        if (documentId && documentId !== 'root') {
            documentStore.fetchDetail(documentId);
        }
    }, [documentId, documentStore]);

    useWillUnmount(() => {
        documentStore.clearDetail();
    });

    const activeTree = documentStore.tree?.activeTree;
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
                <div className="flex-1 overflow-y-auto p-2 bg-surface-container-lowest">
                    {documentStore.loadingList ? (
                        <div className="flex justify-center p-4">
                            <span className="material-symbols-outlined animate-spin text-outline">refresh</span>
                        </div>
                    ) : activeTree && activeTree.children.length > 0 ? (
                        <div>
                            {activeTree.children.map((node: any) => (
                                <DocumentTreeNodeView key={node.id} node={node} documents={documentStore.documents} currentDocId={documentId} level={0} />
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-outline text-body-sm">
                            ドキュメントがありません
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content Area: Detail */}
            <div className="flex-1 flex flex-col min-w-0 bg-white border border-outline-variant rounded-lg overflow-hidden">
                {!documentId || documentId === 'root' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-4xl mb-2">description</span>
                        <p className="text-body-lg">ドキュメントを選択してください</p>
                    </div>
                ) : documentStore.loadingDetail ? (
                    <div className="flex-1 flex justify-center items-center">
                        <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
                    </div>
                ) : doc.id ? (
                    <div className="flex-1 overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 border-b border-surface-container-low bg-surface-container-lowest">
                            <div className="flex items-center gap-3 mb-4">
                                {doc.emoji && (
                                    <span className="text-2xl">{doc.emoji}</span>
                                )}
                                <h1 className="text-2xl font-bold text-on-surface leading-tight">
                                    {doc.title}
                                </h1>
                            </div>
                            
                            {doc.tags && doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {doc.tags.map((tag: any) => (
                                        <span key={tag.id} className="px-2 py-0.5 bg-surface-container border border-outline-variant rounded text-xs font-medium text-on-surface">
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
                            <TiptapViewer content={doc.json || ""} />
                        </div>

                        {/* Attachments */}
                        {doc.attachments && doc.attachments.length > 0 && (
                            <div className="px-6 py-4 border-t border-surface-container-low bg-surface-container-lowest">
                                <h3 className="text-body-md font-bold text-on-surface mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">attach_file</span>
                                    添付ファイル ({doc.attachments.length})
                                </h3>
                                <div className="border border-outline-variant rounded bg-white divide-y divide-outline-variant">
                                    {doc.attachments.map((attachment: any) => (
                                        <div key={attachment.id} className="flex items-center justify-between p-3 hover:bg-surface-container-low transition-colors">
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
                                            <span className="text-xs text-outline font-mono">
                                                {(attachment.size / 1024).toFixed(1)} KB
                                            </span>
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
                                            <DocumentCommentItem comment={comment} />
                                            {index < documentStore.comments.length - 1 && (
                                                <hr className="border-outline-variant my-4" />
                                            )}
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

