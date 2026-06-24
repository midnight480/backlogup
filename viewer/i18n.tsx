import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "ja";

export const dict = {
  en: {
    dashboard: "Dashboard",
    issues: "Issues",
    wikis: "Wiki",
    documents: "Documents",
    settings: "Settings",
    localArchive: "Local Archive",
    notice: "Notice: Subversion and Git repositories are NOT backed up.",
    trackingNotice: "Usage data (OS, browser, region) is collected anonymously to improve the tool.",
    searchPlaceholder: "Search archives...",
    close: "Close",
    language: "Language",

    // Dashboard
    projectDetails: "Project Details",
    projectKey: "Project Key",
    created: "Created",
    licenceInfo: "Licence Info",
    unknownPlan: "Unknown Plan",
    planType: "Plan Type",
    premium: "Premium",
    free: "Free",
    userLimit: "User Limit",
    unlimited: "Unlimited",
    storageCapacity: "Storage Capacity",
    spaceUsage: "Space Usage",
    spaceUsageNotAvailable: "not available",
    renewalDate: "Renewal Date",
    issuesBackedUp: "Issues Backed Up",
    wikiPagesBackedUp: "Wiki Pages Backed Up",
    sharedFilesBackedUp: "Shared Files Backed Up",
    lastSync: "Last Sync",
    browserSharedFiles: "Access shared files in browser:",
    sharedFilesNoteTitle: "Note on Shared Files",
    sharedFilesNoteDesc: "Although `useFileSharing: true` is set, automatic backup by the tool is not comprehensive due to API limitations. Data in shared files requires manual verification and export.",
    sharedFiles: "Shared Files",
    folder: "Folder",
    fileName: "Name",
    size: "Size",
    filesUnit: "files",
    noSharedFiles: "No shared files. Run `npm run backup` to create the list.",
    sharedFilesDownloadHint:
      "This is the list of shared files. Check the ones you want and press “Download selected” to fetch them via the Backlog API (while `npm run dev` is running).",
    downloadSelected: "Download selected",
    downloadInProgress: "Downloading...",
    notDownloaded: "Not downloaded",
    downloadDevOnly:
      "On-screen download is only available while `npm run dev` is running with BACKLOG_API_KEY configured. You can also fetch files via `npm run download:sharedfiles`.",
    downloadSucceeded: "downloaded",
    downloadFailed: "failed",
    gitRepositories: "Git Repositories",
    cloneAllBranches: "Clone all branches",

    // Issues
    issueExplorer: "Issue Explorer",
    archives: "Archives",
    loadingSearch: "Loading search dictionary...",
    searchKeywords: "Search keywords...",
    backedUpIssues: "Backed Up Issues",
    downloading: "Downloading:",
    allSyncsVerified: "All syncs verified",
    page: "Page",
    of: "of",
    id: "ID",
    title: "Title",
    status: "Status",
    priority: "Priority",
    modified: "Modified",
    noIssuesFound: "No issues found.",
    archiveIntegrityNote: "Archive Integrity Note",
    archiveIntegrityDesc:
      "Notice: Subversion, Git, and generic file repositories are NOT backed up in this view. Only metadata, issues, and wiki contents are preserved in the Local Archive vault.",
    vaultAnalytics: "Vault Analytics",
    localSearchIndexed: "Local Search Indexed",

    // Common
    selectDocument: "Please select a document",
    noDocuments: "No documents available",
    description: "Description",
    comments: "Comments",
    details: "Details",
    assignee: "Assignee",
    milestone: "Milestone",
    versions: "Versions",
    category: "Category",
    resolution: "Resolution",
    registeredBy: "Registered By",
    viewInBacklog: "View in Backlog",
    attachment: "Attachment",
    exportCsv: "Download CSV",
    exportMarkdown: "Export Markdown",
    exportPdf: "Export PDF",
    exporting: "Exporting...",
    exportCsvDisabled: "Load issues before exporting",
    exportContentDisabled: "Load content before exporting",
  },
  ja: {
    dashboard: "ダッシュボード",
    issues: "課題",
    wikis: "Wiki",
    documents: "ドキュメント",
    settings: "設定",
    localArchive: "ローカルアーカイブ",
    notice: "注意: Subversion, Git リポジトリはバックアップされません。",
    trackingNotice: "利用状況（OS、ブラウザ、地域など）はツール改善のため匿名で収集されます。",
    searchPlaceholder: "アーカイブを検索...",
    close: "閉じる",
    language: "言語",

    // Dashboard
    projectDetails: "プロジェクト詳細",
    projectKey: "プロジェクトキー",
    created: "作成日",
    licenceInfo: "ライセンス情報",
    unknownPlan: "不明なプラン",
    planType: "プラン種別",
    premium: "プレミアム",
    free: "フリー",
    userLimit: "ユーザー上限",
    unlimited: "無制限",
    storageCapacity: "ストレージ容量",
    spaceUsage: "スペース容量",
    spaceUsageNotAvailable: "利用不可",
    renewalDate: "更新日",
    issuesBackedUp: "バックアップ済みの課題",
    wikiPagesBackedUp: "バックアップ済みのWiki",
    sharedFilesBackedUp: "バックアップ済みの共有ファイル",
    lastSync: "最終同期",
    browserSharedFiles: "ブラウザで共有ファイルにアクセスする:",
    sharedFilesNoteTitle: "ファイル共有（共有ファイル）に関する注意",
    sharedFilesNoteDesc: "`useFileSharing: true` 設定ですが、APIの制限によりツールによる自動バックアップは汎用的ではありません。共有ファイル内のデータは、手動での確認とエクスポートが必要です。",
    sharedFiles: "共有ファイル (Shared Files)",
    folder: "フォルダ",
    fileName: "ファイル名",
    size: "サイズ",
    filesUnit: "件",
    noSharedFiles: "共有ファイルがありません。`npm run backup` を実行して一覧を作成してください。",
    sharedFilesDownloadHint:
      "共有ファイルの一覧です。取得したいファイルにチェックを入れて「選択をダウンロード」を押すと、Backlog API から取得します（`npm run dev` 起動中）。",
    downloadSelected: "選択をダウンロード",
    downloadInProgress: "ダウンロード中...",
    notDownloaded: "未取得",
    downloadDevOnly:
      "画面からのダウンロードは、BACKLOG_API_KEY を設定した `npm run dev` 起動中のみ利用できます。`npm run download:sharedfiles` でも取得できます。",
    downloadSucceeded: "件取得",
    downloadFailed: "件失敗",
    gitRepositories: "Git Repositories",
    cloneAllBranches: "すべてのブランチをクローンする",

    // Issues
    issueExplorer: "課題エクスプローラー",
    archives: "アーカイブ",
    loadingSearch: "検索辞書を読み込み中...",
    searchKeywords: "キーワードで検索...",
    backedUpIssues: "バックアップ済みの課題",
    downloading: "ダウンロード中:",
    allSyncsVerified: "同期完了",
    page: "ページ",
    of: "/",
    id: "キー",
    title: "件名",
    status: "状態",
    priority: "優先度",
    modified: "更新日",
    noIssuesFound: "課題が見つかりません。",
    archiveIntegrityNote: "アーカイブについて",
    archiveIntegrityDesc:
      "注意: Subversion, Git, ファイル機能はこのビューではバックアップ対象外です。メタデータ、課題、Wikiの内容のみがアーカイブとして保存されます。",
    vaultAnalytics: "Vault分析",
    localSearchIndexed: "ローカル検索インデックス化完了",

    // Common
    selectDocument: "ドキュメントを選択してください",
    noDocuments: "ドキュメントがありません",
    description: "詳細",
    comments: "コメント",
    details: "属性",
    assignee: "担当者",
    milestone: "マイルストーン",
    versions: "発生バージョン",
    category: "カテゴリー",
    resolution: "完了理由",
    registeredBy: "登録者",
    viewInBacklog: "Backlogで見る",
    attachment: "添付ファイル",
    exportCsv: "CSVダウンロード",
    exportMarkdown: "Markdown出力",
    exportPdf: "PDF出力",
    exporting: "出力中...",
    exportCsvDisabled: "課題の読み込み完了後にダウンロードできます",
    exportContentDisabled: "コンテンツの読み込み完了後に出力できます",
  },
};

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof dict.en) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: "ja",
  setLang: () => {},
  t: (key) => dict.ja[key] || key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>("ja");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    if (saved === "en" || saved === "ja") {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  };

  const t = (key: keyof typeof dict.en) => {
    return dict[lang][key] || key;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
