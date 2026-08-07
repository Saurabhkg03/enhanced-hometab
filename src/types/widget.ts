import { App } from "obsidian";

export interface WidgetConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    defaultSize: number; // e.g., column span (1, 2, 3)
}

export interface IWidget {
    config: WidgetConfig;
    containerEl: HTMLElement;
    
    mount(app: App, container: HTMLElement): void;
    onunload(): void;
    render(): void;
    refresh(): void;
}
