import * as React from "react";
import {
	getState, subscribe, openFile, showPreview, showEdit,
	updateEditContent, saveFile, renderMermaidDiagrams,
	type MarkdownState,
} from "./activate";
import {
	Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
	List, ListOrdered, CheckSquare, Quote, Link, Image, Minus, Table,
	ArrowLeft,
} from "lucide-react";

interface FileHandlerProps {
	pluginId: string;
	filePath: string;
	content: string;
	sessionId: string;
	onBack: () => void;
}

// ─── Formatting helpers ──────────────────────────────────

type FormatAction = (
	textarea: HTMLTextAreaElement,
	content: string,
) => { newContent: string; selStart: number; selEnd: number };

function wrapSelection(prefix: string, suffix: string): FormatAction {
	return (ta, content) => {
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		const selected = content.slice(start, end);
		// If already wrapped, unwrap
		if (
			content.slice(start - prefix.length, start) === prefix &&
			content.slice(end, end + suffix.length) === suffix
		) {
			const newContent = content.slice(0, start - prefix.length) + selected + content.slice(end + suffix.length);
			return { newContent, selStart: start - prefix.length, selEnd: end - prefix.length };
		}
		const newContent = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
		return { newContent, selStart: start + prefix.length, selEnd: end + prefix.length };
	};
}

function prependLine(prefix: string): FormatAction {
	return (ta, content) => {
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		// Find start of the current line
		const lineStart = content.lastIndexOf("\n", start - 1) + 1;
		const lineEnd = content.indexOf("\n", end);
		const actualEnd = lineEnd === -1 ? content.length : lineEnd;
		const lines = content.slice(lineStart, actualEnd).split("\n");
		const alreadyPrefixed = lines.every(l => l.startsWith(prefix));
		const newLines = alreadyPrefixed
			? lines.map(l => l.slice(prefix.length))
			: lines.map(l => prefix + l);
		const joined = newLines.join("\n");
		const newContent = content.slice(0, lineStart) + joined + content.slice(actualEnd);
		const delta = joined.length - (actualEnd - lineStart);
		return { newContent, selStart: start + (alreadyPrefixed ? -prefix.length : prefix.length), selEnd: end + delta };
	};
}

function insertLink(): FormatAction {
	return (ta, content) => {
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		const selected = content.slice(start, end);
		const text = selected || "link text";
		const insert = `[${text}](url)`;
		const newContent = content.slice(0, start) + insert + content.slice(end);
		// Select "url" for easy replacement
		const urlStart = start + text.length + 3;
		return { newContent, selStart: urlStart, selEnd: urlStart + 3 };
	};
}

function insertImage(): FormatAction {
	return (ta, content) => {
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		const selected = content.slice(start, end);
		const alt = selected || "alt text";
		const insert = `![${alt}](url)`;
		const newContent = content.slice(0, start) + insert + content.slice(end);
		const urlStart = start + alt.length + 4;
		return { newContent, selStart: urlStart, selEnd: urlStart + 3 };
	};
}

function insertHr(): FormatAction {
	return (ta, content) => {
		const start = ta.selectionStart;
		const insert = "\n---\n";
		const newContent = content.slice(0, start) + insert + content.slice(start);
		return { newContent, selStart: start + insert.length, selEnd: start + insert.length };
	};
}

function insertTable(): FormatAction {
	return (ta, content) => {
		const start = ta.selectionStart;
		const table = "\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n";
		const newContent = content.slice(0, start) + table + content.slice(start);
		return { newContent, selStart: start + table.length, selEnd: start + table.length };
	};
}

const ICON_SIZE = 15;

const FORMATS: { icon: React.ReactNode; title: string; action: FormatAction; shortcut?: string }[] = [
	{ icon: <Bold size={ICON_SIZE} />, title: "Bold (Cmd+B)", action: wrapSelection("**", "**"), shortcut: "b" },
	{ icon: <Italic size={ICON_SIZE} />, title: "Italic (Cmd+I)", action: wrapSelection("_", "_"), shortcut: "i" },
	{ icon: <Strikethrough size={ICON_SIZE} />, title: "Strikethrough", action: wrapSelection("~~", "~~") },
	{ icon: <Code size={ICON_SIZE} />, title: "Inline code", action: wrapSelection("`", "`") },
	{ icon: <Heading1 size={ICON_SIZE} />, title: "Heading 1", action: prependLine("# ") },
	{ icon: <Heading2 size={ICON_SIZE} />, title: "Heading 2", action: prependLine("## ") },
	{ icon: <Heading3 size={ICON_SIZE} />, title: "Heading 3", action: prependLine("### ") },
	{ icon: <List size={ICON_SIZE} />, title: "Bullet list", action: prependLine("- ") },
	{ icon: <ListOrdered size={ICON_SIZE} />, title: "Numbered list", action: prependLine("1. ") },
	{ icon: <CheckSquare size={ICON_SIZE} />, title: "Checkbox", action: prependLine("- [ ] ") },
	{ icon: <Quote size={ICON_SIZE} />, title: "Blockquote", action: prependLine("> ") },
	{ icon: <Link size={ICON_SIZE} />, title: "Link (Cmd+K)", action: insertLink(), shortcut: "k" },
	{ icon: <Image size={ICON_SIZE} />, title: "Image", action: insertImage() },
	{ icon: <Minus size={ICON_SIZE} />, title: "Horizontal rule", action: insertHr() },
	{ icon: <Table size={ICON_SIZE} />, title: "Table", action: insertTable() },
];

// ─── Styles ──────────────────────────────────────────────

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
		fontSize: "var(--text-base)",
		color: "var(--text-2)",
		fontWeight: 600,
		overflow: "hidden" as const,
		textOverflow: "ellipsis" as const,
		whiteSpace: "nowrap" as const,
		flex: 1,
	},
	langBadge: {
		fontSize: "var(--text-sm)",
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
		fontSize: "var(--text-sm)",
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
	toolbar: {
		display: "flex",
		alignItems: "center",
		gap: "3px",
		padding: "6px 12px",
		borderBottom: "1px solid var(--border)",
		background: "var(--bg-2)",
		flexShrink: 0,
		flexWrap: "wrap" as const,
	},
	toolBtn: {
		background: "none",
		border: "1px solid transparent",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-2)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-lg)",
		padding: "5px 8px",
		cursor: "pointer" as const,
		lineHeight: 1,
		minWidth: "28px",
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
	},
	toolSep: {
		width: "1px",
		height: "20px",
		background: "var(--border)",
		margin: "0 6px",
		flexShrink: 0,
	},
	textarea: {
		flex: 1,
		width: "100%",
		background: "var(--bg-1)",
		border: "none",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-base)",
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
		fontSize: "var(--text-sm)",
		color: "var(--text-3)",
	},
};

const BackArrow = () => <ArrowLeft size={14} />;

// Group indices for separators in toolbar
const SEPARATORS_AFTER = new Set([2, 3, 6, 10, 12]);

export function MarkdownPanel(props: FileHandlerProps) {
	const [state, setState] = React.useState<MarkdownState>(getState);
	const contentRef = React.useRef<HTMLDivElement>(null);
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
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

	const applyFormat = React.useCallback((action: FormatAction) => {
		const ta = textareaRef.current;
		if (!ta) return;
		const content = ta.value;
		const { newContent, selStart, selEnd } = action(ta, content);
		updateEditContent(newContent);
		// Restore selection after React re-render
		requestAnimationFrame(() => {
			ta.focus();
			ta.setSelectionRange(selStart, selEnd);
		});
	}, []);

	// Keyboard shortcuts (Cmd+S, Cmd+B, Cmd+I, Cmd+K)
	React.useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (!(e.metaKey || e.ctrlKey)) return;
			const current = getState();

			if (e.key === "s" && current.view === "edit" && current.dirty) {
				e.preventDefault();
				saveFile();
				return;
			}

			if (current.view === "edit") {
				const fmt = FORMATS.find(f => f.shortcut === e.key);
				if (fmt) {
					e.preventDefault();
					applyFormat(fmt.action);
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [applyFormat]);

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

				<div style={s.toolbar}>
					{FORMATS.map((fmt, i) => (
						<React.Fragment key={i}>
							<button
								style={s.toolBtn}
								title={fmt.title}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => applyFormat(fmt.action)}
								onMouseEnter={(e) => {
									(e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3, var(--bg-1))";
									(e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
									(e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)";
								}}
								onMouseLeave={(e) => {
									(e.currentTarget as HTMLButtonElement).style.background = "none";
									(e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
									(e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
								}}
							>
								{fmt.icon}
							</button>
							{SEPARATORS_AFTER.has(i) && <div style={s.toolSep} />}
						</React.Fragment>
					))}
				</div>

				<textarea
					ref={textareaRef}
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
					style={{ ...s.content, fontSize: "var(--text-lg)" }}
					className="md-preview-content"
					dangerouslySetInnerHTML={{ __html: state.html }}
				/>
			)}
		</div>
	);
}
