import * as React from "react";
import { generateUuids, NAMESPACES, type UuidVersion } from "./uuid";
import { getAPI } from "./activate";

const VERSIONS: { value: UuidVersion; label: string; desc: string }[] = [
	{ value: "v4", label: "v4", desc: "Random (most common)" },
	{ value: "v7", label: "v7", desc: "Unix timestamp + random (sortable)" },
	{ value: "v1", label: "v1", desc: "Timestamp + node (classic)" },
	{ value: "v5", label: "v5", desc: "SHA-1 namespace + name (deterministic)" },
	{ value: "nil", label: "Nil", desc: "All zeros" },
	{ value: "max", label: "Max", desc: "All ones" },
];

const COUNTS = [1, 5, 10, 25, 50, 100];

const NS_OPTIONS = [
	{ value: NAMESPACES.DNS, label: "DNS" },
	{ value: NAMESPACES.URL, label: "URL" },
	{ value: NAMESPACES.OID, label: "OID" },
	{ value: NAMESPACES.X500, label: "X.500" },
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
	toolbar: {
		padding: "10px 12px",
		display: "flex",
		flexDirection: "column" as const,
		gap: "8px",
		borderBottom: "1px solid var(--border)",
		flexShrink: 0,
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
		minWidth: "52px",
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
	desc: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		marginTop: "-2px",
		paddingLeft: "58px",
	},
	btnRow: {
		display: "flex",
		gap: "6px",
		marginTop: "2px",
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
	results: {
		flex: 1,
		overflow: "auto" as const,
		padding: "8px 12px",
		display: "flex",
		flexDirection: "column" as const,
		gap: "2px",
	},
	resultRow: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		padding: "3px 6px",
		borderRadius: "var(--radius-sm)",
		cursor: "pointer" as const,
		transition: "background 0.1s",
		fontSize: "var(--text-base)",
		color: "var(--text-1)",
		fontFamily: "var(--font-mono)",
		wordBreak: "break-all" as const,
		lineHeight: "1.5",
	},
	copyHint: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		flexShrink: 0,
		opacity: 0,
		transition: "opacity 0.1s",
	},
	empty: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		color: "var(--text-3)",
		fontSize: "var(--text-md)",
	},
	counter: {
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
		textAlign: "right" as const,
		padding: "4px 12px",
		borderTop: "1px solid var(--border)",
		flexShrink: 0,
	},
};

export function UuidPanel() {
	const [version, setVersion] = React.useState<UuidVersion>("v4");
	const [count, setCount] = React.useState(1);
	const [results, setResults] = React.useState<string[]>([]);
	const [generating, setGenerating] = React.useState(false);
	const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);

	// v5 fields
	const [namespace, setNamespace] = React.useState(NAMESPACES.DNS);
	const [name, setName] = React.useState("");

	const versionInfo = VERSIONS.find(v => v.value === version);

	const handleGenerate = React.useCallback(async () => {
		setGenerating(true);
		setCopiedIdx(null);
		try {
			const uuids = await generateUuids({ version, count, namespace, name });
			setResults(uuids);

			// Auto-copy if single result
			if (uuids.length === 1) {
				try {
					const api = getAPI();
					await api.clipboard.writeText(uuids[0]);
					api.ui.showToast("UUID copied to clipboard", { type: "success", duration: 1500 });
				} catch { /* clipboard not critical */ }
			}
		} catch (err) {
			try {
				getAPI().ui.showToast(`Generation failed: ${err}`, { type: "error" });
			} catch { /* ignore */ }
		}
		setGenerating(false);
	}, [version, count, namespace, name]);

	const handleCopyOne = React.useCallback(async (uuid: string, idx: number) => {
		try {
			const api = getAPI();
			await api.clipboard.writeText(uuid);
			setCopiedIdx(idx);
			setTimeout(() => setCopiedIdx(null), 1200);
		} catch { /* ignore */ }
	}, []);

	const handleCopyAll = React.useCallback(async () => {
		if (results.length === 0) return;
		try {
			const api = getAPI();
			await api.clipboard.writeText(results.join("\n"));
			api.ui.showToast(`${results.length} UUIDs copied`, { type: "success", duration: 1500 });
		} catch { /* ignore */ }
	}, [results]);

	return (
		<div style={s.root}>
			<div style={s.toolbar}>
				{/* Version */}
				<div style={s.row}>
					<span style={s.label}>Version</span>
					<select
						style={s.select}
						value={version}
						onChange={e => setVersion(e.target.value as UuidVersion)}
					>
						{VERSIONS.map(v => (
							<option key={v.value} value={v.value}>{v.label} — {v.desc}</option>
						))}
					</select>
				</div>

				{/* v5: namespace + name */}
				{version === "v5" && (
					<>
						<div style={s.row}>
							<span style={s.label}>NS</span>
							<select
								style={s.select}
								value={namespace}
								onChange={e => setNamespace(e.target.value)}
							>
								{NS_OPTIONS.map(ns => (
									<option key={ns.value} value={ns.value}>{ns.label}</option>
								))}
							</select>
						</div>
						<div style={s.row}>
							<span style={s.label}>Name</span>
							<input
								style={s.input}
								placeholder="e.g. example.com"
								value={name}
								onChange={e => setName(e.target.value)}
								onKeyDown={e => { if (e.key === "Enter") handleGenerate(); }}
							/>
						</div>
					</>
				)}

				{/* Count */}
				<div style={s.row}>
					<span style={s.label}>Count</span>
					<select
						style={s.select}
						value={count}
						onChange={e => setCount(Number(e.target.value))}
					>
						{COUNTS.map(c => (
							<option key={c} value={c}>{c}</option>
						))}
					</select>
				</div>

				{/* Buttons */}
				<div style={s.btnRow}>
					<button style={s.btn} onClick={handleGenerate} disabled={generating}>
						{generating ? "Generating..." : "Generate"}
					</button>
					{results.length > 1 && (
						<button style={s.btnSecondary} onClick={handleCopyAll}>
							Copy All
						</button>
					)}
				</div>
			</div>

			{/* Results */}
			<div style={s.results}>
				{results.length === 0 ? (
					<div style={s.empty}>
						{versionInfo ? versionInfo.desc : "Select a version and generate"}
					</div>
				) : (
					results.map((uuid, i) => (
						<div
							key={`${uuid}-${i}`}
							style={{
								...s.resultRow,
								background: copiedIdx === i ? "var(--accent-dim)" : "transparent",
							}}
							onClick={() => handleCopyOne(uuid, i)}
							onMouseEnter={e => {
								(e.currentTarget.style as CSSStyleDeclaration).background = copiedIdx === i ? "var(--accent-dim)" : "var(--bg-hover)";
								const hint = e.currentTarget.querySelector("[data-hint]") as HTMLElement;
								if (hint) hint.style.opacity = "1";
							}}
							onMouseLeave={e => {
								(e.currentTarget.style as CSSStyleDeclaration).background = copiedIdx === i ? "var(--accent-dim)" : "transparent";
								const hint = e.currentTarget.querySelector("[data-hint]") as HTMLElement;
								if (hint) hint.style.opacity = "0";
							}}
							title="Click to copy"
						>
							<span style={{ flex: 1 }}>{uuid}</span>
							<span data-hint="" style={s.copyHint}>
								{copiedIdx === i ? "copied" : "copy"}
							</span>
						</div>
					))
				)}
			</div>

			{/* Footer */}
			{results.length > 0 && (
				<div style={s.counter}>
					{results.length} UUID{results.length !== 1 ? "s" : ""} generated
				</div>
			)}
		</div>
	);
}
