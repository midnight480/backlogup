import { makeAutoObservable } from "mobx";
import { Document as FlexSearchDocument } from "flexsearch";
import type { RootStore } from ".";
import type * as backlog from "backlog-js";

export class PageStore {
  private rootStore: RootStore;

  public loadingPages = false;
  public loadingIndexes = false;
  private internalPages: backlog.Entity.Issue.Issue[] = [];
  public totalPage = 0;
  public currentDownloading = 0;
  public page = 0;
  public pageSize = 20;
  public issueKeyIndex: {[issueKey: string]: string} = {};
  public searchIndex: FlexSearchDocument<unknown, false> | undefined;
  public keyword = "";

  constructor(root: RootStore) {
    this.rootStore = root;

    makeAutoObservable(this);
  }

  public async fetch() {
    if (this.pages.length > 0) {
      return;
    }

    this.loadingPages = true;

    try {
      const pageInfo = await fetch("/assets/configs/pages.json");
      const { start, end } = await pageInfo.json();
      this.totalPage = end;

      const pages = [];
      for (let i = start; i <= end; i++) {
        this.currentDownloading = i;

        const res = await fetch(`/assets/pages/${i}.json`);
        const page: backlog.Entity.Issue.Issue[] = await res.json();
        pages.push(...page);

        // const index: {[issueKey: string]: string} = { ...this.issueKeyIndex };
        // page.forEach((issue) => {
        //   index[issue.issueKey] = issue.id;
        // });
        // this.issueKeyIndex = index;
      }
      this.internalPages = pages;
    } finally {
      this.loadingPages = false;
    }
  }

  public async generateIndex() {
    if (this.searchIndex) {
      return;
    }

    this.loadingIndexes = true;

    try {
      const res = await fetch("/assets/configs/search-index.json");
      const searchIndexes = await res.json();

      this.searchIndex = new FlexSearchDocument({
        preset: "match",
        tokenize: "reverse",
        document: {
          id: "id",
          index: "keywords",
        },
      });

      for (const searchIndex of searchIndexes) {
        this.searchIndex.add(searchIndex);
      }
    } finally {
      this.loadingIndexes = false;
    }
  }

  setPage(page: number) {
    this.page = page;
  }
  setPageSize(pageSize: number) {
    this.pageSize = pageSize;
  }

  setKeyword(keyword: string) {
    this.keyword = keyword;
    this.page = 0; // Reset to first page on new search
  }

  get filteredPages() {
    const keyword = this.keyword.trim();
    if (keyword === "") {
      return this.internalPages;
    }
    const search = this.searchIndex?.search(keyword);
    const response = search?.pop();
    return this.internalPages.filter((page) =>
      response?.result?.includes(page.id) ||
      page.issueKey.includes(keyword) ||
      page.summary.includes(keyword) ||
      page.description.includes(keyword)
    );
  }

  get maxPage() {
    return Math.max(0, Math.ceil(this.filteredPages.length / this.pageSize) - 1);
  }

  get pages() {
    const start = this.page * this.pageSize;
    return this.filteredPages.slice(start, start + this.pageSize);
  }
}
