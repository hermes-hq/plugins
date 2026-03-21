import * as React from "react";
import { getAPI, getSettings, subscribeSettings, type RegexSettings } from "./activate";

interface MatchResult {
	fullMatch: string;
	groups: string[];
	index: number;
}

const PRESETS: { label: string; pattern: string; flags: string; testText: string }[] = [
	{ label: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", flags: "gi", testText: "Contact us at hello@example.com or support@hermes-ide.dev" },
	{ label: "URL", pattern: "https?://[\\w.-]+(?:\\.[a-z]{2,})(?:[/\\w.-]*)*/?", flags: "gi", testText: "Visit https://hermes-ide.dev or http://example.com/path" },
	{ label: "IPv4", pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b", flags: "g", testText: "Server at 192.168.1.1 and client at 10.0.0.255" },
	{ label: "ISO Date", pattern: "\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])", flags: "g", testText: "Created on 2024-03-15, updated 2024-12-01" },
	{ label: "Hex Color", pattern: "#(?:[0-9a-fA-F]{3}){1,2}\\b", flags: "gi", testText: "Primary: #ff5733, Background: #FFF, Border: #2a2a2a" },
	{ label: "Phone (US)", pattern: "(?:\\+1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}", flags: "g", testText: "Call (555) 123-4567 or +1-800-555-0199" },
];

const s = {
	root: {
		display: "flex",
		flexDirection: "column" as const,
		height: "100%",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-lg)",
		color: "var(--text-0)",
		overflow: "hidden",
	},
	section: {
		padding: "8px 12px",
		borderBottom: "1px solid var(--border)",
		display: "flex",
		flexDirection: "column" as const,
		gap: "6px",
		flexShrink: 0,
	},
	row: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
	},
	label: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		fontWeight: 600,
		textTransform: "uppercase" as const,
		letterSpacing: "0.3px",
	},
	patternInput: {
		flex: 1,
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-lg)",
		padding: "6px 8px",
		outline: "none",
		boxSizing: "border-box" as const,
		width: "100%",
	},
	flagsInput: {
		width: "50px",
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--accent)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-base)",
		padding: "6px 6px",
		outline: "none",
		textAlign: "center" as const,
	},
	textarea: {
		width: "100%",
		minHeight: "80px",
		maxHeight: "200px",
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-lg)",
		padding: "8px",
		outline: "none",
		resize: "vertical" as const,
		lineHeight: 1.5,
		boxSizing: "border-box" as const,
	},
	presetBtn: {
		background: "var(--bg-3)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-2)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-sm)",
		padding: "2px 6px",
		cursor: "pointer" as const,
		whiteSpace: "nowrap" as const,
	},
	copyBtn: {
		background: "var(--bg-3)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-2)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-sm)",
		padding: "2px 8px",
		cursor: "pointer" as const,
	},
	results: {
		flex: 1,
		overflow: "auto" as const,
		padding: "8px 12px",
		display: "flex",
		flexDirection: "column" as const,
		gap: "8px",
	},
	matchCount: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		fontWeight: 600,
	},
	highlightArea: {
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-base)",
		lineHeight: 1.6,
		color: "var(--text-1)",
		wordBreak: "break-all" as const,
		whiteSpace: "pre-wrap" as const,
	},
	highlight: {
		background: "var(--accent-dim, rgba(99,102,241,0.2))",
		color: "var(--accent)",
		borderRadius: "2px",
		padding: "0 1px",
	},
	groupsContainer: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "4px",
	},
	groupTitle: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		fontWeight: 600,
		textTransform: "uppercase" as const,
		letterSpacing: "0.3px",
		marginTop: "4px",
	},
	groupRow: {
		fontSize: "var(--text-base)",
		color: "var(--text-1)",
		fontFamily: "var(--font-mono)",
		padding: "2px 6px",
		background: "var(--bg-2)",
		borderRadius: "var(--radius-sm)",
		display: "flex",
		gap: "8px",
	},
	groupIndex: {
		color: "var(--text-3)",
		minWidth: "30px",
	},
	error: {
		fontSize: "var(--text-base)",
		color: "var(--red, #f87171)",
		padding: "6px 8px",
		background: "var(--red-dim, rgba(248,113,113,0.1))",
		borderRadius: "var(--radius-sm)",
		lineHeight: 1.4,
	},
	empty: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		color: "var(--text-3)",
		fontSize: "var(--text-md)",
	},
	footer: {
		padding: "4px 12px",
		borderTop: "1px solid var(--border)",
		flexShrink: 0,
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		display: "flex",
		justifyContent: "space-between",
	},
};

function executeRegex(pattern: string, flags: string, testText: string, maxMatches: number): { matches: MatchResult[]; error: string | null } {
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

function HighlightedText({ text, matches }: { text: string; matches: MatchResult[] }) {
	if (matches.length === 0) {
		return React.createElement("div", { style: s.highlightArea }, text);
	}

	const parts: React.ReactNode[] = [];
	let lastIndex = 0;

	for (let i = 0; i < matches.length; i++) {
		const m = matches[i];
		if (m.index > lastIndex) {
			parts.push(text.slice(lastIndex, m.index));
		}
		parts.push(
			React.createElement("span", { key: i, style: s.highlight }, m.fullMatch)
		);
		lastIndex = m.index + m.fullMatch.length;
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return React.createElement("div", { style: s.highlightArea }, ...parts);
}

export function RegexPanel() {
	const [settings, setSettings] = React.useState<RegexSettings>(getSettings);
	const [pattern, setPattern] = React.useState("");
	const [flags, setFlags] = React.useState(settings.defaultFlags);
	const [testText, setTestText] = React.useState("");

	React.useEffect(() => {
		return subscribeSettings(() => {
			const newSettings = getSettings();
			setSettings(newSettings);
		});
	}, []);

	// Initialize flags from settings
	React.useEffect(() => {
		if (!flags) setFlags(settings.defaultFlags);
	}, [settings.defaultFlags]);

	const { matches, error } = React.useMemo(
		() => settings.liveHighlight || !pattern
			? executeRegex(pattern, flags, testText, settings.maxMatches)
			: { matches: [] as MatchResult[], error: null },
		[pattern, flags, testText, settings.maxMatches, settings.liveHighlight]
	);

	const hasGroups = matches.some(m => m.groups.length > 0);

	const handleCopyPattern = React.useCallback(async () => {
		try {
			const api = getAPI();
			const full = `/${pattern}/${flags}`;
			await api.clipboard.writeText(full);
			api.ui.showToast("Pattern copied", { type: "success", duration: 1500 });
		} catch { /* ignore */ }
	}, [pattern, flags]);

	const handlePreset = React.useCallback((preset: typeof PRESETS[0]) => {
		setPattern(preset.pattern);
		setFlags(preset.flags);
		setTestText(preset.testText);
	}, []);

	return React.createElement("div", { style: s.root },
		// Pattern section
		React.createElement("div", { style: s.section },
			React.createElement("span", { style: s.label }, "Pattern"),
			React.createElement("div", { style: s.row },
				React.createElement("input", {
					style: s.patternInput,
					value: pattern,
					onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPattern(e.target.value),
					placeholder: "Enter regex pattern...",
					spellCheck: false,
				}),
				React.createElement("input", {
					style: s.flagsInput,
					value: flags,
					onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFlags(e.target.value),
					placeholder: "g",
					title: "Flags (g, i, m, s, u, y)",
					maxLength: 6,
				}),
				React.createElement("button", {
					style: s.copyBtn,
					onClick: handleCopyPattern,
					title: "Copy regex pattern",
				}, "Copy"),
			),
			// Presets
			React.createElement("div", { style: { ...s.row, flexWrap: "wrap" as const } },
				React.createElement("span", { style: { ...s.label, marginRight: "2px" } }, "Presets:"),
				...PRESETS.map((preset) =>
					React.createElement("button", {
						key: preset.label,
						style: s.presetBtn,
						onClick: () => handlePreset(preset),
					}, preset.label)
				),
			),
		),

		// Test string section
		React.createElement("div", { style: s.section },
			React.createElement("span", { style: s.label }, "Test String"),
			React.createElement("textarea", {
				style: s.textarea,
				value: testText,
				onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setTestText(e.target.value),
				placeholder: "Enter text to test against...",
				spellCheck: false,
			}),
		),

		// Results
		React.createElement("div", { style: s.results },
			error
				? React.createElement("div", { style: s.error }, error)
				: !pattern
					? React.createElement("div", { style: s.empty }, "Enter a pattern to start matching")
					: React.createElement(React.Fragment, null,
						React.createElement("div", { style: s.matchCount },
							`${matches.length} match${matches.length !== 1 ? "es" : ""}${matches.length >= settings.maxMatches ? ` (limited to ${settings.maxMatches})` : ""}`
						),
						testText && React.createElement(HighlightedText, { text: testText, matches }),
						hasGroups && React.createElement("div", { style: s.groupsContainer },
							React.createElement("span", { style: s.groupTitle }, "Capture Groups"),
							...matches.flatMap((m, mi) =>
								m.groups.map((g, gi) =>
									React.createElement("div", { key: `${mi}-${gi}`, style: s.groupRow },
										React.createElement("span", { style: s.groupIndex }, `Match ${mi + 1}, Group ${gi + 1}:`),
										React.createElement("span", null, g ?? "(undefined)"),
									)
								)
							)
						),
					),
		),

		// Footer
		React.createElement("div", { style: s.footer },
			React.createElement("span", null, `Flags: ${flags || "(none)"}`),
			React.createElement("span", null, pattern ? `/${pattern}/${flags}` : ""),
		),
	);
}
