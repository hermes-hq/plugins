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
		return d.getFullYear() !== now.getFullYear() ? `${month} ${day}, ${d.getFullYear()}` : `${month} ${day}`;
	}
	function isOverdue(iso) {
		const d = new Date(iso);
		const today = /* @__PURE__ */ new Date();
		today.setHours(0, 0, 0, 0);
		return d < today;
	}
	function notifyDrag() {
		for (const l of dragListeners) l();
	}
	function CardView({ card, columnId, columns }) {
		const [editing, setLocalEditing] = useState(false);
		const [title, setTitle] = useState(card.title);
		const [desc, setDesc] = useState(card.description);
		const [prio, setPrio] = useState(card.priority);
		const [due, setDue] = useState(card.dueDate ?? "");
		const [confirmDel, setConfirmDel] = useState(false);
		const titleRef = useRef(null);
		const cardRef = useRef(null);
		const mouseDown = useRef(null);
		const dragging = useRef(false);
		useEffect(() => {
			if (editing && titleRef.current) titleRef.current.focus();
		}, [editing]);
		const save = () => {
			if (!title.trim()) return;
			updateCard(card.id, {
				title: title.trim(),
				description: desc.trim(),
				priority: prio,
				dueDate: due || null
			});
			setLocalEditing(false);
		};
		const cancel = () => {
			setTitle(card.title);
			setDesc(card.description);
			setPrio(card.priority);
			setDue(card.dueDate ?? "");
			setLocalEditing(false);
			setConfirmDel(false);
		};
		const onMouseDown = (e) => {
			if (editing || e.target.closest("button, select, input, textarea")) return;
			e.preventDefault();
			mouseDown.current = {
				x: e.clientX,
				y: e.clientY
			};
			dragging.current = false;
			const onMove = (me) => {
				if (!mouseDown.current) return;
				const dx = me.clientX - mouseDown.current.x;
				const dy = me.clientY - mouseDown.current.y;
				if (!dragging.current && Math.abs(dx) + Math.abs(dy) > 5) {
					dragging.current = true;
					const rect = cardRef.current.getBoundingClientRect();
					const ghost = document.createElement("div");
					ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;width:${Math.min(rect.width, 280)}px;padding:8px 10px;background:var(--bg-2);border:1px solid var(--accent);border-radius:6px;opacity:0.92;box-shadow:0 4px 16px rgba(0,0,0,0.35);font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-0);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
					ghost.textContent = card.title;
					document.body.appendChild(ghost);
					drag = {
						cardId: card.id,
						ghostEl: ghost,
						offsetX: me.clientX - rect.left,
						offsetY: me.clientY - rect.top,
						hoverCol: null,
						hoverIndex: 0
					};
					notifyDrag();
				}
				if (dragging.current && drag?.ghostEl) {
					drag.ghostEl.style.left = `${me.clientX - drag.offsetX}px`;
					drag.ghostEl.style.top = `${me.clientY - drag.offsetY}px`;
					const colEls = document.querySelectorAll("[data-kanban-col]");
					let col = null, idx = 0;
					for (const el of colEls) {
						const r = el.getBoundingClientRect();
						if (me.clientX >= r.left && me.clientX <= r.right) {
							col = el.getAttribute("data-kanban-col");
							const cards = el.querySelectorAll("[data-kanban-card]");
							idx = cards.length;
							for (let i = 0; i < cards.length; i++) {
								const cr = cards[i].getBoundingClientRect();
								if (me.clientY < cr.top + cr.height / 2) {
									idx = i;
									break;
								}
							}
							break;
						}
					}
					if (drag.hoverCol !== col || drag.hoverIndex !== idx) {
						drag.hoverCol = col;
						drag.hoverIndex = idx;
						notifyDrag();
					}
				}
			};
			const onUp = () => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				if (dragging.current && drag) {
					if (drag.hoverCol) reorderCard(drag.cardId, drag.hoverCol, drag.hoverIndex);
					drag.ghostEl?.remove();
					drag = null;
					notifyDrag();
				} else setLocalEditing(true);
				mouseDown.current = null;
				dragging.current = false;
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		};
		if (editing) return react.createElement("div", { style: S.cardEdit }, react.createElement("input", {
			ref: titleRef,
			style: S.input,
			value: title,
			onChange: (e) => setTitle(e.target.value),
			placeholder: "Title",
			onKeyDown: (e) => {
				if (e.key === "Enter") save();
				if (e.key === "Escape") cancel();
			}
		}), react.createElement("textarea", {
			style: {
				...S.input,
				...S.textarea
			},
			value: desc,
			onChange: (e) => setDesc(e.target.value),
			placeholder: "Description (optional)",
			rows: 2
		}), react.createElement("div", { style: S.formRow }, react.createElement("label", { style: S.formLabel }, "Priority"), react.createElement("select", {
			style: S.select,
			value: prio,
			onChange: (e) => setPrio(e.target.value)
		}, react.createElement("option", { value: "none" }, "None"), react.createElement("option", { value: "low" }, "Low"), react.createElement("option", { value: "medium" }, "Medium"), react.createElement("option", { value: "high" }, "High"))), react.createElement("div", { style: S.formRow }, react.createElement("label", { style: S.formLabel }, "Due"), react.createElement("input", {
			style: S.input,
			type: "date",
			value: due,
			onChange: (e) => setDue(e.target.value)
		})), react.createElement("div", { style: S.formRow }, react.createElement("label", { style: S.formLabel }, "Move to"), react.createElement("select", {
			style: S.select,
			value: columnId,
			onChange: (e) => {
				reorderCard(card.id, e.target.value, 999);
				setLocalEditing(false);
			}
		}, ...columns.map((c) => react.createElement("option", {
			key: c.id,
			value: c.id
		}, c.name)))), react.createElement("div", { style: S.formActions }, react.createElement("button", {
			style: S.btnSave,
			onClick: save
		}, "Save"), react.createElement("button", {
			style: S.btnCancel,
			onClick: cancel
		}, "Cancel"), react.createElement("div", { style: { flex: 1 } }), confirmDel ? react.createElement("div", { style: {
			display: "flex",
			gap: "4px",
			alignItems: "center"
		} }, react.createElement("span", { style: {
			fontSize: "9px",
			color: "var(--text-3)"
		} }, "Sure?"), react.createElement("button", {
			style: S.btnDelete,
			onClick: () => deleteCard(card.id)
		}, "Yes"), react.createElement("button", {
			style: S.btnCancel,
			onClick: () => setConfirmDel(false)
		}, "No")) : react.createElement("button", {
			style: S.btnDelete,
			onClick: () => setConfirmDel(true)
		}, "Delete")));
		const overdue = card.dueDate && isOverdue(card.dueDate);
		const isDragged = drag?.cardId === card.id;
		return react.createElement("div", {
			ref: cardRef,
			style: {
				...S.card,
				...isDragged ? { opacity: .3 } : {}
			},
			onMouseDown,
			"data-kanban-card": card.id
		}, react.createElement("div", { style: S.cardTitle }, card.title), (card.priority !== "none" || card.dueDate) && react.createElement("div", { style: S.cardMeta }, card.priority !== "none" && react.createElement("span", { style: {
			...S.badge,
			background: PRIORITY_COLORS[card.priority]
		} }, PRIORITY_LABELS[card.priority]), card.dueDate && react.createElement("span", { style: {
			fontSize: "9px",
			color: overdue ? "#f87171" : "var(--text-3)"
		} }, formatDate(card.dueDate))), card.description && react.createElement("div", { style: S.cardDesc }, card.description));
	}
	function AddCardForm({ columnId, onClose }) {
		const [title, setTitle] = useState("");
		const ref = useRef(null);
		useEffect(() => {
			ref.current?.focus();
		}, []);
		const save = () => {
			if (title.trim()) addCard(columnId, title, "", "none", null);
		};
		return react.createElement("div", { style: {
			...S.cardEdit,
			margin: "0 8px 4px"
		} }, react.createElement("input", {
			ref,
			style: S.input,
			value: title,
			onChange: (e) => setTitle(e.target.value),
			placeholder: "Task title — Enter to add",
			onKeyDown: (e) => {
				if (e.key === "Enter" && title.trim()) save();
				if (e.key === "Escape") onClose();
			}
		}), react.createElement("div", { style: S.formActions }, react.createElement("button", {
			style: S.btnSave,
			onClick: save,
			disabled: !title.trim()
		}, "Add"), react.createElement("button", {
			style: S.btnCancel,
			onClick: onClose
		}, "Cancel")));
	}
	function ColumnView({ column, columns, addingToColumn }) {
		const [, rerender] = useState(0);
		useEffect(() => {
			const cb = () => rerender((n) => n + 1);
			dragListeners.add(cb);
			return () => {
				dragListeners.delete(cb);
			};
		}, []);
		const isHover = drag && drag.hoverCol === column.id;
		const accent = COLUMN_COLORS[column.id] ?? "var(--accent)";
		return react.createElement("div", {
			style: {
				...S.column,
				...isHover ? { background: "var(--bg-2)" } : {}
			},
			"data-kanban-col": column.id
		}, react.createElement("div", { style: S.colHeader }, react.createElement("div", { style: {
			...S.colDot,
			background: accent
		} }), react.createElement("span", { style: S.colName }, column.name), react.createElement("span", { style: S.colCount }, column.cards.length), react.createElement("button", {
			style: S.addBtn,
			onClick: () => setAdding(addingToColumn === column.id ? null : column.id),
			title: "Add task"
		}, "+")), addingToColumn === column.id && react.createElement(AddCardForm, {
			columnId: column.id,
			onClose: () => setAdding(null)
		}), react.createElement("div", { style: S.cardList }, ...column.cards.map((card, i) => react.createElement(react.Fragment, { key: card.id }, isHover && drag.hoverIndex === i && react.createElement("div", { style: S.dropLine }), react.createElement(CardView, {
			card,
			columnId: column.id,
			columns
		}))), isHover && drag.hoverIndex >= column.cards.length && react.createElement("div", { style: S.dropLine }), addingToColumn !== column.id && react.createElement("div", {
			style: S.addCardBtn,
			onClick: () => setAdding(column.id)
		}, "+ Add a task")));
	}
	function NewBoardForm() {
		const [name, setName] = useState("");
		const ref = useRef(null);
		useEffect(() => {
			ref.current?.focus();
		}, []);
		const presets = getBoardPresets();
		return react.createElement("div", { style: S.newBoard }, react.createElement("div", { style: S.newBoardPresets }, ...presets.map((p) => react.createElement("button", {
			key: p.label,
			style: S.presetBtn,
			onClick: () => createBoard(p.name)
		}, p.label))), react.createElement("div", { style: {
			display: "flex",
			gap: "4px"
		} }, react.createElement("input", {
			ref,
			style: {
				...S.input,
				flex: 1
			},
			value: name,
			onChange: (e) => setName(e.target.value),
			placeholder: "Board name...",
			onKeyDown: (e) => {
				if (e.key === "Enter" && name.trim()) createBoard(name);
				if (e.key === "Escape") setCreatingBoard(false);
			}
		}), react.createElement("button", {
			style: S.btnSave,
			onClick: () => {
				if (name.trim()) createBoard(name);
			},
			disabled: !name.trim()
		}, "Create"), react.createElement("button", {
			style: S.btnCancel,
			onClick: () => setCreatingBoard(false)
		}, "Cancel")));
	}
	function BoardSelector({ boards, activeId, onNew }) {
		const [open, setOpen] = useState(false);
		const [search, setSearch] = useState("");
		const [confirmDel, setConfirmDel] = useState(null);
		const searchRef = useRef(null);
		const dropRef = useRef(null);
		const activeBoard = boards.find((b) => b.id === activeId);
		useEffect(() => {
			if (open && searchRef.current) searchRef.current.focus();
		}, [open]);
		useEffect(() => {
			if (!open) return;
			const handler = (e) => {
				if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
			};
			document.addEventListener("mousedown", handler);
			return () => document.removeEventListener("mousedown", handler);
		}, [open]);
		const sorted = [...search.trim() ? boards.filter((b) => b.name.toLowerCase().includes(search.toLowerCase())) : boards].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return react.createElement("div", {
			style: S.selector,
			ref: dropRef
		}, react.createElement("button", {
			style: S.selectorBtn,
			onClick: () => {
				setOpen(!open);
				setSearch("");
				setConfirmDel(null);
			}
		}, react.createElement("span", { style: { fontWeight: 600 } }, activeBoard?.name ?? "Select board"), react.createElement("span", { style: {
			fontSize: "8px",
			marginLeft: "4px",
			opacity: .5
		} }, open ? "▲" : "▼")), react.createElement("button", {
			style: S.newTabBtn,
			onClick: onNew,
			title: "New board"
		}, "+"), activeBoard && react.createElement("button", {
			style: S.tabClose,
			onClick: () => {
				if (confirmDel === activeBoard.id) {
					deleteBoard(activeBoard.id);
					setConfirmDel(null);
				} else setConfirmDel(activeBoard.id);
			},
			title: confirmDel === activeBoard.id ? "Click again to confirm" : "Delete this board"
		}, confirmDel === activeBoard.id ? "✓" : "×"), confirmDel && react.createElement("button", {
			style: S.tabClose,
			onClick: () => setConfirmDel(null),
			title: "Cancel delete"
		}, "✕"), open && react.createElement("div", { style: S.dropdown }, boards.length > 5 && react.createElement("input", {
			ref: searchRef,
			style: {
				...S.input,
				margin: "0 0 4px",
				fontSize: "10px"
			},
			value: search,
			onChange: (e) => setSearch(e.target.value),
			placeholder: "Search boards..."
		}), react.createElement("div", { style: S.dropdownList }, sorted.length === 0 && react.createElement("div", { style: {
			fontSize: "10px",
			color: "var(--text-3)",
			padding: "8px",
			textAlign: "center"
		} }, "No boards found"), ...sorted.map((b) => {
			const isActive = b.id === activeId;
			const date = new Date(b.createdAt).toLocaleDateString("en", {
				month: "short",
				day: "numeric"
			});
			const taskCount = b.columns.reduce((s, c) => s + c.cards.length, 0);
			return react.createElement("div", {
				key: b.id,
				style: {
					...S.dropdownItem,
					...isActive ? {
						background: "var(--accent-dim)",
						color: "var(--accent)"
					} : {}
				},
				onClick: () => {
					switchBoard(b.id);
					setOpen(false);
				}
			}, react.createElement("span", { style: {
				flex: 1,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			} }, b.name), react.createElement("span", { style: {
				fontSize: "8px",
				color: "var(--text-3)",
				flexShrink: 0
			} }, `${taskCount} · ${date}`));
		})), boards.length > 0 && react.createElement("div", { style: {
			fontSize: "8px",
			color: "var(--text-3)",
			padding: "4px 6px",
			borderTop: "1px solid var(--border)",
			textAlign: "center"
		} }, `${boards.length} board${boards.length !== 1 ? "s" : ""}`)));
	}
	function EmptyState() {
		const presets = getBoardPresets();
		return react.createElement("div", { style: S.empty }, react.createElement("div", { style: {
			fontSize: "var(--text-base)",
			fontWeight: 600,
			marginBottom: "6px"
		} }, "Create your first board"), react.createElement("div", { style: {
			fontSize: "var(--text-sm)",
			color: "var(--text-3)",
			marginBottom: "16px",
			lineHeight: 1.5
		} }, "Organize your tasks for today, this week, or any custom timeframe."), react.createElement("div", { style: {
			display: "flex",
			gap: "6px"
		} }, ...presets.map((p) => react.createElement("button", {
			key: p.label,
			style: S.presetBtn,
			onClick: () => createBoard(p.name)
		}, p.label)), react.createElement("button", {
			style: S.presetBtn,
			onClick: () => setCreatingBoard(true)
		}, "Custom...")));
	}
	function KanbanPanel() {
		const [state, setState] = useState(getState());
		useEffect(() => subscribe(() => setState(getState())), []);
		const board = state.boards.find((b) => b.id === state.activeBoardId) ?? null;
		if (state.boards.length === 0 && !state.creatingBoard) return react.createElement("div", { style: S.root }, react.createElement(EmptyState));
		return react.createElement("div", { style: S.root }, react.createElement("div", { style: S.header }, react.createElement(BoardSelector, {
			boards: state.boards,
			activeId: state.activeBoardId,
			onNew: () => setCreatingBoard(true)
		}), board && react.createElement("span", { style: S.taskCount }, board.columns.reduce((s, c) => s + c.cards.length, 0), " tasks")), state.creatingBoard && react.createElement(NewBoardForm), board && react.createElement("div", { style: S.board }, ...board.columns.map((col) => react.createElement(ColumnView, {
			key: col.id,
			column: col,
			columns: board.columns,
			addingToColumn: state.addingToColumn
		}))));
	}
	var useState, useEffect, useRef, useCallback, PRIORITY_COLORS, PRIORITY_LABELS, COLUMN_COLORS, drag, dragListeners, S;
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
		drag = null;
		dragListeners = /* @__PURE__ */ new Set();
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
				borderBottom: "1px solid var(--border)",
				flexShrink: 0,
				padding: "0 12px 0 0"
			},
			taskCount: {
				fontSize: "var(--text-sm)",
				color: "var(--text-3)",
				marginLeft: "auto",
				flexShrink: 0
			},
			selector: {
				display: "flex",
				alignItems: "center",
				gap: "4px",
				position: "relative"
			},
			selectorBtn: {
				background: "none",
				border: "none",
				cursor: "pointer",
				color: "var(--text-0)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-base)",
				padding: "8px 10px",
				display: "flex",
				alignItems: "center"
			},
			tabClose: {
				background: "none",
				border: "none",
				color: "var(--text-3)",
				cursor: "pointer",
				fontSize: "14px",
				padding: "4px 6px",
				lineHeight: 1,
				opacity: .6
			},
			newTabBtn: {
				background: "none",
				border: "none",
				color: "var(--text-3)",
				cursor: "pointer",
				fontSize: "18px",
				padding: "4px 8px",
				lineHeight: 1
			},
			dropdown: {
				position: "absolute",
				top: "100%",
				left: 0,
				zIndex: 50,
				background: "var(--bg-1)",
				border: "1px solid var(--border)",
				borderRadius: "6px",
				padding: "8px",
				minWidth: "260px",
				maxWidth: "360px",
				boxShadow: "0 6px 20px rgba(0,0,0,0.3)"
			},
			dropdownList: {
				maxHeight: "300px",
				overflowY: "auto",
				display: "flex",
				flexDirection: "column",
				gap: "2px"
			},
			dropdownItem: {
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "7px 8px",
				borderRadius: "4px",
				cursor: "pointer",
				fontSize: "var(--text-sm)",
				color: "var(--text-1)",
				transition: "background 0.08s"
			},
			newBoard: {
				padding: "10px 12px",
				borderBottom: "1px solid var(--border)",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				flexShrink: 0
			},
			newBoardPresets: {
				display: "flex",
				gap: "6px"
			},
			presetBtn: {
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
				borderRadius: "5px",
				color: "var(--text-1)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "6px 14px",
				cursor: "pointer"
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
			colHeader: {
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "10px 12px",
				flexShrink: 0
			},
			colDot: {
				width: "9px",
				height: "9px",
				borderRadius: "50%",
				flexShrink: 0
			},
			colName: {
				fontWeight: 600,
				fontSize: "var(--text-sm)",
				color: "var(--text-1)",
				textTransform: "uppercase",
				letterSpacing: "0.5px"
			},
			colCount: {
				fontSize: "var(--text-xs)",
				color: "var(--text-3)",
				background: "var(--bg-2)",
				borderRadius: "8px",
				padding: "1px 6px",
				lineHeight: "16px"
			},
			addBtn: {
				marginLeft: "auto",
				background: "none",
				border: "1px solid var(--border)",
				borderRadius: "4px",
				color: "var(--text-3)",
				cursor: "pointer",
				width: "22px",
				height: "22px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "16px",
				lineHeight: 1,
				padding: 0
			},
			cardList: {
				flex: 1,
				overflowY: "auto",
				padding: "0 10px 10px",
				display: "flex",
				flexDirection: "column",
				gap: "5px"
			},
			card: {
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
				borderRadius: "6px",
				padding: "8px 10px",
				cursor: "grab",
				transition: "opacity 0.1s",
				userSelect: "none",
				maxWidth: "300px"
			},
			cardTitle: {
				fontSize: "var(--text-sm)",
				fontWeight: 500,
				color: "var(--text-0)",
				lineHeight: 1.4
			},
			cardMeta: {
				display: "flex",
				alignItems: "center",
				gap: "6px",
				marginTop: "4px"
			},
			badge: {
				fontSize: "9px",
				fontWeight: 700,
				color: "#000",
				padding: "1px 5px",
				borderRadius: "3px",
				textTransform: "uppercase",
				letterSpacing: "0.3px",
				lineHeight: "15px"
			},
			cardDesc: {
				fontSize: "var(--text-xs)",
				color: "var(--text-3)",
				marginTop: "3px",
				lineHeight: 1.4,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			},
			emptyCol: {
				textAlign: "center",
				color: "var(--text-3)",
				fontSize: "var(--text-sm)",
				padding: "20px 0",
				opacity: .4
			},
			addCardBtn: {
				background: "transparent",
				border: "1px dashed var(--border)",
				borderRadius: "6px",
				padding: "8px 10px",
				cursor: "pointer",
				fontSize: "var(--text-sm)",
				color: "var(--text-3)",
				textAlign: "center",
				transition: "border-color 0.1s, color 0.1s",
				maxWidth: "300px"
			},
			dropLine: {
				height: "2px",
				background: "var(--accent)",
				borderRadius: "1px",
				margin: "1px 0",
				flexShrink: 0
			},
			empty: {
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100%",
				textAlign: "center",
				padding: "20px"
			},
			cardEdit: {
				background: "var(--bg-2)",
				border: "1px solid var(--accent)",
				borderRadius: "6px",
				padding: "8px",
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				maxWidth: "300px"
			},
			input: {
				background: "var(--bg-1)",
				border: "1px solid var(--border)",
				borderRadius: "4px",
				color: "var(--text-0)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "5px 8px",
				outline: "none",
				width: "100%",
				boxSizing: "border-box"
			},
			textarea: {
				resize: "vertical",
				minHeight: "36px",
				lineHeight: 1.5
			},
			select: {
				background: "var(--bg-1)",
				border: "1px solid var(--border)",
				borderRadius: "4px",
				color: "var(--text-0)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "4px 6px",
				outline: "none",
				cursor: "pointer"
			},
			formRow: {
				display: "flex",
				alignItems: "center",
				gap: "8px"
			},
			formLabel: {
				fontSize: "var(--text-sm)",
				color: "var(--text-3)",
				width: "55px",
				flexShrink: 0
			},
			formActions: {
				display: "flex",
				alignItems: "center",
				gap: "6px",
				marginTop: "4px"
			},
			btnSave: {
				background: "var(--accent)",
				border: "none",
				borderRadius: "4px",
				color: "#fff",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "5px 12px",
				cursor: "pointer"
			},
			btnCancel: {
				background: "none",
				border: "1px solid var(--border)",
				borderRadius: "4px",
				color: "var(--text-3)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "5px 10px",
				cursor: "pointer"
			},
			btnDelete: {
				background: "none",
				border: "1px solid transparent",
				borderRadius: "4px",
				color: "#f87171",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--text-sm)",
				padding: "5px 10px",
				cursor: "pointer"
			}
		};
	}));
	//#endregion
	//#region src/activate.ts
	function makeColumns() {
		return [
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
		];
	}
	function todayLabel() {
		return (/* @__PURE__ */ new Date()).toLocaleDateString("en", {
			weekday: "short",
			month: "short",
			day: "numeric"
		});
	}
	function weekLabel() {
		const now = /* @__PURE__ */ new Date();
		const mon = new Date(now);
		mon.setDate(now.getDate() - (now.getDay() + 6) % 7);
		const fri = new Date(mon);
		fri.setDate(mon.getDate() + 4);
		const fmt = (d) => d.toLocaleDateString("en", {
			month: "short",
			day: "numeric"
		});
		return `${fmt(mon)} – ${fmt(fri)}`;
	}
	function getBoardPresets() {
		return [{
			label: "Today",
			name: todayLabel()
		}, {
			label: "This Week",
			name: weekLabel()
		}];
	}
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
		const board = state.boards.find((b) => b.id === state.activeBoardId);
		if (board) {
			const total = board.columns.reduce((s, c) => s + c.cards.length, 0);
			const doing = board.columns.find((c) => c.id === "in-progress")?.cards.length ?? 0;
			api.ui.updateStatusBarItem("kanban.status", {
				text: doing > 0 ? `${board.name}: ${doing} active` : `${board.name}: ${total}`,
				tooltip: `${board.name} — ${total} tasks`
			});
		} else api.ui.updateStatusBarItem("kanban.status", { text: "Planner" });
	}
	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			if (!api) return;
			try {
				await api.storage.set("planner-boards", JSON.stringify(state.boards));
				await api.storage.set("planner-active", state.activeBoardId ?? "");
			} catch {}
		}, 300);
	}
	function createBoard(name) {
		const board = {
			id: crypto.randomUUID(),
			name: name.trim(),
			columns: makeColumns(),
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		state = {
			...state,
			boards: [...state.boards, board],
			activeBoardId: board.id,
			creatingBoard: false,
			editingCard: null,
			addingToColumn: null
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function deleteBoard(boardId) {
		const remaining = state.boards.filter((b) => b.id !== boardId);
		state = {
			...state,
			boards: remaining,
			activeBoardId: remaining.length > 0 ? state.activeBoardId === boardId ? remaining[remaining.length - 1].id : state.activeBoardId : null,
			editingCard: null,
			addingToColumn: null
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function switchBoard(boardId) {
		state = {
			...state,
			activeBoardId: boardId,
			editingCard: null,
			addingToColumn: null
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function setCreatingBoard(v) {
		state = {
			...state,
			creatingBoard: v
		};
		notify();
	}
	function updateActiveBoard(fn) {
		state = {
			...state,
			boards: state.boards.map((b) => b.id === state.activeBoardId ? {
				...b,
				columns: fn(b.columns)
			} : b)
		};
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
		updateActiveBoard((cols) => cols.map((col) => col.id === columnId ? {
			...col,
			cards: [...col.cards, card]
		} : col));
		state = {
			...state,
			addingToColumn: null
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function updateCard(cardId, updates) {
		updateActiveBoard((cols) => cols.map((col) => ({
			...col,
			cards: col.cards.map((card) => card.id === cardId ? {
				...card,
				...updates
			} : card)
		})));
		state = {
			...state,
			editingCard: null
		};
		notify();
		scheduleSave();
	}
	function deleteCard(cardId) {
		updateActiveBoard((cols) => cols.map((col) => ({
			...col,
			cards: col.cards.filter((card) => card.id !== cardId)
		})));
		state = {
			...state,
			editingCard: null
		};
		notify();
		scheduleSave();
		updateStatusBar();
	}
	function reorderCard(cardId, toColumnId, toIndex) {
		let movedCard = null;
		updateActiveBoard((cols) => {
			const without = cols.map((col) => {
				const found = col.cards.find((c) => c.id === cardId);
				if (found) movedCard = found;
				return {
					...col,
					cards: col.cards.filter((c) => c.id !== cardId)
				};
			});
			if (!movedCard) return cols;
			return without.map((col) => {
				if (col.id !== toColumnId) return col;
				const cards = [...col.cards];
				cards.splice(toIndex, 0, movedCard);
				return {
					...col,
					cards
				};
			});
		});
		state = {
			...state,
			editingCard: null
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
			let stored = await api.storage.get("planner-boards");
			if (stored) {
				const boards = JSON.parse(stored);
				if (Array.isArray(boards) && boards.length > 0) state.boards = boards;
			} else {
				const legacy = await api.storage.get("kanban-columns");
				if (legacy) {
					const columns = JSON.parse(legacy);
					if (Array.isArray(columns) && columns.length > 0) state.boards = [{
						id: crypto.randomUUID(),
						name: "My Tasks",
						columns,
						createdAt: (/* @__PURE__ */ new Date()).toISOString()
					}];
				}
			}
			const activeId = await api.storage.get("planner-active");
			if (activeId && state.boards.some((b) => b.id === activeId)) state.activeBoardId = activeId;
			else if (state.boards.length > 0) state.activeBoardId = state.boards[state.boards.length - 1].id;
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
			boards: [],
			activeBoardId: null,
			editingCard: null,
			addingToColumn: null,
			creatingBoard: false
		};
		listeners = /* @__PURE__ */ new Set();
		api = null;
		saveTimer = null;
	}));
	//#endregion
	init_activate();
	exports.activate = activate;
	exports.addCard = addCard;
	exports.createBoard = createBoard;
	exports.deactivate = deactivate;
	exports.deleteBoard = deleteBoard;
	exports.deleteCard = deleteCard;
	exports.getBoardPresets = getBoardPresets;
	exports.getState = getState;
	exports.reorderCard = reorderCard;
	exports.setAdding = setAdding;
	exports.setCreatingBoard = setCreatingBoard;
	exports.setEditing = setEditing;
	exports.subscribe = subscribe;
	exports.switchBoard = switchBoard;
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
