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

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#DDF4FF] dark:bg-primary/20 border border-primary rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          <p className="text-body-sm text-primary dark:text-blue-300 leading-tight">{t("sharedFilesDownloadHint")}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#D0D7DE] overflow-hidden shadow-sm">
        <div className="bg-[#F6F8FA] border-b border-[#D0D7DE] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">folder_shared</span>
            <span className="text-body-sm font-bold text-on-surface">{t("sharedFiles")}</span>
          </div>
          {!sharedFileStore.loadingList && files.length > 0 && (
            <span className="text-body-sm text-tertiary">
              {files.length} {t("filesUnit")} ・ {formatSize(totalSize)}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-label-md text-tertiary border-b border-outline-variant bg-surface-container-lowest">
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">{t("fileName")}</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider w-32 text-right">{t("size")}</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider w-40 text-right">{t("modified")}</th>
              </tr>
            </thead>
            <tbody className="text-body-sm divide-y divide-[#D0D7DE]">
              {sharedFileStore.loadingList ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-tertiary">
                    <span className="material-symbols-outlined animate-spin text-outline align-middle">refresh</span>
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-tertiary">
                    {t("noSharedFiles")}
                  </td>
                </tr>
              ) : (
                sortedDirs.flatMap((dir) => {
                  const rows = (groups.get(dir) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
                  return [
                    <tr key={`dir:${dir}`} className="bg-surface-container-lowest">
                      <td colSpan={3} className="px-4 py-2 text-tertiary text-xs">
                        <span className="flex items-center gap-2 font-mono">
                          <span className="material-symbols-outlined text-outline text-[16px]">folder</span>
                          {dir}
                        </span>
                      </td>
                    </tr>,
                    ...rows.map((file) => (
                      <tr key={file.id} className="hover:bg-[#F6F8FA] group transition-colors">
                        <td className="px-4 py-3 font-medium text-on-surface">
                          <a href={buildHref(file)} download={file.name} className="text-primary hover:underline flex items-center gap-2">
                            <span className="material-symbols-outlined text-outline text-[18px]">description</span>
                            {file.name}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right text-tertiary font-mono">{formatSize(file.size)}</td>
                        <td className="px-4 py-3 text-right text-tertiary">{dayjs(file.updated).format("YYYY/MM/DD")}</td>
                      </tr>
                    )),
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
