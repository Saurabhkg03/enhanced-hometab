import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_HOMETAB, VIEW_TITLE_HOMETAB } from "../constants";
import { DashboardEngine } from "../managers/DashboardEngine";
import EnhancedHometabPlugin from "../main";

export class HomeView extends ItemView {
    private dashboardEngine: DashboardEngine;
    private plugin: EnhancedHometabPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: EnhancedHometabPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_HOMETAB;
    }

    getDisplayText() {
        return VIEW_TITLE_HOMETAB;
    }

    getIcon(): string {
        return "home";
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement; // .view-content
        container.empty();
        
        this.dashboardEngine = new DashboardEngine(this.app, container, this.plugin.settingsManager);
        this.addChild(this.dashboardEngine); 
    }

    async onClose() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
    }
}
