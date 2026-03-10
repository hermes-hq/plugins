import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock NotesPanel before importing activate module
vi.mock("../NotesPanel", () => ({
	NotesPanel: () => null,
}));

import {
	activate,
	deactivate,
	getState,
	subscribe,
	updateNote,
	clearNote,
} from "../activate";

function createMockAPI() {
	return {
		ui: {
			registerPanel: vi.fn(),
			showPanel: vi.fn(),
			hidePanel: vi.fn(),
			togglePanel: vi.fn(),
			showToast: vi.fn(),
			updateStatusBarItem: vi.fn(),
		},
		commands: {
			register: vi.fn(() => ({ dispose: vi.fn() })),
			execute: vi.fn(),
		},
		clipboard: { readText: vi.fn(), writeText: vi.fn() },
		storage: {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
		},
		settings: {
			get: vi.fn().mockResolvedValue("500"),
			update: vi.fn().mockResolvedValue(undefined),
			onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
			getAll: vi.fn().mockResolvedValue({
				autoSaveDelay: "500",
				fontSize: "14",
				showLineCount: true,
			}),
		},
		events: {
			on: vi.fn(() => ({ dispose: vi.fn() })),
		},
		sessions: {
			getActive: vi.fn().mockResolvedValue({ id: "session-1", name: "Session 1" }),
			list: vi.fn().mockResolvedValue([{ id: "session-1", name: "Session 1" }]),
		},
		subscriptions: [] as { dispose: () => void }[],
	};
}

describe("Session Notes Plugin", () => {
	let mockAPI: ReturnType<typeof createMockAPI>;

	beforeEach(() => {
		deactivate();
		mockAPI = createMockAPI();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("initial state has null sessionId and empty note", () => {
		const state = getState();
		expect(state.sessionId).toBeNull();
		expect(state.note).toBe("");
	});

	it("activate loads the active session", async () => {
		await activate(mockAPI as any);

		const state = getState();
		expect(state.sessionId).toBe("session-1");
		expect(state.sessionName).toBe("Session 1");
	});

	it("activate loads stored note from storage", async () => {
		mockAPI.storage.get.mockResolvedValue("hello");

		await activate(mockAPI as any);

		const state = getState();
		expect(state.note).toBe("hello");
		expect(mockAPI.storage.get).toHaveBeenCalledWith("note:session-1");
	});

	it("updateNote changes the note and schedules save", async () => {
		vi.useFakeTimers();
		await activate(mockAPI as any);

		updateNote("new content");

		const state = getState();
		expect(state.note).toBe("new content");
		// Save should not have been called yet (debounced)
		expect(mockAPI.storage.set).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it("auto-save triggers after delay", async () => {
		vi.useFakeTimers();
		await activate(mockAPI as any);

		updateNote("auto-saved content");

		expect(mockAPI.storage.set).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(500);

		expect(mockAPI.storage.set).toHaveBeenCalledWith("note:session-1", "auto-saved content");
	});

	it("clearNote clears the note and deletes from storage", async () => {
		mockAPI.storage.get.mockResolvedValue("some note");
		await activate(mockAPI as any);

		expect(getState().note).toBe("some note");

		await clearNote();

		expect(getState().note).toBe("");
		expect(mockAPI.storage.delete).toHaveBeenCalledWith("note:session-1");
		expect(mockAPI.ui.showToast).toHaveBeenCalledWith("Note cleared", {
			type: "info",
			duration: 1500,
		});
	});

	it("subscribe notifies listeners on state changes", async () => {
		await activate(mockAPI as any);

		const listener = vi.fn();
		const unsub = subscribe(listener);

		updateNote("trigger listener");
		expect(listener).toHaveBeenCalled();

		unsub();
		listener.mockClear();
		updateNote("after unsub");
		expect(listener).not.toHaveBeenCalled();
	});

	it("deactivate flushes pending save", async () => {
		vi.useFakeTimers();
		await activate(mockAPI as any);

		updateNote("pending save");
		// Save is scheduled but not yet executed
		expect(mockAPI.storage.set).not.toHaveBeenCalled();

		deactivate();

		// deactivate calls saveNote synchronously (fire-and-forget)
		// The timer should have been cleared and saveNote called
		expect(mockAPI.storage.set).toHaveBeenCalledWith("note:session-1", "pending save");
	});

	it("reads fontSize and showLineCount from settings", async () => {
		mockAPI.settings.getAll.mockResolvedValue({
			autoSaveDelay: "300",
			fontSize: "18",
			showLineCount: false,
		});

		await activate(mockAPI as any);

		const state = getState();
		expect(state.fontSize).toBe(18);
		expect(state.showLineCount).toBe(false);
	});

	it("status bar updates after updateNote with line count", async () => {
		await activate(mockAPI as any);
		mockAPI.ui.updateStatusBarItem.mockClear();

		updateNote("line1\nline2\nline3");

		expect(mockAPI.ui.updateStatusBarItem).toHaveBeenCalledWith("notes.status", {
			text: "Notes (3L)",
			tooltip: 'Notes for "Session 1" — Click to open',
		});
	});

	it("storage key format is note:<sessionId>", async () => {
		await activate(mockAPI as any);

		expect(mockAPI.storage.get).toHaveBeenCalledWith("note:session-1");
	});

	it("handles no active session gracefully", async () => {
		mockAPI.sessions.getActive.mockResolvedValue(null);

		await activate(mockAPI as any);

		const state = getState();
		// When getActive returns null, activate does not call loadNoteForSession,
		// so sessionId remains whatever it was after deactivate (module-level state).
		// On a fresh module load this would be null; after prior tests it may retain
		// the previous value because deactivate() does not reset activeSessionId.
		// The important behavior: storage.get is NOT called for a session note.
		expect(mockAPI.storage.get).not.toHaveBeenCalled();
		expect(state.note).toBe("");
	});

	it("registers panel and commands on activate", async () => {
		await activate(mockAPI as any);

		expect(mockAPI.ui.registerPanel).toHaveBeenCalledWith(
			"session-notes-panel",
			expect.any(Function),
		);
		expect(mockAPI.commands.register).toHaveBeenCalledWith(
			"notes.open",
			expect.any(Function),
		);
		expect(mockAPI.commands.register).toHaveBeenCalledWith(
			"notes.clear",
			expect.any(Function),
		);
	});

	it("status bar shows plain text when note is empty", async () => {
		await activate(mockAPI as any);
		mockAPI.ui.updateStatusBarItem.mockClear();

		updateNote("");

		expect(mockAPI.ui.updateStatusBarItem).toHaveBeenCalledWith("notes.status", {
			text: "Notes",
			tooltip: 'Notes for "Session 1" — Click to open',
		});
	});

	it("auto-save debounces rapid updates", async () => {
		vi.useFakeTimers();
		await activate(mockAPI as any);

		updateNote("first");
		await vi.advanceTimersByTimeAsync(200);
		updateNote("second");
		await vi.advanceTimersByTimeAsync(200);
		updateNote("third");
		await vi.advanceTimersByTimeAsync(500);

		// Only the last value should be saved
		expect(mockAPI.storage.set).toHaveBeenCalledTimes(1);
		expect(mockAPI.storage.set).toHaveBeenCalledWith("note:session-1", "third");
	});
});
