import { App, Component } from "obsidian";
import { IWidget } from "../types/widget";

export class WidgetManager extends Component {
    private app: App;
    private widgets: Map<string, IWidget> = new Map();

    constructor(app: App) {
        super();
        this.app = app;
    }

    public registerWidget(widget: IWidget) {
        this.widgets.set(widget.config.id, widget);
        this.addChild(widget as unknown as Component);
    }

    public renderWidgets(containerEl: HTMLElement, order: string[]) {
        containerEl.empty();
        
        const sortedWidgets = Array.from(this.widgets.values()).sort((a, b) => {
            const indexA = order.indexOf(a.config.id);
            const indexB = order.indexOf(b.config.id);
            
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            
            return indexA - indexB;
        });

        sortedWidgets.forEach((widget, index) => {
            try {
                widget.mount(this.app, containerEl);
                if (widget.containerEl) {
                    widget.containerEl.style.animationDelay = `${index * 50}ms`;
                }
            } catch (err) {
                console.error(`Enhanced Hometab: Failed to mount widget ${widget.config.id}`, err);
            }
        });
    }
    
    public refreshAll() {
        for (const widget of this.widgets.values()) {
            try {
                widget.refresh();
            } catch (err) {
                console.error(`Enhanced Hometab: Failed to refresh widget ${widget.config.id}`, err);
            }
        }
    }

    public refreshWidget(id: string) {
        const widget = this.widgets.get(id);
        if (widget) {
            try {
                widget.refresh();
            } catch (err) {
                console.error(`Enhanced Hometab: Failed to refresh widget ${id}`, err);
            }
        }
    }

    onunload(): void {
        for (const widget of this.widgets.values()) {
            widget.onunload();
        }
        this.widgets.clear();
    }
}
