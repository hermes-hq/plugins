import { JsonFormatterPanel } from "./JsonFormatterPanel";

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
  settings: {
    get<T = string | number | boolean>(key: string): Promise<T>;
    update(key: string, value: string | number | boolean): Promise<void>;
    onDidChange(key: string, callback: (newValue: string | number | boolean) => void): Disposable;
    getAll(): Promise<Record<string, string | number | boolean>>;
  };
  subscriptions: Disposable[];
}

let hermesAPI: HermesPluginAPI | null = null;

// ─── Settings cache ──────────────────────────────────────────────────
let indentSize = 2;
let sortKeys = false;
let maxDepth = 0; // 0 = unlimited
let settingsListeners: Array<() => void> = [];

export function getAPI(): HermesPluginAPI {
  if (!hermesAPI) throw new Error("JSON Formatter plugin not activated");
  return hermesAPI;
}

export function getSettings() {
  return { indentSize, sortKeys, maxDepth };
}

export function onSettingsChanged(cb: () => void): () => void {
  settingsListeners.push(cb);
  return () => { settingsListeners = settingsListeners.filter((l) => l !== cb); };
}

function notifySettingsListeners() {
  settingsListeners.forEach((cb) => cb());
}

async function loadSettings() {
  if (!hermesAPI) return;
  try {
    const all = await hermesAPI.settings.getAll();
    indentSize = parseInt(String(all.indentSize), 10) || 2;
    sortKeys = all.sortKeys === true;
    maxDepth = parseInt(String(all.maxDepth), 10) || 0;
  } catch {
    // Use defaults
  }
}

/** Recursively sort object keys. */
function sortObjectKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sortObjectKeys);
  if (val !== null && typeof val === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>).sort()) {
      sorted[key] = sortObjectKeys((val as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return val;
}

/** Truncate deeply nested values beyond maxDepth. */
function truncateDepth(val: unknown, depth: number, limit: number): unknown {
  if (limit > 0 && depth >= limit) {
    if (Array.isArray(val)) return `[Array(${val.length})]`;
    if (val !== null && typeof val === "object") return `{Object(${Object.keys(val as Record<string, unknown>).length})}`;
    return val;
  }
  if (Array.isArray(val)) return val.map((v) => truncateDepth(v, depth + 1, limit));
  if (val !== null && typeof val === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      result[k] = truncateDepth(v, depth + 1, limit);
    }
    return result;
  }
  return val;
}

/** Format a parsed JSON value using current settings. */
export function formatWithSettings(parsed: unknown): string {
  let val = parsed;
  if (sortKeys) val = sortObjectKeys(val);
  if (maxDepth > 0) val = truncateDepth(val, 0, maxDepth);
  return JSON.stringify(val, null, indentSize);
}

export async function activate(api: HermesPluginAPI) {
  hermesAPI = api;

  // Load settings before registering anything
  await loadSettings();

  // Listen for settings changes at runtime
  api.subscriptions.push(
    api.settings.onDidChange("indentSize", (v) => {
      indentSize = parseInt(String(v), 10) || 2;
      notifySettingsListeners();
    })
  );
  api.subscriptions.push(
    api.settings.onDidChange("sortKeys", (v) => {
      sortKeys = v === true;
      notifySettingsListeners();
    })
  );
  api.subscriptions.push(
    api.settings.onDidChange("maxDepth", (v) => {
      maxDepth = parseInt(String(v), 10) || 0;
      notifySettingsListeners();
    })
  );

  api.ui.registerPanel("json-formatter-panel", JsonFormatterPanel);

  api.subscriptions.push(
    api.commands.register("json-formatter.openPanel", () => {
      api.ui.showPanel("json-formatter-panel");
    })
  );

  api.subscriptions.push(
    api.commands.register("json-formatter.format", async () => {
      try {
        const text = await api.clipboard.readText();
        const parsed = JSON.parse(text);
        const formatted = formatWithSettings(parsed);
        await api.clipboard.writeText(formatted);
        api.ui.showToast("JSON formatted and copied to clipboard", { type: "success" });
      } catch {
        api.ui.showToast("Clipboard does not contain valid JSON", { type: "error" });
      }
    })
  );

  api.subscriptions.push(
    api.commands.register("json-formatter.minify", async () => {
      try {
        const text = await api.clipboard.readText();
        const parsed = JSON.parse(text);
        const minified = JSON.stringify(parsed);
        await api.clipboard.writeText(minified);
        api.ui.showToast("JSON minified and copied to clipboard", { type: "success" });
      } catch {
        api.ui.showToast("Clipboard does not contain valid JSON", { type: "error" });
      }
    })
  );

  api.subscriptions.push(
    api.commands.register("json-formatter.validate", async () => {
      try {
        const text = await api.clipboard.readText();
        JSON.parse(text);
        api.ui.showToast("Valid JSON", { type: "success" });
      } catch (e) {
        api.ui.showToast(`Invalid JSON: ${e instanceof Error ? e.message : "unknown error"}`, { type: "error" });
      }
    })
  );
}

export function deactivate() {
  hermesAPI = null;
  settingsListeners = [];
  // Reset to defaults so a fresh activate() starts clean
  indentSize = 2;
  sortKeys = false;
  maxDepth = 0;
}
