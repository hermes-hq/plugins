import * as React from "react";
import {
	generatePassword,
	generatePassphrase,
	generateApiKey,
	estimateStrength,
	type PasswordOptions,
	type PassphraseOptions,
	type ApiKeyOptions,
} from "./generator";
import { WORDLIST } from "./wordlist";
import { getAPI } from "./activate";

type Mode = "password" | "passphrase" | "apikey";

const CLEAR_OPTIONS = [
	{ value: 0, label: "Never" },
	{ value: 15, label: "15s" },
	{ value: 30, label: "30s" },
	{ value: 60, label: "60s" },
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
	tabs: {
		display: "flex",
		borderBottom: "1px solid var(--border)",
		flexShrink: 0,
	},
	tab: {
		flex: 1,
		padding: "8px 6px",
		textAlign: "center" as const,
		fontSize: "var(--text-base)",
		fontWeight: 600,
		color: "var(--text-2)",
		background: "transparent",
		border: "none",
		borderBottom: "2px solid transparent",
		cursor: "pointer" as const,
	},
	tabActive: {
		color: "var(--text-0)",
		borderBottom: "2px solid var(--accent, var(--blue))",
	},
	body: {
		padding: "10px 12px",
		display: "flex",
		flexDirection: "column" as const,
		gap: "8px",
		overflow: "auto" as const,
		flex: 1,
	},
	row: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
	},
	label: {
		fontSize: "var(--text-base)",
		color: "var(--text-2)",
		fontWeight: 600,
		textTransform: "uppercase" as const,
		letterSpacing: "0.3px",
		minWidth: "58px",
	},
	select: {
		flex: 1,
		minWidth: 0,
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-lg)",
		padding: "5px 8px",
		outline: "none",
		cursor: "pointer" as const,
	},
	input: {
		flex: 1,
		minWidth: 0,
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-lg)",
		padding: "5px 8px",
		outline: "none",
	},
	range: {
		flex: 1,
	},
	checkRow: {
		display: "flex",
		flexWrap: "wrap" as const,
		gap: "10px",
		paddingLeft: "58px",
	},
	checkLabel: {
		display: "flex",
		alignItems: "center",
		gap: "5px",
		fontSize: "var(--text-base)",
		color: "var(--text-1)",
		cursor: "pointer" as const,
	},
	output: {
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		padding: "10px",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-lg)",
		color: "var(--text-0)",
		wordBreak: "break-all" as const,
		minHeight: "1.6em",
		cursor: "pointer" as const,
	},
	btnRow: {
		display: "flex",
		gap: "6px",
	},
	btn: {
		flex: 1,
		background: "var(--accent, var(--blue))",
		border: "none",
		borderRadius: "var(--radius)",
		color: "#fff",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-md)",
		fontWeight: 600,
		padding: "7px 12px",
		cursor: "pointer" as const,
	},
	btnSecondary: {
		flex: 0,
		background: "var(--bg-3)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-2)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-md)",
		fontWeight: 500,
		padding: "7px 12px",
		cursor: "pointer" as const,
		whiteSpace: "nowrap" as const,
	},
	meterTrack: {
		height: "5px",
		borderRadius: "3px",
		background: "var(--bg-3)",
		overflow: "hidden" as const,
	},
	meterFill: (score: number, label: string) => ({
		height: "100%",
		width: `${Math.round(score * 100)}%`,
		borderRadius: "3px",
		transition: "width 0.15s",
		background:
			label === "Very weak" || label === "Weak"
				? "var(--red, #e5534b)"
				: label === "Fair"
					? "var(--yellow, #d9a441)"
					: "var(--green, #3fb950)",
	}),
	meterLabel: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		display: "flex",
		justifyContent: "space-between" as const,
	},
	clearNote: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		textAlign: "center" as const,
	},
};

export function PasswordGeneratorPanel() {
	const [mode, setMode] = React.useState<Mode>("password");
	const [value, setValue] = React.useState("");
	const [copied, setCopied] = React.useState(false);

	// Password options
	const [pwLength, setPwLength] = React.useState(16);
	const [pwLower, setPwLower] = React.useState(true);
	const [pwUpper, setPwUpper] = React.useState(true);
	const [pwDigits, setPwDigits] = React.useState(true);
	const [pwSymbols, setPwSymbols] = React.useState(true);
	const [pwExcludeAmbiguous, setPwExcludeAmbiguous] = React.useState(false);

	// Passphrase options
	const [ppWordCount, setPpWordCount] = React.useState(4);
	const [ppSeparator, setPpSeparator] = React.useState("-");
	const [ppCapitalize, setPpCapitalize] = React.useState(true);
	const [ppIncludeNumber, setPpIncludeNumber] = React.useState(false);

	// API key options
	const [akPrefix, setAkPrefix] = React.useState("sk_live");
	const [akLength, setAkLength] = React.useState(32);

	// Clipboard auto-clear
	const [clearAfter, setClearAfter] = React.useState(30);
	const [clearCountdown, setClearCountdown] = React.useState<number | null>(null);
	const clearTimerRef = React.useRef<number | null>(null);
	const countdownRef = React.useRef<number | null>(null);
	const lastCopiedRef = React.useRef<string>("");

	const clearPendingTimers = React.useCallback(() => {
		if (clearTimerRef.current !== null) { clearTimeout(clearTimerRef.current); clearTimerRef.current = null; }
		if (countdownRef.current !== null) { clearInterval(countdownRef.current); countdownRef.current = null; }
		setClearCountdown(null);
	}, []);

	const generate = React.useCallback(() => {
		let next = "";
		if (mode === "password") {
			const opts: PasswordOptions = {
				length: pwLength,
				lower: pwLower,
				upper: pwUpper,
				digits: pwDigits,
				symbols: pwSymbols,
				excludeAmbiguous: pwExcludeAmbiguous,
			};
			next = generatePassword(opts);
		} else if (mode === "passphrase") {
			const opts: PassphraseOptions = {
				wordCount: ppWordCount,
				separator: ppSeparator,
				capitalize: ppCapitalize,
				includeNumber: ppIncludeNumber,
			};
			next = generatePassphrase(opts, WORDLIST);
		} else {
			const opts: ApiKeyOptions = { prefix: akPrefix, length: akLength };
			next = generateApiKey(opts);
		}
		setValue(next);
		setCopied(false);
	}, [mode, pwLength, pwLower, pwUpper, pwDigits, pwSymbols, pwExcludeAmbiguous, ppWordCount, ppSeparator, ppCapitalize, ppIncludeNumber, akPrefix, akLength]);

	// Regenerate whenever the mode or any option changes.
	React.useEffect(() => { generate(); }, [generate]);

	// Clean up timers on unmount.
	React.useEffect(() => clearPendingTimers, [clearPendingTimers]);

	const scheduleAutoClear = React.useCallback((copiedValue: string) => {
		clearPendingTimers();
		if (clearAfter <= 0) return;
		lastCopiedRef.current = copiedValue;
		setClearCountdown(clearAfter);
		countdownRef.current = window.setInterval(() => {
			setClearCountdown(c => (c === null ? null : Math.max(0, c - 1)));
		}, 1000);
		clearTimerRef.current = window.setTimeout(async () => {
			clearPendingTimers();
			try {
				const api = getAPI();
				// Only clear the clipboard if it still holds what we put there —
				// don't clobber something the user copied in the meantime.
				const current = await api.clipboard.readText();
				if (current === lastCopiedRef.current) {
					await api.clipboard.writeText("");
					api.ui.showToast("Clipboard cleared", { type: "info", duration: 1500 });
				}
			} catch { /* clipboard read/clear is best-effort */ }
		}, clearAfter * 1000);
	}, [clearAfter, clearPendingTimers]);

	const handleCopy = React.useCallback(async () => {
		if (!value) return;
		try {
			const api = getAPI();
			await api.clipboard.writeText(value);
			setCopied(true);
			api.ui.showToast("Copied to clipboard", { type: "success", duration: 1500 });
			scheduleAutoClear(value);
		} catch { /* ignore */ }
	}, [value, scheduleAutoClear]);

	const strength = React.useMemo(() => estimateStrength(value), [value]);

	return (
		<div style={s.root}>
			<div style={s.tabs}>
				{(["password", "passphrase", "apikey"] as Mode[]).map(m => (
					<button
						key={m}
						style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}
						onClick={() => setMode(m)}
					>
						{m === "password" ? "Password" : m === "passphrase" ? "Passphrase" : "API Key"}
					</button>
				))}
			</div>

			<div style={s.body}>
				{mode === "password" && (
					<>
						<div style={s.row}>
							<span style={s.label}>Length</span>
							<input
								type="range"
								min={6}
								max={64}
								value={pwLength}
								style={s.range}
								onChange={e => setPwLength(Number(e.target.value))}
							/>
							<span>{pwLength}</span>
						</div>
						<div style={s.checkRow}>
							<label style={s.checkLabel}>
								<input type="checkbox" checked={pwLower} onChange={e => setPwLower(e.target.checked)} />
								a-z
							</label>
							<label style={s.checkLabel}>
								<input type="checkbox" checked={pwUpper} onChange={e => setPwUpper(e.target.checked)} />
								A-Z
							</label>
							<label style={s.checkLabel}>
								<input type="checkbox" checked={pwDigits} onChange={e => setPwDigits(e.target.checked)} />
								0-9
							</label>
							<label style={s.checkLabel}>
								<input type="checkbox" checked={pwSymbols} onChange={e => setPwSymbols(e.target.checked)} />
								!@#$
							</label>
						</div>
						<div style={s.checkRow}>
							<label style={s.checkLabel}>
								<input type="checkbox" checked={pwExcludeAmbiguous} onChange={e => setPwExcludeAmbiguous(e.target.checked)} />
								Exclude ambiguous (0/O, 1/l/I)
							</label>
						</div>
					</>
				)}

				{mode === "passphrase" && (
					<>
						<div style={s.row}>
							<span style={s.label}>Words</span>
							<input
								type="range"
								min={3}
								max={8}
								value={ppWordCount}
								style={s.range}
								onChange={e => setPpWordCount(Number(e.target.value))}
							/>
							<span>{ppWordCount}</span>
						</div>
						<div style={s.row}>
							<span style={s.label}>Separator</span>
							<select style={s.select} value={ppSeparator} onChange={e => setPpSeparator(e.target.value)}>
								<option value="-">hyphen ( - )</option>
								<option value="_">underscore ( _ )</option>
								<option value=".">dot ( . )</option>
								<option value=" ">space</option>
								<option value="">none</option>
							</select>
						</div>
						<div style={s.checkRow}>
							<label style={s.checkLabel}>
								<input type="checkbox" checked={ppCapitalize} onChange={e => setPpCapitalize(e.target.checked)} />
								Capitalize words
							</label>
							<label style={s.checkLabel}>
								<input type="checkbox" checked={ppIncludeNumber} onChange={e => setPpIncludeNumber(e.target.checked)} />
								Add trailing number
							</label>
						</div>
					</>
				)}

				{mode === "apikey" && (
					<>
						<div style={s.row}>
							<span style={s.label}>Prefix</span>
							<input
								style={s.input}
								value={akPrefix}
								placeholder="e.g. sk_live (optional)"
								onChange={e => setAkPrefix(e.target.value)}
							/>
						</div>
						<div style={s.row}>
							<span style={s.label}>Length</span>
							<input
								type="range"
								min={16}
								max={64}
								value={akLength}
								style={s.range}
								onChange={e => setAkLength(Number(e.target.value))}
							/>
							<span>{akLength}</span>
						</div>
					</>
				)}

				<div style={s.output} onClick={handleCopy} title="Click to copy">
					{value || " "}
				</div>

				<div>
					<div style={s.meterTrack}>
						<div style={s.meterFill(strength.score, strength.label)} />
					</div>
					<div style={s.meterLabel}>
						<span>{strength.label}</span>
						<span>~{strength.bits} bits</span>
					</div>
				</div>

				<div style={s.btnRow}>
					<button style={s.btn} onClick={generate}>Regenerate</button>
					<button style={s.btnSecondary} onClick={handleCopy}>
						{copied ? "Copied" : "Copy"}
					</button>
				</div>

				<div style={s.row}>
					<span style={s.label}>Auto-clear</span>
					<select
						style={s.select}
						value={clearAfter}
						onChange={e => setClearAfter(Number(e.target.value))}
					>
						{CLEAR_OPTIONS.map(o => (
							<option key={o.value} value={o.value}>{o.label}</option>
						))}
					</select>
				</div>
				{clearCountdown !== null && (
					<div style={s.clearNote}>Clipboard clears in {clearCountdown}s…</div>
				)}
			</div>
		</div>
	);
}
