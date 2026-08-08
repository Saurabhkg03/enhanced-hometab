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
            animation: 200,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
            handle: ".bionic-widget-header",
            ghostClass: "bionic-widget-ghost",
            chosenClass: "bionic-widget-chosen",
            dragClass: "bionic-widget-drag",
            fallbackClass: "bionic-widget-fallback",
            forceFallback: true,
            fallbackTolerance: 3,
            onStart: () => {
                document.body.addClass("bionic-is-dragging");
            },
            onEnd: async (evt) => {
                document.body.removeClass("bionic-is-dragging");
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
                await this.settingsManager.saveSettings(true);
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
