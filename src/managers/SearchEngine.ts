import { App, prepareFuzzySearch, SearchResult, TFile, TFolder } from "obsidian";
import { yieldToMain } from "../utils/performance";

export interface BionicSearchResult {
    id: string;
    type: 'file' | 'folder' | 'tag' | 'command' | 'bookmark' | 'canvas' | 'alias';
    title: string;
    subtitle?: string;
    score: number;
    matches?: SearchResult; // Matches object from prepareFuzzySearch containing offsets
    icon?: string;
    action: () => void;
    quickActions?: { icon: string, tooltip: string, action: (e: MouseEvent) => void }[];
}

export class SearchEngine {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    public async search(query: string): Promise<BionicSearchResult[]> {
        if (!query.trim()) return [];

        const fuzzySearch = prepareFuzzySearch(query);
        const results: BionicSearchResult[] = [];

        // 1. Files & Folders
        const allFiles = this.app.vault.getAllLoadedFiles();
        for (let i = 0; i < allFiles.length; i++) {
            const fileOrFolder = allFiles[i];
            if (i > 0 && i % 100 === 0) {
                await yieldToMain();
            }

            if (fileOrFolder instanceof TFolder) {
                if (fileOrFolder.path === "/") continue;
                const match = fuzzySearch(fileOrFolder.name);
                if (match) {
                    results.push({
                        id: 'folder:' + fileOrFolder.path,
                        type: 'folder',
                        title: fileOrFolder.name,
                        subtitle: fileOrFolder.path,
                        score: match.score - 2, // slightly penalize folders so files show first
                        matches: match,
                        icon: 'folder',
                        action: () => {
                            // No-op for now for folders
                        }
                    });
                }
            } else if (fileOrFolder instanceof TFile) {
                const isCanvas = fileOrFolder.extension === "canvas";
                
                const match = fuzzySearch(fileOrFolder.basename);
                if (match) {
                    results.push({
                        id: 'file:' + fileOrFolder.path,
                        type: isCanvas ? 'canvas' : 'file',
                        title: fileOrFolder.basename,
                        subtitle: fileOrFolder.path,
                        score: match.score,
                        matches: match,
                        icon: isCanvas ? 'layout-dashboard' : 'file',
                        action: () => {
                            this.app.workspace.getLeaf(false).openFile(fileOrFolder);
                        },
                        quickActions: [
                            {
                                icon: 'columns',
                                tooltip: 'Open in split',
                                action: (e) => {
                                    e.stopPropagation();
                                    this.app.workspace.getLeaf('split').openFile(fileOrFolder);
                                }
                            }
                        ]
                    });
                } else {
                    // Check Aliases
                    const cache = this.app.metadataCache.getFileCache(fileOrFolder);
                    const aliases = cache?.frontmatter?.aliases;
                    if (aliases && Array.isArray(aliases)) {
                        for (const alias of aliases) {
                            const aliasMatch = fuzzySearch(alias);
                            if (aliasMatch) {
                                results.push({
                                    id: 'alias:' + fileOrFolder.path + ':' + alias,
                                    type: 'alias',
                                    title: alias,
                                    subtitle: `Alias for ${fileOrFolder.basename}`,
                                    score: aliasMatch.score - 1,
                                    matches: aliasMatch,
                                    icon: 'forward',
                                    action: () => {
                                        this.app.workspace.getLeaf(false).openFile(fileOrFolder);
                                    },
                                    quickActions: [
                                        {
                                            icon: 'columns',
                                            tooltip: 'Open in split',
                                            action: (e) => {
                                                e.stopPropagation();
                                                this.app.workspace.getLeaf('split').openFile(fileOrFolder);
                                            }
                                        }
                                    ]
                                });
                                break;
                            }
                        }
                    }
                }
            }
        }

        // 2. Tags
        const tags = Object.keys(this.app.metadataCache.getTags());
        for (const tag of tags) {
            const match = fuzzySearch(tag);
            if (match) {
                results.push({
                    id: 'tag:' + tag,
                    type: 'tag',
                    title: tag,
                    score: match.score,
                    matches: match,
                    icon: 'hashtag',
                    action: () => {
                        // Normally this would open search pane for the tag.
                    }
                });
            }
        }

        // 3. Commands
        const commands = (this.app as any).commands?.listCommands?.() || [];
        for (const cmd of commands) {
            const match = fuzzySearch(cmd.name);
            if (match) {
                results.push({
                    id: 'cmd:' + cmd.id,
                    type: 'command',
                    title: cmd.name,
                    subtitle: 'Command',
                    score: match.score,
                    matches: match,
                    icon: 'terminal',
                    action: () => {
                        (this.app as any).commands.executeCommandById(cmd.id);
                    }
                });
            }
        }

        // 4. Bookmarks
        const bookmarksPlugin = (this.app as any).internalPlugins?.getPluginById("bookmarks");
        if (bookmarksPlugin?.enabled) {
            const getBookmarks = (items: any[]) => {
                for (const item of items) {
                    if (item.type === "file") {
                        const title = item.title || item.path;
                        const match = fuzzySearch(title);
                        if (match) {
                            results.push({
                                id: 'bookmark:' + item.path,
                                type: 'bookmark',
                                title: title,
                                subtitle: 'Bookmark',
                                score: match.score + 5, // boost
                                matches: match,
                                icon: 'bookmark',
                                action: () => {
                                    const file = this.app.vault.getAbstractFileByPath(item.path);
                                    if (file instanceof TFile) {
                                        this.app.workspace.getLeaf(false).openFile(file);
                                    }
                                }
                            });
                        }
                    } else if (item.type === "group") {
                        getBookmarks(item.items || []);
                    }
                }
            };
            const bookmarks = bookmarksPlugin.instance?.getBookmarks?.() || [];
            getBookmarks(bookmarks);
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, 100); // return top 100
    }
}
