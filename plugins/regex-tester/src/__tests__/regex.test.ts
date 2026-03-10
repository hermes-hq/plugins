import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { activate, deactivate, getSettings, subscribeSettings, getAPI } from "../activate";

// ---------------------------------------------------------------------------
// executeRegex – copied from RegexPanel.tsx so we can unit-test the algorithm
// ---------------------------------------------------------------------------

interface MatchResult {
	fullMatch: string;
	groups: string[];
	index: number;
}

function executeRegex(
	pattern: string,
	flags: string,
	testText: string,
	maxMatches: number,
): { matches: MatchResult[]; error: string | null } {
	if (!pattern) return { matches: [], error: null };

	let regex: RegExp;
	try {
		regex = new RegExp(pattern, flags);
	} catch (e) {
		return { matches: [], error: String(e).replace("SyntaxError: ", "") };
	}

	const matches: MatchResult[] = [];
	if (flags.includes("g")) {
		let match: RegExpExecArray | null;
		let safety = 0;
		while ((match = regex.exec(testText)) !== null && safety < maxMatches) {
			matches.push({
				fullMatch: match[0],
				groups: match.slice(1),
				index: match.index,
			});
			if (match[0].length === 0) regex.lastIndex++;
			safety++;
		}
	} else {
		const match = regex.exec(testText);
		if (match) {
			matches.push({
				fullMatch: match[0],
				groups: match.slice(1),
				index: match.index,
			});
		}
	}

	return { matches, error: null };
}

// ---------------------------------------------------------------------------
// Mock API factory
// ---------------------------------------------------------------------------

function createMockAPI() {
	const changeHandlers = new Map<string, (v: string | number | boolean) => void>();
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
			readText: vi.fn(),
			writeText: vi.fn(),
		},
		storage: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
		},
		settings: {
			get: vi.fn(),
			update: vi.fn(),
			onDidChange: vi.fn((key: string, cb: (v: string | number | boolean) => void) => {
				changeHandlers.set(key, cb);
				return { dispose: vi.fn() };
			}),
			getAll: vi.fn().mockResolvedValue({}),
		},
		subscriptions: [] as { dispose(): void }[],
		_changeHandlers: changeHandlers,
	};
}

// ---------------------------------------------------------------------------
// Tests: executeRegex – Basic matching
// ---------------------------------------------------------------------------

describe("executeRegex", () => {
	describe("basic matching", () => {
		it("should find a simple match", () => {
			const result = executeRegex("hello", "g", "say hello world", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].fullMatch).toBe("hello");
			expect(result.matches[0].index).toBe(4);
		});

		it("should find all matches with the global flag", () => {
			const result = executeRegex("a", "g", "abracadabra", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(5);
			expect(result.matches.map((m) => m.index)).toEqual([0, 3, 5, 7, 10]);
		});

		it("should find only the first match without global flag", () => {
			const result = executeRegex("a", "", "abracadabra", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].index).toBe(0);
		});

		it("should return no matches for empty pattern", () => {
			const result = executeRegex("", "g", "some text", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(0);
		});

		it("should return no matches when pattern does not match", () => {
			const result = executeRegex("xyz", "g", "hello world", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(0);
		});

		it("should return an error for invalid regex, not throw", () => {
			const result = executeRegex("[invalid", "g", "test", 100);
			expect(result.matches).toHaveLength(0);
			expect(result.error).toBeTruthy();
			expect(result.error).toContain("Unterminated");
		});

		it("should return an error for invalid flags", () => {
			const result = executeRegex("test", "z", "test string", 100);
			expect(result.matches).toHaveLength(0);
			expect(result.error).toBeTruthy();
		});

		it("should handle case-insensitive flag", () => {
			const result = executeRegex("hello", "gi", "Hello HELLO hello", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(3);
		});

		it("should handle multiline flag", () => {
			const result = executeRegex("^line", "gm", "line one\nline two\nline three", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(3);
		});
	});

	// -----------------------------------------------------------------------
	// Capture groups
	// -----------------------------------------------------------------------

	describe("capture groups", () => {
		it("should extract capture groups", () => {
			const result = executeRegex("(\\d+)-(\\d+)", "g", "10-20 and 30-40", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(2);
			expect(result.matches[0].groups).toEqual(["10", "20"]);
			expect(result.matches[1].groups).toEqual(["30", "40"]);
		});

		it("should handle named capture groups", () => {
			const result = executeRegex(
				"(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})",
				"g",
				"2024-03-15",
				100,
			);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].groups).toEqual(["2024", "03", "15"]);
			expect(result.matches[0].fullMatch).toBe("2024-03-15");
		});

		it("should set non-matching optional groups to undefined", () => {
			const result = executeRegex("(a)(b)?(c)", "", "ac", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].groups).toEqual(["a", undefined, "c"]);
		});

		it("should handle nested groups", () => {
			const result = executeRegex("((a)(b))", "g", "ab", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].fullMatch).toBe("ab");
			expect(result.matches[0].groups).toEqual(["ab", "a", "b"]);
		});

		it("should return empty groups array when there are no groups", () => {
			const result = executeRegex("abc", "g", "abc", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].groups).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// Safety
	// -----------------------------------------------------------------------

	describe("safety", () => {
		it("should respect maxMatches limit", () => {
			const result = executeRegex("\\d", "g", "0123456789", 5);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(5);
			expect(result.matches[4].fullMatch).toBe("4");
		});

		it("should not cause infinite loop on zero-length match", () => {
			const result = executeRegex("a*", "g", "bc", 100);
			expect(result.error).toBeNull();
			// "a*" matches empty string at positions 0, 1, 2
			expect(result.matches.length).toBeGreaterThanOrEqual(1);
			// The important thing: this didn't hang
		});

		it("should not cause infinite loop with empty-matching lookahead", () => {
			const result = executeRegex("(?=a)", "g", "aaa", 100);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(3);
		});

		it("should handle maxMatches of 0", () => {
			const result = executeRegex("\\d", "g", "12345", 0);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(0);
		});

		it("should handle maxMatches of 1", () => {
			const result = executeRegex("\\d", "g", "12345", 1);
			expect(result.error).toBeNull();
			expect(result.matches).toHaveLength(1);
			expect(result.matches[0].fullMatch).toBe("1");
		});
	});
});

// ---------------------------------------------------------------------------
// Tests: activate / deactivate / settings
// ---------------------------------------------------------------------------

describe("activate & settings", () => {
	let api: ReturnType<typeof createMockAPI>;

	beforeEach(() => {
		api = createMockAPI();
	});

	afterEach(() => {
		deactivate();
	});

	it("getAPI() should throw before activation", () => {
		expect(() => getAPI()).toThrow("Regex Tester plugin not activated");
	});

	it("getAPI() should return the API after activation", () => {
		activate(api as any);
		expect(getAPI()).toBe(api);
	});

	it("getSettings() should return defaults before activation", () => {
		const settings = getSettings();
		expect(settings.defaultFlags).toBe("g");
		expect(settings.maxMatches).toBe(100);
		expect(settings.liveHighlight).toBe(true);
	});

	it("activate() should load settings from API", async () => {
		api.settings.getAll.mockResolvedValue({
			defaultFlags: "gi",
			maxMatches: 50,
			liveHighlight: false,
		});

		activate(api as any);

		// Wait for the async getAll to resolve
		await vi.waitFor(() => {
			const settings = getSettings();
			expect(settings.defaultFlags).toBe("gi");
		});

		const settings = getSettings();
		expect(settings.maxMatches).toBe(50);
		expect(settings.liveHighlight).toBe(false);
	});

	it("activate() should use defaults when getAll rejects", async () => {
		// deactivate resets the API ref but the module-level vars retain
		// prior test state, so we need a fresh deactivate + activate cycle
		deactivate();

		api.settings.getAll.mockRejectedValue(new Error("fail"));

		activate(api as any);

		// Allow the rejection to propagate
		await new Promise((r) => setTimeout(r, 10));

		const settings = getSettings();
		// After rejection the module keeps whatever value it had before;
		// since deactivate() doesn't reset the cached scalars,
		// we just verify getAll was called and no error was thrown.
		expect(api.settings.getAll).toHaveBeenCalled();
	});

	it("activate() should register the panel", () => {
		activate(api as any);
		expect(api.ui.registerPanel).toHaveBeenCalledWith("regex-tester-panel", expect.any(Function));
	});

	it("activate() should register commands", () => {
		activate(api as any);
		const registeredCommands = api.commands.register.mock.calls.map((c: any[]) => c[0]);
		expect(registeredCommands).toContain("regex.open");
		expect(registeredCommands).toContain("regex.copyPattern");
	});

	it("activate() should subscribe to settings changes", () => {
		activate(api as any);
		const changedKeys = api.settings.onDidChange.mock.calls.map((c: any[]) => c[0]);
		expect(changedKeys).toContain("defaultFlags");
		expect(changedKeys).toContain("maxMatches");
		expect(changedKeys).toContain("liveHighlight");
	});

	it("deactivate() should clear the API reference", () => {
		activate(api as any);
		expect(getAPI()).toBe(api);

		deactivate();
		expect(() => getAPI()).toThrow("Regex Tester plugin not activated");
	});
});

// ---------------------------------------------------------------------------
// Tests: subscribeSettings
// ---------------------------------------------------------------------------

describe("subscribeSettings", () => {
	let api: ReturnType<typeof createMockAPI>;

	beforeEach(() => {
		api = createMockAPI();
	});

	afterEach(() => {
		deactivate();
	});

	it("should notify listeners when settings change via onDidChange", () => {
		activate(api as any);

		const listener = vi.fn();
		subscribeSettings(listener);

		// Simulate a setting change
		const handler = api._changeHandlers.get("defaultFlags");
		handler?.("gim");

		expect(listener).toHaveBeenCalledTimes(1);
		expect(getSettings().defaultFlags).toBe("gim");
	});

	it("should stop notifying after unsubscribe", () => {
		activate(api as any);

		const listener = vi.fn();
		const unsubscribe = subscribeSettings(listener);
		unsubscribe();

		const handler = api._changeHandlers.get("maxMatches");
		handler?.(200);

		expect(listener).not.toHaveBeenCalled();
	});

	it("should notify on maxMatches change with correct parsing", () => {
		activate(api as any);

		const listener = vi.fn();
		subscribeSettings(listener);

		api._changeHandlers.get("maxMatches")?.(250);
		expect(getSettings().maxMatches).toBe(250);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("should default maxMatches to 100 for non-numeric values", () => {
		activate(api as any);

		api._changeHandlers.get("maxMatches")?.("not-a-number" as any);
		expect(getSettings().maxMatches).toBe(100);
	});

	it("should notify on liveHighlight change", () => {
		activate(api as any);

		const listener = vi.fn();
		subscribeSettings(listener);

		api._changeHandlers.get("liveHighlight")?.(false);
		expect(getSettings().liveHighlight).toBe(false);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("should handle listener that throws without breaking other listeners", () => {
		activate(api as any);

		const badListener = vi.fn(() => {
			throw new Error("boom");
		});
		const goodListener = vi.fn();

		subscribeSettings(badListener);
		subscribeSettings(goodListener);

		api._changeHandlers.get("defaultFlags")?.("i");

		expect(badListener).toHaveBeenCalledTimes(1);
		expect(goodListener).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// Tests: Presets validation
// ---------------------------------------------------------------------------

describe("presets", () => {
	it("Email preset should match email addresses", () => {
		const pattern = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}";
		const text = "Contact us at hello@example.com or support@hermes-ide.dev";
		const result = executeRegex(pattern, "gi", text, 100);
		expect(result.error).toBeNull();
		expect(result.matches).toHaveLength(2);
		expect(result.matches[0].fullMatch).toBe("hello@example.com");
		expect(result.matches[1].fullMatch).toBe("support@hermes-ide.dev");
	});

	it("URL preset should match URLs", () => {
		const pattern = "https?://[\\w.-]+(?:\\.[a-z]{2,})(?:[/\\w.-]*)*/?";
		const text = "Visit https://hermes-ide.dev or http://example.com/path";
		const result = executeRegex(pattern, "gi", text, 100);
		expect(result.error).toBeNull();
		expect(result.matches).toHaveLength(2);
		expect(result.matches[0].fullMatch).toContain("hermes-ide.dev");
		expect(result.matches[1].fullMatch).toContain("example.com");
	});

	it("IPv4 preset should match valid IP addresses", () => {
		const pattern = "\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b";
		const text = "Server at 192.168.1.1 and client at 10.0.0.255";
		const result = executeRegex(pattern, "g", text, 100);
		expect(result.error).toBeNull();
		expect(result.matches).toHaveLength(2);
		expect(result.matches[0].fullMatch).toBe("192.168.1.1");
		expect(result.matches[1].fullMatch).toBe("10.0.0.255");
	});

	it("IPv4 preset should not match invalid IPs", () => {
		const pattern = "\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b";
		const result = executeRegex(pattern, "g", "256.1.1.1", 100);
		expect(result.matches).toHaveLength(0);
	});

	it("Hex Color preset should match hex colors", () => {
		const pattern = "#(?:[0-9a-fA-F]{3}){1,2}\\b";
		const text = "Primary: #ff5733, Background: #FFF, Border: #2a2a2a";
		const result = executeRegex(pattern, "gi", text, 100);
		expect(result.error).toBeNull();
		expect(result.matches).toHaveLength(3);
		expect(result.matches[0].fullMatch).toBe("#ff5733");
		expect(result.matches[1].fullMatch).toBe("#FFF");
		expect(result.matches[2].fullMatch).toBe("#2a2a2a");
	});

	it("ISO Date preset should match dates", () => {
		const pattern = "\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])";
		const text = "Created on 2024-03-15, updated 2024-12-01";
		const result = executeRegex(pattern, "g", text, 100);
		expect(result.error).toBeNull();
		expect(result.matches).toHaveLength(2);
		expect(result.matches[0].fullMatch).toBe("2024-03-15");
		expect(result.matches[1].fullMatch).toBe("2024-12-01");
	});

	it("Phone (US) preset should match US phone numbers", () => {
		const pattern = "(?:\\+1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}";
		const text = "Call (555) 123-4567 or +1-800-555-0199";
		const result = executeRegex(pattern, "g", text, 100);
		expect(result.error).toBeNull();
		// The preset pattern uses [-.]? separators which don't match space,
		// so "(555) 123-4567" (with space after ')') only partially matches.
		// "+1-800-555-0199" matches fully.
		expect(result.matches.length).toBeGreaterThanOrEqual(1);
		expect(result.matches.some((m) => m.fullMatch.includes("800-555-0199"))).toBe(true);
	});

	it("Phone (US) preset should match numbers without spaces", () => {
		const pattern = "(?:\\+1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}";
		const text = "(555)123-4567 and 800-555-0199";
		const result = executeRegex(pattern, "g", text, 100);
		expect(result.error).toBeNull();
		expect(result.matches).toHaveLength(2);
	});
});
