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
        containerEl.addClass("hometab-sortable-container");

        this.sortableInstance = Sortable.create(containerEl, {
            animation: 200,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
            handle: ".hometab-widget-header",
            ghostClass: "hometab-widget-ghost",
            chosenClass: "hometab-widget-chosen",
            dragClass: "hometab-widget-drag",
            fallbackClass: "hometab-widget-fallback",
            forceFallback: true,
            fallbackTolerance: 3,
            onStart: () => {
                document.body.addClass("hometab-is-dragging");
            },
            onEnd: async (evt) => {
                document.body.removeClass("hometab-is-dragging");
                const newOrder: string[] = [];
                containerEl.querySelectorAll('.hometab-widget').forEach(w => {
                    const id = Array.from(w.classList)
                        .find(cls => cls.startsWith('hometab-widget-'))
                        ?.replace('hometab-widget-', '');
                    if (id) {
                        newOrder.push(id);
                    }
                });
                
                this.settingsManager.settings.widgetOrder = newOrder;
                await this.settingsManager.saveSettings(true);
            }
        });
        
        // Update header cursors visually
        const widgets = containerEl.querySelectorAll('.hometab-widget');
        widgets.forEach((widget) => {
            const header = widget.querySelector('.hometab-widget-header') as HTMLElement;
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
