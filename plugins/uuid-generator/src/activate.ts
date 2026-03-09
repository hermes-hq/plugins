import { UuidPanel } from "./UuidPanel";
import { uuidV4 } from "./uuid";

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
	subscriptions: Disposable[];
}

let hermesAPI: HermesPluginAPI | null = null;

export function getAPI(): HermesPluginAPI {
	if (!hermesAPI) throw new Error("UUID Generator plugin not activated");
	return hermesAPI;
}

export function activate(api: HermesPluginAPI) {
	hermesAPI = api;

	api.ui.registerPanel("uuid-generator-panel", UuidPanel);

	api.subscriptions.push(
		api.commands.register("uuid.openPanel", () => {
			api.ui.showPanel("uuid-generator-panel");
		})
	);

	// Quick command: generate a v4 UUID and copy to clipboard
	api.subscriptions.push(
		api.commands.register("uuid.generateV4", async () => {
			const uuid = uuidV4();
			await api.clipboard.writeText(uuid);
			api.ui.showToast(`UUID copied: ${uuid}`, { type: "success", duration: 2000 });
		})
	);

	// Open panel command
	api.subscriptions.push(
		api.commands.register("uuid.generate", () => {
			api.ui.showPanel("uuid-generator-panel");
		})
	);
}

export function deactivate() {
	hermesAPI = null;
}
