import React from "react";
import { useStore } from "../stores";
import { useDidMount, useWillUnmount } from "@better-hooks/lifecycle";
import { observer } from "mobx-react-lite";
import dayjs from "dayjs";
import { Link, useParams } from "react-router-dom";
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
} from "@mui/material";
import { AttachFile } from "@mui/icons-material";
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
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: "#fafafa" }}>
                <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "monospace",
                        m: 0,
                    }}
                >
                    {displayText}
                </Typography>
            </Paper>
        );
    }

    return (
        <Box
            className="markdown-body"
            sx={{
                "& .ProseMirror": {
                    outline: "none",
                    "& table": {
                        borderCollapse: "collapse",
                        width: "100%",
                        "& th, & td": {
                            border: "1px solid #e4e4e4",
                            padding: "8px",
                        },
                        "& th": {
                            backgroundColor: "#f5f5f5",
                            fontWeight: "bold",
                        },
                    },
                    "& img": {
                        maxWidth: "100%",
                    },
                    "& ul[data-type='taskList']": {
                        listStyle: "none",
                        padding: 0,
                        "& li": {
                            display: "flex",
                            alignItems: "flex-start",
                            "& label": {
                                marginRight: 8,
                            },
                        },
                    },
                },
            }}
        >
            <EditorContent editor={editor} />
        </Box>
    );
};

interface DocumentCommentItemProps {
    comment: BacklogDocumentComment;
}

const DocumentCommentItem: React.FC<DocumentCommentItemProps> = ({
    comment,
}) => {
    return (
        <Box>
            <Box display="flex" alignItems="center" mb={1}>
                <Avatar
                    alt={comment.createdUser?.name}
                    src={`/assets/users/${comment.createdUser?.id}/icon`}
                    sx={{ width: 28, height: 28, fontSize: 12, mr: 1 }}
                />
                <Typography variant="body2" fontWeight="bold">
                    {comment.createdUser?.name}
                </Typography>
                <Typography variant="caption" sx={{ ml: 1 }}>
                    {dayjs(comment.created).format("YYYY/MM/DD HH:mm:ss")}
                </Typography>
            </Box>
            <Box ml="40px" mb={1}>
                <TiptapViewer content={comment.content} />
            </Box>
            {comment.replies && comment.replies.length > 0 && (
                <Box ml="40px">
                    {comment.replies.map((reply) => (
                        <Box
                            key={reply.id}
                            sx={{
                                borderLeft: "3px solid #e0e0e0",
                                pl: 2,
                                ml: 1,
                                mb: 1,
                            }}
                        >
                            <Box display="flex" alignItems="center" mb={0.5}>
                                <Avatar
                                    alt={reply.createdUser?.name}
                                    src={`/assets/users/${reply.createdUser?.id}/icon`}
                                    sx={{ width: 24, height: 24, fontSize: 10, mr: 0.5 }}
                                />
                                <Typography variant="body2" fontWeight="bold">
                                    {reply.createdUser?.name}
                                </Typography>
                                <Typography variant="caption" sx={{ ml: 1 }}>
                                    {dayjs(reply.created).format("YYYY/MM/DD HH:mm:ss")}
                                </Typography>
                            </Box>
                            <TiptapViewer content={reply.content} />
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export const Document: React.FC = observer(() => {
    const { documentStore } = useStore();
    const { id: documentId } = useParams();

    useDidMount(() => {
        documentStore.fetchDetail(documentId);
    });

    useWillUnmount(() => {
        documentStore.clearDetail();
    });

    if (documentStore.loadingDetail) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    const doc = documentStore.document;

    return (
        <Box
            p={4}
            style={{ backgroundColor: "#f0f0f0", minHeight: "100vh" }}
            data-testid="document-detail"
        >
            🔙 <Link to="/">リストに戻る</Link>
            <Box my={2}>
                <Divider />
            </Box>

            <Box display="flex" alignItems="center" mb={1}>
                {doc.emoji && (
                    <Typography variant="h5" sx={{ mr: 1 }}>
                        {doc.emoji}
                    </Typography>
                )}
                <Typography variant="h5" fontWeight="bold">
                    {doc.title}
                </Typography>
            </Box>

            {doc.tags && doc.tags.length > 0 && (
                <Box mb={2}>
                    {doc.tags.map((tag) => (
                        <Chip key={tag.id} label={tag.name} size="small" sx={{ mr: 0.5 }} />
                    ))}
                </Box>
            )}

            <Box>
                <Card variant="outlined">
                    <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                            <Avatar
                                alt={doc.createdUser?.name}
                                src={`/assets/users/${doc.createdUser?.id}/icon`}
                                sx={{ width: 32, height: 32, fontSize: 14, mr: 1 }}
                            />
                            <Box>
                                <Typography variant="body2" fontWeight="bold">
                                    {doc.createdUser?.name}
                                </Typography>
                                <Typography variant="caption">
                                    作成日:{" "}
                                    {dayjs(doc.created).format("YYYY/MM/DD HH:mm:ss")}
                                    {doc.updatedUser && (
                                        <>
                                            {" "}
                                            / 更新日:{" "}
                                            {dayjs(doc.updated).format("YYYY/MM/DD HH:mm:ss")}
                                        </>
                                    )}
                                </Typography>
                            </Box>
                        </Box>

                        <TiptapViewer content={doc.json || ""} />
                    </CardContent>
                </Card>
            </Box>

            {doc.attachments && doc.attachments.length > 0 && (
                <Box mt={3}>
                    <Typography variant="body1" fontWeight="bold">
                        添付ファイル ({doc.attachments.length})
                    </Typography>
                    <Paper variant="outlined" sx={{ mt: 1 }}>
                        <List dense disablePadding>
                            {doc.attachments.map((attachment, index) => (
                                <ListItem
                                    key={attachment.id}
                                    divider={index < doc.attachments.length - 1}
                                >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <AttachFile fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <a
                                                href={`/assets/documents/${documentId}/attachments/${attachment.id}`}
                                                download={attachment.name}
                                            >
                                                {attachment.name}
                                            </a>
                                        }
                                        secondary={`${(attachment.size / 1024).toFixed(1)} KB`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Box>
            )}

            {documentStore.comments.length > 0 && (
                <Box mt={5}>
                    <Typography variant="body1" fontWeight="bold">
                        コメント ({documentStore.comments.length})
                    </Typography>
                    <Box mt={1}>
                        <Card variant="outlined">
                            <CardContent>
                                {documentStore.comments.map((comment, index) => (
                                    <Box key={comment.id}>
                                        <DocumentCommentItem comment={comment} />
                                        {index < documentStore.comments.length - 1 && (
                                            <Box my={2}>
                                                <Divider />
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            )}
        </Box>
    );
});
