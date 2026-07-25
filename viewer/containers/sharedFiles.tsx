import { useDidMount } from "@better-hooks/lifecycle";
import dayjs from "dayjs";
import { observer } from "mobx-react-lite";
import type React from "react";
import { useI18n } from "../i18n";
import { useStore } from "../stores";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// dir + name から、余分なスラッシュを畳んで先頭スラッシュを除いた相対パスを作り、
// publicDir (= scripts/backlog/dist) で配信される asset の URL に変換する。
const buildHref = (file: BacklogSharedFile): string => {
  const rel = `${file.dir}/${file.name}`.replace(/\/+/g, "/").replace(/^\//, "");
  return `/assets/shared-files/${rel.split("/").map(encodeURIComponent).join("/")}`;
};

export const SharedFiles: React.FC = observer(() => {
  const { sharedFileStore } = useStore();
  const { t } = useI18n();

  useDidMount(() => {
    sharedFileStore.fetch();
  });

  const files = sharedFileStore.files;
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  // フォルダ (dir) ごとにグループ化し、元のフォルダ構造が分かるように表示する。
  const groups = new Map<string, BacklogSharedFile[]>();
  for (const f of files) {
    const dir = f.dir || "/";
    const arr = groups.get(dir) ?? [];
    arr.push(f);
    groups.set(dir, arr);
  }
  const sortedDirs = [...groups.keys()].sort();

  const allSelected = files.length > 0 && files.every((f) => sharedFileStore.isSelected(f.id));
  const toggleAll = () => {
    if (allSelected) {
      sharedFileStore.clearSelection();
    } else {
      sharedFileStore.setSelection(files.map((f) => f.id));
    }
  };

  const selectedCount = sharedFileStore.selectedIds.size;
  const canDownload = sharedFileStore.devAvailable && selectedCount > 0 && !sharedFileStore.downloading;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-4 py-3 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-emerald-700 text-[20px]">info</span>
          <p className="text-xs text-emerald-900 leading-relaxed font-medium">
            {sharedFileStore.devAvailable ? t("sharedFilesDownloadHint") : t("downloadDevOnly")}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#D0D7DE] overflow-hidden shadow-sm">
        <div className="bg-[#F6F8FA] border-b border-[#D0D7DE] px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">folder_shared</span>
            <span className="text-body-sm font-bold text-on-surface">{t("sharedFiles")}</span>
            {!sharedFileStore.loadingList && files.length > 0 && (
              <span className="text-body-sm text-tertiary">
                ・{files.length} {t("filesUnit")} ・ {formatSize(totalSize)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {sharedFileStore.lastResult && (
              <span className="text-body-sm text-tertiary">
                {sharedFileStore.lastResult.ok > 0 && (
                  <span className="text-secondary">
                    ✓ {sharedFileStore.lastResult.ok} {t("downloadSucceeded")}
                  </span>
                )}
                {sharedFileStore.lastResult.failed > 0 && (
                  <span className="text-error ml-2">
                    ✗ {sharedFileStore.lastResult.failed} {t("downloadFailed")}
                  </span>
                )}
              </span>
            )}
            {sharedFileStore.devAvailable && (
              <button
                type="button"
                onClick={() => sharedFileStore.downloadSelected()}
                disabled={!canDownload}
                className="flex items-center gap-1.5 px-3 py-1 text-body-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={`material-symbols-outlined text-[18px] ${sharedFileStore.downloading ? "animate-spin" : ""}`}>
                  {sharedFileStore.downloading ? "progress_activity" : "download"}
                </span>
                {sharedFileStore.downloading
                  ? t("downloadInProgress")
                  : `${t("downloadSelected")}${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-label-md text-tertiary border-b border-outline-variant bg-surface-container-lowest">
                <th className="px-4 py-3 w-10">
                  {sharedFileStore.devAvailable && files.length > 0 && (
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer align-middle" />
                  )}
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">{t("fileName")}</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider w-32 text-right">{t("size")}</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider w-40 text-right">{t("modified")}</th>
              </tr>
            </thead>
            <tbody className="text-body-sm divide-y divide-[#D0D7DE]">
              {sharedFileStore.loadingList ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-tertiary">
                    <span className="material-symbols-outlined animate-spin text-outline align-middle">progress_activity</span>
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-tertiary">
                    {t("noSharedFiles")}
                  </td>
                </tr>
              ) : (
                sortedDirs.flatMap((dir) => {
                  const rows = (groups.get(dir) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
                  return [
                    <tr key={`dir:${dir}`} className="bg-surface-container-lowest">
                      <td colSpan={4} className="px-4 py-2 text-tertiary text-xs">
                        <span className="flex items-center gap-2 font-mono">
                          <span className="material-symbols-outlined text-outline text-[16px]">folder</span>
                          {dir}
                        </span>
                      </td>
                    </tr>,
                    ...rows.map((file) => {
                      const downloaded = sharedFileStore.isDownloaded(file.id);
                      return (
                        <tr key={file.id} className="hover:bg-[#F6F8FA] group transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={sharedFileStore.isSelected(file.id)}
                              onChange={() => sharedFileStore.toggle(file.id)}
                              className="cursor-pointer align-middle"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-on-surface">
                            {downloaded ? (
                              <a
                                href={buildHref(file)}
                                download={file.name}
                                className="text-primary hover:underline flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-outline text-[18px]">description</span>
                                {file.name}
                              </a>
                            ) : (
                              <span className="flex items-center gap-2 text-on-surface">
                                <span className="material-symbols-outlined text-outline text-[18px]">draft</span>
                                {file.name}
                                <span className="text-[11px] text-tertiary border border-outline-variant rounded px-1.5 py-0.5">
                                  {t("notDownloaded")}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-tertiary font-mono">{formatSize(file.size)}</td>
                          <td className="px-4 py-3 text-right text-tertiary">{dayjs(file.updated).format("YYYY/MM/DD")}</td>
                        </tr>
                      );
                    }),
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
