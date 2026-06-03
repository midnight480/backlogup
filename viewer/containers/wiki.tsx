import { useDidMount, useWillUnmount } from "@better-hooks/lifecycle";
import type * as backlog from "backlog-js";
import dayjs from "dayjs";
import { observer } from "mobx-react-lite";
import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { ExportButtons } from "../components/exportButtons";
import { useStore } from "../stores";
import { downloadWikiMarkdown } from "../utils/markdownExport";
import { exportElementToPdf } from "../utils/pdfExport";

// Tree Node
interface WikiTreeNode {
  label: string;
  wiki?: backlog.Entity.Wiki.WikiListItem;
  children: Map<string, WikiTreeNode>;
}

function buildWikiTree(wikis: backlog.Entity.Wiki.WikiListItem[]): WikiTreeNode {
  const root: WikiTreeNode = { label: "", children: new Map() };
  for (const wiki of wikis) {
    const segments = wiki.name.split("/");
    let current = root;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!current.children.has(seg)) {
        current.children.set(seg, { label: seg, children: new Map() });
      }
      current = current.children.get(seg)!;
    }
    current.wiki = wiki;
  }
  return root;
}

const WikiTreeNodeView: React.FC<{ node: WikiTreeNode; currentWikiId?: string; level?: number }> = ({ node, currentWikiId, level = 0 }) => {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.size > 0;
  const childNodes = Array.from(node.children.values());
  const isCurrent = node.wiki?.id.toString() === currentWikiId;

  const paddingLeftClass = "px-sm";

  if (node.wiki && hasChildren) {
    return (
      <div className={`mt-xs ${level > 0 ? "ml-xl border-l border-outline-variant" : ""}`}>
        <div
          className={`flex items-center gap-sm py-2 rounded-lg text-body-sm cursor-pointer ${paddingLeftClass} ${isCurrent ? "text-primary bg-primary/5 font-bold dark:bg-primary/20 dark:text-blue-300" : "text-on-surface hover:bg-surface-container-low dark:text-slate-200 dark:hover:bg-slate-800"}`}
          onClick={() => setOpen(!open)}
        >
          <span className="material-symbols-outlined text-sm">{open ? "folder_open" : "folder"}</span>
          <span className="flex-1 truncate">{node.label}</span>
          <Link
            to={`/wikis/${node.wiki.id}`}
            className="material-symbols-outlined text-sm hover:text-primary px-1"
            onClick={(e) => e.stopPropagation()}
          >
            description
          </Link>
        </div>
        {open && (
          <div className="ml-xl mt-xs border-l border-outline-variant">
            {childNodes.map((child) => (
              <WikiTreeNodeView key={child.label} node={child} currentWikiId={currentWikiId} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (node.wiki) {
    return (
      <div className={`mt-xs ${level > 0 ? "ml-xl border-l border-outline-variant" : ""}`}>
        <Link
          to={`/wikis/${node.wiki.id}`}
          className={`flex items-center gap-sm py-1.5 cursor-pointer text-body-sm rounded-lg ${paddingLeftClass} ${isCurrent ? "text-primary bg-primary/5 font-bold dark:bg-primary/20 dark:text-blue-300" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"}`}
        >
          <span className="material-symbols-outlined text-sm">description</span>
          <span className="truncate">{node.label}</span>
        </Link>
      </div>
    );
  }

  if (hasChildren) {
    return (
      <div className={`mt-xs ${level > 0 ? "ml-xl border-l border-outline-variant" : ""}`}>
        <div
          className={`flex items-center gap-sm py-2 rounded-lg text-body-sm cursor-pointer ${paddingLeftClass} text-on-surface hover:bg-surface-container-low`}
          onClick={() => setOpen(!open)}
        >
          <span className="material-symbols-outlined text-sm">{open ? "folder_open" : "folder"}</span>
          <span className="truncate">{node.label}</span>
        </div>
        {open && (
          <div className="ml-xl mt-xs border-l border-outline-variant">
            {childNodes.map((child) => (
              <WikiTreeNodeView key={child.label} node={child} currentWikiId={currentWikiId} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export const Wiki: React.FC = observer(() => {
  const { wikiStore } = useStore();
  const { id: wikiId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = React.useRef<HTMLDivElement>(null);

  useDidMount(() => {
    wikiStore.fetch();
  });

  React.useEffect(() => {
    if (wikiId && wikiId !== "home") {
      wikiStore.fetchDetail(wikiId);
    }
  }, [wikiId, wikiStore]);

  useWillUnmount(() => {
    wikiStore.clearDetail();
  });

  const filteredWikis = useMemo(() => {
    if (!searchQuery) return wikiStore.wikis;
    const q = searchQuery.toLowerCase();
    return wikiStore.wikis.filter((w) => w.name.toLowerCase().includes(q));
  }, [wikiStore.wikis, searchQuery]);

  const tree = useMemo(() => buildWikiTree(filteredWikis), [filteredWikis]);
  const rootChildren = Array.from(tree.children.values());

  const isMarkdown = wikiStore.textFormattingRule === "markdown";

  return (
    <div className="flex h-[calc(100vh-100px)] -mx-gutter -my-md">
      {/* Wiki Directory List */}
      <aside className="w-80 border-r border-outline-variant bg-white flex flex-col h-full shrink-0">
        <div className="p-md border-b border-outline-variant">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Filter pages..."
              type="text"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-sm">
            {wikiStore.loadingList ? (
              <div className="flex justify-center p-4">
                <span className="w-4 h-4 rounded-full bg-primary animate-pulse"></span>
              </div>
            ) : rootChildren.length > 0 ? (
              rootChildren.map((node) => <WikiTreeNodeView key={node.label} node={node} currentWikiId={wikiId} />)
            ) : (
              <div className="p-4 text-center text-body-sm text-tertiary">No wiki pages found.</div>
            )}
          </div>
        </div>
      </aside>

      {/* Markdown Viewer */}
      <section className="flex-1 overflow-y-auto bg-white p-[40px]">
        <div className="max-w-4xl mx-auto">
          {!wikiId || wikiId === "home" ? (
            <div className="text-center mt-20">
              <span className="material-symbols-outlined text-[64px] text-tertiary mb-4">menu_book</span>
              <h2 className="text-headline-md text-on-surface">Wiki Home</h2>
              <p className="text-body-md text-on-surface-variant mt-2">
                Select a page from the directory on the left to view its contents.
              </p>
            </div>
          ) : wikiStore.loadingDetail ? (
            <div className="flex justify-center p-12">
              <span className="w-6 h-6 rounded-full bg-primary animate-pulse"></span>
            </div>
          ) : wikiStore.wiki.id ? (
            <>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md uppercase mb-lg">
                <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate("/wikis/home")}>
                  WIKI
                </span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                <span className="text-on-surface font-bold truncate max-w-sm">{wikiStore.wiki.name}</span>
              </nav>

              {/* Content Header */}
              <div className="flex justify-between items-start mb-xl pb-6 border-b border-outline-variant">
                <div className="flex-1 min-w-0">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">{wikiStore.wiki.name}</h1>
                  <div className="flex items-center gap-4 text-on-surface-variant text-body-sm">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">history</span>
                      Updated {dayjs(wikiStore.wiki.updated).format("YYYY/MM/DD HH:mm")}
                    </span>
                    <span className="flex items-center gap-1">
                      <img
                        src={`/assets/users/${wikiStore.wiki.createdUser?.id}/icon`}
                        alt="icon"
                        className="w-4 h-4 rounded-full"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      {wikiStore.wiki.createdUser?.name || "Unknown"}
                    </span>
                    {wikiStore.stars.length > 0 && (
                      <span className="flex items-center gap-1 text-[#f5a623]">
                        <span className="material-symbols-outlined text-sm">star</span>
                        {wikiStore.stars.length}
                      </span>
                    )}
                  </div>
                  {wikiStore.wiki.tags && wikiStore.wiki.tags.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {wikiStore.wiki.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 bg-surface-container-high rounded text-[11px] font-bold text-on-surface-variant"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ExportButtons
                  disabled={!wikiStore.wiki.id}
                  onExportMarkdown={() => downloadWikiMarkdown(wikiStore.wiki, wikiStore.textFormattingRule)}
                  onExportPdf={async () => {
                    if (!contentRef.current) {
                      return;
                    }
                    await exportElementToPdf({
                      element: contentRef.current,
                      filename: wikiStore.wiki.name ?? "wiki",
                      title: wikiStore.wiki.name,
                    });
                  }}
                />
              </div>

              {/* Markdown Content Container */}
              <div ref={contentRef} className="markdown-body text-body-lg text-on-surface">
                {isMarkdown ? (
                  <ReactMarkdown
                    remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        return inline ? (
                          <code {...props} className={`bg-surface-container px-1 py-0.5 rounded text-code-sm ${className || ""}`}>
                            {children}
                          </code>
                        ) : (
                          <SyntaxHighlighter
                            {...props}
                            children={String(children).replace(/\n$/, "")}
                            style={oneLight}
                            language={match ? match[1] : "text"}
                            PreTag="div"
                            customStyle={{
                              border: "1px solid #e0e3e5",
                              borderRadius: "8px",
                              fontSize: "13px",
                              marginBottom: "16px",
                            }}
                          />
                        );
                      },
                      h1: ({ children }) => (
                        <h1 className="font-headline-lg text-headline-lg mb-4 border-b border-outline-variant pb-2">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="font-headline-md text-headline-md mt-8 mb-2 border-b border-outline-variant pb-2">{children}</h2>
                      ),
                      h3: ({ children }) => <h3 className="font-headline-sm text-headline-sm mt-6 mb-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-4 text-on-surface-variant leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-on-surface-variant">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-on-surface-variant">{children}</ol>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary bg-surface-container-low px-4 py-2 mb-4 italic rounded-r">
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a href={href} className="text-primary hover:underline">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {wikiStore.wiki.content?.replaceAll("\n", "  \n")}
                  </ReactMarkdown>
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-code-sm bg-surface-container-low p-4 rounded-lg border border-outline-variant text-on-surface">
                    {wikiStore.wiki.content}
                  </pre>
                )}
              </div>

              {wikiStore.wiki.attachments && wikiStore.wiki.attachments.length > 0 && (
                <div className="mt-12 p-6 border border-outline-variant bg-surface-container-lowest rounded-xl">
                  <h4 className="font-headline-sm text-headline-sm mb-4 text-on-surface">
                    Attachments ({wikiStore.wiki.attachments.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wikiStore.wiki.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={`/assets/wikis/${wikiId}/attachments/${attachment.id}`}
                        download={attachment.name}
                        className="p-3 bg-white border border-outline-variant rounded-lg flex items-center gap-3 hover:border-primary transition-colors group"
                      >
                        <span className="material-symbols-outlined text-outline group-hover:text-primary">attach_file</span>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-body-md font-medium text-on-surface truncate group-hover:text-primary">
                            {attachment.name}
                          </div>
                          <div className="text-[11px] text-tertiary">{(attachment.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <span className="material-symbols-outlined text-outline group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          download
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center mt-20 text-tertiary">Wiki page not found or unable to load.</div>
          )}
        </div>
      </section>
    </div>
  );
});
