import type * as backlog from "backlog-js";
import { makeAutoObservable } from "mobx";
import type { RootStore } from ".";

export class IssueStore {
  private rootStore: RootStore;

  public issue: backlog.Entity.Issue.Issue = {} as backlog.Entity.Issue.Issue;
  public comments: backlog.Entity.Issue.Comment[] = [];

  constructor(root: RootStore) {
    this.rootStore = root;

    makeAutoObservable(this);
  }

  public async fetch(issueId?: string) {
    if (!issueId) {
      return;
    }

    const [issue, comments] = await Promise.all([
      fetch(`/assets/issues/${issueId}/issue.json`),
      fetch(`/assets/issues/${issueId}/comments.json`),
    ]);
    if (issue.ok) this.issue = await issue.json();
    if (comments.ok) this.comments = await comments.json();
  }

  public clear() {
    this.issue = {};
    this.comments = [];
  }
}
