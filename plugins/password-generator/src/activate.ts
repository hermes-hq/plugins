import { PasswordGeneratorPanel } from "./PasswordGeneratorPanel";
import { generatePassword } from "./generator";

// Hermes Plugin API types (provided at runtime by the host app)
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
	if (!hermesAPI) throw new Error("Password Generator plugin not activated");
	return hermesAPI;
}

export function activate(api: HermesPluginAPI) {
	hermesAPI = api;

	api.ui.registerPanel("password-generator-panel", PasswordGeneratorPanel);

	api.subscriptions.push(
		api.commands.register("password-generator.openPanel", () => {
			api.ui.showPanel("password-generator-panel");
		})
	);

	// Quick command: generate a solid default password and copy it, without
	// opening the panel.
	api.subscriptions.push(
		api.commands.register("password-generator.quickGenerate", async () => {
			const pw = generatePassword({
				length: 20,
				lower: true,
				upper: true,
				digits: true,
				symbols: true,
				excludeAmbiguous: false,
			});
			await api.clipboard.writeText(pw);
			api.ui.showToast("Password copied to clipboard", { type: "success", duration: 2000 });
		})
	);
}

export function deactivate() {
	hermesAPI = null;
}
