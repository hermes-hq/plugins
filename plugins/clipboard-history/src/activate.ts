import * as React from "react";
import { ClipboardHistoryPanel } from "./ClipboardHistoryPanel";

// Hermes Plugin API types (provided at runtime by the host app)
interface Disposable {
  dispose(): void;
}

interface PluginPanelProps {
  pluginId: string;
  panelId: string;
}

export interface HermesPluginAPI {
  ui: {
    registerPanel(panelId: string, component: React.ComponentType<PluginPanelProps>): Disposable;
    showPanel(panelId: string): void;
    hidePanel(panelId: string): void;
    togglePanel(panelId: string): void;
    showToast(message: string, options?: { type?: "info" | "success" | "warning" | "error"; duration?: number }): void;
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
  if (!hermesAPI) throw new Error("Plugin not activated");
  return hermesAPI;
}

export function activate(api: HermesPluginAPI) {
  hermesAPI = api;

  api.ui.registerPanel("clipboard-history-panel", ClipboardHistoryPanel);

  api.subscriptions.push(
    api.commands.register("clipboard-history.open", () => {
      api.ui.showPanel("clipboard-history-panel");
    }),
  );
}

export function deactivate() {
  hermesAPI = null;
}
