import * as React from "react";
import {
	getState, subscribe, getBoardPresets,
	createBoard, deleteBoard, switchBoard, setCreatingBoard, renameBoard,
	addCard, updateCard, deleteCard, reorderCard,
	setAdding,
	type Card, type Column, type Board, type KanbanState,
} from "./activate";

const { useState, useEffect, useRef, useCallback } = React;

// ─── Helpers ──────────────────────────────────────────────

const PRIORITY_COLORS: Record<Card["priority"], string> = {
	none: "var(--text-3)", low: "#4ade80", medium: "#facc15", high: "#f87171",
};
const PRIORITY_LABELS: Record<Card["priority"], string> = {
	none: "", low: "Low", medium: "Med", high: "High",
};
const COLUMN_COLORS: Record<string, string> = {
	"todo": "var(--accent)", "in-progress": "#facc15", "done": "#4ade80",
};

function formatDate(iso: string): string {
	const d = new Date(iso);
	const now = new Date();
	const month = d.toLocaleString("en", { month: "short" });
	const day = d.getDate();
	return d.getFullYear() !== now.getFullYear() ? `${month} ${day}, ${d.getFullYear()}` : `${month} ${day}`;
}

function isOverdue(iso: string): boolean {
	const d = new Date(iso);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return d < today;
}

// ─── Drag State ───────────────────────────────────────────

interface DragInfo {
	cardId: string;
	ghostEl: HTMLElement | null;
	offsetX: number;
	offsetY: number;
	hoverCol: string | null;
	hoverIndex: number;
}

let drag: DragInfo | null = null;
let dragListeners = new Set<() => void>();
function notifyDrag() { for (const l of dragListeners) l(); }

// ─── Card Component ───────────────────────────────────────

function CardView({ card, columnId, columns }: { card: Card; columnId: string; columns: Column[] }) {
	const [editing, setLocalEditing] = useState(false);
	const [title, setTitle] = useState(card.title);
	const [desc, setDesc] = useState(card.description);
	const [prio, setPrio] = useState(card.priority);
	const [due, setDue] = useState(card.dueDate ?? "");
	const [confirmDel, setConfirmDel] = useState(false);
	const titleRef = useRef<HTMLInputElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const mouseDown = useRef<{ x: number; y: number } | null>(null);
	const dragging = useRef(false);

	useEffect(() => { if (editing && titleRef.current) titleRef.current.focus(); }, [editing]);

	const save = () => {
		if (!title.trim()) return;
		updateCard(card.id, { title: title.trim(), description: desc.trim(), priority: prio, dueDate: due || null });
		setLocalEditing(false);
	};
	const cancel = () => {
		setTitle(card.title); setDesc(card.description); setPrio(card.priority); setDue(card.dueDate ?? "");
		setLocalEditing(false); setConfirmDel(false);
	};

	const onMouseDown = (e: React.MouseEvent) => {
		if (editing || (e.target as HTMLElement).closest("button, select, input, textarea")) return;
		e.preventDefault();
		mouseDown.current = { x: e.clientX, y: e.clientY };
		dragging.current = false;

		const onMove = (me: MouseEvent) => {
			if (!mouseDown.current) return;
			const dx = me.clientX - mouseDown.current.x;
			const dy = me.clientY - mouseDown.current.y;
			if (!dragging.current && Math.abs(dx) + Math.abs(dy) > 5) {
				dragging.current = true;
				const rect = cardRef.current!.getBoundingClientRect();
				const ghost = document.createElement("div");
				ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;width:${Math.min(rect.width, 280)}px;padding:8px 10px;background:var(--bg-2);border:1px solid var(--accent);border-radius:6px;opacity:0.92;box-shadow:0 4px 16px rgba(0,0,0,0.35);font-family:var(--font-mono);font-size:var(--text-base);color:var(--text-0);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
				ghost.textContent = card.title;
				document.body.appendChild(ghost);
				drag = { cardId: card.id, ghostEl: ghost, offsetX: me.clientX - rect.left, offsetY: me.clientY - rect.top, hoverCol: null, hoverIndex: 0 };
				notifyDrag();
			}
			if (dragging.current && drag?.ghostEl) {
				drag.ghostEl.style.left = `${me.clientX - drag.offsetX}px`;
				drag.ghostEl.style.top = `${me.clientY - drag.offsetY}px`;
				const colEls = document.querySelectorAll("[data-kanban-col]");
				let col: string | null = null, idx = 0;
				for (const el of colEls) {
					const r = el.getBoundingClientRect();
					if (me.clientX >= r.left && me.clientX <= r.right) {
						col = el.getAttribute("data-kanban-col");
						const cards = el.querySelectorAll("[data-kanban-card]");
						idx = cards.length;
						for (let i = 0; i < cards.length; i++) {
							const cr = cards[i].getBoundingClientRect();
							if (me.clientY < cr.top + cr.height / 2) { idx = i; break; }
						}
						break;
					}
				}
				if (drag.hoverCol !== col || drag.hoverIndex !== idx) {
					drag.hoverCol = col; drag.hoverIndex = idx; notifyDrag();
				}
			}
		};
		const onUp = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			if (dragging.current && drag) {
				if (drag.hoverCol) reorderCard(drag.cardId, drag.hoverCol, drag.hoverIndex);
				drag.ghostEl?.remove(); drag = null; notifyDrag();
			} else {
				setLocalEditing(true);
			}
			mouseDown.current = null; dragging.current = false;
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
	};

	if (editing) {
		return React.createElement("div", { style: S.cardEdit },
			React.createElement("input", { ref: titleRef, style: S.input, value: title, onChange: (e: any) => setTitle(e.target.value), placeholder: "Title", onKeyDown: (e: any) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); } }),
			React.createElement("textarea", { style: { ...S.input, ...S.textarea }, value: desc, onChange: (e: any) => setDesc(e.target.value), placeholder: "Description (optional)", rows: 2 }),
			React.createElement("div", { style: S.formRow },
				React.createElement("label", { style: S.formLabel }, "Priority"),
				React.createElement("select", { style: S.select, value: prio, onChange: (e: any) => setPrio(e.target.value) },
					React.createElement("option", { value: "none" }, "None"), React.createElement("option", { value: "low" }, "Low"),
					React.createElement("option", { value: "medium" }, "Medium"), React.createElement("option", { value: "high" }, "High")),
			),
			React.createElement("div", { style: S.formRow },
				React.createElement("label", { style: S.formLabel }, "Due"),
				React.createElement("input", { style: S.input, type: "date", value: due, onChange: (e: any) => setDue(e.target.value) }),
			),
			React.createElement("div", { style: S.formRow },
				React.createElement("label", { style: S.formLabel }, "Move to"),
				React.createElement("select", { style: S.select, value: columnId, onChange: (e: any) => { reorderCard(card.id, e.target.value, 999); setLocalEditing(false); } },
					...columns.map(c => React.createElement("option", { key: c.id, value: c.id }, c.name))),
			),
			React.createElement("div", { style: S.formActions },
				React.createElement("button", { style: S.btnSave, onClick: save }, "Save"),
				React.createElement("button", { style: S.btnCancel, onClick: cancel }, "Cancel"),
				React.createElement("div", { style: { flex: 1 } }),
				confirmDel
					? React.createElement("div", { style: { display: "flex", gap: "4px", alignItems: "center" } },
						React.createElement("span", { style: { fontSize: "var(--text-xs)", color: "var(--text-3)" } }, "Sure?"),
						React.createElement("button", { style: S.btnDelete, onClick: () => deleteCard(card.id) }, "Yes"),
						React.createElement("button", { style: S.btnCancel, onClick: () => setConfirmDel(false) }, "No"))
					: React.createElement("button", { style: S.btnDelete, onClick: () => setConfirmDel(true) }, "Delete"),
			),
		);
	}

	const overdue = card.dueDate && isOverdue(card.dueDate);
	const isDragged = drag?.cardId === card.id;

	return React.createElement("div", { ref: cardRef, style: { ...S.card, ...(isDragged ? { opacity: 0.3 } : {}) }, onMouseDown, "data-kanban-card": card.id },
		React.createElement("div", { style: S.cardTitle }, card.title),
		(card.priority !== "none" || card.dueDate) && React.createElement("div", { style: S.cardMeta },
			card.priority !== "none" && React.createElement("span", { style: { ...S.badge, background: PRIORITY_COLORS[card.priority] } }, PRIORITY_LABELS[card.priority]),
			card.dueDate && React.createElement("span", { style: { fontSize: "var(--text-xs)", color: overdue ? "#f87171" : "var(--text-3)" } }, formatDate(card.dueDate)),
		),
		card.description && React.createElement("div", { style: S.cardDesc }, card.description),
	);
}

// ─── Add Card Form ────────────────────────────────────────

function AddCardForm({ columnId, onClose }: { columnId: string; onClose: () => void }) {
	const [title, setTitle] = useState("");
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => { ref.current?.focus(); }, []);

	const save = () => { if (title.trim()) addCard(columnId, title, "", "none", null); };

	return React.createElement("div", { style: { ...S.cardEdit, margin: "0 8px 4px" } },
		React.createElement("input", { ref, style: S.input, value: title, onChange: (e: any) => setTitle(e.target.value), placeholder: "Task title — Enter to add", onKeyDown: (e: any) => { if (e.key === "Enter" && title.trim()) save(); if (e.key === "Escape") onClose(); } }),
		React.createElement("div", { style: S.formActions },
			React.createElement("button", { style: S.btnSave, onClick: save, disabled: !title.trim() }, "Add"),
			React.createElement("button", { style: S.btnCancel, onClick: onClose }, "Cancel"),
		),
	);
}

// ─── Column Component ─────────────────────────────────────

function ColumnView({ column, columns, addingToColumn }: { column: Column; columns: Column[]; addingToColumn: string | null }) {
	const [, rerender] = useState(0);
	useEffect(() => { const cb = () => rerender(n => n + 1); dragListeners.add(cb); return () => { dragListeners.delete(cb); }; }, []);

	const isHover = drag && drag.hoverCol === column.id;
	const accent = COLUMN_COLORS[column.id] ?? "var(--accent)";

	return React.createElement("div", { style: { ...S.column, ...(isHover ? { background: "var(--bg-2)" } : {}) }, "data-kanban-col": column.id },
		React.createElement("div", { style: S.colHeader },
			React.createElement("div", { style: { ...S.colDot, background: accent } }),
			React.createElement("span", { style: S.colName }, column.name),
			React.createElement("span", { style: S.colCount }, column.cards.length),
			React.createElement("button", { style: S.addBtn, onClick: () => setAdding(addingToColumn === column.id ? null : column.id), title: "Add task" }, "+"),
		),
		addingToColumn === column.id && React.createElement(AddCardForm, { columnId: column.id, onClose: () => setAdding(null) }),
		React.createElement("div", { style: S.cardList },
			...column.cards.map((card, i) =>
				React.createElement(React.Fragment, { key: card.id },
					isHover && drag!.hoverIndex === i && React.createElement("div", { style: S.dropLine }),
					React.createElement(CardView, { card, columnId: column.id, columns }),
				)
			),
			isHover && drag!.hoverIndex >= column.cards.length && React.createElement("div", { style: S.dropLine }),
			addingToColumn !== column.id && React.createElement("div", {
				style: S.addCardBtn,
				onClick: () => setAdding(column.id),
			}, "+ Add a task"),
		),
	);
}

// ─── New Board Form ───────────────────────────────────────

function NewBoardForm() {
	const [name, setName] = useState("");
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => { ref.current?.focus(); }, []);

	const presets = getBoardPresets();

	return React.createElement("div", { style: S.newBoard },
		React.createElement("div", { style: S.newBoardPresets },
			...presets.map(p =>
				React.createElement("button", { key: p.label, style: S.presetBtn, onClick: () => createBoard(p.name) }, p.label)
			),
		),
		React.createElement("div", { style: { display: "flex", gap: "4px" } },
			React.createElement("input", { ref, style: { ...S.input, flex: 1 }, value: name, onChange: (e: any) => setName(e.target.value), placeholder: "Board name...", onKeyDown: (e: any) => { if (e.key === "Enter" && name.trim()) createBoard(name); if (e.key === "Escape") setCreatingBoard(false); } }),
			React.createElement("button", { style: S.btnSave, onClick: () => { if (name.trim()) createBoard(name); }, disabled: !name.trim() }, "Create"),
			React.createElement("button", { style: S.btnCancel, onClick: () => setCreatingBoard(false) }, "Cancel"),
		),
	);
}

// ─── Board Selector (dropdown, searchable, scales to hundreds) ─────

function BoardSelector({ boards, activeId, onNew }: { boards: Board[]; activeId: string | null; onNew: () => void }) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [confirmDel, setConfirmDel] = useState<string | null>(null);
	const [renaming, setRenaming] = useState(false);
	const [renameName, setRenameName] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);
	const renameRef = useRef<HTMLInputElement>(null);
	const dropRef = useRef<HTMLDivElement>(null);

	const activeBoard = boards.find(b => b.id === activeId);

	useEffect(() => {
		if (open && searchRef.current) searchRef.current.focus();
	}, [open]);

	useEffect(() => {
		if (renaming && renameRef.current) { renameRef.current.focus(); renameRef.current.select(); }
	}, [renaming]);

	// Close dropdown on outside click
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	const startRename = () => {
		if (!activeBoard) return;
		setRenameName(activeBoard.name);
		setRenaming(true);
		setOpen(false);
	};

	const commitRename = () => {
		if (activeBoard && renameName.trim()) {
			renameBoard(activeBoard.id, renameName);
		}
		setRenaming(false);
	};

	const filtered = search.trim()
		? boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
		: boards;

	// Sort: newest first
	const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	return React.createElement("div", { style: S.selector, ref: dropRef },
		renaming
			? React.createElement("input", {
				ref: renameRef,
				style: { ...S.input, fontWeight: 600, fontSize: "var(--text-md)", width: "160px", padding: "5px 8px", margin: "4px 0 4px 6px" },
				value: renameName,
				onChange: (e: any) => setRenameName(e.target.value),
				onKeyDown: (e: any) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); },
				onBlur: commitRename,
			})
			: React.createElement("button", {
				style: S.selectorBtn,
				onClick: () => { setOpen(!open); setSearch(""); setConfirmDel(null); },
				onDoubleClick: (e: any) => { e.preventDefault(); startRename(); },
				title: "Click to browse boards · Double-click to rename",
			},
				React.createElement("span", { style: { fontWeight: 600 } }, activeBoard?.name ?? "Select board"),
				React.createElement("span", { style: { fontSize: "var(--text-xs)", marginLeft: "4px", opacity: 0.5 } }, open ? "▲" : "▼"),
			),
		React.createElement("button", { style: S.newTabBtn, onClick: onNew, title: "New board" }, "+"),
		activeBoard && React.createElement("button", {
			style: S.tabClose,
			onClick: () => {
				if (confirmDel === activeBoard.id) { deleteBoard(activeBoard.id); setConfirmDel(null); }
				else setConfirmDel(activeBoard.id);
			},
			title: confirmDel === activeBoard.id ? "Click again to confirm" : "Delete this board",
		}, confirmDel === activeBoard.id ? "✓" : "×"),
		confirmDel && React.createElement("button", { style: S.tabClose, onClick: () => setConfirmDel(null), title: "Cancel delete" }, "✕"),

		open && React.createElement("div", { style: S.dropdown },
			boards.length > 5 && React.createElement("input", {
				ref: searchRef,
				style: { ...S.input, margin: "0 0 4px", fontSize: "var(--text-sm)" },
				value: search,
				onChange: (e: any) => setSearch(e.target.value),
				placeholder: "Search boards...",
			}),
			React.createElement("div", { style: S.dropdownList },
				sorted.length === 0 && React.createElement("div", { style: { fontSize: "var(--text-sm)", color: "var(--text-3)", padding: "8px", textAlign: "center" as const } }, "No boards found"),
				...sorted.map(b => {
					const isActive = b.id === activeId;
					const date = new Date(b.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" });
					const taskCount = b.columns.reduce((s, c) => s + c.cards.length, 0);
					return React.createElement("div", {
						key: b.id,
						style: { ...S.dropdownItem, ...(isActive ? { background: "var(--accent-dim)", color: "var(--accent)" } : {}) },
						onClick: () => { switchBoard(b.id); setOpen(false); },
					},
						React.createElement("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const } }, b.name),
						React.createElement("span", { style: { fontSize: "var(--text-xs)", color: "var(--text-3)", flexShrink: 0 } }, `${taskCount} · ${date}`),
					);
				}),
			),
			boards.length > 0 && React.createElement("div", { style: { fontSize: "var(--text-xs)", color: "var(--text-3)", padding: "4px 6px", borderTop: "1px solid var(--border)", textAlign: "center" as const } }, `${boards.length} board${boards.length !== 1 ? "s" : ""}`),
		),
	);
}

// ─── Empty State ──────────────────────────────────────────

function EmptyState() {
	const presets = getBoardPresets();
	return React.createElement("div", { style: S.empty },
		React.createElement("div", { style: { fontSize: "var(--text-md)", fontWeight: 600, marginBottom: "6px" } }, "Create your first board"),
		React.createElement("div", { style: { fontSize: "var(--text-base)", color: "var(--text-3)", marginBottom: "16px", lineHeight: 1.5 } }, "Organize your tasks for today, this week, or any custom timeframe."),
		React.createElement("div", { style: { display: "flex", gap: "6px" } },
			...presets.map(p =>
				React.createElement("button", { key: p.label, style: S.presetBtn, onClick: () => createBoard(p.name) }, p.label)
			),
			React.createElement("button", { style: S.presetBtn, onClick: () => setCreatingBoard(true) }, "Custom..."),
		),
	);
}

// ─── Main Panel ───────────────────────────────────────────

export function KanbanPanel() {
	const [state, setState] = useState<KanbanState>(getState());
	useEffect(() => subscribe(() => setState(getState())), []);

	const board = state.boards.find(b => b.id === state.activeBoardId) ?? null;

	if (state.boards.length === 0 && !state.creatingBoard) {
		return React.createElement("div", { style: S.root }, React.createElement(EmptyState));
	}

	return React.createElement("div", { style: S.root },
		React.createElement("div", { style: S.header },
			React.createElement(BoardSelector, { boards: state.boards, activeId: state.activeBoardId, onNew: () => setCreatingBoard(true) }),
			board && React.createElement("span", { style: S.taskCount },
				board.columns.reduce((s, c) => s + c.cards.length, 0), " tasks"
			),
		),
		state.creatingBoard && React.createElement(NewBoardForm),
		board && React.createElement("div", { style: S.board },
			...board.columns.map(col =>
				React.createElement(ColumnView, { key: col.id, column: col, columns: board.columns, addingToColumn: state.addingToColumn })
			),
		),
	);
}

// ─── Styles ───────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
	root: { display: "flex", flexDirection: "column", height: "100%", fontFamily: "var(--font-mono)", color: "var(--text-0)", background: "var(--bg-1)", overflow: "hidden" },
	header: { display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", flexShrink: 0, padding: "0 12px 0 0" },
	taskCount: { fontSize: "var(--text-base)", color: "var(--text-3)", marginLeft: "auto", flexShrink: 0 },

	// Board selector
	selector: { display: "flex", alignItems: "center", gap: "4px", position: "relative" as const },
	selectorBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--text-0)", fontFamily: "var(--font-mono)", fontSize: "var(--text-md)", padding: "8px 10px", display: "flex", alignItems: "center" },
	tabClose: { background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "var(--text-md)", padding: "4px 6px", lineHeight: 1, opacity: 0.6 },
	newTabBtn: { background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "var(--text-2xl)", padding: "4px 8px", lineHeight: 1 },
	dropdown: { position: "absolute" as const, top: "100%", left: 0, zIndex: 50, background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", minWidth: "260px", maxWidth: "360px", boxShadow: "0 6px 20px rgba(0,0,0,0.3)" },
	dropdownList: { maxHeight: "300px", overflowY: "auto" as const, display: "flex", flexDirection: "column" as const, gap: "2px" },
	dropdownItem: { display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "var(--text-base)", color: "var(--text-1)", transition: "background 0.08s" },

	// New board
	newBoard: { padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 },
	newBoardPresets: { display: "flex", gap: "6px" },
	presetBtn: { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "6px 14px", cursor: "pointer" },

	// Board
	board: { display: "flex", flex: 1, gap: "1px", overflow: "hidden", background: "var(--border)" },
	column: { flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-1)", minWidth: 0, overflow: "hidden", transition: "background 0.1s" },
	colHeader: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", flexShrink: 0 },
	colDot: { width: "9px", height: "9px", borderRadius: "50%", flexShrink: 0 },
	colName: { fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text-1)", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
	colCount: { fontSize: "var(--text-sm)", color: "var(--text-3)", background: "var(--bg-2)", borderRadius: "8px", padding: "1px 6px", lineHeight: "16px" },
	addBtn: { marginLeft: "auto", background: "none", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-3)", cursor: "pointer", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xl)", lineHeight: 1, padding: 0 },
	cardList: { flex: 1, overflowY: "auto", padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: "5px" },

	// Cards
	card: { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px 10px", cursor: "grab", transition: "opacity 0.1s", userSelect: "none" as const, maxWidth: "300px" },
	cardTitle: { fontSize: "var(--text-base)", fontWeight: 500, color: "var(--text-0)", lineHeight: 1.4 },
	cardMeta: { display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" },
	badge: { fontSize: "var(--text-xs)", fontWeight: 700, color: "#000", padding: "1px 5px", borderRadius: "3px", textTransform: "uppercase" as const, letterSpacing: "0.3px", lineHeight: "15px" },
	cardDesc: { fontSize: "var(--text-sm)", color: "var(--text-3)", marginTop: "3px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
	emptyCol: { textAlign: "center" as const, color: "var(--text-3)", fontSize: "var(--text-base)", padding: "20px 0", opacity: 0.4 },
	addCardBtn: { background: "transparent", border: "1px dashed var(--border)", borderRadius: "6px", padding: "8px 10px", cursor: "pointer", fontSize: "var(--text-base)", color: "var(--text-3)", textAlign: "center" as const, transition: "border-color 0.1s, color 0.1s", maxWidth: "300px" },
	dropLine: { height: "2px", background: "var(--accent)", borderRadius: "1px", margin: "1px 0", flexShrink: 0 },

	// Empty state
	empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" as const, padding: "20px" },

	// Forms
	cardEdit: { background: "var(--bg-2)", border: "1px solid var(--accent)", borderRadius: "6px", padding: "8px", display: "flex", flexDirection: "column", gap: "6px", maxWidth: "300px" },
	input: { background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-0)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "5px 8px", outline: "none", width: "100%", boxSizing: "border-box" as const },
	textarea: { resize: "vertical" as const, minHeight: "36px", lineHeight: 1.5 },
	select: { background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-0)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "4px 6px", outline: "none", cursor: "pointer" },
	formRow: { display: "flex", alignItems: "center", gap: "8px" },
	formLabel: { fontSize: "var(--text-base)", color: "var(--text-3)", width: "55px", flexShrink: 0 },
	formActions: { display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" },
	btnSave: { background: "var(--accent)", border: "none", borderRadius: "4px", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "5px 12px", cursor: "pointer" },
	btnCancel: { background: "none", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "5px 10px", cursor: "pointer" },
	btnDelete: { background: "none", border: "1px solid transparent", borderRadius: "4px", color: "#f87171", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", padding: "5px 10px", cursor: "pointer" },
};
