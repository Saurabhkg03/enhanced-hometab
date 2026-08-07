import { MarkdownView, setIcon, TFile } from "obsidian";
import { BaseWidget } from "./BaseWidget";
import { SettingsManager } from "../managers/SettingsManager";
import { ContinueWorkingHistory } from "../types/settings";

export class ContinueWorkingWidget extends BaseWidget {
    private settingsManager: SettingsManager;

    constructor(settingsManager: SettingsManager) {
        super({
            id: "continue-working",
            name: "Continue working",
            description: "Resume where you left off",
            icon: "play-circle",
            defaultSize: 3 // Full width widget
        });
        this.settingsManager = settingsManager;
    }

    render(): void {
        const data = this.settingsManager.settings.continueWorkingData;
        if (!this.hasHistory(data)) {
            this.containerEl.style.display = "none";
            return;
        }

        this.containerEl.style.display = "flex";
        this.containerEl.addClass("bionic-continue-working-widget");

        const contentEl = this.containerEl.createDiv({ cls: "bionic-continue-working-content" });

        // Hero Section
        this.renderHeroSection(contentEl, data!);

        // Details Section
        this.renderDetailsSection(contentEl, data!);
    }

    private hasHistory(data?: ContinueWorkingHistory): boolean {
        if (!data) return false;
        
        // Check if any referenced file exists in vault
        const checkExists = (path: string | undefined) => {
            if (!path) return false;
            return this.app.vault.getAbstractFileByPath(path) instanceof TFile;
        };

        return (
            checkExists(data.lastEditedNote?.path) ||
            checkExists(data.lastOpenedNote?.path) ||
            checkExists(data.lastCanvas?.path) ||
            (data.lastWorkspace?.tabsCount ?? 0) > 1
        );
    }

    private renderHeroSection(containerEl: HTMLElement, data: ContinueWorkingHistory) {
        const heroEl = containerEl.createDiv({ cls: "bionic-cw-hero" });
        
        // Find the most relevant active item
        let activeNote = data.lastEditedNote || data.lastOpenedNote || data.lastCanvas;
        
        if (!activeNote || !this.app.vault.getAbstractFileByPath(activeNote.path)) {
            return;
        }

        const typeIcon = activeNote.path.endsWith('.canvas') ? 'layout-dashboard' : 'file-text';

        const infoEl = heroEl.createDiv({ cls: "bionic-cw-hero-info" });
        const badgeEl = infoEl.createDiv({ cls: "bionic-cw-hero-badge" });
        setIcon(badgeEl, "clock");
        badgeEl.createSpan({ text: "RECENT ACTIVITY" });

        infoEl.createDiv({ cls: "bionic-cw-hero-title", text: activeNote.title });
        
        let subtitle = `Opened ${this.formatTimeAgo(activeNote.timestamp)}`;
        infoEl.createDiv({ cls: "bionic-cw-hero-subtitle", text: subtitle });

        const btnEl = heroEl.createEl("button", { cls: "bionic-btn bionic-btn-primary bionic-cw-resume-btn" });
        setIcon(btnEl, "play");
        btnEl.createSpan({ text: "Resume" });

        btnEl.addEventListener("click", () => this.openNote(activeNote));
    }

    private renderDetailsSection(containerEl: HTMLElement, data: ContinueWorkingHistory) {
        const gridEl = containerEl.createDiv({ cls: "bionic-cw-grid" });

        const renderCard = (title: string, icon: string, item: any, onClick: () => void) => {
            if (!item) return;
            // Validate existence
            if (item.path && !this.app.vault.getAbstractFileByPath(item.path)) return;

            const card = gridEl.createDiv({ cls: "bionic-cw-card" });
            const iconEl = card.createDiv({ cls: "bionic-cw-card-icon" });
            setIcon(iconEl, icon);

            const textEl = card.createDiv({ cls: "bionic-cw-card-text" });
            textEl.createDiv({ cls: "bionic-cw-card-title", text: title });
            
            let metaText = item.title;
            if (item.tabsCount) {
                metaText = `${item.tabsCount} Tabs open`;
            }

            textEl.createDiv({ cls: "bionic-cw-card-meta", text: metaText });

            card.addEventListener("click", onClick);
        };

        if (data.lastEditedNote) {
            renderCard("Last Edited", "edit-2", data.lastEditedNote, () => this.openNote(data.lastEditedNote!));
        }

        if (data.lastOpenedNote && data.lastOpenedNote.path !== data.lastEditedNote?.path) {
            renderCard("Last Opened", "file-text", data.lastOpenedNote, () => this.openNote(data.lastOpenedNote!));
        }

        if (data.lastCanvas) {
            renderCard("Last Canvas", "layout-dashboard", data.lastCanvas, () => this.openNote(data.lastCanvas!));
        }

        if (data.lastWorkspace && data.lastWorkspace.tabsCount > 1) {
            renderCard("Previous Session", "layout", data.lastWorkspace, async () => {
                const tabs = data.lastWorkspace!.tabs;
                for (const tab of tabs) {
                    const file = this.app.vault.getAbstractFileByPath(tab.path);
                    if (file instanceof TFile) {
                        const leaf = this.app.workspace.getLeaf('tab');
                        await leaf.openFile(file);
                    }
                }
            });
        }
    }

    private async openNote(item: { path: string }) {
        const file = this.app.vault.getAbstractFileByPath(item.path);
        if (file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(file);
        }
    }

    private formatTimeAgo(timestamp: number): string {
        const now = Date.now();
        const diff = Math.max(0, now - timestamp);
        
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return `Just now`;
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        if (days === 1) return `Yesterday`;
        return `${days}d ago`;
    }
}
