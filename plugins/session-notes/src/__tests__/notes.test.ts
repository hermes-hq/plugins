import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

function createMockApi() {
	const subscriptions: { dispose(): void }[] = [];
	const settingsChangeCallbacks = new Map<string, (v: any) => void>();
	const eventCallbacks = new Map<string, (...args: any[]) => void>();

	return {
		ui: {
			registerPanel: vi.fn(() => ({ dispose: vi.fn() })),
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
		clipboard: {
			readText: vi.fn(),
			writeText: vi.fn(),
		},
		storage: {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
		},
		settings: {
			get: vi.fn(),
			update: vi.fn(),
			onDidChange: vi.fn((key: string, cb: (v: any) => void) => {
				settingsChangeCallbacks.set(key, cb);
				return { dispose: vi.fn() };
			}),
			getAll: vi.fn().mockResolvedValue({}),
		},
		events: {
			on: vi.fn((event: string, cb: (...args: any[]) => void) => {
				eventCallbacks.set(event, cb);
				return { dispose: vi.fn() };
			}),
		},
		sessions: {
			getActive: vi.fn().mockResolvedValue(null),
			list: vi.fn().mockResolvedValue([]),
		},
		subscriptions,
		// Test helpers
		_settingsChangeCallbacks: settingsChangeCallbacks,
		_eventCallbacks: eventCallbacks,
	};
}

type MockApi = ReturnType<typeof createMockApi>;

describe("Session Notes plugin", () => {
	let mockApi: MockApi;

	beforeEach(() => {
		vi.useFakeTimers();
		mockApi = createMockApi();
	});

	afterEach(() => {
		deactivate();
		vi.useRealTimers();
	});

	// ─── State management ───────────────────────────────────────────

	describe("state management", () => {
		it("initial state should have null sessionId and empty note", () => {
			const state = getState();
			expect(state.sessionId).toBeNull();
			expect(state.note).toBe("");
		});

		it("getState() should return current state", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "Session 1" });
			mockApi.storage.get.mockResolvedValue("hello world");

			await activate(mockApi as any);

			const state = getState();
			expect(state.sessionId).toBe("s1");
			expect(state.sessionName).toBe("Session 1");
			expect(state.note).toBe("hello world");
			expect(state.fontSize).toBe(14);
			expect(state.showLineCount).toBe(true);
		});

		it("subscribe() should notify on state changes", async () => {
			await activate(mockApi as any);

			const listener = vi.fn();
			subscribe(listener);

			updateNote("new text");
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it("unsubscribe should stop notifications", async () => {
			await activate(mockApi as any);

			const listener = vi.fn();
			const unsub = subscribe(listener);

			updateNote("first");
			expect(listener).toHaveBeenCalledTimes(1);

			unsub();
			updateNote("second");
			expect(listener).toHaveBeenCalledTimes(1);
		});
	});

	// ─── Note editing ───────────────────────────────────────────────

	describe("note editing", () => {
		it("updateNote() should update the current note", async () => {
			await activate(mockApi as any);

			updateNote("my note");
			expect(getState().note).toBe("my note");
		});

		it("updateNote() should schedule a save (debounce)", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			updateNote("draft");

			// Save should not have been called yet
			expect(mockApi.storage.set).not.toHaveBeenCalled();
		});

		it("after save delay, should call storage.set with correct key", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			updateNote("persisted text");

			// Advance past the default 500ms debounce
			await vi.advanceTimersByTimeAsync(600);

			expect(mockApi.storage.set).toHaveBeenCalledWith("note:s1", "persisted text");
		});

		it("clearNote() should clear the note and delete from storage", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("some content");
			await activate(mockApi as any);

			expect(getState().note).toBe("some content");

			await clearNote();

			expect(getState().note).toBe("");
			expect(mockApi.storage.delete).toHaveBeenCalledWith("note:s1");
			expect(mockApi.ui.showToast).toHaveBeenCalledWith(
				"Note cleared",
				expect.objectContaining({ type: "info" }),
			);
		});

		it("saving an empty/whitespace note should delete from storage instead", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			updateNote("   ");

			await vi.advanceTimersByTimeAsync(600);

			expect(mockApi.storage.delete).toHaveBeenCalledWith("note:s1");
			expect(mockApi.storage.set).not.toHaveBeenCalled();
		});
	});

	// ─── Session switching ──────────────────────────────────────────

	describe("session switching", () => {
		it("when loading a session, should read note from storage", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("stored note");

			await activate(mockApi as any);

			expect(mockApi.storage.get).toHaveBeenCalledWith("note:s1");
			expect(getState().note).toBe("stored note");
		});

		it("when switching sessions via session.created, should save current note first", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			updateNote("note for s1");

			// Simulate new session being created
			mockApi.sessions.list.mockResolvedValue([
				{ id: "s1", name: "S1" },
				{ id: "s2", name: "S2" },
			]);
			mockApi.storage.get.mockResolvedValue("note for s2");

			const sessionCreatedCb = mockApi._eventCallbacks.get("session.created");
			expect(sessionCreatedCb).toBeDefined();
			await sessionCreatedCb!("s2");

			// Should have saved s1's note before switching
			expect(mockApi.storage.set).toHaveBeenCalledWith("note:s1", "note for s1");

			// Now loaded s2
			expect(getState().sessionId).toBe("s2");
			expect(getState().note).toBe("note for s2");
		});

		it("storage key should be note:<sessionId>", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "abc-123", name: "Test" });
			mockApi.storage.get.mockResolvedValue(null);
			await activate(mockApi as any);

			expect(mockApi.storage.get).toHaveBeenCalledWith("note:abc-123");
		});

		it("when session.closed fires for active session, should switch to another active session", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			// Simulate session close — getActive returns a different session
			mockApi.sessions.getActive.mockResolvedValue({ id: "s2", name: "S2" });
			mockApi.storage.get.mockResolvedValue("s2 note");

			const sessionClosedCb = mockApi._eventCallbacks.get("session.closed");
			expect(sessionClosedCb).toBeDefined();
			await sessionClosedCb!("s1");

			expect(getState().sessionId).toBe("s2");
			expect(getState().note).toBe("s2 note");
		});

		it("when session.closed fires and no other session, should clear state", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			mockApi.sessions.getActive.mockResolvedValue(null);

			const sessionClosedCb = mockApi._eventCallbacks.get("session.closed");
			await sessionClosedCb!("s1");

			expect(getState().sessionId).toBeNull();
			expect(getState().sessionName).toBe("");
			expect(getState().note).toBe("");
		});
	});

	// ─── Settings ───────────────────────────────────────────────────

	describe("settings", () => {
		it("settings should load on activate", async () => {
			mockApi.settings.getAll.mockResolvedValue({
				autoSaveDelay: 1000,
				fontSize: 18,
				showLineCount: false,
			});

			await activate(mockApi as any);

			expect(mockApi.settings.getAll).toHaveBeenCalled();
			const state = getState();
			expect(state.fontSize).toBe(18);
			expect(state.showLineCount).toBe(false);
		});

		it("autoSaveDelay should control debounce timing", async () => {
			mockApi.settings.getAll.mockResolvedValue({ autoSaveDelay: 1000 });
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			updateNote("delayed");

			// At 600ms it should NOT have saved yet (delay is 1000ms)
			await vi.advanceTimersByTimeAsync(600);
			expect(mockApi.storage.set).not.toHaveBeenCalled();

			// At 1100ms it should have saved
			await vi.advanceTimersByTimeAsync(500);
			expect(mockApi.storage.set).toHaveBeenCalledWith("note:s1", "delayed");
		});

		it("fontSize setting should be reflected in state", async () => {
			mockApi.settings.getAll.mockResolvedValue({ fontSize: 20 });
			await activate(mockApi as any);

			expect(getState().fontSize).toBe(20);
		});

		it("dynamic settings changes should update state", async () => {
			await activate(mockApi as any);

			const listener = vi.fn();
			subscribe(listener);

			const fontSizeCb = mockApi._settingsChangeCallbacks.get("fontSize");
			expect(fontSizeCb).toBeDefined();
			fontSizeCb!(22);

			expect(getState().fontSize).toBe(22);
			expect(listener).toHaveBeenCalled();
		});

		it("dynamic autoSaveDelay change should affect debounce", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			// Change autoSaveDelay to 200ms
			const delayCb = mockApi._settingsChangeCallbacks.get("autoSaveDelay");
			delayCb!(200);

			updateNote("fast save");

			await vi.advanceTimersByTimeAsync(250);
			expect(mockApi.storage.set).toHaveBeenCalledWith("note:s1", "fast save");
		});
	});

	// ─── Activation / deactivation ──────────────────────────────────

	describe("activation and deactivation", () => {
		it("should register panel on activate", async () => {
			await activate(mockApi as any);
			expect(mockApi.ui.registerPanel).toHaveBeenCalledWith(
				"session-notes-panel",
				expect.any(Function),
			);
		});

		it("should register commands on activate", async () => {
			await activate(mockApi as any);
			expect(mockApi.commands.register).toHaveBeenCalledWith(
				"notes.open",
				expect.any(Function),
			);
			expect(mockApi.commands.register).toHaveBeenCalledWith(
				"notes.clear",
				expect.any(Function),
			);
		});

		it("deactivate should flush pending save", async () => {
			mockApi.sessions.getActive.mockResolvedValue({ id: "s1", name: "S1" });
			mockApi.storage.get.mockResolvedValue("");
			await activate(mockApi as any);

			updateNote("unsaved");
			// Timer is pending, now deactivate
			deactivate();

			// saveNote should have been called during deactivate
			expect(mockApi.storage.set).toHaveBeenCalledWith("note:s1", "unsaved");
		});

		it("deactivate should clear listeners", async () => {
			await activate(mockApi as any);

			const listener = vi.fn();
			subscribe(listener);

			deactivate();

			// Re-activate with fresh api so updateNote works
			const freshApi = createMockApi();
			await activate(freshApi as any);

			updateNote("after deactivate");
			expect(listener).not.toHaveBeenCalled();
		});

		it("updateStatusBar should be called on activate", async () => {
			await activate(mockApi as any);
			expect(mockApi.ui.updateStatusBarItem).toHaveBeenCalledWith(
				"notes.status",
				expect.objectContaining({
					text: expect.stringContaining("Notes"),
				}),
			);
		});
	});
});
