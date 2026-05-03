# Code Generation Plan: Wiki & Document Feature

## Unit Context
- **Unit Name**: wiki-document
- **Description**: Backlog Wiki・ドキュメントのバックアップスクリプト拡張とビューア表示機能追加
- **Dependencies**: backlog-js (Wiki API), Tiptap (ドキュメント描画), 既存MobX/React/MUI構成
- **Scope**: バックアップスクリプト拡張 + ビューアストア/コンテナ/ルーティング追加

---

## Step 1: Install New Dependencies
- [x] package.jsonに@tiptap/react, @tiptap/starter-kit, @tiptap/pm を追加
- [x] npm install 実行

## Step 2: Backup Script — Project Info & Wiki Backup
- [x] `scripts/backlog/index.mts` を修正:
  - プロジェクト情報（textFormattingRule含む）を `configs/project.json` に保存
  - Wikiタグ一覧を `configs/wiki-tags.json` に保存
  - Wiki一覧を `wikis/list.json` に保存
  - 各Wikiページ詳細を `wikis/{wikiId}/wiki.json` に保存
  - 各Wikiページのスター情報を `wikis/{wikiId}/stars.json` に保存

## Step 3: Backup Script — Document Backup
- [x] `scripts/backlog/index.mts` を修正:
  - Document API用のfetchヘルパー関数追加（backlog-js未対応のため直接REST呼び出し）
  - ドキュメントツリーを `documents/tree.json` に保存
  - ドキュメント一覧を `documents/list.json` に保存
  - 各ドキュメント詳細を `documents/{documentId}/document.json` に保存
  - 各ドキュメントのコメント（返信含む）を `documents/{documentId}/comments.json` に保存

## Step 4: Type Definitions
- [x] `viewer/@types/backlog-extra.d.ts` を新規作成:
  - Document型定義（id, projectId, title, plain, json, statusId, emoji, attachments, tags, createdUser, created, updatedUser, updated）
  - DocumentTreeNode型定義
  - DocumentTree型定義
  - DocumentComment型定義（replies含む）

## Step 5: MobX Stores
- [x] `viewer/stores/wiki.ts` を新規作成:
  - WikiStore（一覧、詳細、タグ、スター、textFormattingRule管理）
  - fetch(), fetchDetail(wikiId), fetchTags() メソッド
- [x] `viewer/stores/document.ts` を新規作成:
  - DocumentStore（一覧、詳細、ツリー、コメント管理）
  - fetch(), fetchDetail(documentId), fetchTree(), fetchComments(documentId) メソッド
- [x] `viewer/stores/index.ts` を修正:
  - WikiStore, DocumentStore をRootStoreに追加

## Step 6: Wiki List Container
- [x] `viewer/containers/wikis.tsx` を新規作成:
  - Wiki一覧表示（名前、タグ、作成者、更新日）
  - DataGridまたはList形式
  - Wiki詳細ページへのリンク

## Step 7: Wiki Detail Container
- [x] `viewer/containers/wiki.tsx` を新規作成:
  - Wiki詳細表示
  - textFormattingRuleに基づく描画（Markdown→react-markdown、Backlog記法→プレーンテキスト）
  - タグ表示（Chip）
  - スター情報表示
  - 添付ファイルメタデータ表示
  - 作成者・更新者情報表示

## Step 8: Document List Container with Tree
- [x] `viewer/containers/documents.tsx` を新規作成:
  - ドキュメントツリー構造表示（MUI TreeView or 再帰コンポーネント）
  - ドキュメント一覧表示
  - ドキュメント詳細ページへのリンク

## Step 9: Document Detail Container
- [x] `viewer/containers/document.tsx` を新規作成:
  - Tiptapエディタ（editable: false）でjsonフィールドを読み取り専用描画
  - コメント表示（返信含む、コメントcontentもTiptapで描画）
  - 添付ファイルメタデータ表示
  - emoji・タグ表示

## Step 10: Tab Navigation & Routing
- [x] `viewer/containers/issues.tsx` を修正:
  - MUI Tabsコンポーネント追加（課題/Wiki/ドキュメント）
  - タブ切り替えでコンテンツ切り替え
- [x] `viewer/containers/wikis.tsx` と `viewer/containers/documents.tsx` をタブ内に統合
- [x] `viewer/index.tsx` を修正:
  - `/wikis/:id` ルート追加（Wiki詳細）
  - `/documents/:id` ルート追加（ドキュメント詳細）

## Step 11: Code Summary Documentation
- [x] `aidlc-docs/construction/wiki-document/code/code-summary.md` を作成:
  - 変更ファイル一覧（修正/新規）
  - 追加した依存関係
  - データフロー概要

---

## Total Steps: 11
## Estimated Files:
- **Modified**: 3 (scripts/backlog/index.mts, viewer/stores/index.ts, viewer/index.tsx)
  - Note: issues.tsx はタブナビゲーション追加のため大幅変更
- **Created**: 8 (backlog-extra.d.ts, wiki.ts, document.ts, wikis.tsx, wiki.tsx, documents.tsx, document.tsx, code-summary.md)
- **Config**: 1 (package.json — 依存関係追加)
