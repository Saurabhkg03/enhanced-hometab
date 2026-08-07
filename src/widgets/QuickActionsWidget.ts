import { BaseWidget } from "./BaseWidget";
import { setIcon, Notice, Menu, moment } from "obsidian";
import { CalendarModal } from "../components/CalendarModal";
import { NewFolderModal } from "../components/NewFolderModal";

interface QuickAction {
    id: string;
    icon: string;
    label: string;
    colorClass: string;
    shortcut: number;
    onClick: (e?: MouseEvent) => void;
}

export class QuickActionsWidget extends BaseWidget {
    private shortcutListener: ((e: KeyboardEvent) => void) | null = null;

    constructor() {
        super({
            id: "quick-actions",
            name: "Workspace launcher",
            description: "Common workspace actions",
            icon: "rocket",
            defaultSize: 12
        });
    }

    protected renderHeader(): void {
        const headerEl = this.containerEl.createDiv({ cls: "bionic-section-header" });
        headerEl.createEl("h3", { text: this.config.name, cls: "bionic-section-title" });

        const menuBtnEl = headerEl.createDiv({ cls: "bionic-section-menu-btn" });
        setIcon(menuBtnEl, "more-horizontal");
        menuBtnEl.title = "Configure Workspace Launcher buttons";

        menuBtnEl.addEventListener("click", (e) => {
            e.preventDefault();
            const plugin = (this.app as any).plugins.plugins["enhanced-hometab"];
            if (!plugin) return;

            const menu = new Menu();
            const launcherActions = plugin.settingsManager.settings.launcherActions || [];

            const actionLabels: Record<string, string> = {
                "new-note": "New note",
                "new-folder": "New folder",
                "new-canvas": "New canvas",
                "quick-capture": "Quick capture",
                "open-today": "Open today",
                "templates": "Templates",
                "calendar": "Calendar"
            };

            for (const item of launcherActions) {
                const isChecked = !item.hidden;
                const label = actionLabels[item.id] || item.id;

                menu.addItem((menuItem) => {
                    menuItem
                        .setTitle(label)
                        .setChecked(isChecked)
                        .onClick(async () => {
                            item.hidden = !item.hidden;
                            await plugin.settingsManager.saveSettings();
                            (this.app as any).workspace.trigger("enhanced-hometab:settings-updated");
                        });
                });
            }

            menu.showAtMouseEvent(e);
        });
    }

    onunload(): void {
        if (this.shortcutListener) {
            window.removeEventListener("keydown", this.shortcutListener, true);
            this.shortcutListener = null;
        }
    }

    render(): void {
        const actionsContainer = this.containerEl.createDiv({ cls: "bionic-quick-actions-grid" });
        
        const createFromTemplate = async (title: string, content: string) => {
            const timestamp = moment().format("YYYY-MM-DD");
            const finalContent = content.replace(/{{date}}/g, timestamp);
            
            let i = 0;
            let filename = `${title} (${timestamp}).md`;
            while (this.app.vault.getAbstractFileByPath(filename)) {
                i++;
                filename = `${title} (${timestamp}) ${i}.md`;
            }
            const newFile = await this.app.vault.create(filename, finalContent);
            this.app.workspace.getLeaf(false).openFile(newFile);
        };

        const allActions: Record<string, QuickAction> = {
            "new-note": {
                id: "new-note", icon: "file-plus", label: "New note", colorClass: "color-purple", shortcut: 1,
                onClick: async () => {
                    let i = 0;
                    let filename = "Untitled.md";
                    while (this.app.vault.getAbstractFileByPath(filename)) {
                        i++;
                        filename = `Untitled ${i}.md`;
                    }
                    const newFile = await this.app.vault.create(filename, "");
                    this.app.workspace.getLeaf(false).openFile(newFile);
                }
            },
            "new-folder": {
                id: "new-folder", icon: "folder-plus", label: "New folder", colorClass: "color-green", shortcut: 2,
                onClick: () => {
                    new NewFolderModal(this.app, async (folderName) => {
                        let i = 0;
                        let finalName = folderName;
                        while (this.app.vault.getAbstractFileByPath(finalName)) {
                            i++;
                            finalName = `${folderName} ${i}`;
                        }
                        try {
                            await this.app.vault.createFolder(finalName);
                            new Notice(`Created folder: ${finalName}`);
                        } catch (e) {
                            new Notice(`Failed to create folder: ${folderName}`);
                        }
                    }).open();
                }
            },
            "new-canvas": {
                id: "new-canvas", icon: "layout-dashboard", label: "New canvas", colorClass: "color-orange", shortcut: 3,
                onClick: () => {
                    (this.app as any).commands.executeCommandById('canvas:new-file');
                }
            },
            "quick-capture": {
                id: "quick-capture", icon: "zap", label: "Quick capture", colorClass: "color-yellow", shortcut: 4,
                onClick: async () => {
                    const timestamp = moment().format("YYYYMMDDHHmmss");
                    const filename = `Quick Capture - ${timestamp}.md`;
                    const newFile = await this.app.vault.create(filename, "- [ ] ");
                    this.app.workspace.getLeaf(false).openFile(newFile);
                }
            },
            "open-today": {
                id: "open-today", icon: "calendar-days", label: "Open today", colorClass: "color-blue", shortcut: 5,
                onClick: async () => {
                    const dateStr = moment().format("YYYY-MM-DD");
                    let file = this.app.vault.getMarkdownFiles().find(f => f.basename === dateStr);
                    if (!file) {
                        try {
                            file = await this.app.vault.create(`${dateStr}.md`, `# Tasks (${dateStr})\n\n- [ ] `);
                        } catch (e) {
                            // Fallback
                        }
                    }
                    if (file) {
                        this.app.workspace.getLeaf(false).openFile(file);
                    }
                }
            },
            "templates": {
                id: "templates", icon: "layout-template", label: "Templates", colorClass: "color-purple", shortcut: 6,
                onClick: (e?: MouseEvent) => {
                    const menu = new Menu();
                    
                    menu.addItem((item) => {
                        item
                            .setTitle("Meeting Notes")
                            .setIcon("users")
                            .onClick(() => {
                                createFromTemplate("Meeting Notes", `# 🤝 Meeting Notes\n\n**Date:** {{date}}\n**Attendees:** \n\n---\n\n## 📌 Agenda\n- \n\n## 📝 Key Notes & Decisions\n- \n\n## ✅ Action Items\n- [ ] `);
                            });
                    });

                    menu.addItem((item) => {
                        item
                            .setTitle("Project Plan")
                            .setIcon("kanban")
                            .onClick(() => {
                                createFromTemplate("Project Plan", `# 🚀 Project Plan\n\n**Created:** {{date}}\n**Status:** 🟡 Planning\n\n---\n\n## 🎯 Objectives\n- \n\n## 📋 Milestones\n- [ ] Phase 1: Setup\n- [ ] Phase 2: Implementation\n- [ ] Phase 3: Launch\n`);
                            });
                    });

                    menu.addItem((item) => {
                        item
                            .setTitle("Daily Journal")
                            .setIcon("book-open")
                            .onClick(() => {
                                createFromTemplate("Daily Journal", `# 📓 Journal - {{date}}\n\n## ☀️ Morning Focus\n- **Gratitude:** \n- **Top Priority:** \n\n---\n\n## 🌙 Evening Review\n- **Wins:** \n- **Learnings:** \n`);
                            });
                    });

                    menu.addItem((item) => {
                        item
                            .setTitle("Book & Reading Notes")
                            .setIcon("book-marked")
                            .onClick(() => {
                                createFromTemplate("Book Notes", `# 📚 Book Notes\n\n**Title:** \n**Author:** \n**Rating:** ⭐⭐⭐⭐⭐\n\n---\n\n## 💡 Key Takeaways\n- \n\n## 📖 Summary & Highlights\n- \n`);
                            });
                    });

                    menu.addItem((item) => {
                        item
                            .setTitle("Insert Obsidian Native Template...")
                            .setIcon("settings")
                            .onClick(() => {
                                const commands = (this.app as any).commands;
                                try {
                                    commands.executeCommandById('templater-obsidian:open-insert-template') ||
                                    commands.executeCommandById('templates:insert-template');
                                } catch (e) {
                                    new Notice("No native template folder configured in Obsidian settings.");
                                }
                            });
                    });

                    if (e) {
                        menu.showAtMouseEvent(e);
                    } else {
                        menu.showAtPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    }
                }
            },
            "calendar": {
                id: "calendar", icon: "calendar", label: "Calendar", colorClass: "color-purple", shortcut: 7,
                onClick: () => {
                    new CalendarModal(this.app).open();
                }
            }
        };

        const settings = (this.app as any).plugins.plugins["enhanced-hometab"]?.settingsManager?.settings;
        const launcherActions = settings?.launcherActions || [];

        const activeActions: QuickAction[] = [];
        for (const setting of launcherActions) {
            if (!setting.hidden && allActions[setting.id]) {
                activeActions.push(allActions[setting.id]);
            }
        }

        let draggedItemId: string | null = null;
        let dragTargetId: string | null = null;

        for (const action of activeActions) {
            const btnEl = actionsContainer.createDiv({ cls: "bionic-quick-action-btn" });
            
            btnEl.title = `${action.label} (Alt + ${action.shortcut})`;
            
            const iconEl = btnEl.createDiv({ cls: `bionic-quick-action-icon ${action.colorClass}` });
            setIcon(iconEl, action.icon);
            btnEl.createDiv({ cls: "bionic-quick-action-label", text: action.label });
            
            btnEl.addEventListener("click", (e) => action.onClick(e));

            btnEl.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                const menu = new Menu();
                menu.addItem((item) => {
                    item
                        .setTitle("Hide action")
                        .setIcon("eye-off")
                        .onClick(async () => {
                            const plugin = (this.app as any).plugins.plugins["enhanced-hometab"];
                            const actionSetting = plugin.settingsManager.settings.launcherActions.find((a: any) => a.id === action.id);
                            if (actionSetting) {
                                actionSetting.hidden = true;
                                await plugin.settingsManager.saveSettings();
                                (this.app as any).workspace.trigger("enhanced-hometab:settings-updated");
                            }
                        });
                });
                menu.showAtMouseEvent(e);
            });

            btnEl.setAttribute("draggable", "true");
            
            btnEl.addEventListener("dragstart", (e) => {
                draggedItemId = action.id;
                btnEl.addClass("dragging");
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", action.id);
                }
            });

            btnEl.addEventListener("dragend", () => {
                btnEl.removeClass("dragging");
                draggedItemId = null;
                dragTargetId = null;
                const items = actionsContainer.querySelectorAll(".bionic-quick-action-btn");
                items.forEach(el => el.removeClass("drag-over"));
            });

            btnEl.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (draggedItemId && draggedItemId !== action.id) {
                    btnEl.addClass("drag-over");
                }
            });

            btnEl.addEventListener("dragleave", () => {
                btnEl.removeClass("drag-over");
            });

            btnEl.addEventListener("drop", async (e) => {
                e.preventDefault();
                btnEl.removeClass("drag-over");
                
                if (draggedItemId && draggedItemId !== action.id) {
                    const plugin = (this.app as any).plugins.plugins["enhanced-hometab"];
                    if (!plugin) return;

                    const actions = plugin.settingsManager.settings.launcherActions;
                    const fromIndex = actions.findIndex((a: any) => a.id === draggedItemId);
                    const toIndex = actions.findIndex((a: any) => a.id === action.id);

                    if (fromIndex !== -1 && toIndex !== -1) {
                        const [movedItem] = actions.splice(fromIndex, 1);
                        actions.splice(toIndex, 0, movedItem);
                        await plugin.settingsManager.saveSettings();
                        (this.app as any).workspace.trigger("enhanced-hometab:settings-updated");
                    }
                }
            });
        }
    }
}
