import { useDidMount } from "@better-hooks/lifecycle";
import dayjs from "dayjs";
import { observer } from "mobx-react-lite";
import type React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { useStore } from "../stores";

export const Issues: React.FC = observer(() => {
  const { pageStore } = useStore();
  const { t } = useI18n();

  useDidMount(() => {
    pageStore.fetch();
    pageStore.generateIndex();
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="mb-2">
        <div className="relative w-full md:max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm transition-all"
            placeholder={pageStore.loadingIndexes ? t("loadingSearch") : t("searchKeywords")}
            disabled={pageStore.loadingIndexes}
            value={pageStore.keyword}
            onChange={(e) => pageStore.setKeyword(e.target.value)}
            type="text"
          />
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-[#D0D7DE] overflow-hidden shadow-sm">
          <div className="bg-[#F6F8FA] border-b border-[#D0D7DE] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-body-sm font-bold text-on-surface">{t("backedUpIssues")}</span>
              {pageStore.loadingPages ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-body-sm text-tertiary">
                    {t("downloading")} {pageStore.currentDownloading} / {pageStore.totalPage}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-body-sm text-tertiary">{t("allSyncsVerified")}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                className={`p-1.5 rounded transition-colors ${pageStore.page > 0 ? "hover:bg-surface-container-high cursor-pointer text-on-surface" : "text-outline opacity-50 cursor-not-allowed"}`}
                onClick={() => pageStore.setPage(Math.max(0, pageStore.page - 1))}
                disabled={pageStore.page === 0}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="text-body-sm px-2">
                {t("page")} {pageStore.page + 1} {t("of")} {pageStore.maxPage + 1}
              </span>
              <button
                className={`p-1.5 rounded transition-colors ${pageStore.page < pageStore.maxPage ? "hover:bg-surface-container-high cursor-pointer text-on-surface" : "text-outline opacity-50 cursor-not-allowed"}`}
                onClick={() => pageStore.setPage(Math.min(pageStore.maxPage, pageStore.page + 1))}
                disabled={pageStore.page >= pageStore.maxPage}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-label-md text-tertiary border-b border-outline-variant bg-surface-container-lowest">
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider w-24">{t("id")}</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">{t("title")}</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider w-32">{t("status")}</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider w-32">{t("priority")}</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider w-40 text-right">{t("modified")}</th>
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-[#D0D7DE]">
                {pageStore.pages.map((row: any) => (
                  <tr key={row.id} className="hover:bg-[#F6F8FA] group transition-colors cursor-pointer">
                    <td className="px-4 py-4 font-code-sm text-primary font-bold">
                      <Link to={`/issues/${row.id}`} className="hover:underline">
                        {row.issueKey}
                      </Link>
                    </td>
                    <td className="px-4 py-4 font-medium text-on-surface">
                      <Link to={`/issues/${row.id}`} className="hover:underline">
                        {row.summary}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="px-2.5 py-0.5 text-[11px] font-bold rounded-full border"
                        style={{
                          backgroundColor: row.status?.color || "#EFF1F3",
                          borderColor: row.status?.color || "#D0D7DE",
                          color: "white",
                        }}
                      >
                        {row.status?.name}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 bg-[#EFF1F3] text-tertiary text-[11px] font-bold rounded border border-outline-variant">
                        {row.priority?.name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-tertiary">{dayjs(row.updated).format("YYYY/MM/DD")}</td>
                  </tr>
                ))}
                {pageStore.pages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-tertiary">
                      {t("noIssuesFound")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#DDF4FF] dark:bg-primary/20 border border-primary rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary">cloud_off</span>
              <div>
                <h4 className="text-body-md font-bold text-[#0550AE] mb-1">{t("archiveIntegrityNote")}</h4>
                <p className="text-body-sm text-primary dark:text-blue-300 leading-tight">{t("archiveIntegrityDesc")}</p>
              </div>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden h-48 border border-outline-variant shadow-sm bg-primary-fixed">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-primary/20 z-10"></div>
            <div className="absolute bottom-4 left-4 z-20">
              <span className="text-white font-bold text-headline-sm">{t("vaultAnalytics")}</span>
              <p className="text-white/80 text-body-sm">{t("localSearchIndexed")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
