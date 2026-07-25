import type React from "react";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

export const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const [project, setProject] = useState<any>(null);
  const [licence, setLicence] = useState<any>(null);
  const [spaceUsage, setSpaceUsage] = useState<any>(null);
  const [gitRepos, setGitRepos] = useState<any[]>([]);
  const [activeGitType, setActiveGitType] = useState<Record<number, "http" | "ssh">>({});
  const [cloneAllBranches, setCloneAllBranches] = useState<Record<number, boolean>>({});
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
    fetch("/assets/configs/space-disk-usage.json")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then(setSpaceUsage)
      .catch(() => {});
  }, []);

  const toggleCloneAll = (id: number) => {
    setCloneAllBranches((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    <div className="max-w-6xl mx-auto py-4 space-y-6">
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-3 shadow-xs">
        <span className="material-symbols-outlined text-emerald-700 text-[20px]">info</span>
        <p className="text-xs text-emerald-900 font-medium leading-relaxed">{t("notice")}</p>
      </div>

      <div className="flex justify-between items-end pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("dashboard")}</h1>
          <p className="text-slate-500 text-xs mt-1">Overview of your local project preservation status.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Licence Info Card */}
        <div className="col-span-12 md:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-card transition-shadow">
          <div>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {t("licenceInfo")}
            </span>
            <h3 className="text-xl font-bold mt-3 text-slate-900">
              {licence
                ? licence.licenceTypeId === 51
                  ? t("premium")
                  : licence.licenceTypeId === 11
                    ? t("free")
                    : `${t("planType")} ${licence.licenceTypeId || t("unknownPlan")}`
                : t("unknownPlan")}
            </h3>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">{t("userLimit")}</span>
                <span className="text-xs font-semibold text-slate-800">{licence ? (licence.userLimit === 0 ? t("unlimited") : licence.userLimit) : "-"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">{t("storageCapacity")}</span>
                <span className="text-xs font-semibold text-slate-800">
                  {licence?.storageLimit ? (licence.storageLimit / (1024 * 1024 * 1024)).toFixed(2) + " GB" : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">{t("spaceUsage")}</span>
                <span className="text-xs font-semibold text-slate-800">
                  {spaceUsage && spaceUsage.available && spaceUsage.data?.capacity
                    ? `${((spaceUsage.data.issue + spaceUsage.data.wiki + spaceUsage.data.file + spaceUsage.data.subversion + spaceUsage.data.git + spaceUsage.data.gitLFS) / (1024 * 1024 * 1024)).toFixed(2)} GB / ${(spaceUsage.data.capacity / (1024 * 1024 * 1024)).toFixed(2)} GB`
                    : t("spaceUsageNotAvailable")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-slate-500">{t("renewalDate")}</span>
                <span className="text-xs font-semibold text-emerald-700">
                  {licence?.limitDate ? new Date(licence.limitDate).toLocaleDateString() : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Info Card */}
        <div className="col-span-12 md:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-card transition-shadow">
          <div>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {t("projectDetails")}
            </span>
            <h3 className="text-xl font-bold mt-3 text-slate-900">
              {project?.name || "Unknown"} <span className="text-slate-400 font-normal">({project?.projectKey || "-"})</span>
            </h3>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">Text Formatting</span>
                <span className="text-xs font-semibold text-slate-800">{project?.textFormattingRule === "markdown" ? "Markdown" : "Backlog"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">Wiki Enabled</span>
                <span className="text-xs font-semibold text-slate-800">{project?.useWiki ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">Shared Files Enabled</span>
                <span className="text-xs font-semibold text-slate-800">{project?.useFileSharing ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">Subversion Enabled</span>
                <span className="text-xs font-semibold text-slate-800">{project?.useSubversion ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-slate-500">Git Enabled</span>
                <span className="text-xs font-semibold text-slate-800">{project?.useGit ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">hub</span>
          <h3 className="text-base font-bold text-slate-800">リポジトリ・外部連携ガイド</h3>
        </div>
        <div className="p-6 space-y-6">
          {project?.useSubversion && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {project?.useSubversion && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-bold text-sm">Subversion (SVN)</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase">
                      Enabled
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Checkout command using <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">.env</code> variables:
                  </p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 group relative">
                    <code className="text-xs text-slate-800 block break-all font-mono">
                      svn co https://{backlogHost}/svn/{projectKey}
                    </code>
                    <button
                      className="absolute top-2.5 right-2.5 text-slate-400 hover:text-emerald-600 transition-colors"
                      onClick={() => copyToClipboard(`svn co https://${backlogHost}/svn/${projectKey}`, "svn-cmd")}
                    >
                      <span className="material-symbols-outlined text-[18px]">{copiedId === "svn-cmd" ? "check" : "content_copy"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {project?.useGit && (
            <div className={`space-y-4 ${project?.useSubversion ? "border-t border-slate-100 pt-6" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 font-bold text-sm">{t("gitRepositories")}</span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase">
                  Enabled
                </span>
                <span className="text-xs text-slate-400 ml-1">{gitRepos.length} repositories</span>
              </div>
              <div className={gitRepos.length > 0 ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                {gitRepos.length === 0 ? (
                  <p className="text-xs text-slate-400">リポジトリはありません。</p>
                ) : (
                  gitRepos.map((repo) => {
                    const type = activeGitType[repo.id] || "http";
                    const isCloneAll = cloneAllBranches[repo.id] || false;
                    const url = type === "http" ? repo.httpUrl : repo.sshUrl;
                    const command = isCloneAll 
                      ? `git clone ${url} && cd ${repo.name} && git branch -r | grep -v '\\->' | while read remote; do git branch --track "\${remote#origin/}" "$remote" 2>/dev/null || true; done`
                      : `git clone ${url}`;
                    return (
                      <div key={repo.id} className="p-4 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3 pr-2 overflow-hidden">
                            <span className="font-semibold text-xs text-slate-800 truncate" title={repo.name}>
                              {repo.name}
                            </span>
                            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                              <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" checked={isCloneAll} onChange={() => toggleCloneAll(repo.id)} />
                              <span className="text-[11px] text-slate-500 font-medium">{t("cloneAllBranches")}</span>
                            </label>
                          </div>
                          <div className="flex bg-slate-200/60 rounded-md p-0.5 shrink-0">
                            <button
                              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                                type === "http" ? "bg-white shadow-xs text-emerald-700" : "text-slate-500 hover:text-slate-800"
                              }`}
                              onClick={() => toggleGitType(repo.id, "http")}
                            >
                              HTTP
                            </button>
                            <button
                              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                                type === "ssh" ? "bg-white shadow-xs text-emerald-700" : "text-slate-500 hover:text-slate-800"
                              }`}
                              onClick={() => toggleGitType(repo.id, "ssh")}
                            >
                              SSH
                            </button>
                          </div>
                        </div>
                        <div className="relative group">
                          <input
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-700 focus:ring-0 pr-8 shadow-xs"
                            readOnly
                            value={command}
                          />
                          <button
                            className="absolute right-2 top-1.5 text-slate-400 hover:text-emerald-600"
                            onClick={() => copyToClipboard(command, `git-${repo.id}`)}
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
    </div>
  );
};

