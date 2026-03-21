var __hermes_plugin__ = (function(exports, react) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
		if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
		return target;
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	react = __toESM(react);
	//#region src/KanbanPanel.tsx
	var KanbanPanel_exports = /* @__PURE__ */ __exportAll({ KanbanPanel: () => KanbanPanel });
	function formatDate(iso) {
		const d = new Date(iso);
		const now = /* @__PURE__ */ new Date();
		const month = d.toLocaleString("en", { month: "short" });
		const day = d.getDate();
		if (d.getFullYear() !== now.getFullYear()) return `${month} ${day}, ${d.getFullYear()}`;
		return `${month} ${day}`;
	}
	function isOverdue(iso) {
		const d = new Date(iso);
		const today = /* @__PURE__ */ new Date();
		today.setHours(0, 0, 0, 0);
		return d < today;
	}
	function CardView({ card, columnId, columns }) {
		const [editing, setLocalEditing] = useState(false);
		const [title, setTitle] = useState(card.title);
		const [description, setDescription] = useState(card.description);
		const [priority, setPriority] = useState(card.priority);
		const [dueDate, setDueDate] = useState(card.dueDate ?? "");
		const [confirmDelete, setConfirmDelete] = useState(false);
		const titleRef = useRef(null);
		useEffect(() => {
			if (editing && titleRef.current) titleRef.current.focus();
		}, [editing]);
		const handleSave = () => {
			if (!title.trim()) return;
			updateCard(card.id, {
				title: title.trim(),
				description: description.trim(),
				priority,
				dueDate: dueDate || null
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
		const handleDragStart = (e) => {
			dragCardId = card.id;
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", card.id);
			const el = e.currentTarget;
			requestAnimationFrame(() => {
				el.style.opacity = "0.4";
			});
		};
		const handleDragEnd = (e) => {
			e.currentTarget.style.opacity = "1";
			dragCardId = null;
		};
		if (editing) return react.createElement("div", { style: S.cardEdit }, react.createElement("input", {
			ref: titleRef,
			style: S.input,
			value: title,
			onChange: (e) => setTitle(e.target.value),
			placeholder: "Card title",
			onKeyDown: (e) => {
				if (e.key === "Enter") handleSave();
				if (e.key === "Escape") handleCancel();
			}
		}), react.createElement("textarea", {
			style: {
				...S.input,
				...S.textarea
			},
			value: description,
			onChange: (e) => setDescription(e.target.value),
			placeholder: "Description (optional)",
			rows: 2
		}), react.createElement("div", { style: S.formRow }, react.createElement("label", { style: S.formLabel }, "Priority"), react.createElement("select", {
			style: S.select,
			value: priority,
			onChange: (e) => setPriority(e.target.value)
		}, react.createElement("option", { value: "none" }, "None"), react.createElement("option", { value: "low" }, "Low"), react.createElement("option", { value: "medium" }, "Medium"), react.createElement("option", { value: "high" }, "High"))), react.createElement("div", { style: S.formRow }, react.createElement("label", { style: S.formLabel }, "Due date"), react.createElement("input", {
			style: S.input,
			type: "date",
			value: dueDate,
			onChange: (e) => setDueDate(e.target.value)
		})), react.createElement("div", { style: S.formRow }, react.createElement("label", { style: S.formLabel }, "Move to"), react.createElement("select", {
			style: S.select,
			value: columnId,
			onChange: (e) => {
				reorderCard(card.id, e.target.value, 999);
				setLocalEditing(false);
			}
		}, ...columns.map((col) => react.createElement("option", {
			key: col.id,
			value: col.id
		}, col.name)))), react.createElement("div", { style: S.formActions }, react.createElement("button", {
			style: S.btnSave,
			onClick: handleSave
		}, "Save"), react.createElement("button", {
			style: S.btnCancel,
			onClick: handleCancel
		}, "Cancel"), react.createElement("div", { style: { flex: 1 } }), confirmDelete ? react.createElement("div", { style: {
			display: "flex",
			gap: "4px",
			alignItems: "center"
		} }, react.createElement("span", { style: {
			fontSize: "10px",
			color: "var(--text-3)"
		} }, "Sure?"), react.createElement("button", {
			style: S.btnDelete,
			onClick: () => deleteCard(card.id)
		}, "Yes"), react.createElement("button", {
			style: S.btnCancel,
			onClick: () => setConfirmDelete(false)
		}, "No")) : react.createElement("button", {
			style: S.btnDelete,
			onClick: () => setConfirmDelete(true)
		}, "Delete")));
		const overdue = card.dueDate && isOverdue(card.dueDate);
		return react.createElement("div", {
			style: S.card,
			draggable: true,
			onDragStart: handleDragStart,
			onDragEnd: handleDragEnd,
			onClick: () => setLocalEditing(true)
		}, react.createElement("div", { style: S.cardTitle }, card.title), (card.priority !== "none" || card.dueDate) && react.createElement("div", { style: S.cardMeta }, card.priority !== "none" && react.createElement("span", { style: {
			...S.priorityBadge,
			background: PRIORITY_COLORS[card.priority]
		} }, PRIORITY_LABELS[card.priority]), card.dueDate && react.createElement("span", { style: {
			...S.dateBadge,
			color: overdue ? "#f87171" : "var(--text-3)"
		} }, formatDate(card.dueDate))), card.description && react.createElement("div", { style: S.cardDesc }, card.description));
	}
	function AddCardForm({ columnId, onClose }) {
		const [title, setTitle] = useState("");
		const [description, setDescription] = useState("");
		const [priority, setPriority] = useState("none");
		const [dueDate, setDueDate] = useState("");
		const inputRef = useRef(null);
		useEffect(() => {
			inputRef.current?.focus();
		}, []);
		const handleSave = () => {
			if (!title.trim()) return;
			addCard(columnId, title, description, priority, dueDate || null);
		};
		return react.createElement("div", { style: S.cardEdit }, react.createElement("input", {
			ref: inputRef,
			style: S.input,
			value: title,
			onChange: (e) => setTitle(e.target.value),
			placeholder: "Card title",
			onKeyDown: (e) => {
				if (e.key === "Enter" && title.trim()) handleSave();
				if (e.key === "Escape") onClose();
			}
		}), react.createElement("textarea", {
			style: {
				...S.input,
				...S.textarea
			},
			value: description,
			onChange: (e) => setDescription(e.target.value),
			placeholder: "Description (optional)",
			rows: 2
		}), react.createElement("div", { style: S.formRow }, react.createElement("label", { style: S.formLabel }, "Priority"), react.createElement("select", {
			style: S.select,
			value: priority,
			onChange: (e) => setPriority(e.target.value)
		}, react.createElement("option", { value: "none" }, "None"), react.createElement("option", { value: "low" }, "Low"), react.createElement("option", { value: "medium" }, "Medium"), react.createElement("option", { value: "high" }, "High"))), react.createElement("div", { style: S.formRow }, react.createElement("label", { style: S.formLabel }, "Due date"), react.createElement("input", {
			style: S.input,
			type: "date",
			value: dueDate,
			onChange: (e) => setDueDate(e.target.value)
		})), react.createElement("div", { style: S.formActions }, react.createElement("button", {
			style: S.btnSave,
			onClick: handleSave,
			disabled: !title.trim()
		}, "Add"), react.createElement("button", {
			style: S.btnCancel,
			onClick: onClose
		}, "Cancel")));
	}
	function ColumnView({ column, columns, addingToColumn }) {
		const [dragOver, setDragOver] = useState(false);
		const [dropIndex, setDropIndex] = useState(null);
		const cardsRef = useRef(null);
		const handleDragOver = useCallback((e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			setDragOver(true);
			if (cardsRef.current) {
				const cards = Array.from(cardsRef.current.children);
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
		const handleDrop = useCallback((e) => {
			e.preventDefault();
			setDragOver(false);
			setDropIndex(null);
			if (dragCardId) reorderCard(dragCardId, column.id, dropIndex ?? column.cards.length);
		}, [
			column.id,
			column.cards.length,
			dropIndex
		]);
		const accentColor = COLUMN_COLORS[column.id] ?? "var(--accent)";
		return react.createElement("div", {
			style: {
				...S.column,
				...dragOver ? { background: "var(--bg-2)" } : {}
			},
			onDragOver: handleDragOver,
			onDragLeave: handleDragLeave,
			onDrop: handleDrop
		}, react.createElement("div", { style: S.columnHeader }, react.createElement("div", { style: {
			...S.columnDot,
			background: accentColor
		} }), react.createElement("span", { style: S.columnName }, column.name), react.createElement("span", { style: S.columnCount }, column.cards.length), react.createElement("button", {
			style: S.addBtn,
			onClick: () => setAdding(addingToColumn === column.id ? null : column.id),
			title: "Add card"
		}, "+")), addingToColumn === column.id && react.createElement(AddCardForm, {
			columnId: column.id,
			onClose: () => setAdding(null)
		}), react.createElement("div", {
			style: S.cardList,
			ref: cardsRef
		}, ...column.cards.map((card, i) => react.createElement(react.Fragment, { key: card.id }, dragOver && dropIndex === i && react.createElement("div", { style: S.dropIndicator }), react.createElement(CardView, {
			card,
			columnId: column.id,
			columns
		}))), dragOver && dropIndex === column.cards.length && react.createElement("div", { style: S.dropIndicator }), column.cards.length === 0 && !addingToColumn && react.createElement("div", { style: S.emptyCol }, "No cards")));
	}
	function KanbanPanel() {
		const [state, setState] = useState(getState());
		useEffect(() => {
			return subscribe(() => setState(getState()));
		}, []);
		return react.createElement("div", { style: S.root }, react.createElement("div", { style: S.header }, react.createElement("span", { style: S.headerTitle }, "Kanban Board"), react.createElement("span", { style: S.headerCount }, state.columns.reduce((s, c) => s + c.cards.length, 0), " tasks")), react.createElement("div", { style: S.board }, ...state.columns.map((col) => react.createElement(ColumnView, {
			key: col.id,
			column: col,
			columns: state.columns,
			addingToColumn: state.addingToColumn
		}))));
	}
	var useState, useEffect, useRef, useCallback, PRIORITY_COLORS, PRIORITY_LABELS, COLUMN_COLORS, dragCardId, S;
	var init_KanbanPanel = __esmMin((() => {
		init_activate();
		({useState, useEffect, useRef, useCallback} = react);
		PRIORITY_COLORS = {
			none: "var(--text-3)",
			low: "#4ade80",
			medium: "#facc15",
			high: "#f87171"
		};
		PRIORITY_LABELS = {
			none: "",
			low: "Low",
			medium: "Med",
			high: "High"
		};
		COLUMN_COLORS = {
			"todo": "var(--accent)",
			"in-progress": "#facc15",
			"done": "#4ade80"
		};
		dragCardId = null;
		S = {
			root: {
				display: "flex",
				flexDirection: "column",
				height: "100%",
				fontFamily: "var(--font-mono)",
				color: "var(--text-0)",
				background: "var(--bg-1)",
				overflow: "hidden"
			},
			header: {
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "8px 14px",
				borderBottom: "1px solid var(--border)",
				flexShrink: 0
			},
			headerTitle: {
				fontWeight: 600,
				fontSize: "var(--text-sm)"
			},
			headerCount: {
				fontSize: "var(--text-xs)",
				color: "var(--text-3)"
			},
			board: {
				display: "flex",
				flex: 1,
				gap: "1px",
				overflow: "hidden",
				background: "var(--border)"
			},
			column: {
				flex: 1,
				display: "flex",
				flexDirection: "column",
				background: "var(--bg-1)",
				minWidth: 0,
				overflow: "hidden",
				transition: "background 0.1s"
			},
			columnHeader: {
				display: "flex",
				alignItems: "center",
				gap: "6px",
				padding: "8px 10px",
				flexShrink: 0
			},
			columnDot: {
				width: "8px",
				height: "8px",
				borderRadius: "50%",
				flexShrink: 0
			},
			columnName: {
				fontWeight: 600,
				fontSize: "var(--text-xs)",
				color: "var(--text-1)",
				textTransform: "uppercase",
				letterSpacing: "0.5px"
			},
			columnCount: {
				fontSize: "var(--text-xs)",
				color: "var(--text-3)",
				background: "var(--bg-2)",
				borderRadius: "8px",
				padding: "0 5px",
				lineHeight: "16px"
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
				padding: 0
			},
			cardList: {
				flex: 1,
				overflowY: "auto",
				padding: "0 8px 8px",
				display: "flex",
				flexDirection: "column",
				gap: "4px"
			},
			card: {
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
				borderRadius: "6px",
				padding: "8px 10px",
				cursor: "grab",
				transition: "border-color 0.1s, box-shadow 0.1s",
				userSelect: "none"
			},
			cardTitle: {
				fontSize: "var(--text-sm)",
				fontWeight: 500,
				color: "var(--text-0)",
				lineHeight: 1.3
			},
			cardMeta: {
				display: "flex",
				alignItems: "center",
				gap: "6px",
				marginTop: "4px"
			},
			priorityBadge: {
				fontSize: "8px",
				fontWeight: 700,
				color: "#000",
				padding: "1px 5px",
				borderRadius: "3px",
				textTransform: "uppercase",
				letterSpacing: "0.3px"
			},
			dateBadge: { fontSize: "var(--text-xs)" },
			cardDesc: {
				fontSize: "var(--text-xs)",
				color: "var(--text-3)",
				marginTop: "4px",
				lineHeight: 1.4,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			},
			emptyCol: {
				textAlign: "center",
				color: "var(--text-3)",
				fontSize: "var(--text-xs)",
				padding: "20px 0",
				opacity: .5
			},
			dropIndicator: {
				height: "2px",
				background: "var(--accent)",
				borderRadius: "1px",
				margin: "2px 0",
				flexShrink: 0
			},
			cardEdit: {
				background: "var(--bg-2)",
				border: "1px solid var(--accent)",
				borderRadius: "6px",
				padding: "8px",
				display: "flex",
				flexDirection: "column",
				gap: "6px"
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
				boxSizing: "border-box"
			},
			textarea: {
				resize: "vertical",
				minHeight: "32px",
				lineHeight: 1.4
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
				cursor: "pointer"
			},
			formRow: {
				display: "flex",
				alignItems: "center",
				gap: "6px"
			},
			formLabel: {
				fontSize: "var(--text-xs)",
				color: "var(--text-3)",
				width: "55px",
				flexShrink: 0
			},
			formActions: {
				display: "flex",
				alignItems: "center",
				gap: "4px",
				marginTop: "2px"
			},
			btnSave: {
				background: "var(--accent)",
				border: "none",
				borderRadius: "4px",
				color: "#fff",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-xs)",
				padding: "3px 10px",
				cursor: "pointer"
			},
			btnCancel: {
				background: "none",
				border: "1px solid var(--border)",
				borderRadius: "4px",
				color: "var(--text-3)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-xs)",
				padding: "3px 8px",
				cursor: "pointer"
			},
			btnDelete: {
				background: "none",
				border: "1px solid transparent",
				borderRadius: "4px",
				color: "#f87171",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-xs)",
				padding: "3px 8px",
				cursor: "pointer"
			}
		};
	}));
	//#endregion
	//#region src/activate.ts
	function getState() {
		return state;
	}
	function subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}
	function notify() {
		for (const l of listeners) try {
			l();
		} catch {}
	}
	function updateStatusBar() {
		if (!api) return;
		const total = state.columns.reduce((sum, col) => sum + col.cards.length, 0);
		const doing = state.columns.find((c) => c.id === "in-progress")?.cards.length ?? 0;
		api.ui.updateStatusBarItem("kanban.status", {
			text: doing > 0 ? `Kanban: ${doing} active` : `Kanban: ${total}`,
			tooltip: `${total} tasks total`
		});
	}
	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			if (!api) return;
			try {
				await api.storage.set("kanban-columns", JSON.stringify(state.columns));
			} catch {}
		}, 300);
	}
	function addCard(columnId, title, description, priority, dueDate) {
		const card = {
			id: crypto.randomUUID(),
			title: title.trim(),
			description: description.trim(),
			priority,
			dueDate,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		state = {
			...state,
			addingToColumn: null,
			columns: state.columns.map((col) => col.id === columnId ? {
				...col,
				cards: [...col.cards, card]
			} : col)
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function updateCard(cardId, updates) {
		state = {
			...state,
			editingCard: null,
			columns: state.columns.map((col) => ({
				...col,
				cards: col.cards.map((card) => card.id === cardId ? {
					...card,
					...updates
				} : card)
			}))
		};
		notify();
		scheduleSave();
	}
	function deleteCard(cardId) {
		state = {
			...state,
			editingCard: null,
			columns: state.columns.map((col) => ({
				...col,
				cards: col.cards.filter((card) => card.id !== cardId)
			}))
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function moveCard(cardId, toColumnId) {
		let movedCard = null;
		const withoutCard = state.columns.map((col) => {
			const found = col.cards.find((c) => c.id === cardId);
			if (found) movedCard = found;
			return {
				...col,
				cards: col.cards.filter((c) => c.id !== cardId)
			};
		});
		if (!movedCard) return;
		state = {
			...state,
			editingCard: null,
			columns: withoutCard.map((col) => col.id === toColumnId ? {
				...col,
				cards: [...col.cards, movedCard]
			} : col)
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function reorderCard(cardId, toColumnId, toIndex) {
		let movedCard = null;
		const withoutCard = state.columns.map((col) => {
			const found = col.cards.find((c) => c.id === cardId);
			if (found) movedCard = found;
			return {
				...col,
				cards: col.cards.filter((c) => c.id !== cardId)
			};
		});
		if (!movedCard) return;
		state = {
			...state,
			columns: withoutCard.map((col) => {
				if (col.id !== toColumnId) return col;
				const cards = [...col.cards];
				cards.splice(toIndex, 0, movedCard);
				return {
					...col,
					cards
				};
			})
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function setEditing(cardId) {
		state = {
			...state,
			editingCard: cardId,
			addingToColumn: null
		};
		notify();
	}
	function setAdding(columnId) {
		state = {
			...state,
			addingToColumn: columnId,
			editingCard: null
		};
		notify();
	}
	async function activate(pluginApi) {
		api = pluginApi;
		try {
			const stored = await api.storage.get("kanban-columns");
			if (stored) {
				const columns = JSON.parse(stored);
				if (Array.isArray(columns) && columns.length > 0) state.columns = columns;
			}
		} catch {}
		const { KanbanPanel } = await Promise.resolve().then(() => (init_KanbanPanel(), KanbanPanel_exports));
		api.ui.registerPanel("kanban-board-panel", KanbanPanel);
		api.subscriptions.push(api.commands.register("kanban.open", () => {
			api.ui.showPanel("kanban-board-panel");
		}));
		updateStatusBar();
	}
	function deactivate() {
		if (saveTimer) clearTimeout(saveTimer);
		listeners.clear();
		api = null;
	}
	var state, listeners, api, saveTimer;
	var init_activate = __esmMin((() => {
		state = {
			columns: [
				{
					id: "todo",
					name: "To Do",
					cards: []
				},
				{
					id: "in-progress",
					name: "In Progress",
					cards: []
				},
				{
					id: "done",
					name: "Done",
					cards: []
				}
			],
			editingCard: null,
			addingToColumn: null
		};
		listeners = /* @__PURE__ */ new Set();
		api = null;
		saveTimer = null;
	}));
	//#endregion
	init_activate();
	exports.activate = activate;
	exports.addCard = addCard;
	exports.deactivate = deactivate;
	exports.deleteCard = deleteCard;
	exports.getState = getState;
	exports.moveCard = moveCard;
	exports.reorderCard = reorderCard;
	exports.setAdding = setAdding;
	exports.setEditing = setEditing;
	exports.subscribe = subscribe;
	exports.updateCard = updateCard;
	return exports;
})({}, React);
if (typeof window !== "undefined") {
	window.__hermesPlugins = window.__hermesPlugins || {};
	window.__hermesPlugins["hermes-hq.kanban-board"] = {
		activate: __hermes_plugin__.activate,
		deactivate: __hermes_plugin__.deactivate
	};
}
