import { Plugin } from "obsidian";
import { EnhancedHometabSettings, DEFAULT_SETTINGS } from "../types/settings";

export class SettingsManager {
    private plugin: Plugin;
    public settings: EnhancedHometabSettings;
    public loadPromise: Promise<void>;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    async loadSettings() {
        const loadedData = await this.plugin.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
        
        // Shallow merge the widgets object so defaults aren't lost
        if (loadedData && loadedData.widgets) {
            this.settings.widgets = { ...DEFAULT_SETTINGS.widgets, ...loadedData.widgets };
        }
    }

    async saveSettings(silent = false) {
        await this.plugin.saveData(this.settings);
        if (!silent) {
            (this.plugin.app.workspace as any).trigger("enhanced-hometab:settings-updated");
        }
    }

    get(key: keyof EnhancedHometabSettings) {
        return this.settings[key];
    }
}
