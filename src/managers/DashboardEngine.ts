import { App, Component, EventRef, setIcon } from "obsidian";
import { WidgetManager } from "./WidgetManager";
import { SearchBar } from "../components/SearchBar";
import { QuickActionsWidget } from "../widgets/QuickActionsWidget";
import { PinnedWidget } from "../widgets/PinnedWidget";
import { RecentNotesWidget } from "../widgets/RecentNotesWidget";
import { DailyNoteWidget } from "../widgets/DailyNoteWidget";
import { TagsWidget } from "../widgets/TagsWidget";
import { BacklinksWidget } from "../widgets/BacklinksWidget";
import { ContinueWorkingWidget } from "../widgets/ContinueWorkingWidget";
import { SettingsManager } from "./SettingsManager";
import { LayoutManager } from "./LayoutManager";

export class DashboardEngine extends Component {
    private app: App;
    private containerEl: HTMLElement;
    private settingsManager: SettingsManager;
    private settingsEventRef: EventRef;
    
    private headerEl: HTMLElement;
    private searchAreaEl: HTMLElement;
    private widgetsGridEl: HTMLElement;
    private bgEl: HTMLElement | null = null;
    
    public widgetManager: WidgetManager;
    private layoutManager: LayoutManager;
    private searchBar: SearchBar;
    private clockInterval: number | null = null;
    private vaultTimer: number | null = null;

    constructor(app: App, containerEl: HTMLElement, settingsManager: SettingsManager) {
        super();
        this.app = app;
        this.containerEl = containerEl;
        this.settingsManager = settingsManager;
        
        this.widgetManager = new WidgetManager(this.app);
        this.layoutManager = new LayoutManager(this.app, this.settingsManager, this.widgetManager);
        
        this.setupWidgets();
        
        this.addChild(this.widgetManager);
        this.addChild(this.layoutManager);
    }

    private setupWidgets() {
        const settings = this.settingsManager.settings.widgets;
        if (settings["continue-working"]?.enabled !== false) {
            this.widgetManager.registerWidget(new ContinueWorkingWidget(this.settingsManager));
        }
        if (settings["quick-actions"]?.enabled !== false) {
            this.widgetManager.registerWidget(new QuickActionsWidget());
        }
        if (settings["pinned"]?.enabled !== false) {
            this.widgetManager.registerWidget(new PinnedWidget());
        }
        if (settings["recent-notes"]?.enabled !== false) {
            this.widgetManager.registerWidget(new RecentNotesWidget());
        }
        if (settings["daily-note"]?.enabled !== false) {
            this.widgetManager.registerWidget(new DailyNoteWidget());
        }
        if (settings["tags"]?.enabled !== false) {
            this.widgetManager.registerWidget(new TagsWidget());
        }
        if (settings["backlinks"]?.enabled !== false) {
            this.widgetManager.registerWidget(new BacklinksWidget());
        }
    }

    onload() {
        this.render();
        this.registerVaultObservers();

        this.settingsEventRef = (this.app.workspace as any).on("enhanced-hometab:settings-updated", () => {
            this.handleSettingsUpdated();
        });
    }

    private registerVaultObservers() {
        const triggerWidgetRefresh = () => {
            if (this.vaultTimer) window.clearTimeout(this.vaultTimer);
            this.vaultTimer = window.setTimeout(() => {
                this.widgetManager.refreshWidget("recent-notes");
                this.widgetManager.refreshWidget("daily-note");
                this.widgetManager.refreshWidget("continue-working");
                this.widgetManager.refreshWidget("backlinks");
                this.widgetManager.refreshWidget("tags");
                this.widgetManager.refreshWidget("pinned");
            }, 150);
        };

        this.registerEvent(this.app.vault.on("modify", triggerWidgetRefresh));
        this.registerEvent(this.app.vault.on("create", triggerWidgetRefresh));
        this.registerEvent(this.app.vault.on("delete", triggerWidgetRefresh));
        this.registerEvent(this.app.vault.on("rename", triggerWidgetRefresh));
        this.registerEvent(this.app.metadataCache.on("changed", triggerWidgetRefresh));
        this.registerEvent(this.app.workspace.on("active-leaf-change", triggerWidgetRefresh));
    }

    private handleSettingsUpdated() {
        // Toggle Glassmorphism class directly without rebuilding page
        this.containerEl.toggleClass("bionic-glass-mode", !!this.settingsManager.settings.enableGlassmorphism);

        // Update Background directly
        if (this.bgEl) {
            const bgUrl = this.settingsManager.settings.backgroundImage;
            if (bgUrl) {
                this.bgEl.style.backgroundImage = `url("${bgUrl}")`;
                this.bgEl.style.opacity = this.settingsManager.settings.backgroundOpacity.toString();
            } else {
                this.bgEl.remove();
                this.bgEl = null;
            }
        } else if (this.settingsManager.settings.backgroundImage) {
            this.renderBackground();
        }

        // Re-render ONLY the widget grid container in-place
        this.removeChild(this.widgetManager);
        this.widgetManager.onunload();

        this.widgetManager = new WidgetManager(this.app);
        this.setupWidgets();
        this.addChild(this.widgetManager);

        if (this.widgetsGridEl) {
            this.widgetManager.renderWidgets(this.widgetsGridEl, this.settingsManager.settings.widgetOrder);
            this.layoutManager.bindDraggable(this.widgetsGridEl);
        }
    }

    onunload() {
        if (this.clockInterval) {
            window.clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        if (this.vaultTimer) {
            window.clearTimeout(this.vaultTimer);
            this.vaultTimer = null;
        }
        this.containerEl.empty();
        if (this.settingsEventRef) {
            this.app.workspace.offref(this.settingsEventRef);
        }
    }

    private render() {
        if (this.clockInterval) {
            window.clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        this.containerEl.empty();
        this.containerEl.addClass("bionic-dashboard-container");
        this.containerEl.toggleClass("bionic-glass-mode", !!this.settingsManager.settings.enableGlassmorphism);

        this.renderBackground();
        this.renderSettingsMenu();

        const scrollWrapper = this.containerEl.createDiv({ cls: "bionic-dashboard-scroll-wrapper" });
        const contentWrapper = scrollWrapper.createDiv({ cls: "bionic-dashboard-content" });

        this.headerEl = contentWrapper.createDiv({ cls: "bionic-header" });
        this.renderHeader();

        this.searchAreaEl = contentWrapper.createDiv({ cls: "bionic-search-area" });
        this.renderSearchArea();

        this.widgetsGridEl = contentWrapper.createDiv({ cls: "bionic-widgets-grid" });
        this.widgetManager.renderWidgets(this.widgetsGridEl, this.settingsManager.settings.widgetOrder);
        this.layoutManager.bindDraggable(this.widgetsGridEl);
    }

    private renderBackground() {
        const bgUrl = this.settingsManager.settings.backgroundImage;
        if (!bgUrl) return;

        this.bgEl = this.containerEl.createDiv({ cls: "bionic-dashboard-background" });
        this.bgEl.style.backgroundImage = `url("${bgUrl}")`;
        this.bgEl.style.opacity = this.settingsManager.settings.backgroundOpacity.toString();
    }

    private renderHeader() {
        const greetingName = this.settingsManager.settings.greetingName || "Explorer";
        
        const date = new Date();
        const hour = date.getHours();
        let greetingPrefix = "Good morning";
        if (hour >= 5 && hour < 12) {
            greetingPrefix = "Good morning";
        } else if (hour >= 12 && hour < 17) {
            greetingPrefix = "Good afternoon";
        } else if (hour >= 17 && hour < 22) {
            greetingPrefix = "Good evening";
        } else {
            greetingPrefix = "Good night";
        }
        
        const titleContainer = this.headerEl.createDiv({ cls: "bionic-greeting-container" });
        
        const logoPath = this.app.vault.adapter.getResourcePath(".obsidian/plugins/enhanced-hometab/obsidianlogo.webp");
        titleContainer.createEl("img", {
            cls: "bionic-greeting-logo",
            attr: {
                src: logoPath,
                alt: "Obsidian Logo"
            }
        });
        
        titleContainer.createEl("h1", { text: `${greetingPrefix}, ${greetingName} 👋`, cls: "bionic-greeting" });
        
        if (this.settingsManager.settings.showDate) {
            const dateEl = this.headerEl.createEl("p", { cls: "bionic-date" });
            
            const updateTime = () => {
                const now = new Date();
                const dateString = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                const timeString = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
                dateEl.setText(`${dateString} • ${timeString}`);
            };

            updateTime();
            this.clockInterval = window.setInterval(updateTime, 1000);
        }
    }

    private renderSearchArea() {
        this.searchBar = new SearchBar(this.app, this.searchAreaEl, this.settingsManager);
        this.searchBar.render();
    }

    private renderSettingsMenu() {
        const settingsBtnEl = this.containerEl.createDiv({ cls: "bionic-quick-settings-btn" });
        setIcon(settingsBtnEl, "more-horizontal");
        
        const dropdownEl = this.containerEl.createDiv({ cls: "bionic-quick-settings-dropdown hidden" });
        
        // --- Background Image Settings ---
        dropdownEl.createEl("div", { cls: "bionic-quick-settings-header", text: "Background Image" });
        
        const bgUrlWrapper = dropdownEl.createDiv({ cls: "bionic-settings-input-wrapper" });
        const bgUrlInput = bgUrlWrapper.createEl("input", { 
            type: "text", 
            placeholder: "Image URL...",
            value: this.settingsManager.settings.backgroundImage || "",
            cls: "bionic-settings-text-input"
        });
        
        bgUrlInput.addEventListener("change", async () => {
            this.settingsManager.settings.backgroundImage = bgUrlInput.value.trim();
            await this.settingsManager.saveSettings();
            (this.app.workspace as any).trigger("enhanced-hometab:settings-updated");
        });

        const bgOpacityWrapper = dropdownEl.createDiv({ cls: "bionic-settings-slider-wrapper" });
        bgOpacityWrapper.createSpan({ text: "Opacity:", cls: "bionic-settings-label" });
        const bgOpacityInput = bgOpacityWrapper.createEl("input", { 
            type: "range", 
            attr: { min: "0", max: "1", step: "0.05" },
            cls: "bionic-settings-slider"
        });
        bgOpacityInput.value = this.settingsManager.settings.backgroundOpacity.toString();
        
        bgOpacityInput.addEventListener("change", async () => {
            this.settingsManager.settings.backgroundOpacity = parseFloat(bgOpacityInput.value);
            await this.settingsManager.saveSettings();
            (this.app.workspace as any).trigger("enhanced-hometab:settings-updated");
        });

        // --- Glassmorphism Toggle ---
        const glassItemEl = dropdownEl.createDiv({ cls: "bionic-quick-settings-item" });
        glassItemEl.createSpan({ text: "Glassmorphism UI" });
        
        const glassToggleWrapper = glassItemEl.createDiv({ cls: "bionic-toggle-wrapper" });
        const glassToggleEl = glassToggleWrapper.createEl("input", { type: "checkbox", cls: "bionic-toggle-checkbox" });
        glassToggleEl.checked = this.settingsManager.settings.enableGlassmorphism;
        
        glassToggleEl.addEventListener("change", async () => {
            this.settingsManager.settings.enableGlassmorphism = glassToggleEl.checked;
            await this.settingsManager.saveSettings();
            (this.app.workspace as any).trigger("enhanced-hometab:settings-updated");
        });

        dropdownEl.createEl("hr", { cls: "bionic-settings-divider" });

        // --- Widget Settings ---
        dropdownEl.createEl("div", { cls: "bionic-quick-settings-header", text: "Dashboard Widgets" });

        const widgetsToToggle = [
            { id: "continue-working", name: "Continue Working" },
            { id: "quick-actions", name: "Quick Actions" },
            { id: "pinned", name: "Pinned Notes" },
            { id: "recent-notes", name: "Recent Notes" },
            { id: "daily-note", name: "Tasks" },
            { id: "tags", name: "Recently Used Tags" },
            { id: "backlinks", name: "Backlinks" }
        ];

        widgetsToToggle.forEach(widget => {
            const itemEl = dropdownEl.createDiv({ cls: "bionic-quick-settings-item" });
            itemEl.createSpan({ text: widget.name });
            
            const toggleWrapper = itemEl.createDiv({ cls: "bionic-toggle-wrapper" });
            const toggleEl = toggleWrapper.createEl("input", { type: "checkbox", cls: "bionic-toggle-checkbox" });
            toggleEl.checked = this.settingsManager.settings.widgets[widget.id]?.enabled !== false;
            
            toggleEl.addEventListener("change", async () => {
                if (!this.settingsManager.settings.widgets[widget.id]) {
                    this.settingsManager.settings.widgets[widget.id] = { enabled: true };
                }
                this.settingsManager.settings.widgets[widget.id].enabled = toggleEl.checked;
                await this.settingsManager.saveSettings();
                (this.app.workspace as any).trigger("enhanced-hometab:settings-updated");
            });
        });

        settingsBtnEl.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownEl.toggleClass("hidden", !dropdownEl.hasClass("hidden"));
        });

        document.addEventListener("click", (e) => {
            if (!dropdownEl.contains(e.target as Node) && !settingsBtnEl.contains(e.target as Node)) {
                dropdownEl.addClass("hidden");
            }
        });
    }
}
