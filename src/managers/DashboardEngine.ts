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
    private documentClickHandler: ((e: MouseEvent) => void) | null = null;

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
            // Prevent background CPU burn if the dashboard isn't actively on screen
            if (!this.containerEl.isShown()) return;

            if (this.vaultTimer) window.clearTimeout(this.vaultTimer);
            this.vaultTimer = window.setTimeout(() => {
                this.widgetManager.refreshWidget("recent-notes");
                this.widgetManager.refreshWidget("daily-note");
                this.widgetManager.refreshWidget("continue-working");
                this.widgetManager.refreshWidget("backlinks");
                this.widgetManager.refreshWidget("tags");
                this.widgetManager.refreshWidget("pinned");
            }, 500);
        };

        this.registerEvent(this.app.vault.on("modify", triggerWidgetRefresh));
        this.registerEvent(this.app.vault.on("create", triggerWidgetRefresh));
        this.registerEvent(this.app.vault.on("delete", triggerWidgetRefresh));
        this.registerEvent(this.app.vault.on("rename", triggerWidgetRefresh));
        this.registerEvent(this.app.metadataCache.on("changed", triggerWidgetRefresh));
        this.registerEvent(this.app.workspace.on("active-leaf-change", triggerWidgetRefresh));
    }

    private resolveWallpaperUrl(url: string): string {
        if (!url) return "";
        if (url.startsWith("local:")) {
            const filePath = url.substring(6);
            return this.app.vault.adapter.getResourcePath(filePath);
        }
        return url;
    }

    private handleSettingsUpdated() {
        // Toggle Glassmorphism class directly without rebuilding page
        this.containerEl.toggleClass("bionic-glass-mode", !!this.settingsManager.settings.enableGlassmorphism);

        // Update Background directly
        if (this.bgEl) {
            let bgUrl = this.settingsManager.settings.backgroundImage;
            if (bgUrl) {
                bgUrl = this.resolveWallpaperUrl(bgUrl);
                this.bgEl.style.backgroundImage = `url("${bgUrl}")`;
                this.bgEl.style.opacity = this.settingsManager.settings.backgroundOpacity.toString();
                this.bgEl.style.backgroundSize = this.settingsManager.settings.wallpaperFit || "cover";
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
        if (this.searchBar) {
            this.searchBar.destroy();
        }
        this.containerEl.empty();
        if (this.settingsEventRef) {
            this.app.workspace.offref(this.settingsEventRef);
        }
        if (this.documentClickHandler) {
            document.removeEventListener("click", this.documentClickHandler);
            this.documentClickHandler = null;
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
        let bgUrl = this.settingsManager.settings.backgroundImage;
        if (!bgUrl) return;

        bgUrl = this.resolveWallpaperUrl(bgUrl);

        this.bgEl = this.containerEl.createDiv({ cls: "bionic-dashboard-background" });
        this.bgEl.style.backgroundImage = `url("${bgUrl}")`;
        this.bgEl.style.opacity = this.settingsManager.settings.backgroundOpacity.toString();
        this.bgEl.style.backgroundSize = this.settingsManager.settings.wallpaperFit || "cover";
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
        if (this.searchBar) {
            this.searchBar.destroy();
        }
        this.searchBar = new SearchBar(this.app, this.searchAreaEl, this.settingsManager);
        this.searchBar.render();
    }

    private renderSettingsMenu() {
        const settingsBtnEl = this.containerEl.createEl("button", { cls: "bionic-quick-settings-btn" });
        setIcon(settingsBtnEl, "more-horizontal");
        
        const dropdownEl = this.containerEl.createDiv({ cls: "bionic-quick-settings-dropdown hidden" });
        
        // --- Background Image Settings ---
        dropdownEl.createEl("div", { cls: "bionic-quick-settings-header", text: "Wallpaper" });

        // URL Input & Set Button
        const bgUrlWrapper = dropdownEl.createDiv({ cls: "bionic-settings-input-wrapper bionic-wallpaper-input-wrapper" });
        const bgUrlInput = bgUrlWrapper.createEl("input", { 
            type: "text", 
            placeholder: "Image URL...",
            value: this.settingsManager.settings.backgroundImage || "",
            cls: "bionic-settings-text-input"
        });
        
        const setBgBtn = bgUrlWrapper.createEl("button", { text: "Set", cls: "bionic-wallpaper-set-btn" });
        
        // Local Media Picker
        const localPickerBtn = bgUrlWrapper.createEl("button", { cls: "bionic-wallpaper-local-btn", title: "Upload Local Image" });
        setIcon(localPickerBtn, "image-plus");
        const fileInput = bgUrlWrapper.createEl("input", {
            type: "file",
            attr: { accept: "image/*" },
            cls: "bionic-wallpaper-file-input hidden"
        });

        localPickerBtn.addEventListener("click", () => fileInput.click());

        const addWallpaperToHistory = async (url: string) => {
            if (!url) return;
            const settings = this.settingsManager.settings;
            settings.backgroundImage = url;
            // Remove if already exists to move to front
            settings.recentWallpapers = settings.recentWallpapers.filter(w => w !== url);
            settings.recentWallpapers.unshift(url);
            if (settings.recentWallpapers.length > 9) {
                settings.recentWallpapers = settings.recentWallpapers.slice(0, 9);
            }
            await this.settingsManager.saveSettings();
            (this.app.workspace as any).trigger("enhanced-hometab:settings-updated");
            this.renderWallpaperGallery(galleryContainer, bgUrlInput);
        };

        setBgBtn.addEventListener("click", () => {
            addWallpaperToHistory(bgUrlInput.value.trim());
        });

        bgUrlInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                addWallpaperToHistory(bgUrlInput.value.trim());
            }
        });

        fileInput.addEventListener("change", async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                const file = files[0];
                
                // Helper to compress image
                const compressImage = async (file: File): Promise<ArrayBuffer> => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement("canvas");
                                const MAX_WIDTH = 1920;
                                const MAX_HEIGHT = 1080;
                                let width = img.width;
                                let height = img.height;

                                if (width > height) {
                                    if (width > MAX_WIDTH) {
                                        height *= MAX_WIDTH / width;
                                        width = MAX_WIDTH;
                                    }
                                } else {
                                    if (height > MAX_HEIGHT) {
                                        width *= MAX_HEIGHT / height;
                                        height = MAX_HEIGHT;
                                    }
                                }

                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext("2d");
                                if (!ctx) return reject(new Error("No canvas context"));
                                ctx.drawImage(img, 0, 0, width, height);

                                canvas.toBlob(async (blob) => {
                                    if (blob) {
                                        resolve(await blob.arrayBuffer());
                                    } else {
                                        resolve(await file.arrayBuffer()); // fallback
                                    }
                                }, "image/webp", 0.8);
                            };
                            img.onerror = () => resolve(file.arrayBuffer()); // fallback
                            img.src = event.target?.result as string;
                        };
                        reader.onerror = () => resolve(file.arrayBuffer()); // fallback
                        reader.readAsDataURL(file);
                    });
                };

                const arrayBuffer = await compressImage(file);
                const configDir = this.app.vault.configDir;
                const wallpaperDir = `${configDir}/plugins/enhanced-hometab/wallpapers`;
                
                // Ensure folder exists
                if (!(await this.app.vault.adapter.exists(wallpaperDir))) {
                    await this.app.vault.adapter.mkdir(wallpaperDir);
                }

                const fileName = `wallpaper_${Date.now()}.webp`;
                const filePath = `${wallpaperDir}/${fileName}`;
                
                // Save binary file locally
                await this.app.vault.adapter.writeBinary(filePath, arrayBuffer);

                bgUrlInput.value = "";
                addWallpaperToHistory("local:" + filePath);
            }
        });

        // Fit setting
        const fitWrapper = dropdownEl.createDiv({ cls: "bionic-settings-dropdown-wrapper" });
        fitWrapper.createSpan({ text: "Fit:", cls: "bionic-settings-label" });
        const fitSelect = fitWrapper.createEl("select", { cls: "bionic-settings-select" });
        fitSelect.createEl("option", { value: "cover", text: "Cover" });
        fitSelect.createEl("option", { value: "contain", text: "Contain" });
        fitSelect.value = this.settingsManager.settings.wallpaperFit || "cover";

        fitSelect.addEventListener("change", async () => {
            this.settingsManager.settings.wallpaperFit = fitSelect.value;
            await this.settingsManager.saveSettings();
            (this.app.workspace as any).trigger("enhanced-hometab:settings-updated");
        });

        // Opacity setting
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

        // Gallery container
        const galleryContainer = dropdownEl.createDiv({ cls: "bionic-wallpaper-gallery" });
        this.renderWallpaperGallery(galleryContainer, bgUrlInput);

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
            e.preventDefault();
            e.stopPropagation();
            dropdownEl.classList.toggle("hidden");
        });

        if (this.documentClickHandler) {
            document.removeEventListener("click", this.documentClickHandler);
        }

        this.documentClickHandler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (dropdownEl && settingsBtnEl) {
                if (!dropdownEl.contains(target) && !settingsBtnEl.contains(target)) {
                    dropdownEl.classList.add("hidden");
                }
            }
        };
        
        document.addEventListener("click", this.documentClickHandler);
    }

    private renderWallpaperGallery(container: HTMLElement, urlInput: HTMLInputElement) {
        container.empty();
        const wallpapers = this.settingsManager.settings.recentWallpapers || [];
        if (wallpapers.length === 0) return;

        wallpapers.forEach((url) => {
            const thumb = container.createDiv({ cls: "bionic-wallpaper-thumbnail" });
            if (url === this.settingsManager.settings.backgroundImage) {
                thumb.addClass("active");
            }
            
            const displayUrl = this.resolveWallpaperUrl(url);
            thumb.style.backgroundImage = `url("${displayUrl}")`;

            thumb.addEventListener("click", async () => {
                this.settingsManager.settings.backgroundImage = url;
                // Move to front
                const settings = this.settingsManager.settings;
                settings.recentWallpapers = settings.recentWallpapers.filter(w => w !== url);
                settings.recentWallpapers.unshift(url);
                urlInput.value = url.startsWith("data:") ? "" : url;
                
                await this.settingsManager.saveSettings();
                (this.app.workspace as any).trigger("enhanced-hometab:settings-updated");
                this.renderWallpaperGallery(container, urlInput);
            });

            const deleteBtn = thumb.createDiv({ cls: "bionic-wallpaper-delete-btn" });
            setIcon(deleteBtn, "x");
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const settings = this.settingsManager.settings;
                settings.recentWallpapers = settings.recentWallpapers.filter(w => w !== url);
                if (settings.backgroundImage === url) {
                    settings.backgroundImage = "";
                    urlInput.value = "";
                }
                await this.settingsManager.saveSettings();
                (this.app.workspace as any).trigger("enhanced-hometab:settings-updated");
                this.renderWallpaperGallery(container, urlInput);
            });
        });
    }
}
