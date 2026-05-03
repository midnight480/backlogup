import { makeAutoObservable } from "mobx";
import type { RootStore } from ".";

export class DocumentStore {
    private rootStore: RootStore;

    public loadingList = false;
    public loadingDetail = false;
    public documents: BacklogDocument[] = [];
    public document: BacklogDocument = {} as BacklogDocument;
    public tree: BacklogDocumentTree | null = null;
    public comments: BacklogDocumentComment[] = [];

    constructor(root: RootStore) {
        this.rootStore = root;
        makeAutoObservable(this);
    }

    public async fetch() {
        if (this.documents.length > 0) {
            return;
        }

        this.loadingList = true;
        try {
            const [listRes, treeRes] = await Promise.all([
                fetch("/assets/documents/list.json"),
                fetch("/assets/documents/tree.json"),
            ]);
            if (listRes.ok) {
                this.documents = await listRes.json();
            }
            if (treeRes.ok) {
                this.tree = await treeRes.json();
            }
        } catch (e) {
            console.warn("Failed to fetch documents:", e);
        } finally {
            this.loadingList = false;
        }
    }

    public async fetchDetail(documentId?: string) {
        if (!documentId) {
            return;
        }

        this.loadingDetail = true;
        try {
            const [docRes, commentsRes] = await Promise.all([
                fetch(`/assets/documents/${documentId}/document.json`),
                fetch(`/assets/documents/${documentId}/comments.json`),
            ]);
            if (docRes.ok) {
                this.document = await docRes.json();
            }
            if (commentsRes.ok) {
                this.comments = await commentsRes.json();
            }
        } catch (e) {
            console.warn("Failed to fetch document detail:", documentId, e);
        } finally {
            this.loadingDetail = false;
        }
    }

    public clearDetail() {
        this.document = {} as BacklogDocument;
        this.comments = [];
    }
}
