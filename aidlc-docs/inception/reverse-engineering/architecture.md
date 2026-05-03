# System Architecture

## System Overview
backlogupは、Backlogプロジェクト管理ツールのデータをローカルにバックアップし、オフラインで閲覧可能なReact SPAビューアを提供するモノリシックアプリケーション。バックアップスクリプト（Node.js CLI）とWebビューア（React SPA）の2つの主要コンポーネントで構成される。

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Scripts["バックアップスクリプト (Node.js CLI)"]
        BacklogScript["scripts/backlog<br/>課題バックアップ"]
        TextSearchScript["scripts/textsearch<br/>検索インデックス生成"]
    end

    subgraph Viewer["Webビューア (React SPA)"]
        Router["React Router"]
        subgraph Containers["コンテナ"]
            IndexPage["Index (リダイレクト)"]
            IssuesPage["Issues (課題一覧)"]
            IssuePage["Issue (課題詳細)"]
        end
        subgraph Stores["MobXストア"]
            RootStore["RootStore"]
            PageStore["PageStore"]
            IssueStore["IssueStore"]
        end
        subgraph Components["共通コンポーネント"]
            UserHeader["UserHeader"]
            NotificationUser["NotificationUser"]
        end
    end

    subgraph External["外部サービス"]
        BacklogAPI["Backlog API"]
    end

    subgraph LocalData["ローカルデータ (scripts/backlog/dist/assets)"]
        ConfigsJSON["configs/*.json"]
        PagesJSON["pages/*.json"]
        IssuesJSON["issues/*/issue.json"]
        CommentsJSON["issues/*/comments.json"]
        Attachments["issues/*/attachments/*"]
        UserIcons["users/*/icon"]
    end

    BacklogScript -->|API呼び出し| BacklogAPI
    BacklogScript -->|JSON保存| LocalData
    TextSearchScript -->|読込| LocalData
    TextSearchScript -->|インデックス保存| ConfigsJSON

    Router --> IndexPage
    Router --> IssuesPage
    Router --> IssuePage
    IssuesPage --> PageStore
    IssuePage --> IssueStore
    PageStore -->|fetch| LocalData
    IssueStore -->|fetch| LocalData
```

## Component Descriptions

### scripts/backlog (バックアップスクリプト)
- **Purpose**: Backlog APIからプロジェクトの全データをダウンロード
- **Responsibilities**: 課題、コメント、添付ファイル、ユーザーアイコンの取得と保存
- **Dependencies**: backlog-js, dotenv
- **Type**: Application (CLI)

### scripts/textsearch (検索インデックス生成)
- **Purpose**: 全文検索用インデックスの生成
- **Responsibilities**: Markdown→プレーンテキスト変換、形態素解析、FlexSearchインデックス生成
- **Dependencies**: remark, strip-markdown, kuromojin
- **Type**: Application (CLI)

### viewer (Webビューア)
- **Purpose**: バックアップデータのブラウザ表示
- **Responsibilities**: SPA表示、ルーティング、状態管理、Markdown描画
- **Dependencies**: React, MobX, MUI, react-markdown, react-router-dom
- **Type**: Application (SPA)

## Data Flow

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant CLI as バックアップCLI
    participant API as Backlog API
    participant FS as ローカルファイル
    participant SPA as Webビューア

    Note over CLI,API: バックアップフロー
    CLI->>API: getProject(projectKey)
    API-->>CLI: プロジェクト情報
    CLI->>API: getIssues(projectId)
    API-->>CLI: 課題一覧
    loop 各課題
        CLI->>API: getIssueComments(issueId)
        API-->>CLI: コメント一覧
        CLI->>API: getIssueAttachments(issueId)
        API-->>CLI: 添付ファイル
    end
    CLI->>FS: JSON/バイナリ保存

    Note over User,SPA: 閲覧フロー
    User->>SPA: ページアクセス
    SPA->>FS: fetch(pages/*.json)
    FS-->>SPA: 課題一覧データ
    User->>SPA: 課題クリック
    SPA->>FS: fetch(issues/*/issue.json)
    FS-->>SPA: 課題詳細データ
```

## Integration Points
- **External APIs**: Backlog API v2 (backlog-js経由)
- **Databases**: なし（JSONファイルベース）
- **Third-party Services**: Google Fonts (Noto Sans JP, Quicksand, Inconsolata, Red Hat Display)

## Infrastructure Components
- **CDK Stacks**: なし
- **Deployment Model**: Viteビルド → 静的ファイル配信
- **Networking**: ローカル開発サーバー（Vite dev server）
