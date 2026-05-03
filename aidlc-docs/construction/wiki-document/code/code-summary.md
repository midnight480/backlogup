# Code Summary: Wiki & Document Feature

## Modified Files
- **scripts/backlog/index.mts** — Wiki/ドキュメントバックアップ処理追加、Document API直接呼び出しヘルパー追加、プロジェクト情報保存追加
- **viewer/stores/index.ts** — WikiStore, DocumentStoreをRootStoreに追加
- **viewer/containers/issues.tsx** — IssueListコンポーネントに分離、MUI Tabsによるタブナビゲーション追加（課題/Wiki/ドキュメント）
- **viewer/index.tsx** — Wiki詳細(/wikis/:id)、ドキュメント詳細(/documents/:id)ルート追加

## Created Files
- **viewer/@types/backlog-extra.d.ts** — BacklogDocument, BacklogDocumentTree, BacklogDocumentComment等の型定義
- **viewer/stores/wiki.ts** — WikiStore（一覧、詳細、タグ、スター、textFormattingRule管理）
- **viewer/stores/document.ts** — DocumentStore（一覧、詳細、ツリー、コメント管理）
- **viewer/containers/wikis.tsx** — Wiki一覧コンテナ（リスト形式、タグ・作成者・更新日表示）
- **viewer/containers/wiki.tsx** — Wiki詳細コンテナ（Markdown/プレーンテキスト描画、タグ・スター・添付ファイル表示）
- **viewer/containers/documents.tsx** — ドキュメント一覧コンテナ（ツリー構造表示、フォルダ展開/折りたたみ）
- **viewer/containers/document.tsx** — ドキュメント詳細コンテナ（Tiptap読み取り専用描画、コメント・返信表示）

## Added Dependencies
- @tiptap/react, @tiptap/starter-kit, @tiptap/pm
- @tiptap/extension-document, @tiptap/extension-paragraph, @tiptap/extension-text
- @tiptap/extension-bold, @tiptap/extension-italic, @tiptap/extension-strike
- @tiptap/extension-code, @tiptap/extension-code-block, @tiptap/extension-heading
- @tiptap/extension-bullet-list, @tiptap/extension-ordered-list, @tiptap/extension-list-item
- @tiptap/extension-blockquote, @tiptap/extension-hard-break, @tiptap/extension-horizontal-rule
- @tiptap/extension-link, @tiptap/extension-image
- @tiptap/extension-task-list, @tiptap/extension-task-item
- @tiptap/extension-table, @tiptap/extension-table-row, @tiptap/extension-table-cell, @tiptap/extension-table-header

## Data Flow
```
Backlog API → scripts/backlog/index.mts → ローカルJSON
  ├── configs/project.json (textFormattingRule)
  ├── configs/wiki-tags.json
  ├── wikis/list.json, wikis/{id}/wiki.json, wikis/{id}/stars.json
  └── documents/tree.json, documents/list.json, documents/{id}/document.json, documents/{id}/comments.json

ローカルJSON → viewer stores → React containers
  ├── WikiStore → Wikis (一覧) / Wiki (詳細)
  └── DocumentStore → Documents (ツリー一覧) / Document (詳細)
```

## Build Status
- ✅ vite build 成功
