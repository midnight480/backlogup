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
    <div className="font-body-md text-on-surface bg-background min-h-screen">
      <nav className="bg-white dark:bg-slate-900 flex justify-between items-center w-full px-6 h-14 fixed top-0 z-50 border-b border-[#D0D7DE] dark:border-slate-800">
        <div className="flex items-center gap-6">
          <span className="text-xl font-black text-primary dark:text-blue-400 font-headline-md">backlogup</span>
          <div className="hidden md:flex gap-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? "text-primary font-bold border-b-2 border-primary rounded-none dark:text-blue-400 dark:border-blue-400" : "text-[#57606A] hover:bg-[#F6F8FA] dark:text-slate-300 dark:hover:bg-slate-800"}`
              }
            >
              {t("dashboard")}
            </NavLink>
            <NavLink
              to="/issues"
              className={({ isActive }) =>
                `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? "text-primary font-bold border-b-2 border-primary rounded-none dark:text-blue-400 dark:border-blue-400" : "text-[#57606A] hover:bg-[#F6F8FA] dark:text-slate-300 dark:hover:bg-slate-800"}`
              }
            >
              {t("issues")}
            </NavLink>
            {project?.useWiki !== false && (
              <NavLink
                to="/wikis/home"
                className={({ isActive }) =>
                  `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? "text-primary font-bold border-b-2 border-primary rounded-none dark:text-blue-400 dark:border-blue-400" : "text-[#57606A] hover:bg-[#F6F8FA] dark:text-slate-300 dark:hover:bg-slate-800"}`
                }
              >
                {t("wikis")}
              </NavLink>
            )}
            {project?.useDocument !== false && (
              <NavLink
                to="/documents/root"
                className={({ isActive }) =>
                  `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? "text-primary font-bold border-b-2 border-primary rounded-none dark:text-blue-400 dark:border-blue-400" : "text-[#57606A] hover:bg-[#F6F8FA] dark:text-slate-300 dark:hover:bg-slate-800"}`
                }
              >
                {t("documents")}
              </NavLink>
            )}
            {project?.useFileSharing !== false && (
              <NavLink
                to="/shared-files"
                className={({ isActive }) =>
                  `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? "text-primary font-bold border-b-2 border-primary rounded-none dark:text-blue-400 dark:border-blue-400" : "text-[#57606A] hover:bg-[#F6F8FA] dark:text-slate-300 dark:hover:bg-slate-800"}`
                }
              >
                {t("sharedFiles")}
              </NavLink>
            )}
            <NavLink
              to="/user-mapping"
              className={({ isActive }) =>
                `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? "text-primary font-bold border-b-2 border-primary rounded-none dark:text-blue-400 dark:border-blue-400" : "text-[#57606A] hover:bg-[#F6F8FA] dark:text-slate-300 dark:hover:bg-slate-800"}`
              }
            >
              {t("userMapping" as any)}
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              className="pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm w-64 focus:ring-1 focus:ring-primary outline-none"
              placeholder={t("searchPlaceholder")}
              type="text"
            />
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center p-2 text-outline hover:bg-surface-container-low dark:hover:bg-slate-800 rounded-full transition-colors"
            title={t("settings")}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </nav>

      <main className="pt-14 pb-12 min-h-screen">
        <div className="px-gutter py-md max-w-[1400px] mx-auto">{children}</div>
      </main>

      <footer className="fixed bottom-0 right-0 left-0 py-2 px-6 flex justify-between items-center z-40 bg-[#DDF4FF] dark:bg-blue-900/20 border-t border-primary">
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <span className="font-['Inter'] text-xs font-semibold uppercase tracking-wider text-primary dark:text-blue-300">
            {t("notice")}
          </span>
          <span className="font-['Inter'] text-xs text-primary/80 dark:text-blue-300/80">
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
