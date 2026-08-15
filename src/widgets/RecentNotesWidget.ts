import { BaseWidget } from "./BaseWidget";
import { setIcon } from "obsidian";

export class RecentNotesWidget extends BaseWidget {
    constructor() {
        super({
            id: "recent-notes",
            name: "Recent notes",
            description: "Shows recently modified files",
            icon: "clock",
            defaultSize: 1
        });
    }

    protected onViewAllClick(): void {
        const commands = (this.app as any).commands;
        if (commands && commands.executeCommandById) {
            commands.executeCommandById("file-explorer:open");
        }
    }

    render(): void {
        const listEl = this.containerEl.createDiv({ cls: "hometab-recent-notes-list" });
        
        // Fetch all markdown files
        const files = this.app.vault.getMarkdownFiles();
        
        // Sort by modified time descending
        files.sort((a, b) => b.stat.mtime - a.stat.mtime);
        
        // Take top 5
        const recentFiles = files.slice(0, 5);
        
        if (recentFiles.length === 0) {
            const emptyEl = listEl.createDiv({ cls: "hometab-rich-empty-state" });
            
            const iconBadge = emptyEl.createDiv({ cls: "hometab-empty-icon-badge" });
            setIcon(iconBadge, "file-plus");
            
            emptyEl.createDiv({ cls: "hometab-empty-title", text: "No notes created yet" });
            emptyEl.createDiv({ cls: "hometab-empty-guidance", text: "Create your first note to start building your digital garden." });
            
            const actionBtn = emptyEl.createDiv({ cls: "hometab-empty-action-btn" });
            const btnIcon = actionBtn.createSpan({ cls: "hometab-btn-icon" });
            setIcon(btnIcon, "plus");
            actionBtn.createSpan({ text: "Create New Note" });
            
            actionBtn.addEventListener("click", () => {
                const commands = (this.app as any).commands;
                if (commands && commands.executeCommandById) {
                    commands.executeCommandById("file-explorer:new-file");
                }
            });
            return;
        }

        for (const file of recentFiles) {
            const itemEl = listEl.createDiv({ cls: "hometab-list-item" });
            
            const iconEl = itemEl.createDiv({ cls: "hometab-list-item-icon" });
            setIcon(iconEl, "file-text");
            
            const infoEl = itemEl.createDiv({ cls: "hometab-list-item-info" });
            infoEl.createDiv({ cls: "hometab-list-item-title", text: file.basename });
            
            const timeAgo = this.formatTimeAgo(file.stat.mtime);
            infoEl.createDiv({ cls: "hometab-list-item-meta", text: timeAgo });
            
            itemEl.addEventListener("click", () => {
                this.app.workspace.getLeaf(false).openFile(file);
            });
        }
    }

    private formatTimeAgo(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        
        const days = Math.floor(hours / 24);
        if (days === 1) return `Yesterday`;
        return `${days}d`;
    }
}
