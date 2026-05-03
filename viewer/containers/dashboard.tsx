import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n";

export const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const [project, setProject] = useState<any>(null);
  const [licence, setLicence] = useState<any>(null);
  const [gitRepos, setGitRepos] = useState<any[]>([]);
  const [activeGitType, setActiveGitType] = useState<Record<number, "http" | "ssh">>(
    {}
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/assets/configs/project.json")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then(setProject)
      .catch(() => {});
    fetch("/assets/configs/licence.json")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then(setLicence)
      .catch(() => {});
    fetch("/assets/configs/git-repositories.json")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then(setGitRepos)
      .catch(() => {});
  }, []);

  const toggleGitType = (id: number, type: "http" | "ssh") => {
    setActiveGitType((prev) => ({ ...prev, [id]: type }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const backlogHost = import.meta.env.BACKLOG_HOST || window.location.hostname || "your-space.backlog.jp";
  const projectKey = import.meta.env.BACKLOG_PROJECT_KEY || project?.projectKey || "PROJ";

  return (
    <div className="max-w-6xl mx-auto py-lg">
      <div className="mb-lg bg-[#DDF4FF] dark:bg-primary/20 border border-primary rounded-lg p-md flex items-center gap-md">
        <span className="material-symbols-outlined text-primary dark:text-blue-300">info</span>
        <p className="font-body-md text-primary dark:text-blue-300 font-medium">
          {t("notice")}
        </p>
      </div>

      <div className="flex justify-between items-end mb-xl">
        <div>
          <h1 className="font-headline-lg text-on-surface">{t("dashboard")}</h1>
          <p className="text-on-surface-variant font-body-md">
            Overview of your local project preservation status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-lg mb-lg">
        {/* Licence Info Card */}
        <div className="col-span-12 md:col-span-6 bg-white border border-[#D0D7DE] rounded-xl p-xl flex flex-col justify-between">
          <div>
            <span className="text-label-md bg-[#EFF1F3] text-on-surface-variant px-sm py-xs rounded font-label-md uppercase">
              {t("licenceInfo")}
            </span>
            <h3 className="font-headline-md mt-sm text-on-surface">
              {licence ? (
                licence.licenceTypeId === 51 ? t("premium") : `${t("planType")} ${licence.licenceTypeId || t("unknownPlan")}`
              ) : t("unknownPlan")}
            </h3>
            <div className="mt-lg space-y-md">
              <div className="flex justify-between items-center py-2 border-b border-surface-container">
                <span className="text-body-sm text-on-surface-variant">{t("userLimit")}</span>
                <span className="font-bold">
                  {licence ? (licence.userLimit === 0 ? t("unlimited") : licence.userLimit) : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-container">
                <span className="text-body-sm text-on-surface-variant">{t("storageCapacity")}</span>
                <span className="font-bold">
                  {licence?.storageLimit ? (licence.storageLimit / (1024 * 1024 * 1024)).toFixed(2) + " GB" : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-body-sm text-on-surface-variant">{t("renewalDate")}</span>
                <span className="font-bold text-primary">
                  {licence?.limitDate ? new Date(licence.limitDate).toLocaleDateString() : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Info Card */}
        <div className="col-span-12 md:col-span-6 bg-white border border-[#D0D7DE] rounded-xl p-xl flex flex-col justify-between">
          <div>
            <span className="text-label-md bg-[#EFF1F3] text-on-surface-variant px-sm py-xs rounded font-label-md uppercase">
              {t("projectDetails")}
            </span>
            <h3 className="font-headline-md mt-sm text-on-surface">
              {project?.name || "Unknown"} ({project?.projectKey || "-"})
            </h3>
            <div className="mt-lg space-y-md">
              <div className="flex justify-between items-center py-2 border-b border-surface-container">
                <span className="text-body-sm text-on-surface-variant">Text Formatting</span>
                <span className="font-bold">{project?.textFormattingRule === "markdown" ? "Markdown" : "Backlog"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-container">
                <span className="text-body-sm text-on-surface-variant">Wiki Enabled</span>
                <span className="font-bold">{project?.useWiki ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-container">
                <span className="text-body-sm text-on-surface-variant">Shared Files Enabled</span>
                <span className="font-bold">{project?.useFileSharing ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-container">
                <span className="text-body-sm text-on-surface-variant">Subversion Enabled</span>
                <span className="font-bold">{project?.useSubversion ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-body-sm text-on-surface-variant">Git Enabled</span>
                <span className="font-bold">{project?.useGit ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 bg-white border border-[#D0D7DE] rounded-xl overflow-hidden mb-lg">
        <div className="px-xl py-lg border-b border-[#D0D7DE] bg-[#F6F8FA] flex items-center gap-md">
          <span className="material-symbols-outlined text-primary">hub</span>
          <h3 className="font-headline-sm">リポジトリ・外部連携ガイド</h3>
        </div>
        <div className="p-xl flex flex-col gap-xl">
          {(project?.useSubversion || project?.useFileSharing) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-xl items-start">
              {project?.useSubversion && (
                <div className="space-y-md">
                  <div className="flex items-center gap-sm">
                    <span className="text-on-surface font-bold">Subversion (SVN)</span>
                    <span className="bg-secondary/10 text-[#006e2b] text-[10px] font-black px-1.5 rounded border border-[#006e2b]/20 uppercase">
                      Enabled
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    Checkout command using <code>.env</code> variables:
                  </p>
                  <div className="bg-surface-container-low p-md rounded-lg border border-outline-variant group relative">
                    <code className="text-code-sm text-on-surface block break-all">
                      svn co https://{backlogHost}/svn/{projectKey}
                    </code>
                    <button
                      className="absolute top-2 right-2 text-outline hover:text-primary transition-colors"
                      onClick={() =>
                        copyToClipboard(
                          `svn co https://${backlogHost}/svn/${projectKey}`,
                          "svn-cmd"
                        )
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {copiedId === "svn-cmd" ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {project?.useFileSharing && (
                <div className="space-y-md">
                  <div className="flex items-center gap-sm">
                    <span className="text-on-surface font-bold">共有ファイル (Shared Files)</span>
                    <span className="bg-secondary/10 text-[#006e2b] text-[10px] font-black px-1.5 rounded border border-[#006e2b]/20 uppercase">
                      Enabled
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    ブラウザで共有ファイルにアクセスする:
                  </p>
                  <div className="bg-surface-container-low p-md rounded-lg border border-outline-variant group relative">
                    <a
                      href={`https://${backlogHost}/file/${projectKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-code-sm text-primary hover:underline block break-all"
                    >
                      https://{backlogHost}/file/{projectKey}
                    </a>
                    <button
                      className="absolute top-2 right-2 text-outline hover:text-primary transition-colors"
                      onClick={() =>
                        copyToClipboard(
                          `https://${backlogHost}/file/${projectKey}`,
                          "file-sharing-link"
                        )
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {copiedId === "file-sharing-link" ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {project?.useGit && (
            <div className={`space-y-md ${(project?.useSubversion || project?.useFileSharing) ? "border-t border-[#D0D7DE] pt-xl" : ""}`}>
              <div className="flex items-center gap-sm">
                <span className="text-on-surface font-bold">Git Repositories</span>
                <span className="bg-secondary/10 text-[#006e2b] text-[10px] font-black px-1.5 rounded border border-[#006e2b]/20 uppercase">
                  Enabled
                </span>
                <span className="text-label-sm text-on-surface-variant ml-sm">
                  {gitRepos.length} repositories
                </span>
              </div>
              <div className={gitRepos.length > 0 ? "grid grid-cols-1 md:grid-cols-2 gap-md" : "space-y-md"}>
                {gitRepos.length === 0 ? (
                  <p className="text-body-sm text-outline">リポジトリはありません。</p>
                ) : (
                  gitRepos.map((repo) => {
                    const type = activeGitType[repo.id] || "http";
                    const url = type === "http" ? repo.httpUrl : repo.sshUrl;
                    return (
                      <div
                        key={repo.id}
                        className="p-md bg-surface-bright border border-surface-container-high rounded-lg"
                      >
                        <div className="flex justify-between items-center mb-sm">
                          <span className="font-medium text-body-md truncate pr-sm" title={repo.name}>{repo.name}</span>
                          <div className="flex bg-surface-container rounded p-0.5 shrink-0">
                            <button
                              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                                type === "http"
                                  ? "bg-white shadow-sm text-primary"
                                  : "text-outline hover:text-on-surface"
                              }`}
                              onClick={() => toggleGitType(repo.id, "http")}
                            >
                              HTTP
                            </button>
                            <button
                              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                                type === "ssh"
                                  ? "bg-white shadow-sm text-primary"
                                  : "text-outline hover:text-on-surface"
                              }`}
                              onClick={() => toggleGitType(repo.id, "ssh")}
                            >
                              SSH
                            </button>
                          </div>
                        </div>
                        <div className="relative group">
                          <input
                            className="w-full bg-white border border-outline-variant rounded px-sm py-1.5 text-code-sm text-on-surface-variant focus:ring-0 pr-8"
                            readOnly
                            value={url}
                          />
                          <button
                            className="absolute right-2 top-1.5 text-outline hover:text-primary"
                            onClick={() => copyToClipboard(url, `git-${repo.id}`)}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {copiedId === `git-${repo.id}` ? "check" : "content_copy"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#ffdad6]/20 border-t border-[#ba1a1a]/10 p-xl flex items-start gap-md rounded-b-xl">
        <span className="material-symbols-outlined text-[#ba1a1a]">warning</span>
        <div>
          <p className="font-bold text-on-background">ファイル共有（共有ファイル）に関する注意</p>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            `useFileSharing: true` 設定ですが、APIの制限によりツールによる自動バックアップは汎用的ではありません。
            共有ファイル内のデータは、手動での確認とエクスポートが必要です。
          </p>
        </div>
      </div>
    </div>
  );
};
