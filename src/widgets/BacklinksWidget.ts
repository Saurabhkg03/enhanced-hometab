import { BaseWidget } from "./BaseWidget";
import { TFile, setIcon } from "obsidian";

export class BacklinksWidget extends BaseWidget {
    constructor() {
        super({
            id: "backlinks",
            name: "Most Connected Notes",
            description: "Notes with the highest number of backlinks",
            icon: "link",
            defaultSize: 1
        });
    }

    protected onViewAllClick(): void {
        const commands = (this.app as any).commands;
        if (commands && commands.executeCommandById) {
            commands.executeCommandById("backlink:open");
        }
    }

    render(): void {
        const listEl = this.containerEl.createDiv({ cls: "bionic-backlinks-list" });

        // Calculate real backlinks from app.metadataCache.resolvedLinks
        const resolvedLinks = (this.app.metadataCache as any)?.resolvedLinks || {};
        const backlinkCounts: Record<string, number> = {};

        for (const sourcePath in resolvedLinks) {
            const targets = resolvedLinks[sourcePath];
            if (targets) {
                for (const targetPath in targets) {
                    const count = targets[targetPath];
                    if (count > 0) {
                        backlinkCounts[targetPath] = (backlinkCounts[targetPath] || 0) + count;
                    }
                }
            }
        }

        const sortedPaths = Object.keys(backlinkCounts)
            .sort((a, b) => backlinkCounts[b] - backlinkCounts[a])
            .slice(0, 5);

        const items: { file: TFile; count: number }[] = [];
        for (const path of sortedPaths) {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                items.push({ file, count: backlinkCounts[path] });
            }
        }

        // If no backlinks exist yet across the vault, show top markdown files as suggestions or rich empty state
        if (items.length === 0) {
            const markdownFiles = this.app.vault.getMarkdownFiles()
                .sort((a, b) => b.stat.mtime - a.stat.mtime)
                .slice(0, 5);

            if (markdownFiles.length === 0) {
                const emptyEl = listEl.createDiv({ cls: "bionic-rich-empty-state" });
                
                const iconBadge = emptyEl.createDiv({ cls: "bionic-empty-icon-badge" });
                setIcon(iconBadge, "link-2-off");
                
                emptyEl.createDiv({ cls: "bionic-empty-title", text: "No connections found" });
                emptyEl.createDiv({ cls: "bionic-empty-guidance", text: "Use `[[Note Name]]` wikilinks inside your notes to build a web of interconnected ideas." });
                
                const actionBtn = emptyEl.createDiv({ cls: "bionic-empty-action-btn" });
                const btnIcon = actionBtn.createSpan({ cls: "bionic-btn-icon" });
                setIcon(btnIcon, "plus");
                actionBtn.createSpan({ text: "Create Linked Note" });
                
                actionBtn.addEventListener("click", () => {
                    const commands = (this.app as any).commands;
                    if (commands && commands.executeCommandById) {
                        commands.executeCommandById("file-explorer:new-file");
                    }
                });
                return;
            }

            for (const file of markdownFiles) {
                const itemEl = listEl.createDiv({ cls: "bionic-backlink-item" });
                
                const iconEl = itemEl.createDiv({ cls: "bionic-backlink-icon" });
                setIcon(iconEl, "file-text");

                const titleEl = itemEl.createDiv({ cls: "bionic-backlink-title", text: file.basename });

                const badgeEl = itemEl.createDiv({ cls: "bionic-backlink-badge" });
                const badgeIcon = badgeEl.createDiv({ cls: "bionic-backlink-badge-icon" });
                setIcon(badgeIcon, "link-2-off");
                badgeEl.createSpan({ text: "0 links" });

                itemEl.addEventListener("click", () => {
                    this.app.workspace.getLeaf(false).openFile(file);
                });
            }
            return;
        }

        for (const item of items) {
            const itemEl = listEl.createDiv({ cls: "bionic-backlink-item" });
            
            const iconEl = itemEl.createDiv({ cls: "bionic-backlink-icon" });
            setIcon(iconEl, "file-text");

            const titleEl = itemEl.createDiv({ cls: "bionic-backlink-title", text: item.file.basename });

            const badgeEl = itemEl.createDiv({ cls: "bionic-backlink-badge" });
            const badgeIcon = badgeEl.createDiv({ cls: "bionic-backlink-badge-icon" });
            setIcon(badgeIcon, "link");
            badgeEl.createSpan({ text: `${item.count} ${item.count === 1 ? 'link' : 'links'}` });

            itemEl.addEventListener("click", () => {
                this.app.workspace.getLeaf(false).openFile(item.file);
            });
        }
    }
}
