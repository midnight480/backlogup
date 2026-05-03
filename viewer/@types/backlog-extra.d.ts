/**
 * Backlog Document API 型定義
 * backlog-jsに未実装のDocument APIのレスポンス型を定義
 */

interface BacklogDocumentAttachment {
    id: number;
    name: string;
    size: number;
    createdUser: {
        id: number;
        userId: string;
        name: string;
        roleType: number;
        lang: string;
        mailAddress: string;
        nulabAccount?: {
            nulabId: string;
            name: string;
            uniqueId: string;
            iconUrl?: string;
        } | null;
        keyword?: string;
        lastLoginTime?: string;
    };
    created: string;
}

interface BacklogDocumentTag {
    id: number;
    name: string;
}

interface BacklogDocumentUser {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: string | null;
    mailAddress: string;
    nulabAccount?: {
        nulabId: string;
        name: string;
        uniqueId: string;
        iconUrl?: string;
    } | null;
    keyword?: string;
    lastLoginTime?: string;
    icon?: string;
}

interface BacklogDocument {
    id: string;
    projectId: number;
    title: string;
    plain: string;
    json: Record<string, unknown> | string | null;
    statusId: number;
    emoji: string | null;
    attachments: BacklogDocumentAttachment[];
    tags: BacklogDocumentTag[];
    createdUser: BacklogDocumentUser;
    created: string;
    updatedUser: BacklogDocumentUser;
    updated: string;
}

interface BacklogDocumentTreeNode {
    id: string;
    name: string;
    children: BacklogDocumentTreeNode[];
    emoji?: string;
}

interface BacklogDocumentTree {
    projectId: number;
    activeTree: {
        id: string;
        children: BacklogDocumentTreeNode[];
    };
    trashTree: {
        id: string;
        children: BacklogDocumentTreeNode[];
    };
}

interface BacklogDocumentCommentReply {
    id: string;
    documentId: string;
    commentId: string;
    content: string;
    plain: string;
    createdUserId: number;
    created: string;
    updatedUserId: number;
    updated: string;
    createdUser: BacklogDocumentUser;
}

interface BacklogDocumentComment {
    id: string;
    documentId: string;
    statusId: number;
    content: string;
    plain: string;
    commentType: string;
    createdUserId: number;
    created: string;
    updatedUserId: number;
    updated: string;
    createdUser: BacklogDocumentUser;
    replies: BacklogDocumentCommentReply[];
}
