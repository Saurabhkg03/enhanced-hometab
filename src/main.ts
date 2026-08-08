import { Plugin, WorkspaceLeaf } from 'obsidian';
import { HomeView } from './views/HomeView';
import { VIEW_TYPE_HOMETAB } from './constants';
import { SettingsManager } from './managers/SettingsManager';
import { EnhancedHometabSettingTab } from './views/SettingsTab';
import { ActivityTracker } from './managers/ActivityTracker';

export default class EnhancedHometabPlugin extends Plugin {
	public settingsManager: SettingsManager;
	public activityTracker: ActivityTracker;

	async onload() {
		this.settingsManager = new SettingsManager(this);
		this.settingsManager.loadPromise = this.settingsManager.loadSettings();
		await this.settingsManager.loadPromise; // Block onload until settings are loaded to prevent race conditions
		
		console.log('Enhanced Hometab Plugin loaded');

		this.activityTracker = new ActivityTracker(this.app, this.settingsManager);
		this.addChild(this.activityTracker);

		this.registerView(
			VIEW_TYPE_HOMETAB,
			(leaf: WorkspaceLeaf) => new HomeView(leaf, this)
		);

		this.addRibbonIcon('home', 'Open Enhanced Hometab', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-enhanced-hometab',
			name: 'Open Enhanced Hometab',
			callback: () => {
				this.activateView();
			}
		});

		this.addSettingTab(new EnhancedHometabSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			this.registerLayoutObserver();
		});
	}

	private registerLayoutObserver() {
		// Listen for newly activated leaves
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (this.settingsManager.settings.replaceNewTabs && leaf && leaf.view.getViewType() === 'empty') {
					leaf.setViewState({ type: VIEW_TYPE_HOMETAB, active: true });
				}
			})
		);

		// Also check immediately in case an empty tab is already open on startup
		if (this.settingsManager.settings.replaceNewTabs) {
			const leaves = this.app.workspace.getLeavesOfType('empty');
			for (const leaf of leaves) {
				leaf.setViewState({ type: VIEW_TYPE_HOMETAB, active: true });
			}
		}
	}

	async onunload() {
		console.log('Enhanced Hometab Plugin unloaded');
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_HOMETAB);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_HOMETAB, active: true });
		}

		workspace.revealLeaf(leaf);
	}
}
