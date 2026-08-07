import { App, PluginSettingTab, Setting } from "obsidian";
import EnhancedHometabPlugin from "../main";

export class EnhancedHometabSettingTab extends PluginSettingTab {
    plugin: EnhancedHometabPlugin;

    constructor(app: App, plugin: EnhancedHometabPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Enhanced Hometab Settings' });

        new Setting(containerEl)
            .setName('Greeting Name')
            .setDesc('Name to display in the greeting')
            .addText(text => text
                .setPlaceholder('Explorer')
                .setValue(this.plugin.settingsManager.settings.greetingName)
                .onChange(async (value) => {
                    this.plugin.settingsManager.settings.greetingName = value;
                    await this.plugin.settingsManager.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Date')
            .setDesc('Show the current date under the greeting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.settings.showDate)
                .onChange(async (value) => {
                    this.plugin.settingsManager.settings.showDate = value;
                    await this.plugin.settingsManager.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Replace New Tab')
            .setDesc('Automatically open the Enhanced Hometab when creating a new empty tab')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settingsManager.settings.replaceNewTabs)
                .onChange(async (value) => {
                    this.plugin.settingsManager.settings.replaceNewTabs = value;
                    await this.plugin.settingsManager.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Widgets' });

        const widgets = this.plugin.settingsManager.settings.widgets;
        for (const [id, widgetSetting] of Object.entries(widgets)) {
            new Setting(containerEl)
                .setName(`Enable ${id}`)
                .addToggle(toggle => toggle
                    .setValue(widgetSetting.enabled)
                    .onChange(async (value) => {
                        widgetSetting.enabled = value;
                        await this.plugin.settingsManager.saveSettings();
                    }));
        }
    }
}
