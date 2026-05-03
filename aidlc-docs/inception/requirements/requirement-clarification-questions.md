# Requirements Clarification Questions

回答の中に1点確認が必要な箇所がありました。

## Ambiguity 1: Wiki描画方式の矛盾
Q1で「Backlog独自記法とMarkdownの両方に対応が必要」と回答されましたが、Q2では「react-markdown + remark-gfmで十分」と回答されています。react-markdownはMarkdown/GFM形式のみ対応で、Backlog独自記法（`*bold*`, `{code}`, `#image` 等）は描画できません。

### Clarification Question 1
Backlog独自記法のWikiページの描画方法をどうしますか？

A) Backlog独自記法のプロジェクトでもcontent（テキスト）をそのまま表示する（プレーンテキストとして表示、整形なし）
B) Backlog独自記法のプロジェクトでは、簡易的な独自パーサーを実装してHTMLに変換する
C) Backlog独自記法のプロジェクトは対象外とし、Markdown形式のプロジェクトのみ対応する
D) textFormattingRuleを確認し、Markdownの場合はreact-markdown、Backlog記法の場合はプレーンテキスト表示とする（フォールバック方式）
E) Other (please describe after [Answer]: tag below)

[Answer]: D) textFormattingRuleを確認し、Markdownの場合はreact-markdown、Backlog記法の場合はプレーンテキスト表示とする（フォールバック方式）
