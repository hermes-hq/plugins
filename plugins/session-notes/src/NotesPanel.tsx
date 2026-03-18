import * as React from "react";
import { getState, subscribe, updateNote, clearNote, getAllNotes, viewNote, viewList, type NotesState } from "./activate";

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
		justifyContent: "space-between",
		flexShrink: 0,
		gap: "8px",
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
	sessionLabel: {
		fontSize: "var(--text-sm)",
		color: "var(--text-2)",
		fontWeight: 600,
		overflow: "hidden" as const,
		textOverflow: "ellipsis" as const,
		whiteSpace: "nowrap" as const,
		flex: 1,
	},
	clearBtn: {
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
	textarea: {
		flex: 1,
		background: "transparent",
		border: "none",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		padding: "12px",
		outline: "none",
		resize: "none" as const,
		lineHeight: 1.6,
		width: "100%",
		boxSizing: "border-box" as const,
	},
	footer: {
		padding: "4px 12px",
		borderTop: "1px solid var(--border)",
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		flexShrink: 0,
	},
	footerText: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
	},
	empty: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		color: "var(--text-3)",
		fontSize: "var(--text-md)",
		padding: "20px",
		textAlign: "center" as const,
		lineHeight: 1.6,
	},
	notesList: {
		flex: 1,
		overflow: "auto" as const,
		display: "flex",
		flexDirection: "column" as const,
	},
	noteRow: {
		padding: "8px 12px",
		borderBottom: "1px solid var(--border)",
		cursor: "pointer" as const,
		display: "flex",
		flexDirection: "column" as const,
		gap: "2px",
	},
	noteRowName: {
		fontSize: "var(--text-sm)",
		fontWeight: 600,
		color: "var(--text-1)",
		overflow: "hidden" as const,
		textOverflow: "ellipsis" as const,
		whiteSpace: "nowrap" as const,
	},
	noteRowActive: {
		color: "var(--accent)",
	},
	noteRowPreview: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
		overflow: "hidden" as const,
		textOverflow: "ellipsis" as const,
		whiteSpace: "nowrap" as const,
	},
	noteRowMeta: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
		opacity: 0.6,
	},
};

const BackArrow = () => (
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M19 12H5" />
		<polyline points="12 19 5 12 12 5" />
	</svg>
);

export function NotesPanel() {
	const [state, setState] = React.useState<NotesState>(getState);
	const [noteEntries, setNoteEntries] = React.useState<{ sessionId: string; sessionName: string; preview: string; lines: number }[]>([]);
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	React.useEffect(() => {
		return subscribe(() => setState(getState()));
	}, []);

	// Load notes list when showing list view
	React.useEffect(() => {
		if (state.view === "list") {
			getAllNotes().then(setNoteEntries).catch(() => {});
		}
	}, [state.view]);

	// Focus textarea when entering editor
	React.useEffect(() => {
		if (state.view === "editor" && state.sessionId && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [state.view, state.sessionId]);

	if (!state.sessionId && state.view === "editor") {
		return (
			<div style={s.root}>
				<div style={s.empty}>
					No active session.{"\n"}Open a terminal session to start taking notes.
				</div>
			</div>
		);
	}

	// ─── List View ────────────────────────────────────────
	if (state.view === "list") {
		return (
			<div style={s.root}>
				<div style={s.header}>
					<span style={s.sessionLabel}>All Notes</span>
				</div>
				{noteEntries.length > 0 ? (
					<div style={s.notesList}>
						{noteEntries.map((entry) => (
							<div
								key={entry.sessionId}
								style={s.noteRow}
								onClick={() => viewNote(entry.sessionId, entry.sessionName)}
								onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
								onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
							>
								<span style={{
									...s.noteRowName,
									...(entry.sessionId === state.sessionId ? s.noteRowActive : {}),
								}}>
									{entry.sessionName || entry.sessionId}
								</span>
								<span style={s.noteRowPreview}>{entry.preview}</span>
								<span style={s.noteRowMeta}>
									{entry.lines} line{entry.lines !== 1 ? "s" : ""}
								</span>
							</div>
						))}
					</div>
				) : (
					<div style={s.empty}>
						No notes yet.{"\n"}Open a session and start typing.
					</div>
				)}
			</div>
		);
	}

	// ─── Editor View ──────────────────────────────────────
	const lines = state.note ? state.note.split("\n").length : 0;
	const chars = state.note.length;

	return (
		<div style={s.root}>
			<div style={s.header}>
				<div style={s.headerLeft}>
					<button
						style={s.backBtn}
						onClick={viewList}
						title="Back to notes list"
					>
						<BackArrow />
					</button>
					<span style={s.sessionLabel}>
						{state.sessionName || state.sessionId}
					</span>
				</div>
				{state.note.trim() && (
					<button
						style={s.clearBtn}
						onClick={clearNote}
						title="Clear this note"
					>
						Clear
					</button>
				)}
			</div>
			<textarea
				ref={textareaRef}
				style={{
					...s.textarea,
					fontSize: `${state.fontSize}px`,
				}}
				value={state.note}
				onChange={(e) => updateNote(e.target.value)}
				placeholder="Type your notes here..."
				spellCheck={false}
			/>
			{state.showLineCount && (
				<div style={s.footer}>
					<span style={s.footerText}>
						{lines} line{lines !== 1 ? "s" : ""}, {chars} char{chars !== 1 ? "s" : ""}
					</span>
					<span style={s.footerText}>auto-saved</span>
				</div>
			)}
		</div>
	);
}
