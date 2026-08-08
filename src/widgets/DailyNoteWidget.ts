import { BaseWidget } from "./BaseWidget";
import { TFile, setIcon, moment } from "obsidian";
import { yieldToMain } from "../utils/performance";

interface Task {
    text: string;
    file: TFile;
    line: number;
}

export class DailyNoteWidget extends BaseWidget {
    constructor() {
        super({
            id: "daily-note",
            name: "Tasks",
            description: "Shows pending tasks across your notes",
            icon: "check-square",
            defaultSize: 1
        });
    }

    protected onViewAllClick(): void {
        this.openOrCreateTaskNote();
    }

    private async openOrCreateTaskNote(): Promise<void> {
        const dateStr = moment().format("YYYY-MM-DD");
        
        // Check if today's note or task note exists
        const files = this.app.vault.getMarkdownFiles();
        let targetFile = files.find(f => f.basename === dateStr || f.basename.includes(dateStr));
        
        if (!targetFile) {
            // Check daily notes plugin
            const dailyNotesPlugin = (this.app as any).internalPlugins?.getPluginById("daily-notes");
            if (dailyNotesPlugin?.enabled && dailyNotesPlugin.instance) {
                try {
                    await dailyNotesPlugin.instance.openOrCreateDailyNote();
                    targetFile = this.app.workspace.getActiveFile() || undefined;
                } catch (e) {
                    // Ignore
                }
            }
        }

        if (!targetFile) {
            // Create target file named YYYY-MM-DD.md with a single blank checkbox
            try {
                const initialContent = `# Tasks (${dateStr})\n\n- [ ] `;
                targetFile = await this.app.vault.create(`${dateStr}.md`, initialContent);
            } catch (e) {
                const file = this.app.vault.getAbstractFileByPath(`${dateStr}.md`);
                if (file instanceof TFile) targetFile = file;
            }
        }

        if (targetFile) {
            // Ensure targetFile contains task checkboxes
            let content = await this.app.vault.read(targetFile);
            if (!content.includes("- [ ]")) {
                const appendText = content.trim().length > 0 
                    ? `\n\n## Tasks\n- [ ] ` 
                    : `# Tasks (${dateStr})\n\n- [ ] `;
                content += appendText;
                await this.app.vault.modify(targetFile, content);
            }

            // Open the file
            await this.app.workspace.getLeaf(false).openFile(targetFile);
        }
    }

    async render() {
        const subHeader = this.containerEl.createDiv({ cls: "bionic-daily-note-subheader" });
        subHeader.style.cursor = "pointer";
        subHeader.title = "Open today's task note";
        
        const dateStr = moment().format("YYYY-MM-DD");
        subHeader.createSpan({ text: dateStr, cls: "bionic-daily-note-date" });
        const iconEl = subHeader.createSpan({ cls: "bionic-daily-note-icon" });
        setIcon(iconEl, "calendar");

        subHeader.addEventListener("click", () => {
            this.openOrCreateTaskNote();
        });

        const listEl = this.containerEl.createDiv({ cls: "bionic-tasks-list" });
        listEl.createDiv({ cls: "bionic-loading", text: "Loading tasks..." });

        const tasks = await this.fetchTasks();
        listEl.empty();

        if (tasks.length === 0) {
            const emptyEl = listEl.createDiv({ cls: "bionic-rich-empty-state" });
            
            const iconBadge = emptyEl.createDiv({ cls: "bionic-empty-icon-badge" });
            setIcon(iconBadge, "check-circle-2");
            
            emptyEl.createDiv({ cls: "bionic-empty-title", text: "All caught up!" });
            emptyEl.createDiv({ cls: "bionic-empty-guidance", text: "No pending `- [ ]` tasks found in your recent notes. Enjoy your day!" });
            
            const actionBtn = emptyEl.createDiv({ cls: "bionic-empty-action-btn" });
            const btnIcon = actionBtn.createSpan({ cls: "bionic-btn-icon" });
            setIcon(btnIcon, "plus-circle");
            actionBtn.createSpan({ text: "Add New Task Note" });
            
            actionBtn.addEventListener("click", () => {
                this.openOrCreateTaskNote();
            });
        } else {
            for (const task of tasks.slice(0, 4)) {
                const itemEl = listEl.createDiv({ cls: "bionic-task-item" });
                
                const checkboxEl = itemEl.createEl("input", { type: "checkbox", cls: "bionic-task-checkbox" });
                checkboxEl.addEventListener("change", async (e) => {
                    const target = e.target as HTMLInputElement;
                    target.disabled = true;
                    await this.toggleTaskInFile(task.file, task.text, task.line);
                    itemEl.style.opacity = "0.5";
                    itemEl.style.textDecoration = "line-through";
                    setTimeout(() => {
                        itemEl.style.display = "none";
                    }, 500);
                });
                
                const infoEl = itemEl.createDiv({ cls: "bionic-task-info" });
                infoEl.createDiv({ cls: "bionic-task-text", text: task.text });
                
                itemEl.addEventListener("click", (e) => {
                    if ((e.target as HTMLElement).tagName !== "INPUT") {
                        this.app.workspace.getLeaf(false).openFile(task.file);
                    }
                });
            }

            const addTaskBtn = this.containerEl.createDiv({ cls: "bionic-add-task-btn" });
            const addIconEl = addTaskBtn.createSpan({ cls: "bionic-add-task-icon" });
            setIcon(addIconEl, "plus");
            addTaskBtn.createSpan({ text: "Add a task" });
            addTaskBtn.addEventListener("click", () => {
                this.openOrCreateTaskNote();
            });
        }
    }

    private async fetchTasks(): Promise<Task[]> {
        const tasks: Task[] = [];
        const files = this.app.vault.getMarkdownFiles();
        
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentFiles = files.filter(f => f.stat.mtime > sevenDaysAgo);
        recentFiles.sort((a, b) => b.stat.mtime - a.stat.mtime);
        
        const filesToScan = recentFiles.slice(0, 20);

        let i = 0;
        for (const file of filesToScan) {
            if (++i % 5 === 0) {
                await yieldToMain();
            }
            const content = await this.app.vault.cachedRead(file);
            const lines = content.split('\n');
            for (let j = 0; j < lines.length; j++) {
                const line = lines[j];
                const taskMatch = line.match(/^[\s]*[-*]\s\[ \]\s(.*)/);
                if (taskMatch) {
                    tasks.push({
                        text: taskMatch[1],
                        file: file,
                        line: j
                    });
                }
            }
        }
        
        return tasks;
    }

    private async toggleTaskInFile(file: TFile, taskText: string, preferredLineIndex?: number) {
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        let modified = false;

        // Try preferred line index first if it matches
        if (preferredLineIndex !== undefined && preferredLineIndex < lines.length) {
            const line = lines[preferredLineIndex];
            if (line.includes('[ ]') && line.includes(taskText)) {
                lines[preferredLineIndex] = line.replace(/\[ \]/, "[x]");
                modified = true;
            }
        }

        // If preferred line index was inaccurate (due to line shifts), search entire file
        if (!modified) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('[ ]') && line.includes(taskText)) {
                    lines[i] = line.replace(/\[ \]/, "[x]");
                    modified = true;
                    break;
                }
            }
        }

        if (modified) {
            await this.app.vault.modify(file, lines.join('\n'));
        }
    }
}
