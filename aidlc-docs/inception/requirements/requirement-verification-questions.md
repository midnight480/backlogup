# Requirements Verification Questions

以下の質問に回答してください。各質問の `[Answer]:` タグの後に選択肢の文字を記入してください。

## Question 1
Backlogプロジェクトの「テキスト整形のルール」はどれに設定されていますか？（Wikiのcontent解析方法に影響します）

A) Backlog独自記法
B) Markdown
C) GitHub Flavored Markdown (GFM)
D) プロジェクトによって異なる（複数対応が必要）
E) Other (please describe after [Answer]: tag below)

[Answer]:  D) プロジェクトによって異なる（複数対応が必要）  https://developer.nulab.com/docs/backlog/api/2/get-project/ で textFormattingRule にて、Backlog記法とMarkdown（現在はGFMはMarkdownに統合）を確認できます

## Question 2
「Markupライブラリ」について、具体的にどのライブラリを指していますか？nulab/backlog-markup-language のGitHubリポジトリは現在404で見つかりませんでした。

A) Backlog独自記法をHTMLに変換するNulab公開のライブラリ（具体的なnpmパッケージ名やGitHub URLを教えてください）
B) 既存プロジェクトで使用しているreact-markdown + remark-gfmの組み合わせで十分（Markdown/GFM形式の場合）
C) Backlog独自記法の場合は独自パーサーを実装する必要がある
D) Other (please describe after [Answer]: tag below)

[Answer]:  B) 既存プロジェクトで使用しているreact-markdown + remark-gfmの組み合わせで十分（Markdown/GFM形式の場合）

## Question 3
Wiki・ドキュメントのデータ取得方式は、既存の課題と同じ「バックアップスクリプトでローカルJSONに保存 → ビューアで静的ファイルとして読み込み」のパターンで良いですか？

A) はい、既存パターンと同じ（バックアップスクリプト → ローカルJSON → ビューア表示）
B) いいえ、ビューアからBacklog APIに直接リクエストしたい（リアルタイム取得）
C) Other (please describe after [Answer]: tag below)

[Answer]: A) はい、既存パターンと同じ（バックアップスクリプト → ローカルJSON → ビューア表示）

## Question 4
ナビゲーション構造について、Wiki・ドキュメントへのアクセスはどのようにしたいですか？

A) 既存の課題一覧と同じレベルにWiki一覧・ドキュメント一覧のページを追加（サイドバーやタブで切り替え）
B) トップページにWiki・ドキュメントへのリンクを追加し、それぞれ独立したページとして表示
C) 課題一覧ページにタブを追加して「課題」「Wiki」「ドキュメント」を切り替え
D) Other (please describe after [Answer]: tag below)

[Answer]: C) 課題一覧ページにタブを追加して「課題」「Wiki」「ドキュメント」を切り替え

## Question 5
Wiki添付ファイルとドキュメント添付ファイルもバックアップ対象に含めますか？

A) はい、すべての添付ファイルをダウンロードしてローカルに保存する
B) いいえ、メタデータ（ファイル名・サイズ等）のみ保存し、ファイル本体はダウンロードしない
C) Other (please describe after [Answer]: tag below)

[Answer]:  B) いいえ、メタデータ（ファイル名・サイズ等）のみ保存し、ファイル本体はダウンロードしない

## Question 6
ドキュメントのツリー構造（フォルダ階層）はビューアでも再現しますか？

A) はい、ツリー構造をサイドバーやツリービューで表示する
B) いいえ、フラットな一覧表示で十分
C) Other (please describe after [Answer]: tag below)

[Answer]: A) はい、ツリー構造をサイドバーやツリービューで表示する

## Question 7
ドキュメントのコメント（返信含む）もバックアップ・表示対象に含めますか？

A) はい、コメントと返信を含めてバックアップ・表示する
B) いいえ、ドキュメント本文のみで十分
C) Other (please describe after [Answer]: tag below)

[Answer]: A) はい、コメントと返信を含めてバックアップ・表示する

## Question: Security Extensions
このプロジェクトにセキュリティ拡張ルールを適用しますか？

A) はい — すべてのセキュリティルールをブロッキング制約として適用する（本番グレードのアプリケーション推奨）
B) いいえ — セキュリティルールをスキップする（PoC、プロトタイプ、実験的プロジェクト向け）
C) Other (please describe after [Answer]: tag below)

[Answer]: B) いいえ — セキュリティルールをスキップする（PoC、プロトタイプ、実験的プロジェクト向け）

## Question: Property-Based Testing Extension
このプロジェクトにプロパティベーステスト（PBT）ルールを適用しますか？

A) はい — すべてのPBTルールをブロッキング制約として適用する
B) 部分的 — 純粋関数とシリアライゼーションのラウンドトリップにのみPBTルールを適用する
C) いいえ — PBTルールをスキップする（シンプルなCRUDアプリケーション、UIのみのプロジェクト向け）
D) Other (please describe after [Answer]: tag below)

[Answer]: C) いいえ — PBTルールをスキップする（シンプルなCRUDアプリケーション、UIのみのプロジェクト向け）
