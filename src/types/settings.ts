export interface WidgetSettings {
    enabled: boolean;
}

export interface LauncherActionSetting {
    id: string;
    hidden: boolean;
}

export interface NoteRef {
    path: string;
    title: string;
    timestamp: number;
}

export interface WorkspaceSessionRef {
    timestamp: number;
    tabsCount: number;
    tabs: { path: string; title: string; type: string }[];
}

export interface ContinueWorkingHistory {
    lastEditedNote?: NoteRef;
    lastOpenedNote?: NoteRef;
    lastCanvas?: NoteRef;
    lastWorkspace?: WorkspaceSessionRef;
}

export interface EnhancedHometabSettings {
    widgets: Record<string, WidgetSettings>;
    widgetOrder: string[];
    launcherActions: LauncherActionSetting[];
    greetingName: string;
    showDate: boolean;
    replaceNewTabs: boolean;
    backgroundImage: string;
    backgroundOpacity: number;
    enableGlassmorphism: boolean;
    recentSearches: string[];
    pinnedSearches: string[];
    continueWorkingData?: ContinueWorkingHistory;
}

export const DEFAULT_SETTINGS: EnhancedHometabSettings = {
    widgets: {
        "continue-working": { enabled: true },
        "quick-actions": { enabled: true },
        "pinned": { enabled: true },
        "recent-notes": { enabled: true },
        "daily-note": { enabled: true },
        "tags": { enabled: true },
        "backlinks": { enabled: true }
    },
    widgetOrder: [
        "continue-working",
        "quick-actions",
        "pinned",
        "recent-notes",
        "daily-note",
        "tags",
        "backlinks"
    ],
    launcherActions: [
        { id: "new-note", hidden: false },
        { id: "new-folder", hidden: false },
        { id: "new-canvas", hidden: false },
        { id: "quick-capture", hidden: false },
        { id: "open-today", hidden: false },
        { id: "templates", hidden: false },
        { id: "calendar", hidden: false }
    ],
    greetingName: "Explorer",
    showDate: true,
    replaceNewTabs: true,
    backgroundImage: "",
    backgroundOpacity: 0.5,
    enableGlassmorphism: false,
    recentSearches: [],
    pinnedSearches: [],
    continueWorkingData: {}
};
