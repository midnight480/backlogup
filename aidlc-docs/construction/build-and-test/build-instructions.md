# Build Instructions

## Prerequisites
- **Build Tool**: Vite v4.3.9 + TypeScript v5.1.5
- **Runtime**: Node.js (v18+推奨)
- **Dependencies**: npm install 済み
- **Environment Variables**: `.env` ファイル（sample.envを参照）
  - `BACKLOG_HOST` — Backlogドメイン
  - `BACKLOG_API_KEY` — Backlog APIキー
  - `BACKLOG_PROJECT_KEY` — Backlogプロジェクトキー

## Build Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp sample.env .env
# .env ファイルを編集して実際の値を設定
```

### 3. Run Backup Script (データ取得)
```bash
npm run backup
```
これにより以下が実行されます:
- `scripts/backlog/index.mts` — 課題・Wiki・ドキュメントのバックアップ
- `scripts/textsearch/index.mts` — 検索インデックス生成

### 4. Build Viewer (SPA)
```bash
npm run build
```

### 5. Verify Build Success
- **Expected Output**: `✓ built in Xs` メッセージ
- **Build Artifacts**: `dist/` ディレクトリ
  - `dist/index.html`
  - `dist/assets/index-*.css`
  - `dist/assets/index-*.js`
  - `dist/assets/vendor-*.js`
- **Known Warnings**: 
  - flexsearch の eval 使用警告（既存、無害）
  - vendor chunk サイズ警告（Tiptap追加により増加、動作に影響なし）

## Troubleshooting

### Build Fails with Module Not Found
- **Cause**: Tiptap依存関係が未インストール
- **Solution**: `npm install` を再実行

### Backup Script Fails with API Error
- **Cause**: 環境変数の設定不備、APIキーの権限不足
- **Solution**: `.env` ファイルの値を確認、Backlog管理画面でAPIキーの権限を確認
