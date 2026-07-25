import React, { useEffect } from "react";
import { useI18n } from "../i18n";

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    // Always enforce Light Mode
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div
        className="bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-[440px] flex flex-col overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-500 text-[20px]">settings</span>
            {t("settings")}
          </h2>
          <button className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Language Settings */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t("language")}</h3>
            <div className="flex gap-3">
              <label
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  lang === "en"
                    ? "border-primary bg-emerald-50/60 text-primary font-bold shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input type="radio" className="sr-only" checked={lang === "en"} onChange={() => setLang("en")} />
                <span className="text-base font-bold">English</span>
                <span className="text-xs opacity-75 mt-0.5">EN</span>
              </label>
              <label
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  lang === "ja"
                    ? "border-primary bg-emerald-50/60 text-primary font-bold shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input type="radio" className="sr-only" checked={lang === "ja"} onChange={() => setLang("ja")} />
                <span className="text-base font-bold">日本語</span>
                <span className="text-xs opacity-75 mt-0.5">JA</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

