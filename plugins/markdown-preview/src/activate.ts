import { MarkdownPanel } from "./MarkdownPanel";
import { injectStyles } from "./styles";
import { marked, type Renderer } from "marked";
import mermaid from "mermaid";

interface Disposable { dispose(): void; }
interface PluginPanelProps { pluginId: string; panelId: string; }

interface HermesPluginAPI {
	ui: {
		registerPanel(panelId: string, component: React.ComponentType<PluginPanelProps>): Disposable;
		showPanel(panelId: string): void;
		hidePanel(panelId: string): void;
		togglePanel(panelId: string): void;
		showToast(message: string, options?: { type?: "info" | "success" | "warning" | "error"; duration?: number }): void;
		updateStatusBarItem(itemId: string, update: { text?: string; tooltip?: string; visible?: boolean }): void;
	};
	commands: {
		register(commandId: string, handler: () => void | Promise<void>): Disposable;
		execute(commandId: string): Promise<void>;
	};
	shell: {
		exec(command: string, args?: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>;
		openExternal(url: string): Promise<void>;
	};
	storage: {
		get(key: string): Promise<string | null>;
		set(key: string, value: string): Promise<void>;
		delete(key: string): Promise<void>;
	};
	settings: {
		get<T = string | number | boolean>(key: string): Promise<T>;
		update(key: string, value: string | number | boolean): Promise<void>;
		onDidChange(key: string, callback: (newValue: string | number | boolean) => void): Disposable;
		getAll(): Promise<Record<string, string | number | boolean>>;
	};
	sessions: {
		getActive(): Promise<{ id: string; name: string; working_directory?: string } | null>;
		list(): Promise<{ id: string; name: string }[]>;
	};
	events: {
		on(event: string, callback: (...args: any[]) => void): Disposable;
	};
	subscriptions: Disposable[];
}

// Configure marked for GFM
marked.setOptions({ gfm: true, breaks: true });

// Override renderer: mermaid code blocks → placeholder divs
const renderer: Partial<Renderer> = {
	code({ text, lang }: { text: string; lang?: string }) {
		if (lang === "mermaid") {
			const encoded = btoa(encodeURIComponent(text));
			return `<div class="mermaid-placeholder" data-mermaid-src="${encoded}"></div>`;
		}
		const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const langClass = lang ? ` class="language-${lang}"` : "";
		return `<pre><code${langClass}>${escaped}</code></pre>`;
	},
};
marked.use({ renderer });

// Lazy-init mermaid
let mermaidReady = false;
function ensureMermaid() {
	if (mermaidReady) return;
	mermaid.initialize({ startOnLoad: false, theme: "dark" });
	mermaidReady = true;
}

let api: HermesPluginAPI | null = null;
let listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

export interface MarkdownState {
	filePath: string;
	workingDirectory: string;
	content: string;
	html: string;
	loading: boolean;
	error: string | null;
	lastMtime: number;
	mdFiles: string[];
	filesLoading: boolean;
	view: "preview" | "file-picker" | "edit";
	pollInterval: number;
	editContent: string;
	dirty: boolean;
}

let state: MarkdownState = {
	filePath: "",
	workingDirectory: "",
	content: "",
	html: "",
	loading: false,
	error: null,
	lastMtime: 0,
	mdFiles: [],
	filesLoading: false,
	view: "file-picker",
	pollInterval: 2000,
	editContent: "",
	dirty: false,
};

export function getState(): MarkdownState { return { ...state }; }
export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
function notify() {
	for (const l of listeners) { try { l(); } catch { /* swallow */ } }
}

function renderMarkdown(source: string): string {
	try {
		return marked.parse(source) as string;
	} catch {
		return "<p style='color:var(--red)'>Failed to parse markdown</p>";
	}
}

async function readFile(path: string): Promise<string> {
	if (!api) throw new Error("Not activated");
	const result = await api.shell.exec("cat", [path]);
	if (result.exitCode !== 0) throw new Error(result.stderr || "Failed to read file");
	return result.stdout;
}

async function getMtime(path: string): Promise<number> {
	if (!api) return 0;
	const args = isMac ? ["-f", "%m", path] : ["-c", "%Y", path];
	const result = await api.shell.exec("stat", args);
	if (result.exitCode !== 0) return 0;
	return parseInt(result.stdout.trim(), 10) || 0;
}

export async function loadFile(path: string) {
	if (!api || !path.trim()) return;
	state = { ...state, filePath: path, loading: true, error: null, view: "preview", editContent: "", dirty: false };
	notify();
	try {
		const content = await readFile(path);
		const html = renderMarkdown(content);
		const mtime = await getMtime(path);
		state = { ...state, content, html, loading: false, lastMtime: mtime };
		api.storage.set("lastFile", path).catch(() => {});
		const fileName = path.split("/").pop() || path;
		api.ui.updateStatusBarItem("markdown-preview.status", {
			text: `MD: ${fileName}`,
			tooltip: path,
		});
		startPolling();
	} catch (err) {
		state = { ...state, loading: false, error: String(err) };
	}
	notify();
}

export async function refreshPreview() {
	if (state.filePath) await loadFile(state.filePath);
}

async function pollForChanges() {
	if (!api || !state.filePath || state.loading) return;
	// Don't overwrite user edits
	if (state.view === "edit" || state.dirty) return;
	try {
		const mtime = await getMtime(state.filePath);
		if (mtime > 0 && mtime !== state.lastMtime) {
			const content = await readFile(state.filePath);
			const html = renderMarkdown(content);
			state = { ...state, content, html, lastMtime: mtime };
			notify();
		}
	} catch { /* silent — file may have been deleted */ }
}

function startPolling() {
	stopPolling();
	if (state.pollInterval > 0) {
		pollTimer = setInterval(pollForChanges, state.pollInterval);
	}
}

function stopPolling() {
	if (pollTimer !== null) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
}

export async function discoverFiles() {
	if (!api || !state.workingDirectory) return;
	state = { ...state, filesLoading: true, mdFiles: [] };
	notify();
	try {
		const result = await api.shell.exec("find", [
			state.workingDirectory, "-maxdepth", "4", "-name", "*.md", "-type", "f",
			"-not", "-path", "*/node_modules/*", "-not", "-path", "*/.git/*",
		]);
		const files = result.stdout.trim().split("\n").filter(Boolean).sort();
		state = { ...state, mdFiles: files, filesLoading: false };
	} catch {
		state = { ...state, filesLoading: false };
	}
	notify();
}

export function showFilePicker() {
	state = { ...state, view: "file-picker", editContent: "", dirty: false };
	notify();
}

export function showPreview() {
	if (!state.filePath) return;
	// If switching from edit with dirty content, re-render from editContent
	if (state.view === "edit" && state.dirty) {
		const html = renderMarkdown(state.editContent);
		state = { ...state, view: "preview", content: state.editContent, html };
	} else if (state.html) {
		state = { ...state, view: "preview" };
	}
	notify();
}

export function showEdit() {
	if (!state.filePath) return;
	state = { ...state, view: "edit", editContent: state.content, dirty: false };
	notify();
}

export function updateEditContent(text: string) {
	state = { ...state, editContent: text, dirty: text !== state.content };
	notify();
}

export async function saveFile() {
	if (!api || !state.filePath || !state.dirty) return;
	try {
		const result = await api.shell.exec("sh", [
			"-c", 'printf "%s" "$0" > "$1"', state.editContent, state.filePath,
		]);
		if (result.exitCode !== 0) {
			api.ui.showToast(`Save failed: ${result.stderr}`, { type: "error" });
			return;
		}
		const mtime = await getMtime(state.filePath);
		const html = renderMarkdown(state.editContent);
		state = { ...state, content: state.editContent, html, dirty: false, lastMtime: mtime };
		notify();
		api.ui.showToast("File saved", { type: "success", duration: 2000 });
	} catch (err) {
		api?.ui.showToast(`Save failed: ${err}`, { type: "error" });
	}
}

let mermaidCounter = 0;

export async function renderMermaidDiagrams(container: HTMLElement) {
	ensureMermaid();
	const placeholders = container.querySelectorAll<HTMLElement>(".mermaid-placeholder[data-mermaid-src]");
	for (const el of placeholders) {
		const encoded = el.getAttribute("data-mermaid-src");
		if (!encoded) continue;
		try {
			const source = decodeURIComponent(atob(encoded));
			const id = `mermaid-${++mermaidCounter}`;
			const { svg } = await mermaid.render(id, source);
			el.innerHTML = svg;
			el.removeAttribute("data-mermaid-src");
		} catch {
			el.innerHTML = '<span style="color:var(--red);font-size:var(--text-xs)">Failed to render diagram</span>';
			el.removeAttribute("data-mermaid-src");
		}
	}
}

export async function activate(pluginApi: HermesPluginAPI) {
	api = pluginApi;
	injectStyles();

	api.ui.registerPanel("markdown-preview-panel", MarkdownPanel);

	api.subscriptions.push(
		api.commands.register("markdown-preview.open", () => {
			api!.ui.showPanel("markdown-preview-panel");
		})
	);
	api.subscriptions.push(
		api.commands.register("markdown-preview.refresh", () => refreshPreview())
	);
	api.subscriptions.push(
		api.commands.register("markdown-preview.save", () => saveFile())
	);

	// Load settings
	try {
		const all = await api.settings.getAll();
		state.pollInterval = parseInt(String(all.pollInterval), 10) || 2000;
	} catch { /* defaults */ }

	api.subscriptions.push(
		api.settings.onDidChange("pollInterval", (v) => {
			state.pollInterval = parseInt(String(v), 10) || 0;
			if (state.filePath) startPolling();
			notify();
		})
	);

	// Get initial working directory
	try {
		const active = await api.sessions.getActive();
		if (active?.working_directory) {
			state.workingDirectory = active.working_directory;
		}
	} catch { /* ok */ }

	// Track session changes
	api.subscriptions.push(
		api.events.on("session.focus_changed", async () => {
			try {
				const active = await api!.sessions.getActive();
				if (active?.working_directory) {
					state = { ...state, workingDirectory: active.working_directory };
					notify();
				}
			} catch { /* ok */ }
		})
	);

	// Restore last file
	try {
		const lastFile = await api.storage.get("lastFile");
		if (lastFile) {
			await loadFile(lastFile);
		}
	} catch { /* ok */ }
}

export function deactivate() {
	stopPolling();
	api = null;
	listeners.clear();
	state = {
		filePath: "", workingDirectory: "", content: "", html: "",
		loading: false, error: null, lastMtime: 0, mdFiles: [],
		filesLoading: false, view: "file-picker", pollInterval: 2000,
		editContent: "", dirty: false,
	};
}
