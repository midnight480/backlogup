# Integration Test Instructions

## Purpose
バックアップスクリプトとビューアの統合動作を確認する。

## Test Scenarios

### Scenario 1: バックアップスクリプト → ビューア統合
- **Description**: バックアップスクリプトで生成されたJSONデータがビューアで正しく読み込まれることを確認
- **Setup**: `.env` ファイルに有効なBacklog認証情報を設定
- **Test Steps**:
  1. `npm run backup` を実行
  2. `scripts/backlog/dist/assets/` 以下にファイルが生成されることを確認
  3. `npx vite --host` で開発サーバーを起動
  4. ブラウザで各機能を確認
- **Expected Results**:
  - `configs/project.json` が生成される（textFormattingRule含む）
  - `configs/wiki-tags.json` が生成される
  - `wikis/list.json` が生成される
  - `wikis/{wikiId}/wiki.json` が各Wikiページ分生成される
  - `wikis/{wikiId}/stars.json` が各Wikiページ分生成される
  - `documents/tree.json` が生成される
  - `documents/list.json` が生成される
  - `documents/{documentId}/document.json` が各ドキュメント分生成される
  - `documents/{documentId}/comments.json` が各ドキュメント分生成される

### Scenario 2: Wiki描画方式の切り替え
- **Description**: textFormattingRuleに基づいてWikiの描画方式が正しく切り替わることを確認
- **Test Steps**:
  1. `configs/project.json` の `textFormattingRule` を確認
  2. `markdown` の場合: Wiki詳細ページでMarkdownが描画されることを確認
  3. `backlog` の場合: Wiki詳細ページでプレーンテキストが表示されることを確認

### Scenario 3: ドキュメントツリー構造
- **Description**: ドキュメントツリーがAPI応答と一致することを確認
- **Test Steps**:
  1. `documents/tree.json` の構造を確認
  2. ビューアのドキュメントタブでツリーが正しく表示されることを確認
  3. フォルダ展開/折りたたみが動作することを確認
  4. ドキュメントリンクが正しい詳細ページに遷移することを確認

### Scenario 4: ドキュメントコメント・返信
- **Description**: ドキュメントのコメントと返信が正しく表示されることを確認
- **Test Steps**:
  1. コメントのあるドキュメントの詳細ページを開く
  2. コメントが表示されることを確認
  3. 返信がインデント付きで表示されることを確認
  4. コメント内容がTiptapで読み取り専用描画されることを確認
