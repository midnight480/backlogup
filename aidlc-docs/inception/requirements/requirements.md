# Requirements Document

## Intent Analysis Summary
- **User Request**: Backlog APIを使ってWikiとドキュメントを追加で取得・表示する機能を作成。読み取り専用。WikiはMarkupライブラリベース、ドキュメントはTiptap/ProseMirrorベース。
- **Request Type**: New Feature (既存アプリケーションへの機能追加)
- **Scope Estimate**: Multiple Components (バックアップスクリプト + ビューア + ストア + ルーティング)
- **Complexity Estimate**: Moderate (複数API統合、2つの描画エンジン、ツリー構造表示)

---

## Functional Requirements

### FR-1: Wikiバックアップスクリプト
- **FR-1.1**: Backlog APIからWikiページ一覧を取得する (`GET /api/v2/wikis`)
- **FR-1.2**: 各Wikiページの詳細（content含む）を取得する (`GET /api/v2/wikis/:wikiId`)
- **FR-1.3**: Wikiページ数を取得する (`GET /api/v2/wikis/count`)
- **FR-1.4**: Wikiタグ一覧を取得する (`GET /api/v2/wikis/tags`)
- **FR-1.5**: 各Wikiページのスター情報を取得する (`GET /api/v2/wikis/:wikiId/stars`)
- **FR-1.6**: Wiki添付ファイルのメタデータのみ保存する（ファイル本体はダウンロードしない）
- **FR-1.7**: プロジェクトのtextFormattingRuleを保存する（Wiki描画方式の判定に使用）
- **FR-1.8**: レートリミットを考慮してsleepAsyncを挟む（既存パターンに準拠）

### FR-2: ドキュメントバックアップスクリプト
- **FR-2.1**: Backlog APIからドキュメント一覧を取得する (`GET /api/v2/documents`)
- **FR-2.2**: 各ドキュメントの詳細を取得する (`GET /api/v2/documents/:documentId`)
- **FR-2.3**: ドキュメントツリー構造を取得する (`GET /api/v2/documents/tree`)
- **FR-2.4**: 各ドキュメントのコメント（返信含む）を取得する (`GET /api/v2/documents/:documentId/comments`)
- **FR-2.5**: ドキュメント添付ファイルのメタデータのみ保存する（ファイル本体はダウンロードしない）
- **FR-2.6**: backlog-jsにDocument APIメソッドがないため、直接REST API呼び出しを実装する
- **FR-2.7**: レートリミットを考慮してsleepAsyncを挟む

### FR-3: ビューア — ナビゲーション
- **FR-3.1**: 課題一覧ページにタブを追加して「課題」「Wiki」「ドキュメント」を切り替え可能にする
- **FR-3.2**: ルートページ（/）は既存通り課題一覧にリダイレクト
- **FR-3.3**: Wiki詳細ページのルート追加 (`/wikis/:id`)
- **FR-3.4**: ドキュメント詳細ページのルート追加 (`/documents/:id`)

### FR-4: ビューア — Wiki一覧・詳細表示
- **FR-4.1**: Wiki一覧をリスト形式で表示する（名前、タグ、作成者、更新日）
- **FR-4.2**: Wiki詳細ページでcontentを描画する
- **FR-4.3**: textFormattingRuleがMarkdownの場合、react-markdown + remark-gfmで描画する
- **FR-4.4**: textFormattingRuleがBacklog記法の場合、プレーンテキストとして表示する（フォールバック）
- **FR-4.5**: Wiki添付ファイルのメタデータ（ファイル名・サイズ）を表示する
- **FR-4.6**: Wikiタグをチップ形式で表示する
- **FR-4.7**: スター情報を表示する
- **FR-4.8**: 読み取り専用（編集機能なし）

### FR-5: ビューア — ドキュメント一覧・詳細表示
- **FR-5.1**: ドキュメント一覧をツリー構造（サイドバー/ツリービュー）で表示する
- **FR-5.2**: ドキュメント詳細ページでjsonフィールドをTiptap（ProseMirror）エディタで読み取り専用表示する
- **FR-5.3**: Tiptapエディタはeditable: falseで初期化し、書き換え不可にする
- **FR-5.4**: ドキュメントのコメント（返信含む）を表示する
- **FR-5.5**: コメントのcontent（ProseMirror JSON）もTiptapで読み取り専用描画する
- **FR-5.6**: ドキュメント添付ファイルのメタデータ（ファイル名・サイズ）を表示する
- **FR-5.7**: ドキュメントのemoji、タグを表示する
- **FR-5.8**: 読み取り専用（編集機能なし）

### FR-6: MobXストア
- **FR-6.1**: WikiStore — Wiki一覧・詳細・タグデータの管理
- **FR-6.2**: DocumentStore — ドキュメント一覧・詳細・ツリー・コメントデータの管理
- **FR-6.3**: RootStoreにWikiStoreとDocumentStoreを追加

---

## Non-Functional Requirements

### NFR-1: 既存パターンへの準拠
- 既存のコードスタイル、ディレクトリ構造、状態管理パターンに準拠する
- MobX + observer パターンを使用する
- MUI v5コンポーネントを使用する

### NFR-2: パフォーマンス
- バックアップスクリプトはレートリミットを考慮したsleepAsyncを使用する
- ビューアはローカルJSONからの読み込みのため、パフォーマンス問題は最小限

### NFR-3: 新規依存関係
- **@tiptap/react** — TiptapのReactバインディング
- **@tiptap/starter-kit** — 基本的なTiptap拡張セット
- **@tiptap/pm** — ProseMirrorコア（Tiptap経由）
- backlog-jsの既存バージョンを使用（Wiki API対応済み）
- Document APIはbacklog-jsに未実装のため、fetch APIで直接呼び出し

### NFR-4: 読み取り専用
- Wiki・ドキュメントともに読み取り専用とし、書き換え機能は一切実装しない
- Tiptapエディタはeditable: falseで初期化

---

## Technical Decisions
1. **Wiki描画**: textFormattingRuleに基づくフォールバック方式（Markdown→react-markdown、Backlog記法→プレーンテキスト）
2. **ドキュメント描画**: Tiptap/ProseMirror（読み取り専用モード）でjsonフィールドを描画
3. **Document API**: backlog-jsに未実装のため、直接REST API呼び出し（fetch + apiKey認証）
4. **データフロー**: 既存パターン（バックアップスクリプト→ローカルJSON→ビューア）
5. **ナビゲーション**: 課題一覧ページにタブ追加（課題/Wiki/ドキュメント）

---

## Data Storage Structure (追加分)

```
scripts/backlog/dist/assets/
├── configs/
│   ├── project.json          # プロジェクト情報（textFormattingRule含む）
│   └── wiki-tags.json         # Wikiタグ一覧
├── wikis/
│   ├── list.json              # Wiki一覧
│   └── {wikiId}/
│       ├── wiki.json          # Wiki詳細（content含む）
│       └── stars.json         # スター情報
├── documents/
│   ├── tree.json              # ドキュメントツリー構造
│   ├── list.json              # ドキュメント一覧
│   └── {documentId}/
│       ├── document.json      # ドキュメント詳細（json含む）
│       └── comments.json      # コメント（返信含む）
```
