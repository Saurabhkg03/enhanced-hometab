import { App, Modal, Notice } from "obsidian";

export class NewFolderModal extends Modal {
    private onSubmit: (folderName: string) => void;

    constructor(app: App, onSubmit: (folderName: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl, containerEl } = this;
        containerEl.addClass("bionic-prompt-modal-wrapper");
        contentEl.empty();
        contentEl.addClass("bionic-prompt-modal-container");

        contentEl.createEl("h3", { text: "Create New Folder", cls: "bionic-prompt-title" });
        contentEl.createEl("p", { text: "Enter a name for your new folder:", cls: "bionic-prompt-subtitle" });

        const inputEl = contentEl.createEl("input", {
            type: "text",
            value: "New folder",
            cls: "bionic-prompt-input"
        });

        setTimeout(() => {
            inputEl.focus();
            inputEl.select();
        }, 50);

        const btnContainer = contentEl.createDiv({ cls: "bionic-prompt-btn-container" });

        const cancelBtn = btnContainer.createEl("button", { text: "Cancel", cls: "bionic-prompt-btn-secondary" });
        cancelBtn.addEventListener("click", () => this.close());

        const createBtn = btnContainer.createEl("button", { text: "Create Folder", cls: "bionic-prompt-btn-primary" });
        
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
