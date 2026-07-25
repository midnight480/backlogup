import React, { useEffect, useState, useMemo, useRef } from "react";
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

const UserSearchableSelect: React.FC<{
  value: string | number;
  targetUsers: TargetUser[];
  onChange: (val: string | number) => void;
  lang: string;
}> = ({ value, targetUsers, onChange, lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedUser = targetUsers.find((u) => String(u.id) === String(value));

  const filtered = targetUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      (u.mailAddress && u.mailAddress.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q)) ||
      String(u.id).includes(q)
    );
  });

  const placeholderText = lang === "ja" ? "— 未選択 (デフォルトユーザー適用) —" : "— Unselected (Default User) —";

  return (
    <div className="relative flex-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="w-full py-1.5 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition-all"
      >
        <span className={`truncate pr-2 ${selectedUser ? "text-slate-900 font-medium" : "text-slate-400"}`}>
          {selectedUser ? `${selectedUser.name} (${selectedUser.mailAddress || selectedUser.id})` : placeholderText}
        </span>
        <span className="material-symbols-outlined text-[16px] text-slate-400 ml-1 shrink-0">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[280px]">
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "ja" ? "名前やメールアドレスで検索..." : "Search name or email..."}
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-md text-xs outline-none focus:border-emerald-500 text-slate-800"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-52 p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between ${
                !value ? "bg-emerald-50 text-emerald-800 font-bold" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span className="truncate">{placeholderText}</span>
              {!value && <span className="material-symbols-outlined text-[14px] text-emerald-600 shrink-0">check</span>}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                {lang === "ja" ? "該当するユーザーが見つかりません" : "No matching users found"}
              </div>
            ) : (
              filtered.map((u) => {
                const isSelected = String(u.id) === String(value);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onChange(u.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                      isSelected ? "bg-emerald-50 text-emerald-900 font-bold" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-slate-900 truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{u.mailAddress || `ID: ${u.id}`}</div>
                    </div>
                    {isSelected && <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">check</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[28px]">sync_alt</span>
            {t("userMappingTitle" as any)}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("userMappingSubtitle" as any)}
          </p>
        </div>
      </div>

      {/* Step Indicator (2 Steps) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => setStep(1)}
          className={`p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
            step === 1
              ? "border-emerald-600 bg-emerald-50/60 text-emerald-800 shadow-xs"
              : "border-slate-200/80 bg-white text-slate-500 hover:border-slate-300"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 1 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            1
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">{lang === "ja" ? "1. 自動照合確認 (Auto-Match)" : "1. Auto-Matching Review"}</div>
            <div className="text-xs opacity-80">{lang === "ja" ? "メール・名前にて一括提案" : "Match by Email / Name"}</div>
          </div>
        </button>

        <button
          onClick={() => setStep(2)}
          className={`p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
            step === 2
              ? "border-emerald-600 bg-emerald-50/60 text-emerald-800 shadow-xs"
              : "border-slate-200/80 bg-white text-slate-500 hover:border-slate-300"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 2 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            2
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">{lang === "ja" ? "2. 手動編集 & 保存 (Edit & Save)" : "2. Edit & Export"}</div>
            <div className="text-xs opacity-80">{lang === "ja" ? "個別割当 & user-mapping.json 保存" : "Export user-mapping.json"}</div>
          </div>
        </button>
      </div>

      {/* Auto-Loaded Data Status Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
            <span className="font-bold text-slate-800">
              {lang === "ja" ? `移行元ユーザー: ${sourceUsers.length} 件` : `Source Users: ${sourceUsers.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {targetUsers.length > 0 ? (
              <>
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                <span className="font-bold text-slate-800">
                  {lang === "ja" ? `移行先ユーザー: ${targetUsers.length} 件 (自動読込)` : `Target Users: ${targetUsers.length}`}
                </span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>
                <span className="text-amber-700 font-medium">
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
          <summary className="cursor-pointer text-xs font-semibold text-emerald-700 hover:underline list-none flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">folder_open</span>
            {lang === "ja" ? "外部ファイルを個別選択 / ドロップ" : "Custom File Upload"}
          </summary>
          <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="p-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-center">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                {lang === "ja" ? "移行元 Users (.json / .csv)" : "Source Users (.json / .csv)"}
              </span>
              <input type="file" accept=".json,.csv" onChange={(e) => handleFileUpload(e, "source")} className="hidden" />
              <span className="text-[11px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg inline-block font-bold">ファイルを選択</span>
            </label>

            <label className="p-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 text-center">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                {lang === "ja" ? "移行先 Users (.json / .csv)" : "Target Users (.json / .csv)"}
              </span>
              <input type="file" accept=".json,.csv" onChange={(e) => handleFileUpload(e, "target")} className="hidden" />
              <span className="text-[11px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg inline-block font-bold">ファイルを選択</span>
            </label>
          </div>
        </details>
      </div>

      {/* STEP 1: Auto-Match Review */}
      {step === 1 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">psychology</span>
                {lang === "ja" ? "STEP 1: 自動マッチング結果の確認" : "STEP 1: Auto-Matching Review"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {lang === "ja"
                  ? "メールアドレス・表示名・ユーザーIDの一致に基づいて自動提案されたマッピングです"
                  : "Suggested matches based on email address, user name, and user ID similarity"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={acceptAllCandidates}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                {lang === "ja" ? "全て承認" : "Accept All"}
              </button>
              <button
                onClick={rejectAllCandidates}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                {lang === "ja" ? "全て拒否" : "Reject All"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="p-3.5">{lang === "ja" ? "移行元 表示名 / メール" : "Source User"}</th>
                  <th className="p-3.5">{lang === "ja" ? "提案する移行先ユーザー" : "Suggested Target User"}</th>
                  <th className="p-3.5">{lang === "ja" ? "一致根拠" : "Match Reason"}</th>
                  <th className="p-3.5 text-center">{lang === "ja" ? "判定" : "Decision"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchCandidates.map((c, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      c.status === "accepted"
                        ? "bg-emerald-50/40"
                        : c.status === "rejected"
                        ? "bg-rose-50/40 opacity-60"
                        : ""
                    }`}
                  >
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{c.source.name}</div>
                      <div className="text-xs text-slate-400">{c.source.mailAddress || `ID: ${c.source.id}`}</div>
                    </td>
                    <td className="p-3.5">
                      {c.target ? (
                        <div>
                          <div className="font-bold text-slate-900">{c.target.name}</div>
                          <div className="text-xs text-slate-400">{c.target.mailAddress || `ID: ${c.target.id}`}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">{lang === "ja" ? "— 候補なし —" : "— No candidate —"}</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {c.reason === "email" && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          {lang === "ja" ? "メールアドレス完全一致" : "Email exact match"}
                        </span>
                      )}
                      {c.reason === "name" && (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold text-[11px] rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">badge</span>
                          {lang === "ja" ? "表示名一致" : "Name match"}
                        </span>
                      )}
                      {c.reason === "userId" && (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold text-[11px] rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">fingerprint</span>
                          {lang === "ja" ? "ユーザーID一致" : "User ID match"}
                        </span>
                      )}
                      {!c.reason && <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setCandidateStatus(idx, "accepted")}
                          className={`p-1.5 rounded-lg transition-colors ${
                            c.status === "accepted"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-500 hover:text-slate-800"
                          }`}
                          title="Accept"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button
                          onClick={() => setCandidateStatus(idx, "rejected")}
                          className={`p-1.5 rounded-lg transition-colors ${
                            c.status === "rejected"
                              ? "bg-rose-600 text-white"
                              : "bg-slate-100 text-slate-500 hover:text-slate-800"
                          }`}
                          title="Reject"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
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
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              {lang === "ja" ? "この内容で手動編集へ進む" : "Apply & Proceed to Manual Edit"}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Manual Table Edit & Export */}
      {step === 2 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase text-slate-500">{lang === "ja" ? "全ユーザー数" : "Total Users"}</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{sourceUsers.length}</div>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[32px]">group</span>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase text-emerald-800">{lang === "ja" ? "紐付け完了" : "Mapped"}</div>
                <div className="text-xl font-bold text-emerald-900 mt-1">{mappedCount}</div>
              </div>
              <span className="material-symbols-outlined text-emerald-600 text-[32px]">task_alt</span>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase text-amber-800">{lang === "ja" ? "未設定" : "Unmapped"}</div>
                <div className="text-xl font-bold text-amber-900 mt-1">{sourceUsers.length - mappedCount}</div>
              </div>
              <span className="material-symbols-outlined text-amber-600 text-[32px]">warning</span>
            </div>
          </div>

          {/* Filter & Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "ja" ? "ユーザー名・メール・IDで絞り込み..." : "Filter by name, email, ID..."}
                  className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              >
                <option value="all">{lang === "ja" ? "すべて表示" : "Show All"}</option>
                <option value="mapped">{lang === "ja" ? "設定済みのみ" : "Mapped Only"}</option>
                <option value="unmapped">{lang === "ja" ? "未設定のみ" : "Unmapped Only"}</option>
              </select>
            </div>

            {/* Export action buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={copyMappingJson}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-500">content_copy</span>
                {lang === "ja" ? "JSON コピー" : "Copy JSON"}
              </button>

              <button
                onClick={downloadUsersCsv}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-500">csv</span>
                users.csv
              </button>

              <button
                onClick={downloadMappingJson}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                user-mapping.json {lang === "ja" ? "保存" : "Export"}
              </button>
            </div>
          </div>

          {/* Mapping Table */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="p-3.5 w-12">#</th>
                  <th className="p-3.5">{lang === "ja" ? "移行元 ID / 表示名" : "Source User ID / Name"}</th>
                  <th className="p-3.5">{lang === "ja" ? "移行元 メールアドレス" : "Source Email"}</th>
                  <th className="p-3.5">{lang === "ja" ? "移行先 ユーザー (Destination)" : "Destination User"}</th>
                  <th className="p-3.5 w-28 whitespace-nowrap text-center">{lang === "ja" ? "状態" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSourceUsers.map((su, idx) => {
                  const mapKey = su.mailAddress || su.name || String(su.id);
                  const currentVal = userMapping[mapKey] ?? "";

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{su.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">ID: {su.id}</div>
                      </td>
                      <td className="p-3.5 text-xs text-slate-500">
                        {su.mailAddress || <span className="italic opacity-50">—</span>}
                      </td>
                      <td className="p-3.5">
                        <div className="flex gap-2 items-center">
                          <UserSearchableSelect
                            value={currentVal}
                            targetUsers={targetUsers}
                            lang={lang}
                            onChange={(newVal) => {
                              setUserMapping((prev) => {
                                const copy = { ...prev };
                                if (newVal) copy[mapKey] = newVal;
                                else delete copy[mapKey];
                                return copy;
                              });
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {currentVal ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            {lang === "ja" ? "設定済" : "Mapped"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[11px] rounded-full inline-flex items-center gap-1 whitespace-nowrap">
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
