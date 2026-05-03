---
inclusion: always
---

# コーディング規約・品質基準

> マスター: `docs/coding-standards.md` — 規約変更時はマスターを先に更新すること

このプロジェクトで開発を行うすべてのエージェント・開発者が従うべき基準を定義する。

## プロジェクト概要

- **名前**: backlogup（Backlog プロジェクトのビューア/バックアップツール）
- **言語**: TypeScript (strict mode)
- **フレームワーク**: React 18 + MobX + MUI v5
- **ビルド**: Vite 4
- **フォーマッター/リンター**: Rome (Biome の前身)
- **スクリプト実行**: tsx

## TypeScript ルール

- `strict: true` を前提とする。`any` の使用は原則禁止。やむを得ない場合はコメントで理由を記載する。
- 型定義は `backlog-js` の Entity 型を活用する。独自型は `viewer/@types/` に配置する。
- `import type` を型のみのインポートに使用する。

## フォーマット規約

Rome の設定に従う:

- インデント: スペース 2 つ
- 行幅上限: 140 文字
- セミコロン: あり
- クォート: ダブルクォート
- 末尾カンマ: あり

## React コンポーネント規約

- 関数コンポーネント (`React.FC`) を使用する。クラスコンポーネントは使わない。
- MobX を使うコンポーネントは `observer()` でラップする。
- ライフサイクルフックは `@better-hooks/lifecycle` の `useDidMount` / `useWillUnmount` を使用する。
- Props の型は `interface` で定義し、コンポーネントと同じファイルに置く。
- UI コンポーネントは MUI を使用する。独自 CSS は最小限にする。

## ストア (MobX) 規約

- ストアクラスは `makeAutoObservable(this)` をコンストラクタで呼ぶ。
- RootStore パターンに従い、新しいストアは `viewer/stores/index.ts` に登録する。
- 非同期処理は `async/await` を使い、ローディング状態 (`loading*`) を管理する。
- `try/finally` でローディングフラグを確実にリセットする。

## ディレクトリ構成

```
viewer/
├── @types/          # 型定義ファイル (.d.ts)
├── components/      # 再利用可能な UI コンポーネント
├── containers/      # ページレベルのコンテナコンポーネント
├── stores/          # MobX ストア
├── index.html       # エントリ HTML
└── index.tsx        # アプリケーションエントリポイント

scripts/
├── backlog/         # Backlog API からのデータ取得スクリプト
└── textsearch/      # テキスト検索インデックス生成スクリプト
```

## 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル (コンポーネント) | camelCase | `userHeader.tsx` |
| ファイル (ストア) | camelCase | `wiki.ts` |
| コンポーネント名 | PascalCase | `UserHeader` |
| ストアクラス | PascalCase + Store | `WikiStore` |
| 変数・関数 | camelCase | `fetchDetail` |
| 型・インターフェース | PascalCase | `Props` |
| 定数 | camelCase (既存に合わせる) | `textFormattingRule` |

## インポート順序

1. React / ライブラリ (`react`, `mobx`, `@mui/*`, etc.)
2. プロジェクト内ストア (`../stores`)
3. プロジェクト内コンポーネント (`../components`)
4. 型定義 (`import type`)

## エラーハンドリング

- API 呼び出しは `try/finally` (または `try/catch/finally`) で囲む。
- ユーザーに見せるエラーメッセージは日本語で記述する。
- `console.log` は開発時のみ許容（Rome の `noConsoleLog: off` 設定に準拠）。

## 日付処理

- `dayjs` を使用する。`Date` オブジェクトの直接操作は避ける。
- 表示フォーマット: `YYYY/MM/DD HH:mm:ss`

## ルーティング

- `react-router-dom` v6 を使用する。
- ページ遷移は `<Link>` コンポーネントを使う。

## Markdown レンダリング

- `react-markdown` + `remark-gfm` を使用する。
- コードブロックのシンタックスハイライトは `react-syntax-highlighter` (Prism, oneLight テーマ) を使う。

## スクリプト (.mts ファイル)

- `scripts/` 配下のスクリプトは `.mts` 拡張子を使用する。
- 実行は `tsx` コマンドで行う。
- 環境変数は `dotenv` で `.env` から読み込む。

## Git コミット

- コミットメッセージは日本語可。変更内容を簡潔に記述する。
- `.env` ファイルはコミットしない（`.gitignore` に含まれている）。

## やってはいけないこと

- `node_modules` や `dist` 配下のファイルを手動で編集しない。
- `package.json` の依存関係を変更する場合は理由を明記する。
- 既存の Rome 設定を変更しない（チーム合意なしに）。
- `viewer/` 内でサーバーサイドのロジックを書かない。
