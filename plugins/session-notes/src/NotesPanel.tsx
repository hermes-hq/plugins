import * as React from "react";
import { getState, subscribe, updateNote, clearNote, type NotesState } from "./activate";

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
};

export function NotesPanel() {
	const [state, setState] = React.useState<NotesState>(getState);
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	React.useEffect(() => {
		return subscribe(() => setState(getState()));
	}, []);

	// Focus textarea when session changes
	React.useEffect(() => {
		if (state.sessionId && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [state.sessionId]);

	if (!state.sessionId) {
		return (
			<div style={s.root}>
				<div style={s.empty}>
					No active session.{"\n"}Open a terminal session to start taking notes.
				</div>
			</div>
		);
	}

	const lines = state.note ? state.note.split("\n").length : 0;
	const chars = state.note.length;

	return (
		<div style={s.root}>
			<div style={s.header}>
				<span style={s.sessionLabel}>
					{state.sessionName || state.sessionId}
				</span>
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
