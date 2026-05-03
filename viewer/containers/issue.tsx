import React, { useState } from "react";
import { useStore } from "../stores";
import { useDidMount, useWillUnmount } from "@better-hooks/lifecycle";
import { observer } from "mobx-react-lite";
import dayjs from 'dayjs';
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { UserHeader } from "../components/userHeader";
import { NotificationUser } from "../components/notificationUser";

const notificationType = (type: string) => {
  switch (type) {
    case "issue.create":
      return "課題の追加";
    default:
      return type;
  }
};

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

export const Issue: React.FC = observer((props) => {
  const { pageStore, issueStore } = useStore();
  const { id: issueId } = useParams();
  const [ showMoreinfo, setShowMoreInfo ] = useState(false);

  useDidMount(() => {
    pageStore.fetch();
    issueStore.fetch(issueId);
  });

  useWillUnmount(() => {
    issueStore.clear();
  });

  const issue = issueStore.issue;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center">
        <Link to="/issues" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          リストに戻る
        </Link>
      </div>

      <hr className="border-gray-200" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: issue.issueType?.color }}>
            {issue.issueType?.name}
          </span>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{issue.issueKey}</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">開始日</span>
            <span className="font-medium text-gray-900 mt-0.5">{issue.startDate ? dayjs(issue.startDate).format("YYYY/MM/DD") : "-"}</span>
          </div>
          <div className={`flex flex-col ${issue.dueDate && dayjs(issue.dueDate).isBefore(dayjs()) ? "text-red-600" : ""}`}>
            <span className={`text-xs font-medium uppercase tracking-wider ${issue.dueDate && dayjs(issue.dueDate).isBefore(dayjs()) ? "text-red-500" : "text-gray-400"}`}>期限日</span>
            <span className={`font-medium mt-0.5 ${issue.dueDate && dayjs(issue.dueDate).isBefore(dayjs()) ? "text-red-600" : "text-gray-900"}`}>
              {issue.dueDate ? dayjs(issue.dueDate).format("YYYY/MM/DD") : "-"} {issue.dueDate && dayjs(issue.dueDate).isBefore(dayjs()) ? "🔥" : ""}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: issue.status?.color }}>
              {issue.status?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-snug">{issue.summary}</h1>
      </div>

      {/* Main Issue Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6">
          <UserHeader user={issue.createdUser}>
            <div className="text-xs text-gray-500 mt-0.5">登録日: {issue.created ? dayjs(issue.created).format("YYYY/MM/DD HH:mm:ss") : ""}</div>
          </UserHeader>
          
          <div className="mt-6 prose prose-blue max-w-none prose-img:rounded-lg prose-img:shadow-sm">
            <ReactMarkdown
              className="markdown-body"
              remarkPlugins={[[remarkGfm, { singleTilde: false, }]]}
              components={{
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '')
                  return inline ? (
                    <code {...props} className={className}>
                      {children}
                    </code>
                  ) : (
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, '')}
                      style={oneLight}
                      language={match ? match[1] : "text"}
                      PreTag="div"
                      customStyle={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}
                    />
                  )
                }
              }}
            >
              {issue.description?.replace(/!\[image\]\[(.*?)\]/g, (all, match1) => {
                const targetAttachmentId = issue.attachments?.slice().find((attachment) => attachment.name === match1)?.id;
                return `![image](/assets/issues/${issueId}/attachments/${targetAttachmentId})`;
              }).replaceAll("\n", "  \n")}
            </ReactMarkdown>
          </div>
        </div>

        {/* Issue Details Section */}
        <div className="border-t border-gray-100 bg-gray-50/50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            
            {/* Left Column */}
            <div>
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-gray-100/0">
                  <tr className="border-b border-gray-200/60">
                    <th className="py-3 font-medium text-gray-500 w-1/3">優先度</th>
                    <td className="py-3 text-gray-900">{issue.priority?.name}</td>
                  </tr>
                  <tr className="border-b border-gray-200/60">
                    <th className="py-3 font-medium text-gray-500 w-1/3">カテゴリー</th>
                    <td className="py-3 text-gray-900">{issue.category?.map((c) => c.name).join(", ")}</td>
                  </tr>
                  {showMoreinfo && (
                    <>
                      <tr className="border-b border-gray-200/60">
                        <th className="py-3 font-medium text-gray-500 w-1/3">発生バージョン</th>
                        <td className="py-3 text-gray-900">{issue.versions?.map((v) => v.name).join(", ")}</td>
                      </tr>
                      <tr className="border-b border-gray-200/60">
                        <th className="py-3 font-medium text-gray-500 w-1/3">予定時間</th>
                        <td className="py-3 text-gray-900">{issue.estimatedHours}</td>
                      </tr>
                      <tr className="border-b border-gray-200/60">
                        <th className="py-3 font-medium text-gray-500 w-1/3">完了理由</th>
                        <td className="py-3 text-gray-900">{issue.resolution?.name}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Right Column */}
            <div>
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-gray-100/0">
                  <tr className="border-b border-gray-200/60">
                    <th className="py-3 font-medium text-gray-500 w-1/3">担当者</th>
                    <td className="py-3 text-gray-900">
                      {issue.assignee?.name && (
                        <div className="flex items-center gap-2">
                          <img
                            alt={issue.assignee?.name}
                            src={`/assets/users/${issue.assignee?.id}/icon`}
                            className="w-6 h-6 rounded-full shadow-sm"
                          />
                          <span className="font-medium">{issue.assignee?.name}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200/60">
                    <th className="py-3 font-medium text-gray-500 w-1/3">マイルストーン</th>
                    <td className="py-3 text-gray-900">{issue.milestone?.map((m) => m.name).join(", ")}</td>
                  </tr>
                  {showMoreinfo && (
                    <>
                      <tr className="border-b border-gray-200/60">
                        <th className="py-3 font-medium text-gray-500 w-1/3">&nbsp;</th>
                        <td className="py-3 text-gray-900">&nbsp;</td>
                      </tr>
                      <tr className="border-b border-gray-200/60">
                        <th className="py-3 font-medium text-gray-500 w-1/3">実績時間</th>
                        <td className="py-3 text-gray-900">{issue.actualHours}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowMoreInfo(!showMoreinfo)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
            >
              {showMoreinfo ? <><ArrowUpIcon /> 折りたたむ</> : <><ArrowDownIcon /> 詳細を表示</>}
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            コメント
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">{issueStore.comments.length}</span>
          </h2>
        </div>

        <div className="space-y-6">
          {issueStore.comments.slice().sort((a, b) => a.id > b.id ? 1 : -1).map((comment) => (
            <div key={comment.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6 transition-all hover:shadow-md">
              <UserHeader user={comment.createdUser}>
                <div className="text-xs text-gray-500 mt-0.5">{dayjs(comment.created).format("YYYY/MM/DD HH:mm:ss")}</div>
              </UserHeader>

              <div className="mt-4 md:ml-12 pl-1 border-l-2 border-transparent">
                {/* Change Logs */}
                {comment.changeLog && comment.changeLog.length > 0 && (
                  <div className="mb-4 space-y-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    {comment.changeLog.slice().map((changeLog, index) => {
                      const logClass = "text-sm text-gray-600 flex items-start gap-2";
                      const Bullet = () => <span className="text-blue-400 font-bold">・</span>;
                      
                      switch (changeLog.field) {
                        case "notification":
                          return <div className={logClass} key={index}><Bullet/>お知らせ: <span className="font-medium text-gray-900">{notificationType(changeLog.notificationInfo.type)}</span></div>;
                        case "limitDate":
                          return <div className={logClass} key={index}><Bullet/>期限日: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue}</span></div>;
                        case "assigner":
                          return <div className={logClass} key={index}><Bullet/>担当者: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue}</span></div>;
                        case "parentIssue":
                          return <div className={logClass} key={index}><Bullet/>親課題: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue}</span></div>;
                        case "description":
                          return (
                            <div className="flex items-start gap-2 mt-2" key={index}>
                              <Bullet/>
                              <div className="text-sm text-gray-600 pt-0.5 w-12 shrink-0">詳細:</div>
                              <details className="group flex-1 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                                <summary className="flex cursor-pointer items-center justify-between p-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors">
                                  変更内容を見る
                                  <span className="transition group-open:rotate-180 text-gray-400">
                                    <ChevronDownIcon />
                                  </span>
                                </summary>
                                <div className="border-t border-gray-200 p-3 text-sm text-gray-600 bg-gray-50/50">
                                  <div className="whitespace-pre-wrap bg-red-50/50 text-red-900 p-2 rounded border border-red-100">{changeLog.originalValue}</div>
                                  <div className="my-2 text-center text-gray-400 flex justify-center"><ArrowDownIcon /></div>
                                  <div className="whitespace-pre-wrap bg-green-50/50 text-green-900 p-2 rounded border border-green-100">{changeLog.newValue}</div>
                                </div>
                              </details>
                            </div>
                          );
                        case "component":
                          return <div className={logClass} key={index}><Bullet/>カテゴリー: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        case "resolution":
                          return <div className={logClass} key={index}><Bullet/>完了理由: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        case "milestone":
                          return <div className={logClass} key={index}><Bullet/>マイルストーン: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        case "priority":
                          return <div className={logClass} key={index}><Bullet/>優先度: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        case "issueType":
                          return <div className={logClass} key={index}><Bullet/>種別: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        case "estimatedHours":
                          return <div className={logClass} key={index}><Bullet/>予定時間: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        case "actualHours":
                          return <div className={logClass} key={index}><Bullet/>実績時間: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        case "status":
                          return <div className={logClass} key={index}><Bullet/>状態: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        case "attachment":
                          return <div className={logClass} key={index}><Bullet/>添付ファイル: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "削除"}</span> {changeLog.attachmentInfo && <a href={`/assets/issues/${issueId}/attachments/${changeLog.attachmentInfo.id}`} download={changeLog.attachmentInfo?.name} className="ml-2 text-blue-600 hover:text-blue-800 underline">ダウンロード</a>}</div>;
                        case "summary":
                          return <div className={logClass} key={index}><Bullet/>件名: {changeLog.originalValue || "未設定"} <span className="mx-1 text-gray-400">➡️</span> <span className="font-medium text-gray-900">{changeLog.newValue || "未設定"}</span></div>;
                        default:
                          return <div className={logClass} key={index}><Bullet/>不明イベント: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{JSON.stringify(changeLog)}</span></div>;
                      }
                    })}
                  </div>
                )}

                {/* Comment Content */}
                {comment.content && (
                  <div className="prose prose-sm md:prose-base prose-blue max-w-none prose-img:rounded-lg prose-img:shadow-sm">
                    <ReactMarkdown
                      className="markdown-body"
                      remarkPlugins={[[remarkGfm, { singleTilde: false, }]]}
                      components={{
                        code({node, inline, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '')
                          return inline ? (
                            <code {...props} className={className}>
                              {children}
                            </code>
                          ) : (
                            <SyntaxHighlighter
                              {...props}
                              children={String(children).replace(/\n$/, '')}
                              style={oneLight}
                              language={match ? match[1] : "text"}
                              PreTag="div"
                              customStyle={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}
                            />
                          )
                        }
                      }}
                    >
                      {comment.content?.replace(/!\[image\]\[(.*?)\]/g, (all, match1) => {
                        const targetAttachmentId = comment.changeLog?.slice().find((attachment) => attachment.attachmentInfo?.name === match1)?.attachmentInfo.id;
                        return `![image](/assets/issues/${issueId}/attachments/${targetAttachmentId})`;
                      }).replaceAll("\n", "  \n")}
                    </ReactMarkdown>
                  </div>
                )}

                {comment.created !== comment.updated && (
                  <div className="mt-2 text-xs text-gray-400 italic">（編集済み）</div>
                )}
              </div>

              {/* Notification Users */}
              {comment.notifications && comment.notifications.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                  <div className="flex -space-x-1 overflow-hidden p-1">
                    {comment.notifications.map((notification) =>
                      <div key={notification.id} className="inline-block ring-2 ring-white rounded-full">
                        <NotificationUser user={notification.user} alreadyRead={notification.resourceAlreadyRead} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {issueStore.comments.length === 0 && (
            <div className="text-center py-10 bg-white border border-gray-200 border-dashed rounded-2xl">
              <p className="text-gray-500">コメントはありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
});
