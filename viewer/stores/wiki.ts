import type * as backlog from "backlog-js";
import { makeAutoObservable } from "mobx";
import type { RootStore } from ".";

export class WikiStore {
  private rootStore: RootStore;

  public loadingList = false;
  public loadingDetail = false;
  public wikis: backlog.Entity.Wiki.WikiListItem[] = [];
  public wiki: backlog.Entity.Wiki.Wiki = {} as backlog.Entity.Wiki.Wiki;
  public tags: backlog.Entity.Wiki.Tag[] = [];
  public stars: backlog.Entity.Star.Star[] = [];
  public textFormattingRule = "markdown";

  constructor(root: RootStore) {
    this.rootStore = root;
    makeAutoObservable(this);
  }

  public async fetch() {
    if (this.wikis.length > 0) {
      return;
    }

    this.loadingList = true;
    try {
      const [listRes, tagsRes, projectRes] = await Promise.all([
        fetch("/assets/wikis/list.json"),
        fetch("/assets/configs/wiki-tags.json"),
        fetch("/assets/configs/project.json"),
      ]);
      if (listRes.ok) this.wikis = await listRes.json();
      if (tagsRes.ok) this.tags = await tagsRes.json();
      if (projectRes.ok) {
        const project = await projectRes.json();
        this.textFormattingRule = project.textFormattingRule || "markdown";
      }
    } finally {
      this.loadingList = false;
    }
  }

  public async fetchDetail(wikiId?: string) {
    if (!wikiId) {
      return;
    }

    this.loadingDetail = true;
    try {
      const [wikiRes, starsRes] = await Promise.all([
        fetch(`/assets/wikis/${wikiId}/wiki.json`),
        fetch(`/assets/wikis/${wikiId}/stars.json`),
      ]);
      if (wikiRes.ok) this.wiki = await wikiRes.json();
      if (starsRes.ok) this.stars = await starsRes.json();
    } finally {
      this.loadingDetail = false;
    }
  }

  public clearDetail() {
    this.wiki = {} as backlog.Entity.Wiki.Wiki;
    this.stars = [];
  }
}
