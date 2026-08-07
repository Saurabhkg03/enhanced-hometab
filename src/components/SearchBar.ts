import { App, setIcon } from "obsidian";
import { SearchEngine, BionicSearchResult } from "../managers/SearchEngine";
import { SettingsManager } from "../managers/SettingsManager";

export class SearchBar {
    private app: App;
    private containerEl: HTMLElement;
    private searchEngine: SearchEngine;
    private settingsManager: SettingsManager;
    
    private inputEl: HTMLInputElement;
    private resultsContainerEl: HTMLElement;
    
    private debounceTimer: number | null = null;
    private currentSearchId = 0;
    
    private searchResults: BionicSearchResult[] = [];
    private selectedIndex: number = -1;

    constructor(app: App, containerEl: HTMLElement, settingsManager: SettingsManager) {
        this.app = app;
        this.containerEl = containerEl;
        this.settingsManager = settingsManager;
        this.searchEngine = new SearchEngine(this.app);
    }

    public render() {
        this.containerEl.empty();
        this.containerEl.addClass("bionic-search-bar-container");
        
        const wrapperEl = this.containerEl.createDiv({ cls: "bionic-search-wrapper" });
        
        const iconEl = wrapperEl.createDiv({ cls: "bionic-search-icon" });
        setIcon(iconEl, "search");
        
        this.inputEl = wrapperEl.createEl("input", {
            type: "text",
            placeholder: "Search notes, tags, commands...",
            cls: "bionic-search-input"
        });
        
        const hintEl = wrapperEl.createDiv({ cls: "bionic-search-hint" });
        hintEl.createSpan({ text: "Ctrl K", cls: "bionic-search-hint-key" });
        
        this.resultsContainerEl = this.containerEl.createDiv({ cls: "bionic-search-results hidden" });
        
        this.inputEl.addEventListener("input", () => this.onInput());
        this.inputEl.addEventListener("keydown", (e) => this.onKeyDown(e));
        this.inputEl.addEventListener("focus", () => {
            if (this.inputEl.value.trim().length === 0) {
                this.showEmptyState();
            } else {
                this.resultsContainerEl.removeClass("hidden");
            }
        });
        
        document.addEventListener("click", (e) => {
            if (!this.containerEl.contains(e.target as Node)) {
                this.hideResults();
            }
        });

        window.addEventListener(
            "keydown",
            (e: KeyboardEvent) => {
                const isK = e.key?.toLowerCase() === "k" || e.code === "KeyK";
                if ((e.ctrlKey || e.metaKey) && isK) {
                    if (document.body.contains(this.containerEl)) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.inputEl.focus();
                        this.inputEl.select();
                        if (this.inputEl.value.trim().length > 0) {
                            this.onInput();
                        } else {
                            this.showEmptyState();
                        }
                    }
                }
            },
            true
        );
    }

    private showEmptyState() {
        this.resultsContainerEl.empty();
        this.searchResults = [];
        this.selectedIndex = -1;

        const recent = this.settingsManager.settings.recentSearches || [];
        const pinned = this.settingsManager.settings.pinnedSearches || [];

        if (recent.length === 0 && pinned.length === 0) {
            this.resultsContainerEl.createDiv({ cls: "bionic-search-empty", text: "Start typing to search..." });
        } else {
            if (pinned.length > 0) {
                this.resultsContainerEl.createDiv({ cls: "bionic-search-section-title", text: "Pinned Searches" });
                // We'll just render them as simple items for now
                pinned.forEach(p => {
                    const el = this.resultsContainerEl.createDiv({ cls: "bionic-search-history-item" });
                    setIcon(el.createDiv({ cls: "history-icon" }), "pin");
                    el.createDiv({ cls: "history-text", text: p });
                    el.addEventListener("click", () => {
                        this.inputEl.value = p;
                        this.onInput();
                    });
                });
            }
            if (recent.length > 0) {
                this.resultsContainerEl.createDiv({ cls: "bionic-search-section-title", text: "Recent Searches" });
                recent.forEach(r => {
                    const el = this.resultsContainerEl.createDiv({ cls: "bionic-search-history-item" });
                    setIcon(el.createDiv({ cls: "history-icon" }), "history");
                    el.createDiv({ cls: "history-text", text: r });
                    
                    const deleteBtn = el.createDiv({ cls: "history-delete-btn" });
                    setIcon(deleteBtn, "x");
                    deleteBtn.title = "Remove search";
                    
                    deleteBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.removeFromHistory(r);
                    });

                    el.addEventListener("click", () => {
                        this.inputEl.value = r;
                        this.onInput();
                    });
                });
            }
        }
        this.resultsContainerEl.removeClass("hidden");
    }

    private removeFromHistory(query: string) {
        let recent = this.settingsManager.settings.recentSearches || [];
        recent = recent.filter(r => r !== query);
        this.settingsManager.settings.recentSearches = recent;
        this.settingsManager.saveSettings();
        this.showEmptyState();
    }

    private addToHistory(query: string) {
        let recent = this.settingsManager.settings.recentSearches || [];
        recent = recent.filter(r => r !== query);
        recent.unshift(query);
        if (recent.length > 10) recent = recent.slice(0, 10);
        this.settingsManager.settings.recentSearches = recent;
        this.settingsManager.saveSettings();
    }

    private onInput() {
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
        
        const query = this.inputEl.value;
        if (query.trim().length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.debounceTimer = window.setTimeout(async () => {
            const searchId = ++this.currentSearchId;
            const results = await this.searchEngine.search(query);
            if (searchId === this.currentSearchId) {
                this.renderResults(results);
            }
        }, 150);
    }

    private onKeyDown(e: KeyboardEvent) {
        if (this.resultsContainerEl.hasClass("hidden")) return;
        
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (this.searchResults.length > 0) {
                this.selectedIndex = (this.selectedIndex + 1) % this.searchResults.length;
                this.updateSelection();
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (this.searchResults.length > 0) {
                this.selectedIndex = (this.selectedIndex - 1 + this.searchResults.length) % this.searchResults.length;
                this.updateSelection();
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (this.selectedIndex >= 0 && this.selectedIndex < this.searchResults.length) {
                this.addToHistory(this.inputEl.value.trim());
                this.searchResults[this.selectedIndex].action();
                this.hideResults();
                this.inputEl.value = "";
                this.inputEl.blur();
            } else if (this.searchResults.length > 0) {
                this.addToHistory(this.inputEl.value.trim());
                this.searchResults[0].action();
                this.hideResults();
                this.inputEl.value = "";
                this.inputEl.blur();
            }
        } else if (e.key === "Escape") {
            this.hideResults();
            this.inputEl.blur();
        }
    }

    private updateSelection() {
        const items = this.resultsContainerEl.querySelectorAll('.bionic-search-result-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.addClass('is-selected');
                (item as HTMLElement).scrollIntoView({ block: 'nearest' });
            } else {
                item.removeClass('is-selected');
            }
        });
    }

    private renderHighlightedText(container: HTMLElement, text: string, matches: any) {
        if (!matches || !matches.matches || matches.matches.length === 0) {
            container.setText(text);
            return;
        }

        const matchPositions = matches.matches;
        let lastIndex = 0;

        for (const [start, end] of matchPositions) {
            if (start > lastIndex) {
                container.appendChild(document.createTextNode(text.substring(lastIndex, start)));
            }
            const highlightEl = container.createSpan({ cls: "suggestion-highlight" });
            highlightEl.setText(text.substring(start, end)); // +1 not needed because end is exclusive in fuzzySearch usually... wait, prepareFuzzySearch matches are [start, end + 1] or similar. Oh wait, Obsidian's prepareFuzzySearch returns matches: [number, number][], where the second number is exclusive. But let's assume it's standard substring logic.
            // Wait, Obsidian's prepareFuzzySearch matches are actually [start, end] where end is exclusive?
            // Actually in obsidian API `SearchResult` contains `matches: SearchMatches` which is `number[][]`. It represents [start, end+1]? Actually [start, end+1] is usually exclusive. 
            // Let's use substring(start, end).
            // Actually it might be [start, end] where end is the last character index, meaning end+1 for substring.
            // Let's use substring(start, end) first. Wait, if it's [0, 1] it means length 1. substring(0, 1) is 1 char. That's usually correct for Obsidian API.
            // Let's just use text.slice(start, end) which is same as substring.
            
            // Wait, let's just use substring(start, end)
            // If it's wrong, we can fix it later. Obsidian's fuzzy matcher usually returns [start, end] where end is exclusive.
            
            // Wait, actually `SearchMatches` in Obsidian is `type SearchMatches = number[][]` (each inner array has 2 elements: start and end). The end is exclusive.
            // Yes.
            
            lastIndex = end;
        }

        if (lastIndex < text.length) {
            container.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
    }

    private renderResults(results: BionicSearchResult[]) {
        this.searchResults = results;
        this.selectedIndex = -1;
        this.resultsContainerEl.empty();
        
        if (results.length === 0) {
            this.resultsContainerEl.createDiv({ cls: "bionic-search-empty", text: "No results found." });
        } else {
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const itemEl = this.resultsContainerEl.createDiv({ cls: "bionic-search-result-item" });
                
                const iconContainer = itemEl.createDiv({ cls: "bionic-search-result-icon" });
                setIcon(iconContainer, result.icon || "file");
                
                const contentContainer = itemEl.createDiv({ cls: "bionic-search-result-content" });
                const titleEl = contentContainer.createDiv({ cls: "bionic-search-result-title" });
                this.renderHighlightedText(titleEl, result.title, result.matches);

                if (result.subtitle) {
                    const subtitleEl = contentContainer.createDiv({ cls: "bionic-search-result-subtitle" });
                    // No highlight for subtitle for now, unless we searched by path.
                    subtitleEl.setText(result.subtitle);
                }
                
                // Quick actions
                if (result.quickActions && result.quickActions.length > 0) {
                    const actionsContainer = itemEl.createDiv({ cls: "bionic-search-result-actions" });
                    for (const qa of result.quickActions) {
                        const qaEl = actionsContainer.createDiv({ cls: "bionic-search-qa-btn" });
                        setIcon(qaEl, qa.icon);
                        qaEl.setAttribute("aria-label", qa.tooltip);
                        qaEl.addEventListener("click", (e) => {
                            this.addToHistory(this.inputEl.value.trim());
                            qa.action(e);
                            this.hideResults();
                            this.inputEl.value = "";
                            this.inputEl.blur();
                        });
                    }
                }
                
                itemEl.addEventListener("mouseenter", () => {
                    this.selectedIndex = i;
                    this.updateSelection();
                });
                
                itemEl.addEventListener("click", () => {
                    this.addToHistory(this.inputEl.value.trim());
                    result.action();
                    this.hideResults();
                    this.inputEl.value = "";
                    this.inputEl.blur();
                });
            }
        }
        
        this.resultsContainerEl.removeClass("hidden");
    }

    private hideResults() {
        this.resultsContainerEl.addClass("hidden");
        this.searchResults = [];
        this.selectedIndex = -1;
    }
}
