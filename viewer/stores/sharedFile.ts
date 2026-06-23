import { makeAutoObservable } from "mobx";
import type { RootStore } from ".";

export class SharedFileStore {
  private rootStore: RootStore;

  public loadingList = false;
  public loaded = false;
  public files: BacklogSharedFile[] = [];

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
    } catch (e) {
      console.warn("Failed to fetch shared files:", e);
    } finally {
      this.loadingList = false;
    }
  }
}
