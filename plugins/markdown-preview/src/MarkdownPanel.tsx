import * as React from "react";
import {
	getState, subscribe, loadFile, discoverFiles,
	showFilePicker, refreshPreview, type MarkdownState,
} from "./activate";

const s = {
	root: {
		display: "flex",
		flexDirection: "column" as const,
		height: "100%",
		fontFamily: "var(--font-mono)",
		color: "var(--text-0)",
		overflow: "hidden",
	},
	header: {
		padding: "8px 12px",
		borderBottom: "1px solid var(--border)",
		display: "flex",
		alignItems: "center",
		gap: "8px",
		flexShrink: 0,
	},
	headerLeft: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		flex: 1,
		overflow: "hidden" as const,
	},
	backBtn: {
		background: "none",
		border: "none",
		color: "var(--text-3)",
		cursor: "pointer" as const,
		padding: "2px 4px",
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		borderRadius: "var(--radius-sm)",
	},
	fileName: {
		fontSize: "var(--text-sm)",
		color: "var(--text-2)",
		fontWeight: 600,
		overflow: "hidden" as const,
		textOverflow: "ellipsis" as const,
		whiteSpace: "nowrap" as const,
		flex: 1,
	},
	btn: {
		background: "none",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-3)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "2px 8px",
		cursor: "pointer" as const,
		flexShrink: 0,
		whiteSpace: "nowrap" as const,
	},
	btnPrimary: {
		background: "var(--accent)",
		border: "none",
		borderRadius: "var(--radius-sm)",
		color: "#fff",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "5px 12px",
		cursor: "pointer" as const,
		alignSelf: "flex-start" as const,
	},
	content: {
		flex: 1,
		overflow: "auto" as const,
		padding: "12px 16px",
	},
	empty: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		color: "var(--text-3)",
		fontSize: "var(--text-sm)",
		padding: "20px",
		textAlign: "center" as const,
		lineHeight: 1.6,
	},
	error: {
		color: "var(--red)",
		fontSize: "var(--text-xs)",
		padding: "8px 12px",
		lineHeight: 1.4,
	},
	loading: {
		color: "var(--text-3)",
		fontSize: "var(--text-xs)",
		padding: "8px 12px",
	},
	input: {
		width: "100%",
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-sm)",
		padding: "6px 8px",
		outline: "none",
		boxSizing: "border-box" as const,
	},
	section: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "8px",
		padding: "12px",
	},
	sectionTitle: {
		fontSize: "var(--text-xs)",
		fontWeight: 600,
		color: "var(--text-2)",
		textTransform: "uppercase" as const,
		letterSpacing: "0.5px",
	},
	cwd: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
		wordBreak: "break-all" as const,
	},
	fileList: {
		display: "flex",
		flexDirection: "column" as const,
		gap: "2px",
		maxHeight: "300px",
		overflow: "auto" as const,
	},
	fileItem: {
		padding: "4px 8px",
		borderRadius: "var(--radius-sm)",
		fontSize: "var(--text-xs)",
		color: "var(--text-1)",
		cursor: "pointer" as const,
		wordBreak: "break-all" as const,
		lineHeight: 1.4,
	},
	indicator: {
		width: "6px",
		height: "6px",
		borderRadius: "50%",
		background: "var(--green, #3fb950)",
		flexShrink: 0,
	},
};

const BackArrow = () => (
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M19 12H5" />
		<polyline points="12 19 5 12 12 5" />
	</svg>
);

export function MarkdownPanel() {
	const [state, setState] = React.useState<MarkdownState>(getState);
	const [pathInput, setPathInput] = React.useState("");
	const contentRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		return subscribe(() => setState(getState()));
	}, []);

	const handleOpenFile = () => {
		const p = pathInput.trim();
		if (p) loadFile(p);
	};

	// ─── File Picker View ─────────────────────────────────
	if (state.view === "file-picker") {
		return (
			<div style={s.root}>
				<div style={s.header}>
					<span style={s.fileName}>Markdown Preview</span>
				</div>
				<div style={{ ...s.content, display: "flex", flexDirection: "column" as const, gap: "12px" }}>
					<div style={s.section}>
						<span style={s.sectionTitle}>Open a file</span>
						<div style={{ display: "flex", gap: "6px" }}>
							<input
								style={{ ...s.input, flex: 1 }}
								value={pathInput}
								onChange={(e) => setPathInput(e.target.value)}
								placeholder="/path/to/README.md"
								onKeyDown={(e) => { if (e.key === "Enter") handleOpenFile(); }}
							/>
							<button style={s.btnPrimary} onClick={handleOpenFile} disabled={!pathInput.trim()}>
								Open
							</button>
						</div>
					</div>

					{state.workingDirectory && (
						<div style={s.section}>
							<span style={s.sectionTitle}>Markdown files in project</span>
							<span style={s.cwd}>{state.workingDirectory}</span>
							{state.mdFiles.length === 0 && !state.filesLoading && (
								<button style={s.btnPrimary} onClick={discoverFiles}>
									Scan for .md files
								</button>
							)}
							{state.filesLoading && (
								<span style={s.loading}>Scanning...</span>
							)}
							{state.mdFiles.length > 0 && (
								<React.Fragment>
									<div style={s.fileList}>
										{state.mdFiles.map((f) => {
											const rel = f.startsWith(state.workingDirectory)
												? f.slice(state.workingDirectory.length).replace(/^\//, "")
												: f;
											return (
												<div
													key={f}
													style={s.fileItem}
													onClick={() => loadFile(f)}
													onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
													onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
												>
													{rel}
												</div>
											);
										})}
									</div>
									<button style={s.btn} onClick={discoverFiles}>Rescan</button>
								</React.Fragment>
							)}
						</div>
					)}

					{state.filePath && state.html && (
						<div style={s.section}>
							<button style={s.btn} onClick={() => { state.view = "preview"; setState(getState()); }}>
								Back to preview
							</button>
						</div>
					)}
				</div>
			</div>
		);
	}

	// ─── Preview View ─────────────────────────────────────
	const fileName = state.filePath.split("/").pop() || state.filePath;

	return (
		<div style={s.root}>
			<div style={s.header}>
				<div style={s.headerLeft}>
					<button style={s.backBtn} onClick={showFilePicker} title="Change file">
						<BackArrow />
					</button>
					<span style={s.fileName} title={state.filePath}>{fileName}</span>
					{state.pollInterval > 0 && <span style={s.indicator} title="Auto-refreshing" />}
				</div>
				<button style={s.btn} onClick={refreshPreview} title="Refresh now">
					Refresh
				</button>
			</div>

			{state.loading && <span style={s.loading}>Loading...</span>}
			{state.error && <span style={s.error}>{state.error}</span>}

			{state.html && (
				<div
					ref={contentRef}
					style={{ ...s.content, fontSize: "14px" }}
					className="md-preview-content"
					dangerouslySetInnerHTML={{ __html: state.html }}
				/>
			)}

			{!state.html && !state.loading && !state.error && (
				<div style={s.empty}>
					No file loaded.
				</div>
			)}
		</div>
	);
}
