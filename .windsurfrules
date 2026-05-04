# backlogup コーディング規約
# マスター: docs/coding-standards.md — 規約変更時はマスターを先に更新すること

## プロジェクト概要
- 名前: backlogup（Backlog プロジェクトのビューア/バックアップツール）
- 言語: TypeScript (strict mode)
- フレームワーク: React 19 + MobX + Tailwind CSS
- ビルド: Vite 8
- フォーマッター/リンター: Biome
- スクリプト実行: tsx

## TypeScript
- strict: true 前提。any 禁止（やむを得ない場合はコメントで理由記載）
- 型定義は backlog-js の Entity 型を活用。独自型は viewer/@types/ に配置
- 型のみのインポートには import type を使用

## フォーマット（Biome 設定準拠）
- インデント: スペース 2 つ
- 行幅上限: 140 文字
- セミコロン: あり
- クォート: ダブルクォート
- 末尾カンマ: あり

## React コンポーネント
- 関数コンポーネント (React.FC) のみ使用
- MobX を使うコンポーネントは observer() でラップ
- ライフサイクルは @better-hooks/lifecycle の useDidMount / useWillUnmount
- Props は interface で定義し、同ファイルに配置
- UI のスタイリングには Tailwind CSS を使用

## MobX ストア
- makeAutoObservable(this) をコンストラクタで呼ぶ
- RootStore パターン。新ストアは viewer/stores/index.ts に登録
- 非同期は async/await + loading* 状態管理
- try/finally でローディングフラグをリセット

## ディレクトリ構成
- viewer/@types/ — 型定義 (.d.ts)
- viewer/components/ — 再利用可能 UI コンポーネント
- viewer/containers/ — ページレベルコンテナ
- viewer/stores/ — MobX ストア
- scripts/backlog/ — Backlog API データ取得
- scripts/textsearch/ — テキスト検索インデックス生成

## 命名規則
- ファイル: camelCase (userHeader.tsx, wiki.ts)
- コンポーネント名: PascalCase (UserHeader)
- ストアクラス: PascalCase + Store (WikiStore)
- 変数・関数: camelCase
- 型・インターフェース: PascalCase

## インポート順序
1. React / 外部ライブラリ (react, mobx, @mui/*)
2. プロジェクト内ストア (../stores)
3. プロジェクト内コンポーネント (../components)
4. 型定義 (import type)

## エラーハンドリング
- API 呼び出しは try/finally で囲む
- ユーザー向けエラーメッセージは日本語
- console.log は開発時のみ許容

## ライブラリ使用規約
- 日付: dayjs（Date 直接操作禁止）。表示: YYYY/MM/DD HH:mm:ss
- ルーティング: react-router-dom v6。遷移は <Link>
- Markdown: react-markdown + remark-gfm
- シンタックスハイライト: react-syntax-highlighter (Prism, oneLight)

## スクリプト
- scripts/ 配下は .mts 拡張子、tsx で実行
- 環境変数は dotenv で .env から読み込み

## 禁止事項
- node_modules / dist の手動編集禁止
- package.json 依存変更時は理由明記
- Biome 設定をチーム合意なしに変更しない
- viewer/ 内にサーバーサイドロジックを書かない
- .env をコミットしない
