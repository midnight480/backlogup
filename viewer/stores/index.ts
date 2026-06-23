import React from "react";
import { DocumentStore } from "./document";
import { IssueStore } from "./issue";
import { PageStore } from "./page";
import { SharedFileStore } from "./sharedFile";
import { WikiStore } from "./wiki";

export class RootStore {
  public pageStore: PageStore;
  public issueStore: IssueStore;
  public wikiStore: WikiStore;
  public documentStore: DocumentStore;
  public sharedFileStore: SharedFileStore;

  constructor() {
    this.pageStore = new PageStore(this);
    this.issueStore = new IssueStore(this);
    this.wikiStore = new WikiStore(this);
    this.documentStore = new DocumentStore(this);
    this.sharedFileStore = new SharedFileStore(this);
  }
}

const StoresContext = React.createContext(new RootStore());

export const useStore = () => React.useContext(StoresContext);
