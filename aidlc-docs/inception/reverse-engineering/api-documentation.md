# API Documentation

## External APIs (Backlog API v2)

### 現在使用中のエンドポイント

#### getProject
- **Method**: GET
- **Path**: /api/v2/projects/:projectIdOrKey
- **Purpose**: プロジェクト情報取得
- **Response**: `Entity.Project.Project`

#### getIssueTypes
- **Method**: GET
- **Path**: /api/v2/projects/:projectIdOrKey/issueTypes
- **Purpose**: 課題種別一覧取得

#### getCategories
- **Method**: GET
- **Path**: /api/v2/projects/:projectIdOrKey/categories
- **Purpose**: カテゴリー一覧取得

#### getVersions
- **Method**: GET
- **Path**: /api/v2/projects/:projectIdOrKey/versions
- **Purpose**: バージョン/マイルストーン一覧取得

#### getProjectUsers
- **Method**: GET
- **Path**: /api/v2/projects/:projectIdOrKey/users
- **Purpose**: プロジェクトユーザー一覧取得

#### getUserIcon
- **Method**: GET
- **Path**: /api/v2/users/:userId/icon
- **Purpose**: ユーザーアイコン取得

#### getIssuesCount
- **Method**: GET
- **Path**: /api/v2/issues/count
- **Purpose**: 課題数取得

#### getIssues
- **Method**: GET
- **Path**: /api/v2/issues
- **Purpose**: 課題一覧取得（ページネーション対応）

#### getIssueComments
- **Method**: GET
- **Path**: /api/v2/issues/:issueIdOrKey/comments
- **Purpose**: 課題コメント一覧取得

#### getIssueCommentsCount
- **Method**: GET
- **Path**: /api/v2/issues/:issueIdOrKey/comments/count
- **Purpose**: 課題コメント数取得

#### getIssueAttachments
- **Method**: GET
- **Path**: /api/v2/issues/:issueIdOrKey/attachments
- **Purpose**: 課題添付ファイル一覧取得

#### getIssueAttachment
- **Method**: GET
- **Path**: /api/v2/issues/:issueIdOrKey/attachments/:attachmentId
- **Purpose**: 課題添付ファイルダウンロード

### 新規追加予定のエンドポイント（Wiki）

#### getWikisCount
- **Method**: GET
- **Path**: /api/v2/wikis/count
- **Purpose**: Wikiページ数取得
- **backlog-js**: `backlog.getWikisCount(projectIdOrKey)`
- **Response**: `{ count: number }`

#### getWikis
- **Method**: GET
- **Path**: /api/v2/wikis
- **Purpose**: Wikiページ一覧取得
- **backlog-js**: `backlog.getWikis({ projectIdOrKey })`
- **Response**: `Entity.Wiki.WikiListItem[]`

#### getWiki
- **Method**: GET
- **Path**: /api/v2/wikis/:wikiId
- **Purpose**: Wikiページ詳細取得（content含む）
- **backlog-js**: `backlog.getWiki(wikiId)`
- **Response**: `Entity.Wiki.Wiki`

#### getWikisTags
- **Method**: GET
- **Path**: /api/v2/wikis/tags
- **Purpose**: Wikiタグ一覧取得
- **backlog-js**: `backlog.getWikisTags(projectIdOrKey)`
- **Response**: `Entity.Wiki.Tag[]`

#### getWikisStars
- **Method**: GET
- **Path**: /api/v2/wikis/:wikiId/stars
- **Purpose**: Wikiページのスター取得
- **backlog-js**: `backlog.getWikisStars(wikiId)`
- **Response**: `Entity.Star.Star[]`

#### getWikiAttachment
- **Method**: GET
- **Path**: /api/v2/wikis/:wikiId/attachments/:attachmentId
- **Purpose**: Wiki添付ファイルダウンロード
- **backlog-js**: `backlog.getWikiAttachment(wikiId, attachmentId)`
- **Response**: `Entity.File.FileData`

### 新規追加予定のエンドポイント（Document）

**注意**: backlog-jsにはDocument APIのメソッドが含まれていない。直接REST API呼び出しが必要。

#### Get Document List
- **Method**: GET
- **Path**: /api/v2/documents
- **Purpose**: ドキュメント一覧取得
- **Query Params**: projectId, keyword, sort, order, offset, count
- **Response**: ドキュメント配列（id, projectId, title, plain, json, statusId, emoji, attachments, tags, createdUser, created, updatedUser, updated）

#### Get Document
- **Method**: GET
- **Path**: /api/v2/documents/:documentId
- **Purpose**: ドキュメント詳細取得
- **Response**: ドキュメントオブジェクト（id, projectId, title, plain, json, statusId, emoji, attachments, tags, createdUser, created, updatedUser, updated）

#### Get Document Tree
- **Method**: GET
- **Path**: /api/v2/documents/tree
- **Purpose**: ドキュメントツリー構造取得
- **Query Params**: projectIdOrKey
- **Response**: `{ projectId, activeTree: { id, children: [...] }, trashTree: { id, children: [...] } }`

#### Get Document Attachments
- **Method**: GET
- **Path**: /api/v2/documents/:documentId/attachments/:attachmentId
- **Purpose**: ドキュメント添付ファイルダウンロード

#### Get Document Comments
- **Method**: GET
- **Path**: /api/v2/documents/:documentId/comments
- **Purpose**: ドキュメントコメント一覧取得
- **Response**: コメント配列（id, documentId, content(JSON), plain, commentType, createdUser, replies）

## Internal APIs (Viewer Stores)

### PageStore
- `fetch()` - 課題一覧データをローカルJSONから読み込み
- `generateIndex()` - FlexSearch検索インデックスを読み込み
- `setKeyword(keyword: string)` - 検索キーワード設定
- `pages` (getter) - フィルタリング済み課題一覧

### IssueStore
- `fetch(issueId?: string)` - 課題詳細・コメントをローカルJSONから読み込み
- `clear()` - ストアをリセット

## Data Models

### Issue (backlog-js Entity.Issue.Issue)
- id, projectId, issueKey, issueType, summary, description, resolution, priority, status, assignee, category[], versions[], milestone[], startDate, dueDate, estimatedHours, actualHours, createdUser, created, updatedUser, updated, customFields[], attachments[], sharedFiles[], stars[]

### Wiki (backlog-js Entity.Wiki.Wiki)
- id, projectId, name, content, tags[], attachments[], sharedFiles[], stars[], createdUser, created, updatedUser, updated

### Document (カスタム型が必要)
- id (string), projectId, title, plain, json (TipTap/ProseMirror JSON), statusId, emoji, attachments[], tags[], createdUser, created, updatedUser, updated
