import { App, Modal, Notice } from "obsidian";

export class NewFolderModal extends Modal {
    private onSubmit: (folderName: string) => void;

    constructor(app: App, onSubmit: (folderName: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl, containerEl } = this;
        containerEl.addClass("hometab-prompt-modal-wrapper");
        contentEl.empty();
        contentEl.addClass("hometab-prompt-modal-container");

        contentEl.createEl("h3", { text: "Create New Folder", cls: "hometab-prompt-title" });
        contentEl.createEl("p", { text: "Enter a name for your new folder:", cls: "hometab-prompt-subtitle" });

        const inputEl = contentEl.createEl("input", {
            type: "text",
            value: "New folder",
            cls: "hometab-prompt-input"
        });

        setTimeout(() => {
            inputEl.focus();
            inputEl.select();
        }, 50);

        const btnContainer = contentEl.createDiv({ cls: "hometab-prompt-btn-container" });

        const cancelBtn = btnContainer.createEl("button", { text: "Cancel", cls: "hometab-prompt-btn-secondary" });
        cancelBtn.addEventListener("click", () => this.close());

        const createBtn = btnContainer.createEl("button", { text: "Create Folder", cls: "hometab-prompt-btn-primary" });
        
        const submit = () => {
            const val = inputEl.value.trim();
            if (val) {
                this.close();
                this.onSubmit(val);
            }
        };

        createBtn.addEventListener("click", submit);
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                submit();
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
