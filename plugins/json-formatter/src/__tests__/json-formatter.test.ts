import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	activate,
	deactivate,
	getAPI,
	getSettings,
	formatWithSettings,
	onSettingsChanged,
} from "../activate";

vi.mock("react", () => ({}));
vi.mock("../JsonFormatterPanel", () => ({
	JsonFormatterPanel: () => null,
}));

// ─── Mock API ────────────────────────────────────────────────────────

type SettingsChangeCb = (newValue: string | number | boolean) => void;

function createMockAPI(overrides?: {
	settings?: Record<string, unknown>;
}) {
	const settingsValues: Record<string, unknown> = {
		indentSize: "2",
		sortKeys: false,
		maxDepth: 0,
		...overrides?.settings,
	};
	const changeListeners = new Map<string, SettingsChangeCb[]>();

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
		clipboard: {
			readText: vi.fn().mockResolvedValue("{}"),
			writeText: vi.fn().mockResolvedValue(undefined),
		},
		storage: {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
		},
		settings: {
			get: vi.fn((key: string) => Promise.resolve(settingsValues[key])),
			update: vi.fn().mockResolvedValue(undefined),
			onDidChange: vi.fn((key: string, cb: SettingsChangeCb) => {
				if (!changeListeners.has(key)) changeListeners.set(key, []);
				changeListeners.get(key)!.push(cb);
				return { dispose: vi.fn() };
			}),
			getAll: vi.fn().mockResolvedValue(settingsValues),
		},
		subscriptions: [] as { dispose: () => void }[],
		// Test helper to simulate a setting change
		_simulateChange(key: string, value: string | number | boolean) {
			(changeListeners.get(key) || []).forEach((cb) => cb(value));
		},
	};
}

beforeEach(() => {
	deactivate();
});

// ─── Settings loading ────────────────────────────────────────────────

describe("settings loading", () => {
	it("loads default settings on activate", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(api.settings.getAll).toHaveBeenCalled();
		const s = getSettings();
		expect(s.indentSize).toBe(2);
		expect(s.sortKeys).toBe(false);
		expect(s.maxDepth).toBe(0);
	});

	it("loads custom settings from API", async () => {
		const api = createMockAPI({
			settings: { indentSize: "4", sortKeys: true, maxDepth: 10 },
		});
		await activate(api as never);
		const s = getSettings();
		expect(s.indentSize).toBe(4);
		expect(s.sortKeys).toBe(true);
		expect(s.maxDepth).toBe(10);
	});

	it("falls back to defaults if getAll fails", async () => {
		const api = createMockAPI();
		api.settings.getAll.mockRejectedValue(new Error("fail"));
		await activate(api as never);
		const s = getSettings();
		expect(s.indentSize).toBe(2);
		expect(s.sortKeys).toBe(false);
		expect(s.maxDepth).toBe(0);
	});
});

// ─── Settings change listeners ───────────────────────────────────────

describe("settings change listeners", () => {
	it("registers onDidChange for all three settings", async () => {
		const api = createMockAPI();
		await activate(api as never);
		const keys = api.settings.onDidChange.mock.calls.map((c: [string, SettingsChangeCb]) => c[0]);
		expect(keys).toContain("indentSize");
		expect(keys).toContain("sortKeys");
		expect(keys).toContain("maxDepth");
	});

	it("updates indentSize on change", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(getSettings().indentSize).toBe(2);
		api._simulateChange("indentSize", "4");
		expect(getSettings().indentSize).toBe(4);
	});

	it("updates sortKeys on change", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(getSettings().sortKeys).toBe(false);
		api._simulateChange("sortKeys", true);
		expect(getSettings().sortKeys).toBe(true);
	});

	it("updates maxDepth on change", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(getSettings().maxDepth).toBe(0);
		api._simulateChange("maxDepth", 5);
		expect(getSettings().maxDepth).toBe(5);
	});

	it("notifies component listeners on change", async () => {
		const api = createMockAPI();
		await activate(api as never);
		const cb = vi.fn();
		onSettingsChanged(cb);
		api._simulateChange("indentSize", "4");
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("unsubscribe stops notifications", async () => {
		const api = createMockAPI();
		await activate(api as never);
		const cb = vi.fn();
		const unsub = onSettingsChanged(cb);
		unsub();
		api._simulateChange("indentSize", "4");
		expect(cb).not.toHaveBeenCalled();
	});
});

// ─── formatWithSettings ──────────────────────────────────────────────

describe("formatWithSettings", () => {
	it("formats with default 2-space indent", async () => {
		const api = createMockAPI();
		await activate(api as never);
		const result = formatWithSettings({ a: 1 });
		expect(result).toBe('{\n  "a": 1\n}');
	});

	it("formats with 4-space indent", async () => {
		const api = createMockAPI({ settings: { indentSize: "4" } });
		await activate(api as never);
		const result = formatWithSettings({ a: 1 });
		expect(result).toBe('{\n    "a": 1\n}');
	});

	it("formats with 1-space indent", async () => {
		const api = createMockAPI({ settings: { indentSize: "1" } });
		await activate(api as never);
		const result = formatWithSettings({ a: 1 });
		expect(result).toBe('{\n "a": 1\n}');
	});

	it("sorts keys when sortKeys is true", async () => {
		const api = createMockAPI({ settings: { sortKeys: true } });
		await activate(api as never);
		const result = formatWithSettings({ c: 3, a: 1, b: 2 });
		const parsed = JSON.parse(result);
		expect(Object.keys(parsed)).toEqual(["a", "b", "c"]);
	});

	it("does not sort keys when sortKeys is false", async () => {
		const api = createMockAPI({ settings: { sortKeys: false } });
		await activate(api as never);
		const result = formatWithSettings({ c: 3, a: 1, b: 2 });
		const parsed = JSON.parse(result);
		expect(Object.keys(parsed)).toEqual(["c", "a", "b"]);
	});

	it("sorts keys recursively in nested objects", async () => {
		const api = createMockAPI({ settings: { sortKeys: true } });
		await activate(api as never);
		const result = formatWithSettings({ z: { b: 2, a: 1 }, a: 1 });
		const parsed = JSON.parse(result);
		expect(Object.keys(parsed)).toEqual(["a", "z"]);
		expect(Object.keys(parsed.z)).toEqual(["a", "b"]);
	});

	it("sorts keys in arrays of objects", async () => {
		const api = createMockAPI({ settings: { sortKeys: true } });
		await activate(api as never);
		const result = formatWithSettings([{ b: 2, a: 1 }]);
		const parsed = JSON.parse(result);
		expect(Object.keys(parsed[0])).toEqual(["a", "b"]);
	});

	it("truncates at maxDepth when set", async () => {
		const api = createMockAPI({ settings: { maxDepth: 1 } });
		await activate(api as never);
		const result = formatWithSettings({ a: { b: { c: 1 } } });
		expect(result).toContain("{Object(1)}");
	});

	it("does not truncate when maxDepth is 0 (unlimited)", async () => {
		const api = createMockAPI({ settings: { maxDepth: 0 } });
		await activate(api as never);
		const result = formatWithSettings({ a: { b: { c: 1 } } });
		expect(result).not.toContain("Object");
		expect(result).toContain('"c": 1');
	});

	it("truncates arrays at maxDepth", async () => {
		const api = createMockAPI({ settings: { maxDepth: 1 } });
		await activate(api as never);
		const result = formatWithSettings({ arr: [1, 2, 3] });
		expect(result).toContain("[Array(3)]");
	});

	it("leaves primitives untouched at any depth", async () => {
		const api = createMockAPI({ settings: { maxDepth: 1 } });
		await activate(api as never);
		const result = formatWithSettings({ str: "hello", num: 42, bool: true });
		const parsed = JSON.parse(result);
		expect(parsed.str).toBe("hello");
		expect(parsed.num).toBe(42);
		expect(parsed.bool).toBe(true);
	});

	it("combines sortKeys and maxDepth", async () => {
		const api = createMockAPI({ settings: { sortKeys: true, maxDepth: 1 } });
		await activate(api as never);
		const result = formatWithSettings({ z: { deep: true }, a: 1 });
		const parsed = JSON.parse(result);
		expect(Object.keys(parsed)).toEqual(["a", "z"]);
		expect(parsed.z).toBe("{Object(1)}");
	});

	it("handles empty object", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(formatWithSettings({})).toBe("{}");
	});

	it("handles empty array", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(formatWithSettings([])).toBe("[]");
	});

	it("handles null", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(formatWithSettings(null)).toBe("null");
	});

	it("handles string value", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(formatWithSettings("hello")).toBe('"hello"');
	});

	it("handles number value", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(formatWithSettings(42)).toBe("42");
	});

	it("reflects runtime settings change in format output", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(formatWithSettings({ a: 1 })).toBe('{\n  "a": 1\n}');
		api._simulateChange("indentSize", "4");
		expect(formatWithSettings({ a: 1 })).toBe('{\n    "a": 1\n}');
	});
});

// ─── Commands ────────────────────────────────────────────────────────

describe("command registration", () => {
	it("registers all four commands", async () => {
		const api = createMockAPI();
		await activate(api as never);
		const registered = api.commands.register.mock.calls.map((c: [string, () => void]) => c[0]);
		expect(registered).toContain("json-formatter.openPanel");
		expect(registered).toContain("json-formatter.format");
		expect(registered).toContain("json-formatter.minify");
		expect(registered).toContain("json-formatter.validate");
	});

	it("registers panel", async () => {
		const api = createMockAPI();
		await activate(api as never);
		expect(api.ui.registerPanel).toHaveBeenCalledWith("json-formatter-panel", expect.any(Function));
	});
});

// ─── Format command with settings ────────────────────────────────────

describe("format command", () => {
	it("uses settings for clipboard format", async () => {
		const api = createMockAPI({ settings: { indentSize: "4", sortKeys: true } });
		api.clipboard.readText.mockResolvedValue('{"b":2,"a":1}');
		await activate(api as never);

		// Find and call the format command handler
		const formatCall = api.commands.register.mock.calls.find(
			(c: [string, () => Promise<void>]) => c[0] === "json-formatter.format"
		);
		expect(formatCall).toBeDefined();
		await formatCall![1]();

		expect(api.clipboard.writeText).toHaveBeenCalled();
		const written = api.clipboard.writeText.mock.calls[0][0];
		const parsed = JSON.parse(written);
		expect(Object.keys(parsed)).toEqual(["a", "b"]); // sorted
		expect(written).toContain("    "); // 4-space indent
	});

	it("shows error toast for invalid JSON", async () => {
		const api = createMockAPI();
		api.clipboard.readText.mockResolvedValue("not json");
		await activate(api as never);

		const formatCall = api.commands.register.mock.calls.find(
			(c: [string, () => Promise<void>]) => c[0] === "json-formatter.format"
		);
		await formatCall![1]();
		expect(api.ui.showToast).toHaveBeenCalledWith(
			"Clipboard does not contain valid JSON",
			{ type: "error" }
		);
	});
});

// ─── Deactivate ──────────────────────────────────────────────────────

describe("deactivate", () => {
	it("clears API reference", async () => {
		const api = createMockAPI();
		await activate(api as never);
		deactivate();
		expect(() => getAPI()).toThrow("JSON Formatter plugin not activated");
	});

	it("clears settings listeners on deactivate", async () => {
		const api = createMockAPI();
		await activate(api as never);
		const cb = vi.fn();
		onSettingsChanged(cb);
		deactivate();
		// After deactivate, re-activate and change — old listener shouldn't fire
		await activate(api as never);
		api._simulateChange("indentSize", "4");
		expect(cb).not.toHaveBeenCalled();
	});
});

// ─── Manifest validation ─────────────────────────────────────────────

describe("manifest settings schema", () => {
	it("has valid settings in hermes-plugin.json", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const manifestPath = path.resolve(__dirname, "../../hermes-plugin.json");
		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

		expect(manifest.contributes.settings).toBeDefined();
		const settings = manifest.contributes.settings;

		// indentSize
		expect(settings.indentSize.type).toBe("select");
		expect(settings.indentSize.default).toBe("2");
		expect(settings.indentSize.options.length).toBeGreaterThanOrEqual(3);

		// sortKeys
		expect(settings.sortKeys.type).toBe("boolean");
		expect(settings.sortKeys.default).toBe(false);

		// maxDepth
		expect(settings.maxDepth.type).toBe("number");
		expect(settings.maxDepth.default).toBe(0);
		expect(settings.maxDepth.min).toBe(0);
		expect(settings.maxDepth.max).toBe(100);
	});
});
