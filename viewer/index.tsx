import "./index.css";
import "dayjs/locale/ja";

import dayjs from "dayjs";
import { configure } from "mobx";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, NavLink } from "react-router-dom";
import { Index } from "./containers";
import { Issues } from "./containers/issues";
import { Issue } from "./containers/issue";
import { Wiki } from "./containers/wiki";
import { Document } from "./containers/document";
import { Dashboard } from "./containers/dashboard";

dayjs.locale("ja");
configure({
  enforceActions: "never",
});

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="font-body-md text-on-surface bg-background min-h-screen">
      <nav className="bg-white dark:bg-slate-900 flex justify-between items-center w-full px-6 h-14 fixed top-0 z-50 border-b border-[#D0D7DE] dark:border-slate-800">
        <div className="flex items-center gap-6">
          <span className="text-xl font-black text-[#0969DA] dark:text-blue-400 font-headline-md">backlogup</span>
          <div className="hidden md:flex gap-4">
            <NavLink to="/dashboard" className={({ isActive }) => `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? 'text-[#0969DA] font-bold border-b-2 border-[#0969DA] rounded-none' : 'text-[#57606A] hover:bg-[#F6F8FA]'}`}>
              Dashboard
            </NavLink>
            <NavLink to="/issues" className={({ isActive }) => `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? 'text-[#0969DA] font-bold border-b-2 border-[#0969DA] rounded-none' : 'text-[#57606A] hover:bg-[#F6F8FA]'}`}>
              Issues
            </NavLink>
            <NavLink to="/wikis" className={({ isActive }) => `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? 'text-[#0969DA] font-bold border-b-2 border-[#0969DA] rounded-none' : 'text-[#57606A] hover:bg-[#F6F8FA]'}`}>
              Wikis
            </NavLink>
            <NavLink to="/documents" className={({ isActive }) => `font-body-md px-3 py-1 rounded-lg transition-colors ${isActive ? 'text-[#0969DA] font-bold border-b-2 border-[#0969DA] rounded-none' : 'text-[#57606A] hover:bg-[#F6F8FA]'}`}>
              Documents
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input className="pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm w-64 focus:ring-1 focus:ring-primary outline-none" placeholder="Search archives..." type="text" />
          </div>
        </div>
      </nav>

      <aside className="fixed left-0 top-0 h-full flex flex-col pt-14 bg-white dark:bg-slate-900 border-r border-[#D0D7DE] dark:border-slate-800 w-64 z-40">
        <div className="p-6 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-headline-sm">Local Archive</h2>
              <p className="text-[11px] text-tertiary font-body-sm">v1.0.0 Stable</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4">
          <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 border-l-2 font-medium transition-all ${isActive ? 'bg-white text-[#0969DA] border-[#0969DA]' : 'text-[#1F2328] border-transparent hover:bg-[#F6F8FA]'}`}>
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="font-body-md">Dashboard</span>
          </NavLink>
          <NavLink to="/issues" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 border-l-2 font-medium transition-all ${isActive ? 'bg-white text-[#0969DA] border-[#0969DA]' : 'text-[#1F2328] border-transparent hover:bg-[#F6F8FA]'}`}>
            <span className="material-symbols-outlined text-[20px]">assignment</span>
            <span className="font-body-md">Issues</span>
          </NavLink>
          <NavLink to="/wikis/home" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 border-l-2 font-medium transition-all ${isActive ? 'bg-white text-[#0969DA] border-[#0969DA]' : 'text-[#1F2328] border-transparent hover:bg-[#F6F8FA]'}`}>
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
            <span className="font-body-md">Wiki</span>
          </NavLink>
          <NavLink to="/documents/root" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 border-l-2 font-medium transition-all ${isActive ? 'bg-white text-[#0969DA] border-[#0969DA]' : 'text-[#1F2328] border-transparent hover:bg-[#F6F8FA]'}`}>
            <span className="material-symbols-outlined text-[20px]">description</span>
            <span className="font-body-md">Documents</span>
          </NavLink>
        </nav>
      </aside>

      <main className="ml-64 pt-14 pb-12 min-h-screen">
        <div className="px-gutter py-md max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>

      <footer className="fixed bottom-0 right-0 left-64 py-2 px-6 flex justify-between items-center z-40 bg-[#DDF4FF] dark:bg-blue-900/20 border-t border-[#0969DA]">
        <div className="flex items-center gap-4">
          <span className="font-['Inter'] text-xs font-semibold uppercase tracking-wider text-[#0969DA] dark:text-blue-300">
            Notice: Subversion, Git, and generic files are NOT backed up.
          </span>
        </div>
      </footer>
    </div>
  );
};

// rome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.querySelector("#app")!).render(
  <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/issues/:id" element={<Issue />} />
        <Route path="/wikis/:id" element={<Wiki />} />
        <Route path="/documents/:id" element={<Document />} />
      </Routes>
    </Layout>
  </BrowserRouter>
);
