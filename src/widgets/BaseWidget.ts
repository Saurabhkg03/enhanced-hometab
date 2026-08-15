import { App, Component, setIcon } from "obsidian";
import { IWidget, WidgetConfig } from "../types/widget";

export abstract class BaseWidget extends Component implements IWidget {
    public config: WidgetConfig;
    public containerEl: HTMLElement;
    protected app: App;

    constructor(config: WidgetConfig) {
        super();
        this.config = config;
    }

    mount(app: App, parentEl: HTMLElement): void {
        this.app = app;
        
        // Create widget container
        this.containerEl = parentEl.createDiv({ 
            cls: `hometab-widget hometab-widget-${this.config.id}` 
        });
        
        // Add widget header if needed
        this.renderHeader();
        
        // Let subclass render its specific content
        this.render();
    }

    onunload(): void {
        this.containerEl.empty();
        this.containerEl.remove();
    }

    protected renderHeader(): void {
        const headerEl = this.containerEl.createDiv({ cls: "hometab-widget-header" });
        
        const titleContainer = headerEl.createDiv({ cls: "hometab-widget-title-container" });
        const iconEl = titleContainer.createDiv({ cls: "hometab-widget-header-icon" });
        
        if (this.config.icon) {
            setIcon(iconEl, this.config.icon);
        }
        
        titleContainer.createEl("h3", { text: this.config.name, cls: "hometab-widget-title" });
        const viewAllEl = headerEl.createEl("a", { text: "View all", cls: "hometab-widget-action-link", href: "#" });
        viewAllEl.addEventListener("click", (e) => {
            e.preventDefault();
            this.onViewAllClick();
        });
    }

    protected onViewAllClick(): void {
        // Subclasses can override this
    }
    abstract render(): void;
    
    // Default refresh just re-renders, can be optimized by subclasses
    refresh(): void {
        const children = Array.from(this.containerEl.children);
        for (const child of children) {
            if (!child.hasClass("hometab-widget-header")) {
                child.remove();
            }
        }
        this.render();
    }
}
