import React from "react";
import { PageStore } from "./page";
import { IssueStore } from "./issue";
import { WikiStore } from "./wiki";
import { DocumentStore } from "./document";

export class RootStore {
  public pageStore: PageStore;
  public issueStore: IssueStore;
  public wikiStore: WikiStore;
  public documentStore: DocumentStore;

  constructor() {
    this.pageStore = new PageStore(this);
    this.issueStore = new IssueStore(this);
    this.wikiStore = new WikiStore(this);
    this.documentStore = new DocumentStore(this);
  }
}

const StoresContext = React.createContext(new RootStore());

export const useStore = () => React.useContext(StoresContext);
