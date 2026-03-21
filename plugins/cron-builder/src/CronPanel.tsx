import * as React from "react";
import { getAPI } from "./activate";
import { Copy, Check, Clock, Zap, SlidersHorizontal, CalendarClock } from "lucide-react";

// ─── Cron parsing & utilities ────────────────────────────────────────────────

interface CronFields {
	minute: string;
	hour: string;
	dayOfMonth: string;
	month: string;
	dayOfWeek: string;
}

const DEFAULT_CRON: CronFields = {
	minute: "*",
	hour: "*",
	dayOfMonth: "*",
	month: "*",
	dayOfWeek: "*",
};

function fieldsToExpression(fields: CronFields): string {
	return `${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`;
}

function expressionToFields(expr: string): CronFields | null {
	const parts = expr.trim().split(/\s+/);
	if (parts.length !== 5) return null;
	return {
		minute: parts[0],
		hour: parts[1],
		dayOfMonth: parts[2],
		month: parts[3],
		dayOfWeek: parts[4],
	};
}

// ─── Field value expansion ───────────────────────────────────────────────────

function expandField(field: string, min: number, max: number): number[] | null {
	try {
		const results = new Set<number>();
		const parts = field.split(",");
		for (const part of parts) {
			const trimmed = part.trim();
			if (trimmed === "*") {
				for (let i = min; i <= max; i++) results.add(i);
			} else if (trimmed.includes("/")) {
				const [rangePart, stepStr] = trimmed.split("/");
				const step = parseInt(stepStr, 10);
				if (isNaN(step) || step <= 0) return null;
				let start = min;
				let end = max;
				if (rangePart !== "*") {
					if (rangePart.includes("-")) {
						const [a, b] = rangePart.split("-").map(Number);
						if (isNaN(a) || isNaN(b)) return null;
						start = a;
						end = b;
					} else {
						start = parseInt(rangePart, 10);
						if (isNaN(start)) return null;
						end = max;
					}
				}
				for (let i = start; i <= end; i += step) results.add(i);
			} else if (trimmed.includes("-")) {
				const [a, b] = trimmed.split("-").map(Number);
				if (isNaN(a) || isNaN(b)) return null;
				for (let i = a; i <= b; i++) results.add(i);
			} else {
				const val = parseInt(trimmed, 10);
				if (isNaN(val)) return null;
				results.add(val);
			}
		}
		return Array.from(results).sort((a, b) => a - b);
	} catch {
		return null;
	}
}

function isValidCron(fields: CronFields): boolean {
	const minMax: [number, number][] = [
		[0, 59], [0, 23], [1, 31], [1, 12], [0, 6],
	];
	const parts = [fields.minute, fields.hour, fields.dayOfMonth, fields.month, fields.dayOfWeek];
	for (let i = 0; i < 5; i++) {
		if (expandField(parts[i], minMax[i][0], minMax[i][1]) === null) return false;
	}
	return true;
}

// ─── Human-readable description ──────────────────────────────────────────────

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describeField(field: string, min: number, max: number, names?: string[]): string {
	if (field === "*") return "";
	if (field.includes("/")) {
		const [rangePart, step] = field.split("/");
		if (rangePart === "*") return `every ${step}`;
		return `every ${step} from ${rangePart}`;
	}
	if (field.includes("-")) {
		const [a, b] = field.split("-");
		const aName = names ? names[parseInt(a, 10)] || a : a;
		const bName = names ? names[parseInt(b, 10)] || b : b;
		return `${aName} through ${bName}`;
	}
	if (field.includes(",")) {
		const vals = field.split(",").map(v => {
			const n = parseInt(v.trim(), 10);
			return names ? names[n] || v.trim() : v.trim();
		});
		return vals.join(", ");
	}
	const n = parseInt(field, 10);
	return names ? names[n] || field : field;
}

function describeCron(fields: CronFields): string {
	const { minute, hour, dayOfMonth, month, dayOfWeek } = fields;

	// Every minute
	if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
		return "Every minute";
	}

	const parts: string[] = [];

	// Time description
	if (minute.includes("/")) {
		const step = minute.split("/")[1];
		parts.push(`Every ${step} minute${step === "1" ? "" : "s"}`);
	} else if (minute === "*" && hour !== "*") {
		parts.push("Every minute");
	} else if (minute !== "*" && hour === "*") {
		parts.push(`At minute ${describeField(minute, 0, 59)} of every hour`);
	} else if (minute !== "*" && hour !== "*") {
		const mins = minute.padStart(2, "0");
		if (!hour.includes("/") && !hour.includes("-") && !hour.includes(",")) {
			const hrs = hour.padStart(2, "0");
			parts.push(`At ${hrs}:${mins}`);
		} else {
			parts.push(`At minute ${mins}`);
		}
	} else {
		// minute=* and hour=*
		// handled above for all-stars; if we get here dayOfMonth/month/dayOfWeek differ
		parts.push("Every minute");
	}

	// Hour qualifier (when minute has a step and hour is specific)
	if (hour.includes("/")) {
		const step = hour.split("/")[1];
		parts.push(`past every ${step} hour${step === "1" ? "" : "s"}`);
	} else if (hour !== "*" && (minute === "*" || minute.includes("/"))) {
		parts.push(`during hour ${describeField(hour, 0, 23)}`);
	}

	// Day of week
	if (dayOfWeek !== "*") {
		const desc = describeField(dayOfWeek, 0, 6, DAY_NAMES);
		parts.push(`on ${desc}`);
	}

	// Day of month
	if (dayOfMonth !== "*") {
		const desc = describeField(dayOfMonth, 1, 31);
		parts.push(`on day ${desc} of the month`);
	}

	// Month
	if (month !== "*") {
		const desc = describeField(month, 1, 12, MONTH_NAMES);
		parts.push(`in ${desc}`);
	}

	return parts.join(" ");
}

// ─── Next N runs calculator ──────────────────────────────────────────────────

function getNextRuns(fields: CronFields, count: number, from?: Date): Date[] {
	const runs: Date[] = [];
	const start = from || new Date();
	const minuteVals = expandField(fields.minute, 0, 59);
	const hourVals = expandField(fields.hour, 0, 23);
	const domVals = expandField(fields.dayOfMonth, 1, 31);
	const monthVals = expandField(fields.month, 1, 12);
	const dowVals = expandField(fields.dayOfWeek, 0, 6);

	if (!minuteVals || !hourVals || !domVals || !monthVals || !dowVals) return [];

	const minuteSet = new Set(minuteVals);
	const hourSet = new Set(hourVals);
	const domSet = new Set(domVals);
	const monthSet = new Set(monthVals);
	const dowSet = new Set(dowVals);

	// Start from the next minute
	const cursor = new Date(start);
	cursor.setSeconds(0, 0);
	cursor.setMinutes(cursor.getMinutes() + 1);

	// Limit iterations to avoid infinite loops (scan up to 2 years of minutes)
	const maxIterations = 2 * 365 * 24 * 60;
	let iterations = 0;

	while (runs.length < count && iterations < maxIterations) {
		const m = cursor.getMinutes();
		const h = cursor.getHours();
		const dom = cursor.getDate();
		const mon = cursor.getMonth() + 1; // JS months are 0-based
		const dow = cursor.getDay();

		if (
			minuteSet.has(m) &&
			hourSet.has(h) &&
			domSet.has(dom) &&
			monthSet.has(mon) &&
			dowSet.has(dow)
		) {
			runs.push(new Date(cursor));
		}

		cursor.setMinutes(cursor.getMinutes() + 1);
		iterations++;
	}

	return runs;
}

function formatDate(d: Date): string {
	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const day = days[d.getDay()];
	const mon = months[d.getMonth()];
	const date = d.getDate();
	const year = d.getFullYear();
	const hrs = String(d.getHours()).padStart(2, "0");
	const mins = String(d.getMinutes()).padStart(2, "0");
	return `${day}, ${mon} ${date}, ${year} ${hrs}:${mins}`;
}

// ─── Visual builder field mode types ─────────────────────────────────────────

type FieldMode = "every" | "specific" | "range" | "interval";

interface FieldConfig {
	mode: FieldMode;
	specific: number[];
	rangeStart: number;
	rangeEnd: number;
	intervalStep: number;
	intervalStart: number;
}

function defaultFieldConfig(min: number, max: number): FieldConfig {
	return {
		mode: "every",
		specific: [min],
		rangeStart: min,
		rangeEnd: max,
		intervalStep: 1,
		intervalStart: min,
	};
}

function fieldConfigToString(cfg: FieldConfig): string {
	switch (cfg.mode) {
		case "every":
			return "*";
		case "specific":
			return cfg.specific.length > 0 ? cfg.specific.join(",") : "*";
		case "range":
			return `${cfg.rangeStart}-${cfg.rangeEnd}`;
		case "interval":
			return `${cfg.intervalStart}/${cfg.intervalStep}`;
	}
}

function stringToFieldConfig(field: string, min: number, max: number): FieldConfig {
	const cfg = defaultFieldConfig(min, max);

	if (field === "*") {
		cfg.mode = "every";
		return cfg;
	}

	if (field.includes("/")) {
		cfg.mode = "interval";
		const [startPart, stepPart] = field.split("/");
		cfg.intervalStep = parseInt(stepPart, 10) || 1;
		if (startPart === "*") {
			cfg.intervalStart = min;
		} else {
			cfg.intervalStart = parseInt(startPart, 10) || min;
		}
		return cfg;
	}

	if (field.includes("-") && !field.includes(",")) {
		cfg.mode = "range";
		const [a, b] = field.split("-").map(Number);
		cfg.rangeStart = isNaN(a) ? min : a;
		cfg.rangeEnd = isNaN(b) ? max : b;
		return cfg;
	}

	// Specific values (single or comma-separated)
	cfg.mode = "specific";
	cfg.specific = field.split(",").map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n));
	if (cfg.specific.length === 0) {
		cfg.mode = "every";
	}
	return cfg;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

interface Preset {
	label: string;
	expression: string;
}

const PRESETS: Preset[] = [
	{ label: "Every minute", expression: "* * * * *" },
	{ label: "Every 5 minutes", expression: "*/5 * * * *" },
	{ label: "Every 15 minutes", expression: "*/15 * * * *" },
	{ label: "Every 30 minutes", expression: "*/30 * * * *" },
	{ label: "Every hour", expression: "0 * * * *" },
	{ label: "Every 6 hours", expression: "0 */6 * * *" },
	{ label: "Daily at midnight", expression: "0 0 * * *" },
	{ label: "Daily at noon", expression: "0 12 * * *" },
	{ label: "Monday at 9:00 AM", expression: "0 9 * * 1" },
	{ label: "Weekdays at 9:00 AM", expression: "0 9 * * 1-5" },
	{ label: "First of month at midnight", expression: "0 0 1 * *" },
	{ label: "Every Sunday at midnight", expression: "0 0 * * 0" },
];

// ─── Styles ──────────────────────────────────────────────────────────────────

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
	scrollArea: {
		flex: 1,
		overflow: "auto" as const,
		padding: "10px 12px",
		display: "flex",
		flexDirection: "column" as const,
		gap: "12px",
	},
	section: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "6px",
	},
	sectionTitle: {
		fontSize: "var(--text-base)",
		color: "var(--text-2)",
		fontWeight: 600,
		textTransform: "uppercase" as const,
		letterSpacing: "0.3px",
	},
	expressionRow: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
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
		padding: "6px 8px",
		outline: "none",
	},
	inputError: {
		borderColor: "var(--red, #f44)",
	},
	btn: {
		background: "var(--accent, var(--blue))",
		border: "none",
		borderRadius: "var(--radius)",
		color: "#fff",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-md)",
		fontWeight: 600,
		padding: "7px 12px",
		cursor: "pointer" as const,
		whiteSpace: "nowrap" as const,
	},
	btnSecondary: {
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
	description: {
		fontSize: "var(--text-base)",
		color: "var(--text-1)",
		padding: "8px 10px",
		background: "var(--bg-2)",
		borderRadius: "var(--radius)",
		lineHeight: "1.5",
	},
	fieldRow: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
	},
	fieldLabel: {
		fontSize: "var(--text-base)",
		color: "var(--text-2)",
		fontWeight: 600,
		minWidth: "70px",
		flexShrink: 0,
	},
	select: {
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-base)",
		padding: "4px 6px",
		outline: "none",
		cursor: "pointer" as const,
	},
	fieldInput: {
		width: "50px",
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-base)",
		padding: "4px 6px",
		outline: "none",
	},
	fieldSelectWide: {
		flex: 1,
		minWidth: 0,
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-base)",
		padding: "4px 6px",
		outline: "none",
		cursor: "pointer" as const,
	},
	presetGrid: {
		display: "flex",
		flexWrap: "wrap" as const,
		gap: "4px",
	},
	presetBtn: {
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		color: "var(--text-1)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-sm)",
		padding: "4px 8px",
		cursor: "pointer" as const,
		whiteSpace: "nowrap" as const,
	},
	runItem: {
		fontSize: "var(--text-base)",
		color: "var(--text-1)",
		fontFamily: "var(--font-mono)",
		padding: "3px 6px",
		borderRadius: "var(--radius-sm)",
		background: "var(--bg-2)",
	},
	runList: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "3px",
	},
	errorText: {
		fontSize: "var(--text-base)",
		color: "var(--red, #f44)",
	},
	muted: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
	},
	inlineLabel: {
		fontSize: "var(--text-base)",
		color: "var(--text-3)",
	},
};

// ─── Visual field builder sub-component ──────────────────────────────────────

interface FieldBuilderProps {
	label: string;
	min: number;
	max: number;
	config: FieldConfig;
	onChange: (cfg: FieldConfig) => void;
	names?: string[];
}

function FieldBuilder({ label, min, max, config, onChange, names }: FieldBuilderProps) {
	const update = (partial: Partial<FieldConfig>) => {
		onChange({ ...config, ...partial });
	};

	return (
		<div style={s.fieldRow}>
			<span style={s.fieldLabel}>{label}</span>
			<select
				style={s.select}
				value={config.mode}
				onChange={e => {
					const mode = e.target.value as FieldMode;
					update({ mode });
				}}
			>
				<option value="every">Every</option>
				<option value="specific">Specific</option>
				<option value="range">Range</option>
				<option value="interval">Interval</option>
			</select>
			{config.mode === "specific" && (
				<select
					style={s.fieldSelectWide}
					multiple
					value={config.specific.map(String)}
					onChange={e => {
						const selected = Array.from(e.target.selectedOptions).map(o => parseInt(o.value, 10));
						update({ specific: selected });
					}}
					size={1}
					title="Hold Ctrl/Cmd to select multiple"
				>
					{Array.from({ length: max - min + 1 }, (_, i) => {
						const val = min + i;
						const display = names ? names[val] || String(val) : String(val);
						return <option key={val} value={String(val)}>{display}</option>;
					})}
				</select>
			)}
			{config.mode === "range" && (
				<>
					<input
						style={s.fieldInput}
						type="number"
						min={min}
						max={max}
						value={config.rangeStart}
						onChange={e => update({ rangeStart: parseInt(e.target.value, 10) || min })}
					/>
					<span style={s.inlineLabel}>to</span>
					<input
						style={s.fieldInput}
						type="number"
						min={min}
						max={max}
						value={config.rangeEnd}
						onChange={e => update({ rangeEnd: parseInt(e.target.value, 10) || max })}
					/>
				</>
			)}
			{config.mode === "interval" && (
				<>
					<span style={s.inlineLabel}>every</span>
					<input
						style={s.fieldInput}
						type="number"
						min={1}
						max={max - min + 1}
						value={config.intervalStep}
						onChange={e => update({ intervalStep: parseInt(e.target.value, 10) || 1 })}
					/>
					<span style={s.inlineLabel}>from</span>
					<input
						style={s.fieldInput}
						type="number"
						min={min}
						max={max}
						value={config.intervalStart}
						onChange={e => update({ intervalStart: parseInt(e.target.value, 10) || min })}
					/>
				</>
			)}
		</div>
	);
}

// ─── Field ranges ────────────────────────────────────────────────────────────

const FIELD_DEFS: { key: keyof CronFields; label: string; min: number; max: number; names?: string[] }[] = [
	{ key: "minute", label: "Minute", min: 0, max: 59 },
	{ key: "hour", label: "Hour", min: 0, max: 23 },
	{ key: "dayOfMonth", label: "Day (M)", min: 1, max: 31 },
	{ key: "month", label: "Month", min: 1, max: 12, names: MONTH_NAMES },
	{ key: "dayOfWeek", label: "Day (W)", min: 0, max: 6, names: DAY_NAMES },
];

// ─── Main Panel Component ────────────────────────────────────────────────────

export function CronPanel() {
	const [fields, setFields] = React.useState<CronFields>({ ...DEFAULT_CRON });
	const [textInput, setTextInput] = React.useState("* * * * *");
	const [copied, setCopied] = React.useState(false);

	// Visual builder state - one config per field
	const [builderConfigs, setBuilderConfigs] = React.useState<Record<keyof CronFields, FieldConfig>>(() => ({
		minute: defaultFieldConfig(0, 59),
		hour: defaultFieldConfig(0, 23),
		dayOfMonth: defaultFieldConfig(1, 31),
		month: defaultFieldConfig(1, 12),
		dayOfWeek: defaultFieldConfig(0, 6),
	}));

	// Sync direction flag to avoid loops
	const syncSource = React.useRef<"text" | "builder" | null>(null);

	// When text input changes, update fields + builder configs
	const handleTextChange = React.useCallback((value: string) => {
		setTextInput(value);
		const parsed = expressionToFields(value);
		if (parsed && isValidCron(parsed)) {
			syncSource.current = "text";
			setFields(parsed);
			setBuilderConfigs({
				minute: stringToFieldConfig(parsed.minute, 0, 59),
				hour: stringToFieldConfig(parsed.hour, 0, 23),
				dayOfMonth: stringToFieldConfig(parsed.dayOfMonth, 1, 31),
				month: stringToFieldConfig(parsed.month, 1, 12),
				dayOfWeek: stringToFieldConfig(parsed.dayOfWeek, 0, 6),
			});
		}
	}, []);

	// When builder changes, update fields + text input
	const handleBuilderChange = React.useCallback((key: keyof CronFields, cfg: FieldConfig) => {
		syncSource.current = "builder";
		setBuilderConfigs(prev => ({ ...prev, [key]: cfg }));
		setFields(prev => {
			const updated = { ...prev, [key]: fieldConfigToString(cfg) };
			setTextInput(fieldsToExpression(updated));
			return updated;
		});
	}, []);

	// Apply preset
	const handlePreset = React.useCallback((expression: string) => {
		handleTextChange(expression);
	}, [handleTextChange]);

	// Copy to clipboard
	const handleCopy = React.useCallback(async () => {
		const expr = fieldsToExpression(fields);
		try {
			const api = getAPI();
			await api.clipboard.writeText(expr);
			setCopied(true);
			api.ui.showToast("Cron expression copied to clipboard", { type: "success", duration: 1500 });
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard not critical */
		}
	}, [fields]);

	const expression = fieldsToExpression(fields);
	const valid = isValidCron(fields);
	const description = valid ? describeCron(fields) : "";
	const nextRuns = valid ? getNextRuns(fields, 5) : [];

	// Check if text input matches a valid expression
	const textParsed = expressionToFields(textInput);
	const textValid = textParsed !== null && isValidCron(textParsed);
	const textMismatch = textInput.trim() !== expression;

	return (
		<div style={s.root}>
			<div style={s.scrollArea}>
				{/* Expression input */}
				<div style={s.section}>
					<span style={{ ...s.sectionTitle, display: "flex", alignItems: "center", gap: "5px" }}><Clock size={13} /> Expression</span>
					<div style={s.expressionRow}>
						<input
							style={{
								...s.input,
								...(textInput.trim() !== "" && !textValid && textMismatch ? s.inputError : {}),
							}}
							value={textInput}
							onChange={e => handleTextChange(e.target.value)}
							placeholder="* * * * *"
							spellCheck={false}
						/>
						<button style={{ ...s.btn, display: "flex", alignItems: "center", gap: "4px" }} onClick={handleCopy} title="Copy expression">
							{copied ? <Check size={14} /> : <Copy size={14} />}
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>
					<div style={s.muted}>minute hour day(month) month day(week)</div>
				</div>

				{/* Human-readable description */}
				{valid && (
					<div style={s.section}>
						<span style={s.sectionTitle}>Description</span>
						<div style={s.description}>{description}</div>
					</div>
				)}

				{/* Visual builder */}
				<div style={s.section}>
					<span style={{ ...s.sectionTitle, display: "flex", alignItems: "center", gap: "5px" }}><SlidersHorizontal size={13} /> Visual Builder</span>
					{FIELD_DEFS.map(fd => (
						<FieldBuilder
							key={fd.key}
							label={fd.label}
							min={fd.min}
							max={fd.max}
							config={builderConfigs[fd.key]}
							onChange={cfg => handleBuilderChange(fd.key, cfg)}
							names={fd.names}
						/>
					))}
				</div>

				{/* Presets */}
				<div style={s.section}>
					<span style={{ ...s.sectionTitle, display: "flex", alignItems: "center", gap: "5px" }}><Zap size={13} /> Presets</span>
					<div style={s.presetGrid}>
						{PRESETS.map(p => (
							<button
								key={p.expression}
								style={{
									...s.presetBtn,
									...(expression === p.expression ? { borderColor: "var(--accent, var(--blue))", color: "var(--accent, var(--blue))" } : {}),
								}}
								onClick={() => handlePreset(p.expression)}
								title={p.expression}
							>
								{p.label}
							</button>
						))}
					</div>
				</div>

				{/* Next runs */}
				{valid && (
					<div style={s.section}>
						<span style={{ ...s.sectionTitle, display: "flex", alignItems: "center", gap: "5px" }}><CalendarClock size={13} /> Next 5 Runs</span>
						{nextRuns.length > 0 ? (
							<div style={s.runList}>
								{nextRuns.map((run, i) => (
									<div key={i} style={s.runItem}>{formatDate(run)}</div>
								))}
							</div>
						) : (
							<div style={s.muted}>No upcoming runs found in the next 2 years</div>
						)}
					</div>
				)}

				{/* Error state */}
				{!valid && textInput.trim() !== "" && (
					<div style={s.section}>
						<span style={s.errorText}>Invalid cron expression</span>
					</div>
				)}
			</div>
		</div>
	);
}
