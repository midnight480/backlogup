import { makeAutoObservable } from "mobx";
import type { RootStore } from ".";

interface DownloadResultEntry {
  id: number;
  ok: boolean;
  path?: string;
  error?: string;
}

export class SharedFileStore {
  private rootStore: RootStore;

  public loadingList = false;
  public loaded = false;
  public files: BacklogSharedFile[] = [];

  // 画面からの選択ダウンロード用の状態
  public selectedIds = new Set<number>();
  public downloadedIds = new Set<number>();
  public devAvailable = false; // npm run dev のプロキシAPIが利用可能か（=.env 設定済み）
  public downloading = false;
  public lastResult: { ok: number; failed: number } | null = null;

  constructor(root: RootStore) {
    this.rootStore = root;
    makeAutoObservable(this);
  }

  public async fetch() {
    if (this.loaded) {
      return;
    }

    this.loadingList = true;
    try {
      const res = await fetch("/assets/shared-files/list.json");
      if (res.ok) {
        this.files = (await res.json()) as BacklogSharedFile[];
      }
      this.loaded = true;
      await this.refreshStatus();
    } catch (e) {
      console.warn("Failed to fetch shared files:", e);
    } finally {
      this.loadingList = false;
    }
  }

  // 開発サーバーのプロキシAPIに問い合わせ、設定有無と取得済みファイルを取得する。
  // 本番ビルド（プロキシ無し）では 404 となり devAvailable=false になる。
  public async refreshStatus() {
    try {
      const res = await fetch("/api/shared-files/status");
      if (res.ok) {
        const data = await res.json();
        this.devAvailable = Boolean(data.configured);
        this.downloadedIds = new Set<number>(data.downloadedIds ?? []);
      } else {
        this.devAvailable = false;
      }
    } catch {
      this.devAvailable = false;
    }
  }

  public isDownloaded(id: number) {
    return this.downloadedIds.has(id);
  }

  public isSelected(id: number) {
    return this.selectedIds.has(id);
  }

  public toggle(id: number) {
    const next = new Set(this.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds = next;
  }

  public setSelection(ids: number[]) {
    this.selectedIds = new Set(ids);
  }

  public clearSelection() {
    this.selectedIds = new Set();
  }

  public async downloadSelected() {
    const ids = [...this.selectedIds];
    if (ids.length === 0 || this.downloading) {
      return;
    }

    this.downloading = true;
    this.lastResult = null;
    try {
      const res = await fetch("/api/shared-files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        console.warn("shared file download failed:", await res.json().catch(() => ({})));
        this.lastResult = { ok: 0, failed: ids.length };
        return;
      }
      const data = await res.json();
      const results: DownloadResultEntry[] = data.results ?? [];
      const okIds = results.filter((r) => r.ok).map((r) => r.id);
      const next = new Set(this.downloadedIds);
      for (const id of okIds) {
        next.add(id);
      }
      this.downloadedIds = next;
      this.lastResult = { ok: okIds.length, failed: results.length - okIds.length };
      this.clearSelection();
    } catch (e) {
      console.warn("shared file download error:", e);
      this.lastResult = { ok: 0, failed: ids.length };
    } finally {
      this.downloading = false;
    }
  }
}
