import { App, Modal, setIcon, TFile } from "obsidian";

export class CalendarModal extends Modal {
    private currentDate: Date;

    constructor(app: App) {
        super(app);
        this.currentDate = new Date();
    }

    onOpen() {
        const { contentEl, containerEl } = this;
        containerEl.addClass("hometab-calendar-modal-wrapper");
        contentEl.empty();
        contentEl.addClass("hometab-calendar-modal-container");

        this.renderCalendar();
    }

    private renderCalendar() {
        const { contentEl } = this;
        contentEl.empty();

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // Header
        const headerEl = contentEl.createDiv({ cls: "hometab-cal-header" });
        
        const prevBtn = headerEl.createDiv({ cls: "hometab-cal-nav-btn" });
        setIcon(prevBtn, "chevron-left");
        prevBtn.title = "Previous month";
        prevBtn.addEventListener("click", () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        const titleWrapper = headerEl.createDiv({ cls: "hometab-cal-title-wrapper" });
        titleWrapper.createEl("h2", { text: `${monthNames[month]} ${year}`, cls: "hometab-cal-title" });

        const nextBtn = headerEl.createDiv({ cls: "hometab-cal-nav-btn" });
        setIcon(nextBtn, "chevron-right");
        nextBtn.title = "Next month";
        nextBtn.addEventListener("click", () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Days of week
        const daysHeaderEl = contentEl.createDiv({ cls: "hometab-cal-days-header" });
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayNames.forEach(d => daysHeaderEl.createDiv({ cls: "hometab-cal-day-name", text: d }));

        // Grid
        const gridEl = contentEl.createDiv({ cls: "hometab-cal-grid" });

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            gridEl.createDiv({ cls: "hometab-cal-day empty" });
        }

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        const files = this.app.vault.getMarkdownFiles();

        for (let day = 1; day <= totalDays; day++) {
            const dayEl = gridEl.createDiv({ cls: "hometab-cal-day" });
            dayEl.createSpan({ text: `${day}`, cls: "hometab-cal-day-num" });

            if (isCurrentMonth && today.getDate() === day) {
                dayEl.addClass("today");
            }

            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const datePath = `${year}-${mStr}-${dStr}`;

            const existingFile = files.find(f => f.basename === datePath || f.basename.includes(datePath));
            if (existingFile) {
                dayEl.addClass("has-note");
                dayEl.title = `Note: ${existingFile.basename}`;
                dayEl.createDiv({ cls: "hometab-cal-dot" });
            }

            dayEl.addEventListener("click", async () => {
                this.close();
                let file = existingFile;
                if (!file) {
                    const content = `# Notes (${datePath})\n\n- [ ] `;
                    try {
                        file = await this.app.vault.create(`${datePath}.md`, content);
                    } catch (e) {
                        const fallback = this.app.vault.getAbstractFileByPath(`${datePath}.md`);
                        if (fallback instanceof TFile) file = fallback;
                    }
                }
                if (file) {
                    this.app.workspace.getLeaf(false).openFile(file);
                }
            });
        }

        // Footer with Today action
        const footerEl = contentEl.createDiv({ cls: "hometab-cal-footer" });
        const todayBtn = footerEl.createDiv({ cls: "hometab-cal-today-btn" });
        const todayIcon = todayBtn.createSpan({ cls: "btn-icon" });
        setIcon(todayIcon, "calendar");
        todayBtn.createSpan({ text: "Jump to Today" });

        todayBtn.addEventListener("click", () => {
            this.currentDate = new Date();
            this.renderCalendar();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
