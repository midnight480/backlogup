/**
 * Backlog API 型定義
 * backlog-js 0.20.x で Document API が正式サポートされたため Entity 型を流用する。
 */
import type * as backlog from "backlog-js";

declare global {
  type BacklogDocument = backlog.Entity.Document.Document;
  type BacklogDocumentTag = backlog.Entity.Document.Tag;
  type BacklogDocumentTree = backlog.Entity.Document.DocumentTree;
  type BacklogDocumentTreeNode = backlog.Entity.Document.DocumentTreeNode;
  type BacklogDocumentComment = backlog.Entity.Document.DocumentComment;
  type BacklogDocumentCommentReply = backlog.Entity.Document.DocumentCommentReply;
  type BacklogDocumentUser = backlog.Entity.User.User;
  type BacklogDocumentAttachment = backlog.Entity.File.DocumentFileInfo;

  /**
   * 共有ファイル一覧 (shared-files/list.json) のエントリ。
   * バックアップ時に scripts/backlog/index.mts が出力する簡易メタ情報。
   */
  interface BacklogSharedFile {
    id: number;
    type: string;
    dir: string;
    name: string;
    size: number;
    updated: string;
  }
}
