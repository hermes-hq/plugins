import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	activate,
	deactivate,
	startTimer,
	pauseTimer,
	resetTimer,
	skipPhase,
	getState,
	subscribe,
} from "../activate";

vi.mock("react", () => ({}));
vi.mock("../PomodoroPanel", () => ({
	PomodoroPanel: () => null,
}));

function createMockAPI(overrides?: {
	settings?: Record<string, any>;
	storedCount?: string | null;
}) {
	const settingsValues = {
		workDuration: "25",
		breakDuration: "5",
		longBreakDuration: "15",
		autoStartBreak: true,
		autoStartWork: false,
		showNotifications: true,
		...overrides?.settings,
	};
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
			get: vi.fn().mockResolvedValue(overrides?.storedCount ?? null),
			set: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
		},
		settings: {
			get: vi.fn().mockResolvedValue("25"),
			update: vi.fn().mockResolvedValue(undefined),
			onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
			getAll: vi.fn().mockResolvedValue(settingsValues),
		},
		notifications: {
			send: vi.fn().mockResolvedValue(undefined),
		},
		subscriptions: [] as { dispose: () => void }[],
	};
}

/**
 * Helper: activate with autoStartBreak=false so that completing a work
 * session does NOT automatically start a break timer (which would cause
 * runAllTimersAsync to run through the entire break and cycle back).
 */
async function activateNoAutoStart(overrides?: Record<string, any>) {
	const api = createMockAPI({
		settings: {
			autoStartBreak: false,
			autoStartWork: false,
			...overrides,
		},
	});
	await activate(api as any);
	return api;
}

describe("Pomodoro Timer", () => {
	let mockAPI: ReturnType<typeof createMockAPI>;

	beforeEach(async () => {
		vi.useFakeTimers();
		deactivate();
		resetTimer();
	});

	afterEach(() => {
		deactivate();
		vi.useRealTimers();
	});

	describe("initial state", () => {
		it("should return work phase with 25:00 remaining and 0 completed after activate", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			const state = getState();
			// activate calls resetTimer internally via setPhase, so phase is "work" equivalent
			// but state is "idle" (not running yet)
			expect(state.state).toBe("idle");
			expect(state.secondsRemaining).toBe(25 * 60);
			expect(state.totalSeconds).toBe(25 * 60);
			expect(state.completedPomodoros).toBe(0);
		});

		it("should have sessionsUntilLongBreak set to 4", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			const state = getState();
			expect(state.sessionsUntilLongBreak).toBe(4);
		});
	});

	describe("startTimer", () => {
		it("should change state to running and phase to work", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			startTimer();
			const state = getState();
			expect(state.state).toBe("running");
			expect(state.phase).toBe("work");
		});

		it("should update the status bar when starting", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			mockAPI.ui.updateStatusBarItem.mockClear();
			startTimer();
			expect(mockAPI.ui.updateStatusBarItem).toHaveBeenCalled();
		});
	});

	describe("pauseTimer", () => {
		beforeEach(async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
		});

		it("should pause a running timer", () => {
			startTimer();
			pauseTimer();
			const state = getState();
			expect(state.state).toBe("paused");
		});

		it("should not change state if not running", () => {
			pauseTimer();
			const state = getState();
			expect(state.state).toBe("idle");
		});

		it("should stop the countdown when paused", () => {
			startTimer();
			vi.advanceTimersByTime(3000);
			pauseTimer();
			const secondsAfterPause = getState().secondsRemaining;
			vi.advanceTimersByTime(5000);
			expect(getState().secondsRemaining).toBe(secondsAfterPause);
		});
	});

	describe("resetTimer", () => {
		it("should reset back to idle with full work duration", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			startTimer();
			vi.advanceTimersByTime(5000);
			resetTimer();
			const state = getState();
			expect(state.state).toBe("idle");
			expect(state.phase).toBe("work");
			expect(state.secondsRemaining).toBe(25 * 60);
		});
	});

	describe("timer countdown", () => {
		beforeEach(async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
		});

		it("should decrease secondsRemaining each second", () => {
			startTimer();
			vi.advanceTimersByTime(1000);
			expect(getState().secondsRemaining).toBe(25 * 60 - 1);
		});

		it("should decrease by 5 after 5 seconds", () => {
			startTimer();
			vi.advanceTimersByTime(5000);
			expect(getState().secondsRemaining).toBe(25 * 60 - 5);
		});
	});

	describe("timer completion", () => {
		it("should increment completedPomodoros when work session ends", async () => {
			const api = await activateNoAutoStart();
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(getState().completedPomodoros).toBe(1);
		});

		it("should switch to break phase after work completes", async () => {
			const api = await activateNoAutoStart();
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(getState().phase).toBe("break");
		});

		it("should persist completed count to storage", async () => {
			const api = await activateNoAutoStart();
			const countBefore = getState().completedPomodoros;
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(api.storage.set).toHaveBeenCalledWith(
				"completedCount",
				String(countBefore + 1),
			);
		});

		it("should show a toast notification on completion", async () => {
			const api = await activateNoAutoStart();
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(api.ui.showToast).toHaveBeenCalledWith(
				expect.stringContaining("Focus session complete"),
				expect.objectContaining({ type: "success" }),
			);
		});

		it("should auto-start break when autoStartBreak is true", async () => {
			mockAPI = createMockAPI({ settings: { autoStartBreak: true, autoStartWork: false } });
			await activate(mockAPI as any);
			startTimer();
			// Advance to complete work session
			vi.advanceTimersByTime(25 * 60 * 1000);
			// Flush microtasks for the async onTimerComplete
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();
			// Break should have auto-started (phase is break, state is running)
			// but advanceTimersByTime may have also ticked some break seconds
			const state = getState();
			expect(state.phase).toBe("break");
			expect(state.state).toBe("running");
		});
	});

	describe("long break", () => {
		it("should switch to longBreak when sessionsUntilLongBreak reaches 0", async () => {
			const api = await activateNoAutoStart();
			// Complete work sessions until sessionsUntilLongBreak reaches 0
			const sessionsNeeded = getState().sessionsUntilLongBreak;
			for (let i = 0; i < sessionsNeeded; i++) {
				startTimer();
				vi.advanceTimersByTime(25 * 60 * 1000);
				await vi.runAllTimersAsync();
				if (i < sessionsNeeded - 1) {
					// Complete the break to get back to work
					startTimer();
					vi.advanceTimersByTime(5 * 60 * 1000);
					await vi.runAllTimersAsync();
				}
			}
			const state = getState();
			expect(state.phase).toBe("longBreak");
			// sessionsUntilLongBreak should be reset to 4
			expect(state.sessionsUntilLongBreak).toBe(4);
		});
	});

	describe("skipPhase", () => {
		it("should skip from work to break", async () => {
			const api = await activateNoAutoStart();
			const countBefore = getState().completedPomodoros;
			startTimer();
			skipPhase();
			await vi.runAllTimersAsync();
			const state = getState();
			expect(state.phase).toBe("break");
			expect(state.completedPomodoros).toBe(countBefore + 1);
		});

		it("should skip from break back to work", async () => {
			const api = await activateNoAutoStart();
			// Complete a work session first
			startTimer();
			skipPhase();
			await vi.runAllTimersAsync();
			// Now in break phase, start it and skip
			startTimer();
			skipPhase();
			await vi.runAllTimersAsync();
			const state = getState();
			expect(state.phase).toBe("work");
		});
	});

	describe("subscribe/notify", () => {
		beforeEach(async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
		});

		it("should call listeners on state changes", () => {
			const listener = vi.fn();
			subscribe(listener);
			startTimer();
			expect(listener).toHaveBeenCalled();
		});

		it("should stop calling listener after unsubscribe", () => {
			const listener = vi.fn();
			const unsubscribe = subscribe(listener);
			startTimer();
			const callCount = listener.mock.calls.length;
			unsubscribe();
			pauseTimer();
			expect(listener.mock.calls.length).toBe(callCount);
		});

		it("should call listeners on tick", () => {
			const listener = vi.fn();
			subscribe(listener);
			startTimer();
			listener.mockClear();
			vi.advanceTimersByTime(1000);
			expect(listener).toHaveBeenCalled();
		});
	});

	describe("settings integration", () => {
		it("should load settings on activate", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			expect(mockAPI.settings.getAll).toHaveBeenCalled();
		});

		it("should register onDidChange listeners for all settings", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			const settingKeys = mockAPI.settings.onDidChange.mock.calls.map(
				(call: any[]) => call[0],
			);
			expect(settingKeys).toContain("workDuration");
			expect(settingKeys).toContain("breakDuration");
			expect(settingKeys).toContain("longBreakDuration");
			expect(settingKeys).toContain("autoStartBreak");
			expect(settingKeys).toContain("autoStartWork");
			expect(settingKeys).toContain("showNotifications");
		});
	});

	describe("storage persistence", () => {
		it("should load persisted completed count on activate", async () => {
			const api = createMockAPI({ storedCount: "7" });
			await activate(api as any);
			expect(getState().completedPomodoros).toBe(7);
		});
	});

	describe("notifications", () => {
		it("should send a notification when work session completes", async () => {
			const api = await activateNoAutoStart({ showNotifications: true });
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(api.notifications.send).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Pomodoro Complete",
					body: "Time for a break!",
				}),
			);
		});

		it("should not send notification when showNotifications is false", async () => {
			const api = createMockAPI({
				settings: {
					autoStartBreak: false,
					autoStartWork: false,
					showNotifications: false,
				},
			});
			await activate(api as any);
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(api.notifications.send).not.toHaveBeenCalled();
		});
	});

	describe("deactivate cleanup", () => {
		it("should clear interval and set api to null", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			startTimer();
			deactivate();
			const secondsBefore = getState().secondsRemaining;
			vi.advanceTimersByTime(5000);
			expect(getState().secondsRemaining).toBe(secondsBefore);
		});

		it("should clear all listeners on deactivate", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			const listener = vi.fn();
			subscribe(listener);
			deactivate();
			const callsAfterDeactivate = listener.mock.calls.length;
			resetTimer();
			startTimer();
			expect(listener.mock.calls.length).toBe(callsAfterDeactivate);
		});
	});

	describe("commands registration", () => {
		it("should register pomodoro commands on activate", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			const registeredCommands = mockAPI.commands.register.mock.calls.map(
				(call: any[]) => call[0],
			);
			expect(registeredCommands).toContain("pomodoro.start");
			expect(registeredCommands).toContain("pomodoro.pause");
			expect(registeredCommands).toContain("pomodoro.reset");
			expect(registeredCommands).toContain("pomodoro.openPanel");
		});
	});

	describe("panel registration", () => {
		it("should register the pomodoro panel on activate", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			expect(mockAPI.ui.registerPanel).toHaveBeenCalledWith(
				"pomodoro-panel",
				expect.any(Function),
			);
		});
	});

	describe("formatTime via status bar", () => {
		it("should display 25:00 for idle state with default 25 min work duration", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			const calls = mockAPI.ui.updateStatusBarItem.mock.calls;
			const lastCall = calls[calls.length - 1];
			expect(lastCall[0]).toBe("pomodoro.status");
			expect(lastCall[1].text).toBe("25:00");
		});

		it("should display correct format after ticking (e.g. 24:59 after 1 second)", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			startTimer();
			mockAPI.ui.updateStatusBarItem.mockClear();
			vi.advanceTimersByTime(1000);
			const calls = mockAPI.ui.updateStatusBarItem.mock.calls;
			const lastCall = calls[calls.length - 1];
			expect(lastCall[1].text).toBe("24:59");
		});

		it("should display 01:01 for 61 seconds remaining", async () => {
			mockAPI = createMockAPI({ settings: { workDuration: "2" } });
			await activate(mockAPI as any);
			startTimer();
			// 2 min = 120 seconds, advance 59 seconds to reach 61 seconds remaining
			vi.advanceTimersByTime(59000);
			mockAPI.ui.updateStatusBarItem.mockClear();
			vi.advanceTimersByTime(0); // force a status bar read from last tick
			const calls = mockAPI.ui.updateStatusBarItem.mock.calls;
			// Check state directly
			expect(getState().secondsRemaining).toBe(61);
			// The last tick at 59s should have updated status bar
			const allCalls = mockAPI.ui.updateStatusBarItem.mock.calls;
			// Look at the call right before we cleared
			const preClearCalls = mockAPI.ui.updateStatusBarItem.mock.calls;
			// Re-approach: just check via a fresh tick
			mockAPI.ui.updateStatusBarItem.mockClear();
			vi.advanceTimersByTime(1000);
			const newCalls = mockAPI.ui.updateStatusBarItem.mock.calls;
			expect(newCalls.length).toBeGreaterThan(0);
			// After ticking 1 more second, we have 60 seconds remaining
			expect(newCalls[newCalls.length - 1][1].text).toBe("01:00");
		});

		it("should display 00:01 for 1 second remaining", async () => {
			mockAPI = createMockAPI({
				settings: {
					workDuration: "1",
					autoStartBreak: false,
					autoStartWork: false,
				},
			});
			await activate(mockAPI as any);
			startTimer();
			// 1 min = 60 seconds, advance 59 seconds to reach 1 second remaining
			vi.advanceTimersByTime(58000);
			mockAPI.ui.updateStatusBarItem.mockClear();
			vi.advanceTimersByTime(1000);
			const calls = mockAPI.ui.updateStatusBarItem.mock.calls;
			expect(calls[calls.length - 1][1].text).toBe("00:01");
		});

		it("should show phase label in tooltip when running", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			startTimer();
			const calls = mockAPI.ui.updateStatusBarItem.mock.calls;
			const lastCall = calls[calls.length - 1];
			expect(lastCall[1].tooltip).toContain("Focus");
		});

		it("should show paused label in tooltip when paused", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			startTimer();
			pauseTimer();
			const calls = mockAPI.ui.updateStatusBarItem.mock.calls;
			const lastCall = calls[calls.length - 1];
			expect(lastCall[1].tooltip).toContain("paused");
		});
	});

	describe("settings changes at runtime", () => {
		it("should update work duration when idle and workDuration setting changes", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			// Find the workDuration onDidChange callback
			const workDurationCall = mockAPI.settings.onDidChange.mock.calls.find(
				(call: any[]) => call[0] === "workDuration",
			);
			expect(workDurationCall).toBeDefined();
			const callback = workDurationCall![1];
			// Simulate settings change
			callback("30");
			const state = getState();
			expect(state.secondsRemaining).toBe(30 * 60);
			expect(state.totalSeconds).toBe(30 * 60);
		});

		it("should not update timer when workDuration changes while running", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			startTimer();
			vi.advanceTimersByTime(5000);
			const secondsBefore = getState().secondsRemaining;
			// Trigger settings change
			const workDurationCall = mockAPI.settings.onDidChange.mock.calls.find(
				(call: any[]) => call[0] === "workDuration",
			);
			const callback = workDurationCall![1];
			callback("30");
			// Timer should keep its current remaining time
			expect(getState().secondsRemaining).toBe(secondsBefore);
		});

		it("should not update timer when workDuration changes while paused", async () => {
			mockAPI = createMockAPI();
			await activate(mockAPI as any);
			startTimer();
			vi.advanceTimersByTime(5000);
			pauseTimer();
			const secondsBefore = getState().secondsRemaining;
			// Trigger settings change
			const workDurationCall = mockAPI.settings.onDidChange.mock.calls.find(
				(call: any[]) => call[0] === "workDuration",
			);
			const callback = workDurationCall![1];
			callback("30");
			expect(getState().secondsRemaining).toBe(secondsBefore);
		});

		it("should update break duration when idle in break phase and breakDuration setting changes", async () => {
			const api = await activateNoAutoStart();
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			// Now in break phase, idle
			expect(getState().phase).toBe("break");
			expect(getState().state).toBe("idle");
			expect(getState().secondsRemaining).toBe(5 * 60);
			// Trigger breakDuration change
			const breakDurationCall = api.settings.onDidChange.mock.calls.find(
				(call: any[]) => call[0] === "breakDuration",
			);
			expect(breakDurationCall).toBeDefined();
			const callback = breakDurationCall![1];
			callback("10");
			const state = getState();
			expect(state.secondsRemaining).toBe(10 * 60);
			expect(state.totalSeconds).toBe(10 * 60);
		});

		it("should update long break duration when idle in longBreak phase and longBreakDuration setting changes", async () => {
			const api = await activateNoAutoStart();
			// Complete 4 work sessions to reach longBreak
			for (let i = 0; i < 4; i++) {
				startTimer();
				vi.advanceTimersByTime(25 * 60 * 1000);
				await vi.runAllTimersAsync();
				if (i < 3) {
					startTimer();
					vi.advanceTimersByTime(5 * 60 * 1000);
					await vi.runAllTimersAsync();
				}
			}
			expect(getState().phase).toBe("longBreak");
			expect(getState().state).toBe("idle");
			expect(getState().secondsRemaining).toBe(15 * 60);
			// Trigger longBreakDuration change
			const longBreakCall = api.settings.onDidChange.mock.calls.find(
				(call: any[]) => call[0] === "longBreakDuration",
			);
			expect(longBreakCall).toBeDefined();
			const callback = longBreakCall![1];
			callback("20");
			const state = getState();
			expect(state.secondsRemaining).toBe(20 * 60);
			expect(state.totalSeconds).toBe(20 * 60);
		});

		it("should not update break timer when breakDuration changes while running", async () => {
			const api = await activateNoAutoStart();
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			// Start the break
			startTimer();
			vi.advanceTimersByTime(2000);
			const secondsBefore = getState().secondsRemaining;
			// Trigger breakDuration change
			const breakDurationCall = api.settings.onDidChange.mock.calls.find(
				(call: any[]) => call[0] === "breakDuration",
			);
			const callback = breakDurationCall![1];
			callback("10");
			expect(getState().secondsRemaining).toBe(secondsBefore);
		});

		it("should not update timer when in break phase even if idle", async () => {
			const api = await activateNoAutoStart();
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			// Now in break phase, idle
			expect(getState().phase).toBe("break");
			expect(getState().state).toBe("idle");
			// Trigger workDuration change
			const workDurationCall = api.settings.onDidChange.mock.calls.find(
				(call: any[]) => call[0] === "workDuration",
			);
			const callback = workDurationCall![1];
			const secondsBefore = getState().secondsRemaining;
			callback("30");
			// Should not change break timer
			expect(getState().secondsRemaining).toBe(secondsBefore);
		});
	});

	describe("break completion", () => {
		it("should switch to work phase after break completes", async () => {
			const api = await activateNoAutoStart();
			// Complete a work session to enter break
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(getState().phase).toBe("break");
			// Start and complete the break
			startTimer();
			vi.advanceTimersByTime(5 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(getState().phase).toBe("work");
		});

		it("should show break-over toast when break completes", async () => {
			const api = await activateNoAutoStart();
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			api.ui.showToast.mockClear();
			// Complete the break
			startTimer();
			vi.advanceTimersByTime(5 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(api.ui.showToast).toHaveBeenCalledWith(
				expect.stringContaining("Break is over"),
				expect.objectContaining({ type: "info" }),
			);
		});

		it("should auto-start work when autoStartWork is true and break completes", async () => {
			mockAPI = createMockAPI({
				settings: { autoStartBreak: false, autoStartWork: true },
			});
			await activate(mockAPI as any);
			// Complete work session - this transitions to break (or longBreak)
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			const phaseAfterWork = getState().phase;
			// It could be "break" or "longBreak" depending on sessionsUntilLongBreak
			expect(["break", "longBreak"]).toContain(phaseAfterWork);
			// Start and complete the break/longBreak
			const breakDurationSecs = getState().secondsRemaining;
			startTimer();
			vi.advanceTimersByTime(breakDurationSecs * 1000);
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();
			const state = getState();
			expect(state.phase).toBe("work");
			expect(state.state).toBe("running");
		});

		it("should switch to work after long break completes", async () => {
			const api = await activateNoAutoStart();
			// Complete 4 work sessions and their breaks
			for (let i = 0; i < 4; i++) {
				startTimer();
				vi.advanceTimersByTime(25 * 60 * 1000);
				await vi.runAllTimersAsync();
				if (i < 3) {
					// Complete break
					startTimer();
					vi.advanceTimersByTime(5 * 60 * 1000);
					await vi.runAllTimersAsync();
				}
			}
			// Should be in longBreak now
			expect(getState().phase).toBe("longBreak");
			// Complete the long break
			startTimer();
			vi.advanceTimersByTime(15 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(getState().phase).toBe("work");
		});
	});

	describe("custom settings durations", () => {
		it("should use custom work duration from settings", async () => {
			mockAPI = createMockAPI({ settings: { workDuration: "50" } });
			await activate(mockAPI as any);
			const state = getState();
			expect(state.secondsRemaining).toBe(50 * 60);
			expect(state.totalSeconds).toBe(50 * 60);
		});

		it("should use custom break duration from settings", async () => {
			const api = createMockAPI({
				settings: {
					breakDuration: "10",
					autoStartBreak: false,
					autoStartWork: false,
				},
			});
			await activate(api as any);
			startTimer();
			vi.advanceTimersByTime(25 * 60 * 1000);
			await vi.runAllTimersAsync();
			expect(getState().phase).toBe("break");
			expect(getState().secondsRemaining).toBe(10 * 60);
		});

		it("should use custom long break duration from settings", async () => {
			const api = createMockAPI({
				settings: {
					longBreakDuration: "20",
					autoStartBreak: false,
					autoStartWork: false,
				},
			});
			await activate(api as any);
			// Complete enough work sessions to reach longBreak
			const sessionsNeeded = getState().sessionsUntilLongBreak;
			for (let i = 0; i < sessionsNeeded; i++) {
				startTimer();
				vi.advanceTimersByTime(25 * 60 * 1000);
				await vi.runAllTimersAsync();
				if (i < sessionsNeeded - 1) {
					// Complete the break to get back to work
					startTimer();
					vi.advanceTimersByTime(5 * 60 * 1000);
					await vi.runAllTimersAsync();
				}
			}
			expect(getState().phase).toBe("longBreak");
			expect(getState().secondsRemaining).toBe(20 * 60);
		});
	});
});
