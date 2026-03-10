import { NotesPanel } from "./NotesPanel";

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
	events: {
		on(event: string, callback: (...args: any[]) => void): Disposable;
	};
	sessions: {
		getActive(): Promise<{ id: string; name: string } | null>;
		list(): Promise<{ id: string; name: string }[]>;
	};
	subscriptions: Disposable[];
}

let api: HermesPluginAPI | null = null;
let activeSessionId: string | null = null;
let activeSessionName: string = "";
let currentNote: string = "";
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let autoSaveDelay = 500;
let fontSize = 14;
let showLineCount = true;
let listeners = new Set<() => void>();

export interface NotesState {
	sessionId: string | null;
	sessionName: string;
	note: string;
	fontSize: number;
	showLineCount: boolean;
}

export function getState(): NotesState {
	return {
		sessionId: activeSessionId,
		sessionName: activeSessionName,
		note: currentNote,
		fontSize,
		showLineCount,
	};
}

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notifyListeners() {
	for (const l of listeners) {
		try { l(); } catch { /* swallow */ }
	}
}

function storageKey(sessionId: string): string {
	return `note:${sessionId}`;
}

async function saveNote() {
	if (!api || !activeSessionId) return;
	try {
		if (currentNote.trim()) {
			await api.storage.set(storageKey(activeSessionId), currentNote);
		} else {
			await api.storage.delete(storageKey(activeSessionId));
		}
	} catch { /* best effort */ }
}

function scheduleSave() {
	if (saveTimer !== null) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveNote();
		saveTimer = null;
	}, autoSaveDelay);
}

async function loadNoteForSession(sessionId: string, sessionName: string) {
	// Save current note first
	if (activeSessionId && activeSessionId !== sessionId) {
		if (saveTimer !== null) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		await saveNote();
	}

	activeSessionId = sessionId;
	activeSessionName = sessionName;
	currentNote = "";

	if (api) {
		try {
			const stored = await api.storage.get(storageKey(sessionId));
			currentNote = stored ?? "";
		} catch { /* ok */ }
		updateStatusBar();
	}

	notifyListeners();
}

function updateStatusBar() {
	if (!api) return;
	const lines = currentNote ? currentNote.split("\n").length : 0;
	const hasContent = currentNote.trim().length > 0;
	const text = hasContent ? `Notes (${lines}L)` : "Notes";
	const tooltip = activeSessionName
		? `Notes for "${activeSessionName}" — Click to open`
		: "Session Notes — Click to open";
	api.ui.updateStatusBarItem("notes.status", { text, tooltip });
}

export function updateNote(text: string) {
	currentNote = text;
	scheduleSave();
	updateStatusBar();
	notifyListeners();
}

export async function clearNote() {
	if (!api || !activeSessionId) return;
	currentNote = "";
	try {
		await api.storage.delete(storageKey(activeSessionId));
	} catch { /* ok */ }
	updateStatusBar();
	notifyListeners();
	api.ui.showToast("Note cleared", { type: "info", duration: 1500 });
}

export async function activate(pluginApi: HermesPluginAPI) {
	api = pluginApi;

	// Load settings
	try {
		const all = await api.settings.getAll();
		autoSaveDelay = parseInt(String(all.autoSaveDelay), 10) || 500;
		fontSize = parseInt(String(all.fontSize), 10) || 14;
		showLineCount = all.showLineCount !== false;
	} catch { /* use defaults */ }

	// Listen for settings changes
	api.subscriptions.push(
		api.settings.onDidChange("autoSaveDelay", (v) => {
			autoSaveDelay = parseInt(String(v), 10) || 500;
		})
	);
	api.subscriptions.push(
		api.settings.onDidChange("fontSize", (v) => {
			fontSize = parseInt(String(v), 10) || 14;
			notifyListeners();
		})
	);
	api.subscriptions.push(
		api.settings.onDidChange("showLineCount", (v) => {
			showLineCount = v !== false;
			updateStatusBar();
			notifyListeners();
		})
	);

	// Load initial active session
	try {
		const active = await api.sessions.getActive();
		if (active) {
			await loadNoteForSession(active.id, active.name);
		}
	} catch { /* no active session yet */ }

	// Subscribe to session events
	api.subscriptions.push(
		api.events.on("session.created", async (sessionId: string) => {
			// Auto-switch to new session
			try {
				const sessions = await api!.sessions.list();
				const session = sessions.find(s => s.id === sessionId);
				if (session) {
					await loadNoteForSession(session.id, session.name);
				}
			} catch { /* ok */ }
		})
	);

	api.subscriptions.push(
		api.events.on("session.closed", async (sessionId: string) => {
			if (activeSessionId === sessionId) {
				// Switch to another session if available
				try {
					const active = await api!.sessions.getActive();
					if (active) {
						await loadNoteForSession(active.id, active.name);
					} else {
						activeSessionId = null;
						activeSessionName = "";
						currentNote = "";
						updateStatusBar();
						notifyListeners();
					}
				} catch { /* ok */ }
			}
		})
	);

	// Register panel
	api.ui.registerPanel("session-notes-panel", NotesPanel);

	// Commands
	api.subscriptions.push(
		api.commands.register("notes.open", () => {
			api!.ui.showPanel("session-notes-panel");
		})
	);
	api.subscriptions.push(
		api.commands.register("notes.clear", () => clearNote())
	);

	updateStatusBar();
}

export function deactivate() {
	// Flush pending save
	if (saveTimer !== null) {
		clearTimeout(saveTimer);
		saveTimer = null;
	}
	saveNote();
	api = null;
	listeners.clear();
}
