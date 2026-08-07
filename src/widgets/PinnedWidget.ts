import { BaseWidget } from "./BaseWidget";
import { setIcon, TFile } from "obsidian";

export class PinnedWidget extends BaseWidget {
    constructor() {
        super({
            id: "pinned",
            name: "Pinned",
            description: "Shows your bookmarked notes",
            icon: "pin",
            defaultSize: 1
        });
    }

    protected onViewAllClick(): void {
        const commands = (this.app as any).commands;
        if (commands && commands.executeCommandById) {
            commands.executeCommandById("bookmarks:open");
        }
    }

    render(): void {
        const listEl = this.containerEl.createDiv({ cls: "bionic-recent-notes-list" }); 
        
        let bookmarks: any[] = [];
        const bookmarksPlugin = (this.app as any).internalPlugins?.plugins?.bookmarks?.instance;
        
        if (bookmarksPlugin && bookmarksPlugin.getBookmarks) {
            bookmarks = bookmarksPlugin.getBookmarks().filter((b: any) => b.type === "file");
        }
        
        if (bookmarks.length === 0) {
            const emptyEl = listEl.createDiv({ cls: "bionic-rich-empty-state" });
            
            const iconBadge = emptyEl.createDiv({ cls: "bionic-empty-icon-badge" });
            setIcon(iconBadge, "bookmark");
            
            emptyEl.createDiv({ cls: "bionic-empty-title", text: "No pinned notes" });
            emptyEl.createDiv({ cls: "bionic-empty-guidance", text: "Right-click any file in your file explorer and choose 'Bookmark' to pin it here." });
            
            const actionBtn = emptyEl.createDiv({ cls: "bionic-empty-action-btn" });
            const btnIcon = actionBtn.createSpan({ cls: "bionic-btn-icon" });
            setIcon(btnIcon, "search");
            actionBtn.createSpan({ text: "Browse Files" });
            
            actionBtn.addEventListener("click", () => {
                const commands = (this.app as any).commands;
                if (commands && commands.executeCommandById) {
                    commands.executeCommandById("file-explorer:open");
                }
            });
            return;
        }

        for (const bookmark of bookmarks.slice(0, 5)) {
            const itemEl = listEl.createDiv({ cls: "bionic-list-item" });
            
            const iconEl = itemEl.createDiv({ cls: "bionic-list-item-icon" });
            setIcon(iconEl, "pin");
            
            const infoEl = itemEl.createDiv({ cls: "bionic-list-item-info" });
            infoEl.createDiv({ cls: "bionic-list-item-title", text: bookmark.title || bookmark.path.split('/').pop()?.replace('.md', '') });
            
            const file = this.app.vault.getAbstractFileByPath(bookmark.path);
            if (file && file instanceof TFile) {
                const cache = this.app.metadataCache.getFileCache(file);
                let metaText = "Today";
                if (cache?.tags && cache.tags.length > 0) {
                    metaText = cache.tags[0].tag;
                }
                
                infoEl.createDiv({ cls: "bionic-list-item-meta bionic-tag-meta", text: metaText });
                
                itemEl.addEventListener("click", () => {
                    this.app.workspace.getLeaf(false).openFile(file);
                });
            } else {
                infoEl.createDiv({ cls: "bionic-list-item-meta bionic-tag-meta", text: "#pinned" });
            }
        }
    }
}
