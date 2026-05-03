# BacklogUp

> Fork 元: [common-creation/backlogup](https://github.com/common-creation/backlogup)

## これはなに

Backlog API を叩いて、指定したプロジェクトのデータをバックアップします。  
バックアップしたデータは簡易ビューアで閲覧できます。

![](https://i.imgur.com/CWX1wbL.png)
![](https://i.imgur.com/ylTYYPW.png)

## バックアップ対象

| 対象 | 内容 |
|------|------|
| 課題 (Issues) | 課題本体、コメント、添付ファイル |
| Wiki | Wiki ページ、スター、添付ファイル、タグ |
| ドキュメント (Documents) | ドキュメント本体、ツリー構造、コメント、添付ファイル |
| プロジェクト設定 | 課題種別、カテゴリ、マイルストーン、メンバー一覧 |
| ユーザー | アイコン画像 |

## バックアップの取り方

1. `sample.env` を `.env` にコピー
2. `.env` のコメント通りに必要事項を入力する
   - `BACKLOG_HOST` — Backlog のドメイン（例: `xxx.backlog.com`）
   - `BACKLOG_API_KEY` — API キー（個人設定 → API から取得）
   - `BACKLOG_PROJECT_KEY` — プロジェクトキー
3. `npm run backup` でバックアップを開始する

※ Backlog プロジェクトの規模によっては、バックアップに時間がかかります。

## 簡易ビューアのビルド

```bash
npm run build
```

`dist` ディレクトリに、バックアップデータも含めてアセット一式が保存されます。

## 開発

```bash
# 依存インストール
npm install

# 開発サーバー起動
npx vite --open
```

## AI エージェント向けコーディング規約

各 AI IDE が自動で読み込むルールファイルを配置しています。

| IDE | ファイル | 読み込み |
|-----|---------|---------|
| Kiro | `.kiro/steering/coding-standards.md` | 自動 |
| Cursor | `.cursorrules` | 自動 |
| GitHub Copilot | `.github/copilot-instructions.md` | 自動 |
| Cline | `.clinerules` | 自動 |
| Windsurf | `.windsurfrules` | 自動 |
| Google Antigravity | — | 手動設定が必要 |

マスタードキュメント: [`docs/coding-standards.md`](docs/coding-standards.md)

### Antigravity での設定方法

Google Antigravity はファイルベースのルール自動読み込みに未対応のため、手動で Knowledge に登録する必要があります。

1. Antigravity を開く
2. 設定 → Knowledge を開く
3. `docs/coding-standards.md` の内容を Knowledge として追加する

## ライセンス

MIT License
