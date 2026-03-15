import * as React from "react";
import { PixelOfficePanel } from "./ui/PixelOfficePanel";

// ── Plugin API types (provided at runtime by Hermes host) ──

interface Disposable {
  dispose(): void;
}

interface PluginPanelProps {
  pluginId: string;
  panelId: string;
}

export interface SessionInfo {
  id: string;
  name: string;
  phase: string;
  detected_agent: string;
  working_directory: string;
  ai_provider?: string;
  branch?: string;
  created_at?: number;
}

export interface TranscriptEvent {
  type: "tool_start" | "tool_end" | "text" | "thinking" | "turn_end";
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  timestamp: number;
  session_id: string;
}

export interface HermesPluginAPI {
  ui: {
    registerPanel(
      panelId: string,
      component: React.ComponentType<PluginPanelProps>
    ): Disposable;
    showPanel(panelId: string): void;
    hidePanel(panelId: string): void;
    togglePanel(panelId: string): void;
    showToast(
      message: string,
      options?: {
        type?: "info" | "success" | "warning" | "error";
        duration?: number;
      }
    ): void;
    updateStatusBarItem(
      itemId: string,
      update: { text?: string; tooltip?: string; visible?: boolean }
    ): void;
    updateSessionActionBadge(
      actionId: string,
      badge: { count?: number }
    ): void;
  };
  commands: {
    register(
      commandId: string,
      handler: () => void | Promise<void>
    ): Disposable;
    execute(commandId: string): Promise<void>;
  };
  storage: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  settings: {
    get<T = string | number | boolean>(key: string): Promise<T>;
    update(key: string, value: string | number | boolean): Promise<void>;
    onDidChange(
      key: string,
      callback: (newValue: string | number | boolean) => void
    ): Disposable;
    getAll(): Promise<Record<string, string | number | boolean>>;
  };
  events: {
    on(event: string, callback: (...args: unknown[]) => void): Disposable;
  };
  sessions: {
    list(): Promise<SessionInfo[]>;
    getActive(): Promise<SessionInfo | null>;
    focus?(sessionId: string): Promise<void>;
  };
  agents?: {
    watchTranscript(
      sessionId: string,
      callback: (event: TranscriptEvent) => void
    ): Promise<Disposable>;
  };
  subscriptions: Disposable[];
}

// ── Module-level state ──

let api: HermesPluginAPI | null = null;
const listeners = new Set<() => void>();

export function getAPI(): HermesPluginAPI {
  if (!api) throw new Error("Pixel Office plugin not activated");
  return api;
}

// ── State management (observer pattern) ──

export interface PixelOfficeState {
  ready: boolean;
  sessions: SessionInfo[];
  activeSessionId: string | null;
  soundEnabled: boolean;
  showBranchLabels: boolean;
  showToolStatus: boolean;
}

let state: PixelOfficeState = {
  ready: false,
  sessions: [],
  activeSessionId: null,
  soundEnabled: true,
  showBranchLabels: true,
  showToolStatus: true,
};

export function getState(): PixelOfficeState {
  return { ...state };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // Silently ignore errors
    }
  });
}

export function updateState(partial: Partial<PixelOfficeState>) {
  state = { ...state, ...partial };
  notifyListeners();
}

// ── Plugin lifecycle ──

export function activate(pluginAPI: HermesPluginAPI) {
  api = pluginAPI;

  // Register the pixel office panel
  api.ui.registerPanel("pixel-office-panel", PixelOfficePanel);

  // Register the toggle command
  api.subscriptions.push(
    api.commands.register("hermes-hq.pixel-office.toggle", () => {
      api!.ui.togglePanel("pixel-office-panel");
    })
  );

  // Load settings
  api.settings.get<boolean>("soundEnabled").then((val) => {
    updateState({ soundEnabled: val ?? true });
  });
  api.settings.get<boolean>("showBranchLabels").then((val) => {
    updateState({ showBranchLabels: val ?? true });
  });
  api.settings.get<boolean>("showToolStatus").then((val) => {
    updateState({ showToolStatus: val ?? true });
  });

  // Watch settings changes
  api.subscriptions.push(
    api.settings.onDidChange("soundEnabled", (val) => {
      updateState({ soundEnabled: val as boolean });
    })
  );
  api.subscriptions.push(
    api.settings.onDidChange("showBranchLabels", (val) => {
      updateState({ showBranchLabels: val as boolean });
    })
  );
  api.subscriptions.push(
    api.settings.onDidChange("showToolStatus", (val) => {
      updateState({ showToolStatus: val as boolean });
    })
  );

  // Listen for session events
  api.subscriptions.push(
    api.events.on("session.created", () => {
      refreshSessions();
    })
  );
  api.subscriptions.push(
    api.events.on("session.closed", () => {
      refreshSessions();
    })
  );

  // Listen for phase changes (if available in the API)
  api.subscriptions.push(
    api.events.on("session.phase_changed", () => {
      refreshSessions();
    })
  );

  // Listen for focus changes
  api.subscriptions.push(
    api.events.on("session.focus_changed", (data: unknown) => {
      const event = data as { sessionId: string | null } | undefined;
      if (event) {
        updateState({ activeSessionId: event.sessionId });
      }
    })
  );

  // Initial session load
  refreshSessions().then(() => {
    updateState({ ready: true });
  });
}

async function refreshSessions() {
  try {
    const sessions = await api!.sessions.list();
    updateState({ sessions });
  } catch {
    // API not available yet or error — keep existing state
  }
}

export function deactivate() {
  api = null;
  state = {
    ready: false,
    sessions: [],
    activeSessionId: null,
    soundEnabled: true,
    showBranchLabels: true,
    showToolStatus: true,
  };
  listeners.clear();
}
