import * as React from "react";
import {
	getState, subscribe, openFile, showPreview, showEdit,
	updateEditContent, saveFile, renderMermaidDiagrams,
	type MarkdownState,
} from "./activate";

interface FileHandlerProps {
	pluginId: string;
	filePath: string;
	content: string;
	sessionId: string;
	onBack: () => void;
}

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
	langBadge: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
		background: "var(--bg-2)",
		padding: "1px 6px",
		borderRadius: "var(--radius-sm)",
		flexShrink: 0,
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
	content: {
		flex: 1,
		overflow: "auto" as const,
		padding: "12px 16px",
	},
	dirtyIndicator: {
		width: "6px",
		height: "6px",
		borderRadius: "50%",
		background: "var(--yellow, #d29922)",
		flexShrink: 0,
	},
	textarea: {
		flex: 1,
		width: "100%",
		background: "var(--bg-1)",
		border: "none",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-sm)",
		padding: "12px 16px",
		outline: "none",
		resize: "none" as const,
		lineHeight: 1.7,
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
};

const BackArrow = () => (
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M19 12H5" />
		<polyline points="12 19 5 12 12 5" />
	</svg>
);

export function MarkdownPanel(props: FileHandlerProps) {
	const [state, setState] = React.useState<MarkdownState>(getState);
	const contentRef = React.useRef<HTMLDivElement>(null);
	const onBackRef = React.useRef(props.onBack);
	onBackRef.current = props.onBack;

	// Initialize state when a new file is opened
	React.useEffect(() => {
		openFile(props.filePath, props.content, () => onBackRef.current());
	}, [props.filePath]);

	React.useEffect(() => {
		return subscribe(() => setState(getState()));
	}, []);

	// Render mermaid diagrams after preview HTML is set
	React.useEffect(() => {
		if (state.view === "preview" && state.html && contentRef.current) {
			renderMermaidDiagrams(contentRef.current);
		}
	}, [state.view, state.html]);

	// Cmd/Ctrl+S handler for edit view
	React.useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				const current = getState();
				if (current.view === "edit" && current.dirty) {
					e.preventDefault();
					saveFile();
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	const fileName = props.filePath.split("/").pop() || props.filePath;

	// ─── Edit View ────────────────────────────────────────
	if (state.view === "edit") {
		const lines = state.editContent.split("\n").length;
		const chars = state.editContent.length;

		return (
			<div style={s.root}>
				<div style={s.header}>
					<div style={s.headerLeft}>
						<button style={s.backBtn} onClick={props.onBack} title="Back to files">
							<BackArrow />
						</button>
						<span style={s.fileName} title={props.filePath}>{fileName}</span>
						<span style={s.langBadge}>markdown</span>
						{state.dirty && <span style={s.dirtyIndicator} title="Unsaved changes" />}
					</div>
					<button style={s.btn} onClick={showPreview} title="Preview">
						Preview
					</button>
					{state.dirty && (
						<button style={s.btn} onClick={saveFile} title="Save file">
							Save
						</button>
					)}
				</div>

				<textarea
					style={s.textarea}
					value={state.editContent}
					onChange={(e) => updateEditContent(e.target.value)}
					spellCheck={false}
				/>

				<div style={s.footer}>
					<span style={s.footerText}>{lines} lines, {chars} chars</span>
					<span style={s.footerText}>{state.dirty ? "Unsaved" : "Saved"}</span>
				</div>
			</div>
		);
	}

	// ─── Preview View ─────────────────────────────────────
	return (
		<div style={s.root}>
			<div style={s.header}>
				<div style={s.headerLeft}>
					<button style={s.backBtn} onClick={props.onBack} title="Back to files">
						<BackArrow />
					</button>
					<span style={s.fileName} title={props.filePath}>{fileName}</span>
					<span style={s.langBadge}>markdown</span>
					{state.dirty && <span style={s.dirtyIndicator} title="Unsaved changes" />}
				</div>
				<button style={s.btn} onClick={showEdit} title="Edit source">
					Edit
				</button>
			</div>

			{state.html && (
				<div
					ref={contentRef}
					style={{ ...s.content, fontSize: "14px" }}
					className="md-preview-content"
					dangerouslySetInnerHTML={{ __html: state.html }}
				/>
			)}
		</div>
	);
}
