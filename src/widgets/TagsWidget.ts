import { BaseWidget } from "./BaseWidget";
import { setIcon } from "obsidian";

const TAG_COLORS = [
    { bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.3)", text: "#a78bfa" }, // Purple
    { bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)", text: "#34d399" }, // Emerald
    { bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.3)", text: "#fb923c" }, // Orange
    { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa" }, // Blue
    { bg: "rgba(236, 72, 153, 0.12)", border: "rgba(236, 72, 153, 0.3)", text: "#f472b6" }, // Pink
    { bg: "rgba(20, 184, 166, 0.12)", border: "rgba(20, 184, 166, 0.3)", text: "#2dd4bf" }, // Teal
];

export class TagsWidget extends BaseWidget {
    constructor() {
        super({
            id: "tags",
            name: "Recently Used Tags",
            description: "Shows your most used tags",
            icon: "tag",
            defaultSize: 1
        });
    }

    protected onViewAllClick(): void {
        const commands = (this.app as any).commands;
        if (commands && commands.executeCommandById) {
            commands.executeCommandById("tag-pane:open");
        }
    }

    render(): void {
        const tagsContainer = this.containerEl.createDiv({ cls: "bionic-tags-grid" });
        
        const tags = (this.app.metadataCache as any).getTags() || {};
        
        const sortedTags = Object.entries(tags)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 12);
            
        if (sortedTags.length === 0) {
            const emptyEl = tagsContainer.createDiv({ cls: "bionic-rich-empty-state" });
            
            const iconBadge = emptyEl.createDiv({ cls: "bionic-empty-icon-badge" });
            setIcon(iconBadge, "tag");
            
            emptyEl.createDiv({ cls: "bionic-empty-title", text: "No tags found" });
            emptyEl.createDiv({ cls: "bionic-empty-guidance", text: "Add `#tag` keywords anywhere inside your notes to categorize and discover them here." });
            
            const actionBtn = emptyEl.createDiv({ cls: "bionic-empty-action-btn" });
            const btnIcon = actionBtn.createSpan({ cls: "bionic-btn-icon" });
            setIcon(btnIcon, "plus");
            actionBtn.createSpan({ text: "Create Tagged Note" });
            
            actionBtn.addEventListener("click", () => {
                const commands = (this.app as any).commands;
                if (commands && commands.executeCommandById) {
                    commands.executeCommandById("file-explorer:new-file");
                }
            });
            return;
        }

        let colorIdx = 0;
        for (const [tag, count] of sortedTags) {
            const color = TAG_COLORS[colorIdx % TAG_COLORS.length];
            colorIdx++;

            const tagEl = tagsContainer.createDiv({ cls: "bionic-tag-pill" });
            tagEl.style.backgroundColor = color.bg;
            tagEl.style.borderColor = color.border;

            const iconEl = tagEl.createDiv({ cls: "bionic-tag-icon" });
            setIcon(iconEl, "hashtag");
            iconEl.style.color = color.text;

            const cleanTagName = tag.replace(/^#/, "");
            const nameEl = tagEl.createSpan({ cls: "bionic-tag-name", text: cleanTagName });
            nameEl.style.color = color.text;

            const countEl = tagEl.createSpan({ cls: "bionic-tag-count", text: `${count}` });

            tagEl.addEventListener("click", () => {
                const searchPlugin = (this.app as any).internalPlugins?.getPluginById("global-search");
                if (searchPlugin?.instance) {
                    searchPlugin.instance.openGlobalSearch(`tag:${tag}`);
                }
            });
        }
    }
}
