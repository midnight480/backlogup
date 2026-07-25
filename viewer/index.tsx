import "./index.css";
import "dayjs/locale/ja";

import dayjs from "dayjs";
import { configure } from "mobx";
import type React from "react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { SettingsModal } from "./components/settingsModal";
import { Index } from "./containers";
import { Dashboard } from "./containers/dashboard";
import { Document } from "./containers/document";
import { Issue } from "./containers/issue";
import { Issues } from "./containers/issues";
import { SharedFiles } from "./containers/sharedFiles";
import { UserMapping } from "./containers/userMapping";
import { Wiki } from "./containers/wiki";
import { I18nProvider, Lang, useI18n } from "./i18n";

dayjs.locale("ja");
configure({
  enforceActions: "never",
});

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t, lang } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    fetch("/assets/configs/project.json")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then(setProject)
      .catch(() => {});
  }, []);

  return (
    <div className="font-body-md text-slate-800 bg-slate-50 min-h-screen selection:bg-emerald-100 selection:text-emerald-900">
      <nav className="bg-white/90 backdrop-blur-md flex justify-between items-center w-full px-6 h-14 fixed top-0 z-50 border-b border-slate-200/80 shadow-subtle">
        <div className="flex items-center gap-8">
          <NavLink to="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:bg-emerald-700 transition-colors">
              b
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight font-headline-md">backlogup</span>
          </NavLink>
          <div className="hidden md:flex items-center gap-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `font-body-md px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "text-emerald-700 bg-emerald-50 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`
              }
            >
              {t("dashboard")}
            </NavLink>
            <NavLink
              to="/issues"
              className={({ isActive }) =>
                `font-body-md px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "text-emerald-700 bg-emerald-50 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`
              }
            >
              {t("issues")}
            </NavLink>
            {project?.useWiki !== false && (
              <NavLink
                to="/wikis/home"
                className={({ isActive }) =>
                  `font-body-md px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "text-emerald-700 bg-emerald-50 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`
                }
              >
                {t("wikis")}
              </NavLink>
            )}
            {project?.useDocument !== false && (
              <NavLink
                to="/documents/root"
                className={({ isActive }) =>
                  `font-body-md px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "text-emerald-700 bg-emerald-50 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`
                }
              >
                {t("documents")}
              </NavLink>
            )}
            {project?.useFileSharing !== false && (
              <NavLink
                to="/shared-files"
                className={({ isActive }) =>
                  `font-body-md px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "text-emerald-700 bg-emerald-50 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`
                }
              >
                {t("sharedFiles")}
              </NavLink>
            )}
            <NavLink
              to="/user-mapping"
              className={({ isActive }) =>
                `font-body-md px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "text-emerald-700 bg-emerald-50 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`
              }
            >
              {t("userMapping" as any)}
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              className="pl-9 pr-4 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs w-56 transition-all focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-800 placeholder-slate-400"
              placeholder={t("searchPlaceholder")}
              type="text"
            />
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            title={t("settings")}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </nav>

      <main className="pt-14 pb-16 min-h-screen">
        <div className="px-6 py-6 max-w-[1440px] mx-auto">{children}</div>
      </main>

      <footer className="fixed bottom-0 right-0 left-0 py-2.5 px-6 flex justify-between items-center z-40 bg-emerald-50/90 backdrop-blur-md border-t border-emerald-200/80">
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <span className="font-['Inter'] text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            {t("notice")}
          </span>
          <span className="font-['Inter'] text-xs text-emerald-900/90 font-medium">
            {t("trackingNotice" as keyof typeof dict.en)}
          </span>
        </div>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

// rome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.querySelector("#app")!).render(
  <I18nProvider>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<Issue />} />
          <Route path="/wikis/:id" element={<Wiki />} />
          <Route path="/documents/:id" element={<Document />} />
          <Route path="/shared-files" element={<SharedFiles />} />
          <Route path="/user-mapping" element={<UserMapping />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </I18nProvider>,
);
