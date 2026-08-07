import { App, Component, MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import { SettingsManager } from "./SettingsManager";

export class ActivityTracker extends Component {
    private app: App;
    private settingsManager: SettingsManager;
    private debounceTimer: number | null = null;

    constructor(app: App, settingsManager: SettingsManager) {
        super();
        this.app = app;
        this.settingsManager = settingsManager;
    }

    onload() {
        this.registerEvent(
            this.app.workspace.on('file-open', (file: TFile | null) => {
                if (file) {
                    this.trackFileOpen(file);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file instanceof TFile) {
                    this.trackFileModify(file);
                }
            })
        );
    }

    private trackFileOpen(file: TFile) {
        if (!this.settingsManager.settings.continueWorkingData) {
            this.settingsManager.settings.continueWorkingData = {};
        }

        const data = this.settingsManager.settings.continueWorkingData;
        const noteRef = {
            path: file.path,
            title: file.basename,
            timestamp: Date.now()
        };

        if (file.extension === 'canvas') {
            data.lastCanvas = noteRef;
        } else if (file.extension === 'md') {
            data.lastOpenedNote = noteRef;
        }

        this.debouncedSave();
    }

    private trackFileModify(file: TFile) {
        if (!this.settingsManager.settings.continueWorkingData) {
            this.settingsManager.settings.continueWorkingData = {};
        }

        const data = this.settingsManager.settings.continueWorkingData;
        
        if (file.extension === 'md' || file.extension === 'canvas') {
            data.lastEditedNote = {
                path: file.path,
                title: file.basename,
                timestamp: Date.now()
            };
            this.debouncedSave();
        }
    }

    private trackWorkspaceSession() {
        if (!this.settingsManager.settings.continueWorkingData) {
            this.settingsManager.settings.continueWorkingData = {};
        }

        const leaves = this.app.workspace.getLeavesOfType('markdown');
        const canvasLeaves = this.app.workspace.getLeavesOfType('canvas');
        const allLeaves = [...leaves, ...canvasLeaves];

        // Only track if there are real files open
        const tabs = allLeaves.map(l => {
            const file = (l.view as any).file;
            return file ? { path: file.path, title: file.basename, type: file.extension } : null;
        }).filter(t => t !== null) as { path: string; title: string; type: string }[];

        if (tabs.length > 0) {
            this.settingsManager.settings.continueWorkingData.lastWorkspace = {
                timestamp: Date.now(),
                tabsCount: tabs.length,
                tabs: tabs
            };
        }
    }

    private debouncedSave() {
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(async () => {
            // Update workspace session state right before we save
            this.trackWorkspaceSession();
            await this.settingsManager.saveSettings();
            // Intentionally omitting the trigger for "enhanced-hometab:settings-updated"
            // so we don't force-reload the active Hometab view on every file open/edit.
        }, 3000);
    }
}
