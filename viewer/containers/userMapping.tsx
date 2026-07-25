import React, { useEffect, useState, useMemo } from "react";
import { useI18n } from "../i18n";

export interface SourceUser {
  id: number | string;
  name: string;
  mailAddress?: string;
  userId?: string;
}

export interface TargetUser {
  id: number | string;
  name: string;
  mailAddress?: string;
  userId?: string;
}

export interface MatchCandidate {
  source: SourceUser;
  target?: TargetUser;
  reason?: "email" | "name" | "userId" | "manual";
  status: "accepted" | "rejected" | "pending";
}

export const UserMapping = () => {
  const { t, lang } = useI18n();

  // Navigation steps: 1 = Auto Match Review, 2 = Manual Edit & Export
  const [step, setStep] = useState<1 | 2>(1);

  // State
  const [sourceUsers, setSourceUsers] = useState<SourceUser[]>([]);
  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);
  const [userMapping, setUserMapping] = useState<Record<string, string | number>>({});
  
  // Auto-match state
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);

  // UI Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "mapped" | "unmapped">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Process Auto-Matching logic
  const runAutoMatchForData = (srcs: SourceUser[], tgts: TargetUser[]) => {
    if (srcs.length === 0) return;

    const targetByEmail = new Map<string, TargetUser>();
    const targetByName = new Map<string, TargetUser>();
    const targetByUserId = new Map<string, TargetUser>();

    tgts.forEach((tu) => {
      if (tu.mailAddress) targetByEmail.set(tu.mailAddress.trim().toLowerCase(), tu);
      if (tu.name) targetByName.set(tu.name.trim().toLowerCase(), tu);
      if (tu.userId) targetByUserId.set(tu.userId.trim().toLowerCase(), tu);
    });

    const candidates: MatchCandidate[] = srcs.map((su) => {
      const email = su.mailAddress?.trim().toLowerCase();
      const name = su.name?.trim().toLowerCase();
      const uId = su.userId?.trim().toLowerCase();

      if (email && targetByEmail.has(email)) {
        return { source: su, target: targetByEmail.get(email), reason: "email", status: "accepted" };
      }
      if (name && targetByName.has(name)) {
        return { source: su, target: targetByName.get(name), reason: "name", status: "accepted" };
      }
      if (uId && targetByUserId.has(uId)) {
        return { source: su, target: targetByUserId.get(uId), reason: "userId", status: "accepted" };
      }

      return { source: su, target: undefined, status: "pending" };
    });

    setMatchCandidates(candidates);
  };

  // Attempt auto-loading existing users from backup vault assets on initial load
  useEffect(() => {
    const loadDefaultAssets = async () => {
      try {
        const [srcRes, tgtRes] = await Promise.all([
          fetch("/assets/configs/users.json").catch(() => null),
          fetch("/assets/configs/users_list.json").catch(() => null),
        ]);

        let loadedSrc: SourceUser[] = [];
        let loadedTgt: TargetUser[] = [];

        if (srcRes && srcRes.ok) {
          const srcData = await srcRes.json();
          if (Array.isArray(srcData)) {
            loadedSrc = srcData;
            setSourceUsers(srcData);
          }
        }

        if (tgtRes && tgtRes.ok) {
          const tgtData = await tgtRes.json();
          if (Array.isArray(tgtData)) {
            loadedTgt = tgtData;
            setTargetUsers(tgtData);
          }
        }

        if (loadedSrc.length > 0) {
          runAutoMatchForData(loadedSrc, loadedTgt);
        }
      } catch (_e) {
        // Ignore fallback errors
      }
    };
    loadDefaultAssets();
  }, []);

  // Sample data charger
  const loadSampleData = () => {
    const sampleSource: SourceUser[] = [
      { id: 101, name: "山田 太郎", mailAddress: "taro.yamada@example.com", userId: "yamada_t" },
      { id: 102, name: "佐藤 花子", mailAddress: "hanako.sato@example.com", userId: "sato_h" },
      { id: 103, name: "鈴木 一郎", mailAddress: "ichiro.suzuki@example.org", userId: "suzuki_i" },
      { id: 104, name: "John Smith", mailAddress: "john.smith@example.net", userId: "jsmith" },
      { id: 105, name: "開発チーム共有アカウント", mailAddress: "", userId: "dev_team" },
    ];

    const sampleTarget: TargetUser[] = [
      { id: 201, name: "山田 太郎", mailAddress: "taro.yamada@example.com", userId: "yamada_t" },
      { id: 202, name: "佐藤 花子", mailAddress: "hanako.sato@newdomain.com", userId: "sato_h" },
      { id: 203, name: "John Smith", mailAddress: "john.smith@example.net", userId: "jsmith" },
      { id: 204, name: "管理者 ユーザー", mailAddress: "admin@example.com", userId: "admin" },
    ];

    setSourceUsers(sampleSource);
    setTargetUsers(sampleTarget);
    runAutoMatchForData(sampleSource, sampleTarget);
    showToast(lang === "ja" ? "サンプルデータを読み込みました" : "Sample data loaded");
  };

  // Apply matching candidates to mapping table & go to Step 2
  const applyMatchesAndProceed = () => {
    const newMapping: Record<string, string | number> = { ...userMapping };

    matchCandidates.forEach((c) => {
      if (c.status === "accepted" && c.target) {
        const key = c.source.mailAddress || c.source.name || String(c.source.id);
        newMapping[key] = c.target.id;
      }
    });

    setUserMapping(newMapping);
    setStep(2);
  };

  const setCandidateStatus = (index: number, status: "accepted" | "rejected") => {
    setMatchCandidates((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status };
      return copy;
    });
  };

  const acceptAllCandidates = () => {
    setMatchCandidates((prev) => prev.map((c) => (c.target ? { ...c, status: "accepted" } : c)));
  };

  const rejectAllCandidates = () => {
    setMatchCandidates((prev) => prev.map((c) => ({ ...c, status: "rejected" })));
  };

  // File parse handlers for custom/manual uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "source" | "target" | "mapping") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (!content) return;

      try {
        if (type === "mapping" || file.name.endsWith(".json")) {
          const parsed = JSON.parse(content);
          if (type === "mapping") {
            setUserMapping(parsed);
            showToast(lang === "ja" ? "user-mapping.json を読み込みました" : "Loaded user-mapping.json");
          } else if (type === "source") {
            setSourceUsers(Array.isArray(parsed) ? parsed : []);
            runAutoMatchForData(Array.isArray(parsed) ? parsed : [], targetUsers);
          } else if (type === "target") {
            setTargetUsers(Array.isArray(parsed) ? parsed : []);
            runAutoMatchForData(sourceUsers, Array.isArray(parsed) ? parsed : []);
          }
        } else if (file.name.endsWith(".csv")) {
          const lines = content.split("\n").filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
            const rows = lines.slice(1).map((line, idx) => {
              const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
              const rowObj: any = { id: idx + 1 };
              headers.forEach((h, i) => {
                rowObj[h] = cols[i] || "";
              });
              return {
                id: rowObj["Source Backlog user id"] || rowObj.id || rowObj.ID || idx + 1,
                name: rowObj["Source Backlog user display name"] || rowObj.Name || rowObj.name || `User ${idx + 1}`,
                mailAddress: rowObj["Source Backlog user email"] || rowObj.Email || rowObj.mailAddress || "",
                userId: rowObj.userId || rowObj.UserId || "",
              };
            });

            if (type === "source") {
              setSourceUsers(rows);
              runAutoMatchForData(rows, targetUsers);
            }
            if (type === "target") {
              setTargetUsers(rows);
              runAutoMatchForData(sourceUsers, rows);
            }
            showToast(lang === "ja" ? `CSVから ${rows.length} 件読み込みました` : `Loaded ${rows.length} rows from CSV`);
          }
        }
      } catch (err) {
        showToast(lang === "ja" ? "ファイルの読み込みに失敗しました" : "Failed to parse file");
      }
    };
    reader.readAsText(file);
  };

  // Filtered rows for Step 2 Table
  const filteredSourceUsers = useMemo(() => {
    return sourceUsers.filter((su) => {
      const key = su.mailAddress || su.name || String(su.id);
      const isMapped = !!userMapping[key];

      if (filterStatus === "mapped" && !isMapped) return false;
      if (filterStatus === "unmapped" && isMapped) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = su.name?.toLowerCase().includes(q);
        const matchEmail = su.mailAddress?.toLowerCase().includes(q);
        const matchId = String(su.id).toLowerCase().includes(q);
        return matchName || matchEmail || matchId;
      }

      return true;
    });
  }, [sourceUsers, userMapping, filterStatus, searchQuery]);

  // Statistics
  const mappedCount = useMemo(() => {
    return sourceUsers.filter((su) => {
      const key = su.mailAddress || su.name || String(su.id);
      return !!userMapping[key];
    }).length;
  }, [sourceUsers, userMapping]);

  // JSON Download & Server Direct Save
  const downloadMappingJson = async () => {
    const jsonStr = JSON.stringify(userMapping, null, 2);

    let savedOnServer = false;
    try {
      const res = await fetch("/api/user-mapping/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping: userMapping }),
      });
      if (res.ok) {
        savedOnServer = true;
      }
    } catch (_e) {
      // Ignore network fallback
    }

    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-mapping.json";
    a.click();
    URL.revokeObjectURL(url);

    if (savedOnServer) {
      showToast(
        lang === "ja"
          ? "所定の位置 (user-mapping.json) に自動保存し、ダウンロードしました！"
          : "Saved directly to user-mapping.json in workspace & downloaded!"
      );
    } else {
      showToast(lang === "ja" ? "user-mapping.json をダウンロードしました" : "Downloaded user-mapping.json");
    }
  };

  // Copy JSON to Clipboard
  const copyMappingJson = () => {
    const jsonStr = JSON.stringify(userMapping, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast(lang === "ja" ? "クリップボードにコピーしました" : "Copied JSON to clipboard");
    });
  };

  // Export users.csv
  const downloadUsersCsv = () => {
    const headers = [
      "Source Backlog user id",
      "Source Backlog user display name",
      "Source Backlog user email",
      "Destination Backlog user name",
    ];

    const rows = sourceUsers.map((su) => {
      const key = su.mailAddress || su.name || String(su.id);
      const dest = userMapping[key] || "";
      return [
        `"${String(su.id).replace(/"/g, '""')}"`,
        `"${(su.name || "").replace(/"/g, '""')}"`,
        `"${(su.mailAddress || "").replace(/"/g, '""')}"`,
        `"${String(dest).replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast(lang === "ja" ? "users.csv をダウンロードしました" : "Downloaded users.csv");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-blue-600 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <span className="material-symbols-outlined text-green-400">check_circle</span>
          <span className="text-body-md font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface dark:text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[32px]">sync_alt</span>
            {t("userMappingTitle" as any)}
          </h1>
          <p className="text-body-md text-outline dark:text-slate-400 mt-1">
            {t("userMappingSubtitle" as any)}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadSampleData}
            className="px-4 py-2 text-body-sm font-semibold rounded-xl border border-outline-variant hover:bg-surface-container dark:border-slate-700 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">labs</span>
            {lang === "ja" ? "サンプルデータで試す" : "Load Sample Data"}
          </button>
        </div>
      </div>

      {/* Step Indicator (2 Steps) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => setStep(1)}
          className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${
            step === 1
              ? "border-primary bg-primary/5 dark:bg-blue-900/20 text-primary dark:text-blue-400"
              : "border-outline-variant dark:border-slate-800 bg-white dark:bg-slate-900 text-outline hover:border-primary/50"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-body-md ${
              step === 1 ? "bg-primary text-white" : "bg-surface-container dark:bg-slate-800"
            }`}
          >
            1
          </div>
          <div>
            <div className="text-body-md font-bold">{lang === "ja" ? "1. 自動照合確認 (Auto-Match)" : "1. Auto-Matching Review"}</div>
            <div className="text-body-sm opacity-80">{lang === "ja" ? "メール・名前にて一括提案" : "Match by Email / Name"}</div>
          </div>
        </button>

        <button
          onClick={() => setStep(2)}
          className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${
            step === 2
              ? "border-primary bg-primary/5 dark:bg-blue-900/20 text-primary dark:text-blue-400"
              : "border-outline-variant dark:border-slate-800 bg-white dark:bg-slate-900 text-outline hover:border-primary/50"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-body-md ${
              step === 2 ? "bg-primary text-white" : "bg-surface-container dark:bg-slate-800"
            }`}
          >
            2
          </div>
          <div>
            <div className="text-body-md font-bold">{lang === "ja" ? "2. 手動編集 & 保存 (Edit & Save)" : "2. Edit & Export"}</div>
            <div className="text-body-sm opacity-80">{lang === "ja" ? "個別割当 & user-mapping.json 保存" : "Export user-mapping.json"}</div>
          </div>
        </button>
      </div>

      {/* Auto-Loaded Data Status Banner */}
      <div className="bg-surface-container-low dark:bg-slate-800/60 border border-outline-variant dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-body-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
            <span className="font-bold text-on-surface dark:text-white">
              {lang === "ja" ? `移行元ユーザー: ${sourceUsers.length} 件` : `Source Users: ${sourceUsers.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {targetUsers.length > 0 ? (
              <>
                <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                <span className="font-bold text-on-surface dark:text-white">
                  {lang === "ja" ? `移行先ユーザー: ${targetUsers.length} 件 (自動読込)` : `Target Users: ${targetUsers.length}`}
                </span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  {lang === "ja"
                    ? "移行先ユーザー未検出 (npm run fetch:target-users を実行またはファイルをドロップ)"
                    : "Target users missing (Run npm run fetch:target-users or drop file)"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Collapsible Manual File Import Dropdown */}
        <details className="group">
          <summary className="cursor-pointer text-body-sm font-semibold text-primary dark:text-blue-400 hover:underline list-none flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">folder_open</span>
            {lang === "ja" ? "外部ファイルを個別選択 / ドロップ" : "Custom File Upload"}
          </summary>
          <div className="mt-3 p-4 bg-white dark:bg-slate-900 border border-outline-variant dark:border-slate-700 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="p-3 border border-dashed border-outline-variant dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary text-center">
              <span className="text-body-xs font-bold text-outline dark:text-slate-300 block mb-1">
                {lang === "ja" ? "移行元 Users (.json / .csv)" : "Source Users (.json / .csv)"}
              </span>
              <input type="file" accept=".json,.csv" onChange={(e) => handleFileUpload(e, "source")} className="hidden" />
              <span className="text-body-xs bg-primary/10 text-primary px-3 py-1 rounded-lg inline-block font-bold">ファイルを選択</span>
            </label>

            <label className="p-3 border border-dashed border-outline-variant dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary text-center">
              <span className="text-body-xs font-bold text-outline dark:text-slate-300 block mb-1">
                {lang === "ja" ? "移行先 Users (.json / .csv)" : "Target Users (.json / .csv)"}
              </span>
              <input type="file" accept=".json,.csv" onChange={(e) => handleFileUpload(e, "target")} className="hidden" />
              <span className="text-body-xs bg-green-600/10 text-green-600 px-3 py-1 rounded-lg inline-block font-bold">ファイルを選択</span>
            </label>
          </div>
        </details>
      </div>

      {/* STEP 1: Auto-Match Review */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">psychology</span>
                {lang === "ja" ? "STEP 1: 自動マッチング結果の確認" : "STEP 1: Auto-Matching Review"}
              </h2>
              <p className="text-body-sm text-outline dark:text-slate-400 mt-1">
                {lang === "ja"
                  ? "メールアドレス・表示名・ユーザーIDの一致に基づいて自動提案されたマッピングです"
                  : "Suggested matches based on email address, user name, and user ID similarity"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={acceptAllCandidates}
                className="px-4 py-2 bg-green-600 text-white text-body-sm font-bold rounded-xl shadow hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                {lang === "ja" ? "全て承認" : "Accept All"}
              </button>
              <button
                onClick={rejectAllCandidates}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-on-surface dark:text-white text-body-sm font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                {lang === "ja" ? "全て拒否" : "Reject All"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-outline-variant dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-body-md">
              <thead className="bg-surface-container-low dark:bg-slate-800/80 text-outline dark:text-slate-300 font-bold border-b border-outline-variant dark:border-slate-800">
                <tr>
                  <th className="p-4">{lang === "ja" ? "移行元 表示名 / メール" : "Source User"}</th>
                  <th className="p-4">{lang === "ja" ? "提案する移行先ユーザー" : "Suggested Target User"}</th>
                  <th className="p-4">{lang === "ja" ? "一致根拠" : "Match Reason"}</th>
                  <th className="p-4 text-center">{lang === "ja" ? "判定" : "Decision"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant dark:divide-slate-800">
                {matchCandidates.map((c, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      c.status === "accepted"
                        ? "bg-green-50/50 dark:bg-green-950/20"
                        : c.status === "rejected"
                        ? "bg-red-50/50 dark:bg-red-950/20 opacity-60"
                        : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-bold text-on-surface dark:text-white">{c.source.name}</div>
                      <div className="text-body-sm text-outline dark:text-slate-400">{c.source.mailAddress || `ID: ${c.source.id}`}</div>
                    </td>
                    <td className="p-4">
                      {c.target ? (
                        <div>
                          <div className="font-bold text-on-surface dark:text-white">{c.target.name}</div>
                          <div className="text-body-sm text-outline dark:text-slate-400">{c.target.mailAddress || `ID: ${c.target.id}`}</div>
                        </div>
                      ) : (
                        <span className="text-outline italic text-body-sm">{lang === "ja" ? "— 候補なし —" : "— No candidate —"}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {c.reason === "email" && (
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold text-body-xs rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          {lang === "ja" ? "メールアドレス完全一致" : "Email exact match"}
                        </span>
                      )}
                      {c.reason === "name" && (
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-body-xs rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">badge</span>
                          {lang === "ja" ? "表示名一致" : "Name match"}
                        </span>
                      )}
                      {c.reason === "userId" && (
                        <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-body-xs rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">fingerprint</span>
                          {lang === "ja" ? "ユーザーID一致" : "User ID match"}
                        </span>
                      )}
                      {!c.reason && <span className="text-body-sm text-outline">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setCandidateStatus(idx, "accepted")}
                          className={`p-2 rounded-lg transition-colors ${
                            c.status === "accepted"
                              ? "bg-green-600 text-white"
                              : "bg-surface-container dark:bg-slate-800 text-outline hover:text-on-surface"
                          }`}
                          title="Accept"
                        >
                          <span className="material-symbols-outlined text-[20px]">check</span>
                        </button>
                        <button
                          onClick={() => setCandidateStatus(idx, "rejected")}
                          className={`p-2 rounded-lg transition-colors ${
                            c.status === "rejected"
                              ? "bg-red-600 text-white"
                              : "bg-surface-container dark:bg-slate-800 text-outline hover:text-on-surface"
                          }`}
                          title="Reject"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={applyMatchesAndProceed}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-body-md shadow hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {lang === "ja" ? "この内容で手動編集へ進む" : "Apply & Proceed to Manual Edit"}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Manual Table Edit & Export */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-low dark:bg-slate-800/60 p-4 rounded-xl border border-outline-variant dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-body-xs font-bold uppercase text-outline dark:text-slate-400">{lang === "ja" ? "全ユーザー数" : "Total Users"}</div>
                <div className="text-headline-md font-bold text-on-surface dark:text-white mt-1">{sourceUsers.length}</div>
              </div>
              <span className="material-symbols-outlined text-primary text-[36px]">group</span>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-xl border border-green-200 dark:border-green-800/40 flex items-center justify-between">
              <div>
                <div className="text-body-xs font-bold uppercase text-green-700 dark:text-green-400">{lang === "ja" ? "紐付け完了" : "Mapped"}</div>
                <div className="text-headline-md font-bold text-green-800 dark:text-green-300 mt-1">{mappedCount}</div>
              </div>
              <span className="material-symbols-outlined text-green-600 text-[36px]">task_alt</span>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
              <div>
                <div className="text-body-xs font-bold uppercase text-amber-700 dark:text-amber-400">{lang === "ja" ? "未設定" : "Unmapped"}</div>
                <div className="text-headline-md font-bold text-amber-800 dark:text-amber-300 mt-1">{sourceUsers.length - mappedCount}</div>
              </div>
              <span className="material-symbols-outlined text-amber-600 text-[36px]">warning</span>
            </div>
          </div>

          {/* Filter & Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "ja" ? "ユーザー名・メール・IDで絞り込み..." : "Filter by name, email, ID..."}
                  className="pl-10 pr-4 py-2 w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-xl text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="py-2 px-3 bg-surface-container-low dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-xl text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">{lang === "ja" ? "すべて表示" : "Show All"}</option>
                <option value="mapped">{lang === "ja" ? "設定済みのみ" : "Mapped Only"}</option>
                <option value="unmapped">{lang === "ja" ? "未設定のみ" : "Unmapped Only"}</option>
              </select>
            </div>

            {/* Export action buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={copyMappingJson}
                className="px-4 py-2.5 border border-outline-variant dark:border-slate-700 rounded-xl text-body-sm font-bold text-on-surface dark:text-white hover:bg-surface-container dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                {lang === "ja" ? "JSON コピー" : "Copy JSON"}
              </button>

              <button
                onClick={downloadUsersCsv}
                className="px-4 py-2.5 border border-outline-variant dark:border-slate-700 rounded-xl text-body-sm font-bold text-on-surface dark:text-white hover:bg-surface-container dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">csv</span>
                users.csv
              </button>

              <button
                onClick={downloadMappingJson}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-body-sm font-bold shadow hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                user-mapping.json {lang === "ja" ? "保存" : "Export"}
              </button>
            </div>
          </div>

          {/* Mapping Table */}
          <div className="overflow-x-auto border border-outline-variant dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-body-md">
              <thead className="bg-surface-container-low dark:bg-slate-800/80 text-outline dark:text-slate-300 font-bold border-b border-outline-variant dark:border-slate-800">
                <tr>
                  <th className="p-4 w-12">#</th>
                  <th className="p-4">{lang === "ja" ? "移行元 ID / 表示名" : "Source User ID / Name"}</th>
                  <th className="p-4">{lang === "ja" ? "移行元 メールアドレス" : "Source Email"}</th>
                  <th className="p-4">{lang === "ja" ? "移行先 ユーザー (Destination)" : "Destination User"}</th>
                  <th className="p-4 w-32 whitespace-nowrap text-center">{lang === "ja" ? "状態" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant dark:divide-slate-800">
                {filteredSourceUsers.map((su, idx) => {
                  const mapKey = su.mailAddress || su.name || String(su.id);
                  const currentVal = userMapping[mapKey] ?? "";

                  return (
                    <tr key={idx} className="hover:bg-surface-container-low/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-outline font-mono text-body-sm">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-on-surface dark:text-white">{su.name}</div>
                        <div className="text-body-xs font-mono text-outline dark:text-slate-400">ID: {su.id}</div>
                      </td>
                      <td className="p-4 text-body-sm text-outline dark:text-slate-400">
                        {su.mailAddress || <span className="italic opacity-50">—</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 items-center">
                          <select
                            value={currentVal}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setUserMapping((prev) => {
                                const copy = { ...prev };
                                if (newVal) copy[mapKey] = newVal;
                                else delete copy[mapKey];
                                return copy;
                              });
                            }}
                            className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-xl text-body-sm focus:outline-none focus:ring-1 focus:ring-primary text-on-surface dark:text-white"
                          >
                            <option value="">{lang === "ja" ? "— 未選択 (デフォルトユーザー適用) —" : "— Unselected (Default User) —"}</option>
                            {targetUsers.map((tu) => (
                              <option key={tu.id} value={tu.id}>
                                {tu.name} ({tu.mailAddress || tu.id})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        {currentVal ? (
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 font-bold text-body-xs rounded-full inline-flex items-center gap-1.5 whitespace-nowrap">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            {lang === "ja" ? "設定済" : "Mapped"}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-body-xs rounded-full inline-flex items-center gap-1.5 whitespace-nowrap">
                            <span className="material-symbols-outlined text-[14px]">priority_high</span>
                            {lang === "ja" ? "未設定" : "Unmapped"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
