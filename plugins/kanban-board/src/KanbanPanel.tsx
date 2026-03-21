import * as React from "react";
import {
	getState, subscribe,
	addCard, updateCard, deleteCard, reorderCard,
	setEditing, setAdding,
	type Card, type Column, type KanbanState,
} from "./activate";

const { useState, useEffect, useRef, useCallback } = React;

// ─── Priority Helpers ─────────────────────────────────────

const PRIORITY_COLORS: Record<Card["priority"], string> = {
	none: "var(--text-3)",
	low: "#4ade80",
	medium: "#facc15",
	high: "#f87171",
};

const PRIORITY_LABELS: Record<Card["priority"], string> = {
	none: "",
	low: "Low",
	medium: "Med",
	high: "High",
};

function formatDate(iso: string): string {
	const d = new Date(iso);
	const now = new Date();
	const month = d.toLocaleString("en", { month: "short" });
	const day = d.getDate();
	if (d.getFullYear() !== now.getFullYear()) {
		return `${month} ${day}, ${d.getFullYear()}`;
	}
	return `${month} ${day}`;
}

function isOverdue(iso: string): boolean {
	const d = new Date(iso);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return d < today;
}

// ─── Column Colors ────────────────────────────────────────

const COLUMN_COLORS: Record<string, string> = {
	"todo": "var(--accent)",
	"in-progress": "#facc15",
	"done": "#4ade80",
};

// ─── Drag State ───────────────────────────────────────────

let dragCardId: string | null = null;
let dragSourceCol: string | null = null;

// ─── Card Component ───────────────────────────────────────

function CardView({ card, columnId, columns }: { card: Card; columnId: string; columns: Column[] }) {
	const [editing, setLocalEditing] = useState(false);
	const [title, setTitle] = useState(card.title);
	const [description, setDescription] = useState(card.description);
	const [priority, setPriority] = useState(card.priority);
	const [dueDate, setDueDate] = useState(card.dueDate ?? "");
	const [confirmDelete, setConfirmDelete] = useState(false);
	const titleRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing && titleRef.current) titleRef.current.focus();
	}, [editing]);

	const handleSave = () => {
		if (!title.trim()) return;
		updateCard(card.id, {
			title: title.trim(),
			description: description.trim(),
			priority,
			dueDate: dueDate || null,
		});
		setLocalEditing(false);
	};

	const handleCancel = () => {
		setTitle(card.title);
		setDescription(card.description);
		setPriority(card.priority);
		setDueDate(card.dueDate ?? "");
		setLocalEditing(false);
		setConfirmDelete(false);
	};

	const handleDragStart = (e: React.DragEvent) => {
		dragCardId = card.id;
		dragSourceCol = columnId;
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", card.id);
		const el = e.currentTarget as HTMLElement;
		requestAnimationFrame(() => { el.style.opacity = "0.4"; });
	};

	const handleDragEnd = (e: React.DragEvent) => {
		(e.currentTarget as HTMLElement).style.opacity = "1";
		dragCardId = null;
		dragSourceCol = null;
	};

	if (editing) {
		return React.createElement("div", { style: S.cardEdit },
			React.createElement("input", {
				ref: titleRef,
				style: S.input,
				value: title,
				onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
				placeholder: "Card title",
				onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); },
			}),
			React.createElement("textarea", {
				style: { ...S.input, ...S.textarea },
				value: description,
				onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
				placeholder: "Description (optional)",
				rows: 2,
			}),
			React.createElement("div", { style: S.formRow },
				React.createElement("label", { style: S.formLabel }, "Priority"),
				React.createElement("select", {
					style: S.select,
					value: priority,
					onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as Card["priority"]),
				},
					React.createElement("option", { value: "none" }, "None"),
					React.createElement("option", { value: "low" }, "Low"),
					React.createElement("option", { value: "medium" }, "Medium"),
					React.createElement("option", { value: "high" }, "High"),
				),
			),
			React.createElement("div", { style: S.formRow },
				React.createElement("label", { style: S.formLabel }, "Due date"),
				React.createElement("input", {
					style: S.input,
					type: "date",
					value: dueDate,
					onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value),
				}),
			),
			React.createElement("div", { style: S.formRow },
				React.createElement("label", { style: S.formLabel }, "Move to"),
				React.createElement("select", {
					style: S.select,
					value: columnId,
					onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
						reorderCard(card.id, e.target.value, 999);
						setLocalEditing(false);
					},
				},
					...columns.map(col =>
						React.createElement("option", { key: col.id, value: col.id }, col.name)
					),
				),
			),
			React.createElement("div", { style: S.formActions },
				React.createElement("button", { style: S.btnSave, onClick: handleSave }, "Save"),
				React.createElement("button", { style: S.btnCancel, onClick: handleCancel }, "Cancel"),
				React.createElement("div", { style: { flex: 1 } }),
				confirmDelete
					? React.createElement("div", { style: { display: "flex", gap: "4px", alignItems: "center" } },
						React.createElement("span", { style: { fontSize: "10px", color: "var(--text-3)" } }, "Sure?"),
						React.createElement("button", { style: S.btnDelete, onClick: () => deleteCard(card.id) }, "Yes"),
						React.createElement("button", { style: S.btnCancel, onClick: () => setConfirmDelete(false) }, "No"),
					)
					: React.createElement("button", { style: S.btnDelete, onClick: () => setConfirmDelete(true) }, "Delete"),
			),
		);
	}

	const overdue = card.dueDate && isOverdue(card.dueDate);

	return React.createElement("div", {
		style: S.card,
		draggable: true,
		onDragStart: handleDragStart,
		onDragEnd: handleDragEnd,
		onClick: () => setLocalEditing(true),
	},
		React.createElement("div", { style: S.cardTitle }, card.title),
		(card.priority !== "none" || card.dueDate) && React.createElement("div", { style: S.cardMeta },
			card.priority !== "none" && React.createElement("span", {
				style: { ...S.priorityBadge, background: PRIORITY_COLORS[card.priority] },
			}, PRIORITY_LABELS[card.priority]),
			card.dueDate && React.createElement("span", {
				style: { ...S.dateBadge, color: overdue ? "#f87171" : "var(--text-3)" },
			}, formatDate(card.dueDate)),
		),
		card.description && React.createElement("div", { style: S.cardDesc }, card.description),
	);
}

// ─── Add Card Form ────────────────────────────────────────

function AddCardForm({ columnId, onClose }: { columnId: string; onClose: () => void }) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<Card["priority"]>("none");
	const [dueDate, setDueDate] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSave = () => {
		if (!title.trim()) return;
		addCard(columnId, title, description, priority, dueDate || null);
	};

	return React.createElement("div", { style: S.cardEdit },
		React.createElement("input", {
			ref: inputRef,
			style: S.input,
			value: title,
			onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
			placeholder: "Card title",
			onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" && title.trim()) handleSave(); if (e.key === "Escape") onClose(); },
		}),
		React.createElement("textarea", {
			style: { ...S.input, ...S.textarea },
			value: description,
			onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
			placeholder: "Description (optional)",
			rows: 2,
		}),
		React.createElement("div", { style: S.formRow },
			React.createElement("label", { style: S.formLabel }, "Priority"),
			React.createElement("select", {
				style: S.select,
				value: priority,
				onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as Card["priority"]),
			},
				React.createElement("option", { value: "none" }, "None"),
				React.createElement("option", { value: "low" }, "Low"),
				React.createElement("option", { value: "medium" }, "Medium"),
				React.createElement("option", { value: "high" }, "High"),
			),
		),
		React.createElement("div", { style: S.formRow },
			React.createElement("label", { style: S.formLabel }, "Due date"),
			React.createElement("input", {
				style: S.input,
				type: "date",
				value: dueDate,
				onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value),
			}),
		),
		React.createElement("div", { style: S.formActions },
			React.createElement("button", { style: S.btnSave, onClick: handleSave, disabled: !title.trim() }, "Add"),
			React.createElement("button", { style: S.btnCancel, onClick: onClose }, "Cancel"),
		),
	);
}

// ─── Column Component ─────────────────────────────────────

function ColumnView({ column, columns, addingToColumn }: { column: Column; columns: Column[]; addingToColumn: string | null }) {
	const [dragOver, setDragOver] = useState(false);
	const [dropIndex, setDropIndex] = useState<number | null>(null);
	const cardsRef = useRef<HTMLDivElement>(null);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOver(true);

		// Calculate drop index from mouse position
		if (cardsRef.current) {
			const cards = Array.from(cardsRef.current.children) as HTMLElement[];
			let idx = cards.length;
			for (let i = 0; i < cards.length; i++) {
				const rect = cards[i].getBoundingClientRect();
				if (e.clientY < rect.top + rect.height / 2) {
					idx = i;
					break;
				}
			}
			setDropIndex(idx);
		}
	}, []);

	const handleDragLeave = useCallback(() => {
		setDragOver(false);
		setDropIndex(null);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
		setDropIndex(null);
		if (dragCardId) {
			reorderCard(dragCardId, column.id, dropIndex ?? column.cards.length);
		}
	}, [column.id, column.cards.length, dropIndex]);

	const accentColor = COLUMN_COLORS[column.id] ?? "var(--accent)";

	return React.createElement("div", {
		style: {
			...S.column,
			...(dragOver ? { background: "var(--bg-2)" } : {}),
		},
		onDragOver: handleDragOver,
		onDragLeave: handleDragLeave,
		onDrop: handleDrop,
	},
		React.createElement("div", { style: S.columnHeader },
			React.createElement("div", { style: { ...S.columnDot, background: accentColor } }),
			React.createElement("span", { style: S.columnName }, column.name),
			React.createElement("span", { style: S.columnCount }, column.cards.length),
			React.createElement("button", {
				style: S.addBtn,
				onClick: () => setAdding(addingToColumn === column.id ? null : column.id),
				title: "Add card",
			}, "+"),
		),
		addingToColumn === column.id && React.createElement(AddCardForm, {
			columnId: column.id,
			onClose: () => setAdding(null),
		}),
		React.createElement("div", { style: S.cardList, ref: cardsRef },
			...column.cards.map((card, i) =>
				React.createElement(React.Fragment, { key: card.id },
					dragOver && dropIndex === i && React.createElement("div", { style: S.dropIndicator }),
					React.createElement(CardView, { card, columnId: column.id, columns }),
				)
			),
			dragOver && dropIndex === column.cards.length && React.createElement("div", { style: S.dropIndicator }),
			column.cards.length === 0 && !addingToColumn && React.createElement("div", { style: S.emptyCol }, "No cards"),
		),
	);
}

// ─── Main Panel ───────────────────────────────────────────

export function KanbanPanel() {
	const [state, setState] = useState<KanbanState>(getState());

	useEffect(() => {
		return subscribe(() => setState(getState()));
	}, []);

	return React.createElement("div", { style: S.root },
		React.createElement("div", { style: S.header },
			React.createElement("span", { style: S.headerTitle }, "Kanban Board"),
			React.createElement("span", { style: S.headerCount },
				state.columns.reduce((s, c) => s + c.cards.length, 0), " tasks"
			),
		),
		React.createElement("div", { style: S.board },
			...state.columns.map(col =>
				React.createElement(ColumnView, {
					key: col.id,
					column: col,
					columns: state.columns,
					addingToColumn: state.addingToColumn,
				})
			),
		),
	);
}

// ─── Styles ───────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
	root: {
		display: "flex",
		flexDirection: "column",
		height: "100%",
		fontFamily: "var(--font-mono)",
		color: "var(--text-0)",
		background: "var(--bg-1)",
		overflow: "hidden",
	},
	header: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		padding: "8px 14px",
		borderBottom: "1px solid var(--border)",
		flexShrink: 0,
	},
	headerTitle: {
		fontWeight: 600,
		fontSize: "var(--text-sm)",
	},
	headerCount: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
	},
	board: {
		display: "flex",
		flex: 1,
		gap: "1px",
		overflow: "hidden",
		background: "var(--border)",
	},
	column: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		background: "var(--bg-1)",
		minWidth: 0,
		overflow: "hidden",
		transition: "background 0.1s",
	},
	columnHeader: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		padding: "8px 10px",
		flexShrink: 0,
	},
	columnDot: {
		width: "8px",
		height: "8px",
		borderRadius: "50%",
		flexShrink: 0,
	},
	columnName: {
		fontWeight: 600,
		fontSize: "var(--text-xs)",
		color: "var(--text-1)",
		textTransform: "uppercase" as const,
		letterSpacing: "0.5px",
	},
	columnCount: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
		background: "var(--bg-2)",
		borderRadius: "8px",
		padding: "0 5px",
		lineHeight: "16px",
	},
	addBtn: {
		marginLeft: "auto",
		background: "none",
		border: "1px solid var(--border)",
		borderRadius: "4px",
		color: "var(--text-3)",
		cursor: "pointer",
		width: "20px",
		height: "20px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "14px",
		lineHeight: 1,
		padding: 0,
	},
	cardList: {
		flex: 1,
		overflowY: "auto",
		padding: "0 8px 8px",
		display: "flex",
		flexDirection: "column",
		gap: "4px",
	},
	card: {
		background: "var(--bg-2)",
		border: "1px solid var(--border)",
		borderRadius: "6px",
		padding: "8px 10px",
		cursor: "grab",
		transition: "border-color 0.1s, box-shadow 0.1s",
		userSelect: "none" as const,
	},
	cardTitle: {
		fontSize: "var(--text-sm)",
		fontWeight: 500,
		color: "var(--text-0)",
		lineHeight: 1.3,
	},
	cardMeta: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		marginTop: "4px",
	},
	priorityBadge: {
		fontSize: "8px",
		fontWeight: 700,
		color: "#000",
		padding: "1px 5px",
		borderRadius: "3px",
		textTransform: "uppercase" as const,
		letterSpacing: "0.3px",
	},
	dateBadge: {
		fontSize: "var(--text-xs)",
	},
	cardDesc: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
		marginTop: "4px",
		lineHeight: 1.4,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap" as const,
	},
	emptyCol: {
		textAlign: "center" as const,
		color: "var(--text-3)",
		fontSize: "var(--text-xs)",
		padding: "20px 0",
		opacity: 0.5,
	},
	dropIndicator: {
		height: "2px",
		background: "var(--accent)",
		borderRadius: "1px",
		margin: "2px 0",
		flexShrink: 0,
	},
	// ─── Forms ────────────────────────────────────────────
	cardEdit: {
		background: "var(--bg-2)",
		border: "1px solid var(--accent)",
		borderRadius: "6px",
		padding: "8px",
		display: "flex",
		flexDirection: "column",
		gap: "6px",
	},
	input: {
		background: "var(--bg-1)",
		border: "1px solid var(--border)",
		borderRadius: "4px",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "4px 6px",
		outline: "none",
		width: "100%",
		boxSizing: "border-box" as const,
	},
	textarea: {
		resize: "vertical" as const,
		minHeight: "32px",
		lineHeight: 1.4,
	},
	select: {
		background: "var(--bg-1)",
		border: "1px solid var(--border)",
		borderRadius: "4px",
		color: "var(--text-0)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "3px 4px",
		outline: "none",
		cursor: "pointer",
	},
	formRow: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
	},
	formLabel: {
		fontSize: "var(--text-xs)",
		color: "var(--text-3)",
		width: "55px",
		flexShrink: 0,
	},
	formActions: {
		display: "flex",
		alignItems: "center",
		gap: "4px",
		marginTop: "2px",
	},
	btnSave: {
		background: "var(--accent)",
		border: "none",
		borderRadius: "4px",
		color: "#fff",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "3px 10px",
		cursor: "pointer",
	},
	btnCancel: {
		background: "none",
		border: "1px solid var(--border)",
		borderRadius: "4px",
		color: "var(--text-3)",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "3px 8px",
		cursor: "pointer",
	},
	btnDelete: {
		background: "none",
		border: "1px solid transparent",
		borderRadius: "4px",
		color: "#f87171",
		fontFamily: "var(--font-mono)",
		fontSize: "var(--text-xs)",
		padding: "3px 8px",
		cursor: "pointer",
	},
};
