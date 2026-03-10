import { RegexPanel } from "./RegexPanel";

interface Disposable {
	dispose(): void;
}

interface PluginPanelProps {
	pluginId: string;
	panelId: string;
}

interface HermesPluginAPI {
	ui: {
		registerPanel(panelId: string, component: React.ComponentType<PluginPanelProps>): Disposable;
		showPanel(panelId: string): void;
		hidePanel(panelId: string): void;
		togglePanel(panelId: string): void;
		showToast(message: string, options?: { type?: "info" | "success" | "warning" | "error"; duration?: number }): void;
		updateStatusBarItem(itemId: string, update: { text?: string; tooltip?: string; visible?: boolean }): void;
	};
	commands: {
		register(commandId: string, handler: () => void | Promise<void>): Disposable;
		execute(commandId: string): Promise<void>;
	};
	clipboard: {
		readText(): Promise<string>;
		writeText(text: string): Promise<void>;
	};
	storage: {
		get(key: string): Promise<string | null>;
		set(key: string, value: string): Promise<void>;
		delete(key: string): Promise<void>;
	};
	settings: {
		get<T = string | number | boolean>(key: string): Promise<T>;
		update(key: string, value: string | number | boolean): Promise<void>;
		onDidChange(key: string, callback: (newValue: string | number | boolean) => void): Disposable;
		getAll(): Promise<Record<string, string | number | boolean>>;
	};
	subscriptions: Disposable[];
}

let hermesAPI: HermesPluginAPI | null = null;
let defaultFlags = "g";
let maxMatches = 100;
let liveHighlight = true;
let listeners = new Set<() => void>();

export interface RegexSettings {
	defaultFlags: string;
	maxMatches: number;
	liveHighlight: boolean;
}

export function getAPI(): HermesPluginAPI {
	if (!hermesAPI) throw new Error("Regex Tester plugin not activated");
	return hermesAPI;
}

export function getSettings(): RegexSettings {
	return { defaultFlags, maxMatches, liveHighlight };
}

export function subscribeSettings(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notifyListeners() {
	for (const l of listeners) {
		try { l(); } catch { /* swallow */ }
	}
}

export function activate(api: HermesPluginAPI) {
	hermesAPI = api;

	// Load settings
	api.settings.getAll().then((all) => {
		defaultFlags = String(all.defaultFlags ?? "g");
		maxMatches = parseInt(String(all.maxMatches), 10) || 100;
		liveHighlight = all.liveHighlight !== false;
		notifyListeners();
	}).catch(() => { /* use defaults */ });

	// Listen for changes
	api.subscriptions.push(
		api.settings.onDidChange("defaultFlags", (v) => {
			defaultFlags = String(v);
			notifyListeners();
		})
	);
	api.subscriptions.push(
		api.settings.onDidChange("maxMatches", (v) => {
			maxMatches = parseInt(String(v), 10) || 100;
			notifyListeners();
		})
	);
	api.subscriptions.push(
		api.settings.onDidChange("liveHighlight", (v) => {
			liveHighlight = v !== false;
			notifyListeners();
		})
	);

	// Register panel
	api.ui.registerPanel("regex-tester-panel", RegexPanel);

	// Commands
	api.subscriptions.push(
		api.commands.register("regex.open", () => {
			api.ui.showPanel("regex-tester-panel");
		})
	);
	api.subscriptions.push(
		api.commands.register("regex.copyPattern", async () => {
			// Will be handled by panel state — this is a no-op placeholder
			api.ui.showToast("Use the panel to copy patterns", { type: "info", duration: 1500 });
		})
	);
}

export function deactivate() {
	hermesAPI = null;
	listeners.clear();
}
