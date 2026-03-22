import * as React from "react";

// ─── Types ────────────────────────────────────────────────

export interface Card {
	id: string;
	title: string;
	description: string;
	priority: "none" | "low" | "medium" | "high";
	dueDate: string | null;
	createdAt: string;
}

export interface Column {
	id: string;
	name: string;
	cards: Card[];
}

export interface Board {
	id: string;
	name: string;
	columns: Column[];
	createdAt: string;
}

export interface KanbanState {
	boards: Board[];
	activeBoardId: string | null;
	editingCard: string | null;
	addingToColumn: string | null;
	creatingBoard: boolean;
}

// ─── Plugin API Types ─────────────────────────────────────

interface Disposable { dispose(): void; }
interface PluginPanelProps { pluginId: string; panelId: string; }

interface HermesPluginAPI {
	subscriptions: Disposable[];
	storage: {
		get(key: string): Promise<string | null>;
		set(key: string, value: string): Promise<void>;
		delete(key: string): Promise<void>;
	};
	commands: {
		register(command: string, handler: (...args: unknown[]) => void): Disposable;
	};
	ui: {
		registerPanel(panelId: string, component: React.ComponentType<PluginPanelProps>): Disposable;
		showPanel(panelId: string): void;
		updateStatusBarItem(itemId: string, update: { text?: string; tooltip?: string; visible?: boolean }): void;
	};
}

// ─── Helpers ──────────────────────────────────────────────

function makeColumns(): Column[] {
	return [
		{ id: "todo", name: "To Do", cards: [] },
		{ id: "in-progress", name: "In Progress", cards: [] },
		{ id: "done", name: "Done", cards: [] },
	];
}

function todayLabel(): string {
	const d = new Date();
	return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function weekLabel(): string {
	const now = new Date();
	const mon = new Date(now);
	mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
	const fri = new Date(mon);
	fri.setDate(mon.getDate() + 4);
	const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });
	return `${fmt(mon)} – ${fmt(fri)}`;
}

export function getBoardPresets(): { label: string; name: string }[] {
	return [
		{ label: "Today", name: todayLabel() },
		{ label: "This Week", name: weekLabel() },
	];
}

// ─── State Management ─────────────────────────────────────

let state: KanbanState = {
	boards: [],
	activeBoardId: null,
	editingCard: null,
	addingToColumn: null,
	creatingBoard: false,
};

let listeners = new Set<() => void>();
let api: HermesPluginAPI | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function getState(): KanbanState { return state; }

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notify() {
	for (const l of listeners) { try { l(); } catch { /* */ } }
}

function updateStatusBar() {
	if (!api) return;
	const board = state.boards.find(b => b.id === state.activeBoardId);
	if (board) {
		const total = board.columns.reduce((s, c) => s + c.cards.length, 0);
		const doing = board.columns.find(c => c.id === "in-progress")?.cards.length ?? 0;
		api.ui.updateStatusBarItem("kanban.status", {
			text: doing > 0 ? `${board.name}: ${doing} active` : `${board.name}: ${total}`,
			tooltip: `${board.name} — ${total} tasks`,
		});
	} else {
		api.ui.updateStatusBarItem("kanban.status", { text: "Planner" });
	}
}

function scheduleSave() {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(async () => {
		if (!api) return;
		try {
			await api.storage.set("planner-boards", JSON.stringify(state.boards));
			await api.storage.set("planner-active", state.activeBoardId ?? "");
		} catch { /* */ }
	}, 300);
}

// ─── Board Actions ────────────────────────────────────────

export function createBoard(name: string) {
	const board: Board = {
		id: crypto.randomUUID(),
		name: name.trim(),
		columns: makeColumns(),
		createdAt: new Date().toISOString(),
	};
	state = {
		...state,
		boards: [...state.boards, board],
		activeBoardId: board.id,
		creatingBoard: false,
		editingCard: null,
		addingToColumn: null,
	};
	notify(); scheduleSave(); updateStatusBar();
}

export function deleteBoard(boardId: string) {
	const remaining = state.boards.filter(b => b.id !== boardId);
	state = {
		...state,
		boards: remaining,
		activeBoardId: remaining.length > 0
			? (state.activeBoardId === boardId ? remaining[remaining.length - 1].id : state.activeBoardId)
			: null,
		editingCard: null,
		addingToColumn: null,
	};
	notify(); scheduleSave(); updateStatusBar();
}

export function switchBoard(boardId: string) {
	state = { ...state, activeBoardId: boardId, editingCard: null, addingToColumn: null };
	notify(); scheduleSave(); updateStatusBar();
}

export function renameBoard(boardId: string, newName: string) {
	const trimmed = newName.trim();
	if (!trimmed) return;
	state = {
		...state,
		boards: state.boards.map(b => b.id === boardId ? { ...b, name: trimmed } : b),
	};
	notify(); scheduleSave(); updateStatusBar();
}

export function setCreatingBoard(v: boolean) {
	state = { ...state, creatingBoard: v };
	notify();
}

// ─── Card Actions ─────────────────────────────────────────

function updateActiveBoard(fn: (columns: Column[]) => Column[]) {
	state = {
		...state,
		boards: state.boards.map(b =>
			b.id === state.activeBoardId ? { ...b, columns: fn(b.columns) } : b
		),
	};
}

export function addCard(columnId: string, title: string, description: string, priority: Card["priority"], dueDate: string | null) {
	const card: Card = {
		id: crypto.randomUUID(),
		title: title.trim(),
		description: description.trim(),
		priority,
		dueDate,
		createdAt: new Date().toISOString(),
	};
	updateActiveBoard(cols => cols.map(col =>
		col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
	));
	state = { ...state, addingToColumn: null };
	notify(); scheduleSave(); updateStatusBar();
}

export function updateCard(cardId: string, updates: Partial<Pick<Card, "title" | "description" | "priority" | "dueDate">>) {
	updateActiveBoard(cols => cols.map(col => ({
		...col,
		cards: col.cards.map(card => card.id === cardId ? { ...card, ...updates } : card),
	})));
	state = { ...state, editingCard: null };
	notify(); scheduleSave();
}

export function deleteCard(cardId: string) {
	updateActiveBoard(cols => cols.map(col => ({
		...col,
		cards: col.cards.filter(card => card.id !== cardId),
	})));
	state = { ...state, editingCard: null };
	notify(); scheduleSave(); updateStatusBar();
}

export function reorderCard(cardId: string, toColumnId: string, toIndex: number) {
	let movedCard: Card | null = null;
	updateActiveBoard(cols => {
		const without = cols.map(col => {
			const found = col.cards.find(c => c.id === cardId);
			if (found) movedCard = found;
			return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
		});
		if (!movedCard) return cols;
		return without.map(col => {
			if (col.id !== toColumnId) return col;
			const cards = [...col.cards];
			cards.splice(toIndex, 0, movedCard!);
			return { ...col, cards };
		});
	});
	state = { ...state, editingCard: null };
	notify(); scheduleSave(); updateStatusBar();
}

export function setEditing(cardId: string | null) {
	state = { ...state, editingCard: cardId, addingToColumn: null };
	notify();
}

export function setAdding(columnId: string | null) {
	state = { ...state, addingToColumn: columnId, editingCard: null };
	notify();
}

// ─── Plugin Lifecycle ─────────────────────────────────────

export async function activate(pluginApi: HermesPluginAPI) {
	api = pluginApi;

	// Load persisted data (try new key first, fall back to legacy)
	try {
		let stored = await api.storage.get("planner-boards");
		if (stored) {
			const boards = JSON.parse(stored);
			if (Array.isArray(boards) && boards.length > 0) {
				state.boards = boards;
			}
		} else {
			// Migrate from old kanban-columns key
			const legacy = await api.storage.get("kanban-columns");
			if (legacy) {
				const columns = JSON.parse(legacy);
				if (Array.isArray(columns) && columns.length > 0) {
					state.boards = [{
						id: crypto.randomUUID(),
						name: "My Tasks",
						columns,
						createdAt: new Date().toISOString(),
					}];
				}
			}
		}
		const activeId = await api.storage.get("planner-active");
		if (activeId && state.boards.some(b => b.id === activeId)) {
			state.activeBoardId = activeId;
		} else if (state.boards.length > 0) {
			state.activeBoardId = state.boards[state.boards.length - 1].id;
		}
	} catch { /* use defaults */ }

	const { KanbanPanel } = await import("./KanbanPanel");
	api.ui.registerPanel("kanban-board-panel", KanbanPanel);

	api.subscriptions.push(
		api.commands.register("kanban.open", () => {
			api!.ui.showPanel("kanban-board-panel");
		})
	);

	updateStatusBar();
}

export function deactivate() {
	if (saveTimer) clearTimeout(saveTimer);
	listeners.clear();
	api = null;
}
