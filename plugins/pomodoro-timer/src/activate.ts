import * as React from "react";
import { PomodoroPanel } from "./PomodoroPanel";

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
	notifications: {
		send(options: { title: string; body?: string }): Promise<void>;
	};
	subscriptions: Disposable[];
}

export type TimerPhase = "work" | "break" | "longBreak" | "idle";
export type TimerState = "running" | "paused" | "idle";

export interface PomodoroState {
	phase: TimerPhase;
	state: TimerState;
	secondsRemaining: number;
	totalSeconds: number;
	completedPomodoros: number;
	sessionsUntilLongBreak: number;
}

// Module-level state
let api: HermesPluginAPI | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let pomodoroState: PomodoroState = {
	phase: "idle",
	state: "idle",
	secondsRemaining: 25 * 60,
	totalSeconds: 25 * 60,
	completedPomodoros: 0,
	sessionsUntilLongBreak: 4,
};
let listeners: Set<() => void> = new Set();

// Settings cache
let workDuration = 25;
let breakDuration = 5;
let longBreakDuration = 15;
let autoStartBreak = true;
let autoStartWork = false;
let showNotifications = true;

export function getState(): PomodoroState {
	return { ...pomodoroState };
}

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notifyListeners() {
	for (const listener of listeners) {
		try { listener(); } catch { /* swallow */ }
	}
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateStatusBar() {
	if (!api) return;
	const { state, phase, secondsRemaining } = pomodoroState;
	let text: string;
	let tooltip: string;

	if (state === "idle") {
		text = formatTime(workDuration * 60);
		tooltip = "Pomodoro Timer — Click to open";
	} else {
		const phaseLabel = phase === "work" ? "Focus" : phase === "longBreak" ? "Long Break" : "Break";
		const stateLabel = state === "paused" ? " (paused)" : "";
		text = formatTime(secondsRemaining);
		tooltip = `${phaseLabel}${stateLabel} — ${pomodoroState.completedPomodoros} completed`;
	}

	api.ui.updateStatusBarItem("pomodoro.status", { text, tooltip });
}

function tick() {
	if (pomodoroState.state !== "running") return;

	pomodoroState.secondsRemaining--;

	if (pomodoroState.secondsRemaining <= 0) {
		onTimerComplete();
		return;
	}

	updateStatusBar();
	notifyListeners();
}

async function onTimerComplete() {
	if (!api) return;

	stopInterval();

	if (pomodoroState.phase === "work") {
		pomodoroState.completedPomodoros++;
		pomodoroState.sessionsUntilLongBreak--;

		// Persist count
		try {
			await api.storage.set("completedCount", String(pomodoroState.completedPomodoros));
		} catch { /* best effort */ }

		const msg = `Focus session complete! (${pomodoroState.completedPomodoros} total)`;
		api.ui.showToast(msg, { type: "success", duration: 4000 });

		if (showNotifications) {
			try {
				await api.notifications.send({ title: "Pomodoro Complete", body: "Time for a break!" });
			} catch { /* fallback already handled by toast */ }
		}

		// Start break
		if (pomodoroState.sessionsUntilLongBreak <= 0) {
			pomodoroState.sessionsUntilLongBreak = 4;
			setPhase("longBreak");
		} else {
			setPhase("break");
		}

		if (autoStartBreak) {
			startTimer();
		}
	} else {
		// Break ended
		const breakType = pomodoroState.phase === "longBreak" ? "Long break" : "Break";
		api.ui.showToast(`${breakType} is over! Time to focus.`, { type: "info", duration: 4000 });

		if (showNotifications) {
			try {
				await api.notifications.send({ title: "Break Over", body: "Ready to focus?" });
			} catch { /* best effort */ }
		}

		setPhase("work");

		if (autoStartWork) {
			startTimer();
		}
	}

	updateStatusBar();
	notifyListeners();
}

function setPhase(phase: TimerPhase) {
	pomodoroState.phase = phase;
	let duration: number;
	switch (phase) {
		case "work":
			duration = workDuration;
			break;
		case "break":
			duration = breakDuration;
			break;
		case "longBreak":
			duration = longBreakDuration;
			break;
		default:
			duration = workDuration;
	}
	pomodoroState.totalSeconds = duration * 60;
	pomodoroState.secondsRemaining = duration * 60;
	pomodoroState.state = "idle";
}

function stopInterval() {
	if (intervalId !== null) {
		clearInterval(intervalId);
		intervalId = null;
	}
}

export function startTimer() {
	if (pomodoroState.phase === "idle") {
		setPhase("work");
	}
	pomodoroState.state = "running";
	stopInterval();
	intervalId = setInterval(tick, 1000);
	updateStatusBar();
	notifyListeners();
}

export function pauseTimer() {
	if (pomodoroState.state !== "running") return;
	pomodoroState.state = "paused";
	stopInterval();
	updateStatusBar();
	notifyListeners();
}

export function resetTimer() {
	stopInterval();
	setPhase("work");
	pomodoroState.state = "idle";
	updateStatusBar();
	notifyListeners();
}

export function skipPhase() {
	stopInterval();
	onTimerComplete();
}

async function loadSettings() {
	if (!api) return;
	try {
		const all = await api.settings.getAll();
		workDuration = parseInt(String(all.workDuration), 10) || 25;
		breakDuration = parseInt(String(all.breakDuration), 10) || 5;
		longBreakDuration = parseInt(String(all.longBreakDuration), 10) || 15;
		autoStartBreak = all.autoStartBreak !== false;
		autoStartWork = all.autoStartWork === true;
		showNotifications = all.showNotifications !== false;
	} catch {
		// Use defaults
	}
}

export async function activate(pluginApi: HermesPluginAPI) {
	api = pluginApi;

	// Load persisted count
	try {
		const stored = await api.storage.get("completedCount");
		if (stored) pomodoroState.completedPomodoros = parseInt(stored, 10) || 0;
	} catch { /* ok */ }

	// Load settings
	await loadSettings();

	// Initialize timer with work duration
	pomodoroState.totalSeconds = workDuration * 60;
	pomodoroState.secondsRemaining = workDuration * 60;

	// Listen for settings changes
	api.subscriptions.push(
		api.settings.onDidChange("workDuration", (v) => {
			workDuration = parseInt(String(v), 10) || 25;
			if (pomodoroState.state === "idle" && pomodoroState.phase !== "break" && pomodoroState.phase !== "longBreak") {
				pomodoroState.totalSeconds = workDuration * 60;
				pomodoroState.secondsRemaining = workDuration * 60;
				updateStatusBar();
				notifyListeners();
			}
		})
	);
	api.subscriptions.push(
		api.settings.onDidChange("breakDuration", (v) => {
			breakDuration = parseInt(String(v), 10) || 5;
			if (pomodoroState.state === "idle" && pomodoroState.phase === "break") {
				pomodoroState.totalSeconds = breakDuration * 60;
				pomodoroState.secondsRemaining = breakDuration * 60;
				updateStatusBar();
				notifyListeners();
			}
		})
	);
	api.subscriptions.push(
		api.settings.onDidChange("longBreakDuration", (v) => {
			longBreakDuration = parseInt(String(v), 10) || 15;
			if (pomodoroState.state === "idle" && pomodoroState.phase === "longBreak") {
				pomodoroState.totalSeconds = longBreakDuration * 60;
				pomodoroState.secondsRemaining = longBreakDuration * 60;
				updateStatusBar();
				notifyListeners();
			}
		})
	);
	api.subscriptions.push(
		api.settings.onDidChange("autoStartBreak", (v) => { autoStartBreak = v === true; })
	);
	api.subscriptions.push(
		api.settings.onDidChange("autoStartWork", (v) => { autoStartWork = v === true; })
	);
	api.subscriptions.push(
		api.settings.onDidChange("showNotifications", (v) => { showNotifications = v !== false; })
	);

	// Register panel
	api.ui.registerPanel("pomodoro-panel", PomodoroPanel);

	// Register commands
	api.subscriptions.push(
		api.commands.register("pomodoro.start", () => startTimer())
	);
	api.subscriptions.push(
		api.commands.register("pomodoro.pause", () => pauseTimer())
	);
	api.subscriptions.push(
		api.commands.register("pomodoro.reset", () => resetTimer())
	);
	api.subscriptions.push(
		api.commands.register("pomodoro.openPanel", () => {
			api!.ui.showPanel("pomodoro-panel");
		})
	);

	updateStatusBar();
}

export function deactivate() {
	stopInterval();
	api = null;
	listeners.clear();
	pomodoroState = {
		phase: "idle",
		state: "idle",
		secondsRemaining: 25 * 60,
		totalSeconds: 25 * 60,
		completedPomodoros: 0,
		sessionsUntilLongBreak: 4,
	};
}
