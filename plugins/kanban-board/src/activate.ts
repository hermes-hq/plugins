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

export interface KanbanState {
	columns: Column[];
	editingCard: string | null;
	addingToColumn: string | null;
}

// ─── Plugin API Types ─────────────────────────────────────

interface Disposable {
	dispose(): void;
}

interface PluginPanelProps {
	pluginId: string;
	panelId: string;
}

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

// ─── State Management ─────────────────────────────────────

const DEFAULT_COLUMNS: Column[] = [
	{ id: "todo", name: "To Do", cards: [] },
	{ id: "in-progress", name: "In Progress", cards: [] },
	{ id: "done", name: "Done", cards: [] },
];

let state: KanbanState = {
	columns: DEFAULT_COLUMNS,
	editingCard: null,
	addingToColumn: null,
};

let listeners = new Set<() => void>();
let api: HermesPluginAPI | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function getState(): KanbanState {
	return state;
}

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notify() {
	for (const l of listeners) {
		try { l(); } catch { /* ignore */ }
	}
}

function updateStatusBar() {
	if (!api) return;
	const total = state.columns.reduce((sum, col) => sum + col.cards.length, 0);
	const doing = state.columns.find(c => c.id === "in-progress")?.cards.length ?? 0;
	api.ui.updateStatusBarItem("kanban.status", {
		text: doing > 0 ? `Kanban: ${doing} active` : `Kanban: ${total}`,
		tooltip: `${total} tasks total`,
	});
}

function scheduleSave() {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(async () => {
		if (!api) return;
		try {
			await api.storage.set("kanban-columns", JSON.stringify(state.columns));
		} catch { /* ignore */ }
	}, 300);
}

// ─── Actions ──────────────────────────────────────────────

export function addCard(columnId: string, title: string, description: string, priority: Card["priority"], dueDate: string | null) {
	const card: Card = {
		id: crypto.randomUUID(),
		title: title.trim(),
		description: description.trim(),
		priority,
		dueDate,
		createdAt: new Date().toISOString(),
	};
	state = {
		...state,
		addingToColumn: null,
		columns: state.columns.map(col =>
			col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
		),
	};
	notify();
	scheduleSave();
	updateStatusBar();
}

export function updateCard(cardId: string, updates: Partial<Pick<Card, "title" | "description" | "priority" | "dueDate">>) {
	state = {
		...state,
		editingCard: null,
		columns: state.columns.map(col => ({
			...col,
			cards: col.cards.map(card =>
				card.id === cardId ? { ...card, ...updates } : card
			),
		})),
	};
	notify();
	scheduleSave();
}

export function deleteCard(cardId: string) {
	state = {
		...state,
		editingCard: null,
		columns: state.columns.map(col => ({
			...col,
			cards: col.cards.filter(card => card.id !== cardId),
		})),
	};
	notify();
	scheduleSave();
	updateStatusBar();
}

export function moveCard(cardId: string, toColumnId: string) {
	let movedCard: Card | null = null;
	const withoutCard = state.columns.map(col => {
		const found = col.cards.find(c => c.id === cardId);
		if (found) movedCard = found;
		return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
	});
	if (!movedCard) return;
	state = {
		...state,
		editingCard: null,
		columns: withoutCard.map(col =>
			col.id === toColumnId ? { ...col, cards: [...col.cards, movedCard!] } : col
		),
	};
	notify();
	scheduleSave();
	updateStatusBar();
}

export function reorderCard(cardId: string, toColumnId: string, toIndex: number) {
	let movedCard: Card | null = null;
	const withoutCard = state.columns.map(col => {
		const found = col.cards.find(c => c.id === cardId);
		if (found) movedCard = found;
		return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
	});
	if (!movedCard) return;
	state = {
		...state,
		columns: withoutCard.map(col => {
			if (col.id !== toColumnId) return col;
			const cards = [...col.cards];
			cards.splice(toIndex, 0, movedCard!);
			return { ...col, cards };
		}),
	};
	notify();
	scheduleSave();
	updateStatusBar();
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

	// Load persisted data
	try {
		const stored = await api.storage.get("kanban-columns");
		if (stored) {
			const columns = JSON.parse(stored);
			if (Array.isArray(columns) && columns.length > 0) {
				state.columns = columns;
			}
		}
	} catch { /* use defaults */ }

	// Lazy-load the panel component
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
