import React, { useState, useEffect } from "react";
import { useI18n } from "../i18n";

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t, lang, setLang } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-outline-variant dark:border-slate-700 rounded-2xl shadow-2xl w-[480px] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container dark:border-slate-800">
          <h2 className="text-headline-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined">settings</span>
            {t("settings")}
          </h2>
          <button className="p-1 text-outline hover:text-on-surface dark:hover:text-white rounded transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          {/* Language Settings */}
          <div>
            <h3 className="text-label-md font-bold text-tertiary uppercase tracking-wider mb-4">{t("language")}</h3>
            <div className="flex gap-4">
              <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${lang === "en" ? "border-primary bg-primary/5 text-primary" : "border-surface-container hover:border-primary/50 dark:border-slate-700"}`}>
                <input type="radio" className="sr-only" checked={lang === "en"} onChange={() => setLang("en")} />
                <span className="text-body-lg font-bold">English</span>
                <span className="text-body-sm opacity-80 mt-1">EN</span>
              </label>
              <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${lang === "ja" ? "border-primary bg-primary/5 text-primary" : "border-surface-container hover:border-primary/50 dark:border-slate-700"}`}>
                <input type="radio" className="sr-only" checked={lang === "ja"} onChange={() => setLang("ja")} />
                <span className="text-body-lg font-bold">日本語</span>
                <span className="text-body-sm opacity-80 mt-1">JA</span>
              </label>
            </div>
          </div>

          {/* Theme Mode */}
          <div>
            <h3 className="text-label-md font-bold text-tertiary uppercase tracking-wider mb-4">Appearance</h3>
            <div className="flex gap-4">
              <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${theme === "light" ? "border-primary bg-primary/5 text-primary" : "border-surface-container hover:border-primary/50 dark:border-slate-700 dark:text-white"}`}>
                <input type="radio" className="sr-only" checked={theme === "light"} onChange={() => toggleTheme("light")} />
                <span className="material-symbols-outlined mb-2 text-[28px]">light_mode</span>
                <span className="text-body-md font-bold">Light</span>
              </label>
              <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${theme === "dark" ? "border-primary bg-primary/5 text-primary" : "border-surface-container hover:border-primary/50 dark:border-slate-700 dark:text-white"}`}>
                <input type="radio" className="sr-only" checked={theme === "dark"} onChange={() => toggleTheme("dark")} />
                <span className="material-symbols-outlined mb-2 text-[28px]">dark_mode</span>
                <span className="text-body-md font-bold">Dark</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
