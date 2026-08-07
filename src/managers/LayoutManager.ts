import { App, Component } from "obsidian";
import { SettingsManager } from "./SettingsManager";
import { WidgetManager } from "./WidgetManager";
import Sortable from "sortablejs";

export class LayoutManager extends Component {
    private app: App;
    private settingsManager: SettingsManager;
    private widgetManager: WidgetManager;
    private sortableInstance: Sortable | null = null;

    constructor(app: App, settingsManager: SettingsManager, widgetManager: WidgetManager) {
        super();
        this.app = app;
        this.settingsManager = settingsManager;
        this.widgetManager = widgetManager;
    }

    public bindDraggable(containerEl: HTMLElement) {
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }

        // Add a class so we can style the ghost element
        containerEl.addClass("bionic-sortable-container");

        this.sortableInstance = Sortable.create(containerEl, {
            animation: 250, // Smooth animation (ms)
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
            handle: ".bionic-widget-header", // Drag handle
            ghostClass: "bionic-widget-ghost",
            dragClass: "bionic-widget-drag",
            forceFallback: true, // Better compatibility across environments
            fallbackTolerance: 3,
            onEnd: async (evt) => {
                const newOrder: string[] = [];
                containerEl.querySelectorAll('.bionic-widget').forEach(w => {
                    const id = Array.from(w.classList)
                        .find(cls => cls.startsWith('bionic-widget-'))
                        ?.replace('bionic-widget-', '');
                    if (id) {
                        newOrder.push(id);
                    }
                });
                
                this.settingsManager.settings.widgetOrder = newOrder;
                await this.settingsManager.saveSettings();
            }
        });
        
        // Update header cursors visually
        const widgets = containerEl.querySelectorAll('.bionic-widget');
        widgets.forEach((widget) => {
            const header = widget.querySelector('.bionic-widget-header') as HTMLElement;
            if (header) {
                header.style.cursor = "grab";
            }
        });
    }

    onunload(): void {
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }
    }
}
