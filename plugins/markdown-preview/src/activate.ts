import { MarkdownPanel } from "./MarkdownPanel";
import { injectStyles } from "./styles";
import { marked, type Renderer } from "marked";
import mermaid from "mermaid";

interface Disposable { dispose(): void; }

interface FileHandlerProps {
	pluginId: string;
	filePath: string;
	content: string;
	sessionId: string;
	onBack: () => void;
}

interface HermesPluginAPI {
	ui: {
		registerPanel(panelId: string, component: React.ComponentType<any>): Disposable;
		registerFileHandler(extensions: string[], component: React.ComponentType<FileHandlerProps>): Disposable;
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

export interface MarkdownState {
	filePath: string;
	content: string;
	html: string;
	view: "preview" | "edit";
	editContent: string;
	dirty: boolean;
	onBack: (() => void) | null;
}

let state: MarkdownState = {
	filePath: "",
	content: "",
	html: "",
	view: "preview",
	editContent: "",
	dirty: false,
	onBack: null,
};

export function getState(): MarkdownState { return { ...state }; }
export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
function notify() {
	for (const l of listeners) { try { l(); } catch { /* swallow */ } }
}

export function renderMarkdown(source: string): string {
	try {
		return marked.parse(source) as string;
	} catch {
		return "<p style='color:var(--red)'>Failed to parse markdown</p>";
	}
}

export function openFile(filePath: string, content: string, onBack: () => void) {
	const html = renderMarkdown(content);
	state = { filePath, content, html, view: "preview", editContent: "", dirty: false, onBack };
	notify();
}

export function showPreview() {
	if (state.view === "edit" && state.dirty) {
		const html = renderMarkdown(state.editContent);
		state = { ...state, view: "preview", content: state.editContent, html };
	} else {
		state = { ...state, view: "preview" };
	}
	notify();
}

export function showEdit() {
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
		const html = renderMarkdown(state.editContent);
		state = { ...state, content: state.editContent, html, dirty: false };
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

	// Register as file handler for markdown files
	if (api.ui.registerFileHandler) {
		api.subscriptions.push(
			api.ui.registerFileHandler(["md", "markdown", "mdx"], MarkdownPanel)
		);
	}

	api.subscriptions.push(
		api.commands.register("markdown-preview.save", () => saveFile())
	);
}

export function deactivate() {
	api = null;
	listeners.clear();
	state = {
		filePath: "", content: "", html: "",
		view: "preview", editContent: "", dirty: false,
		onBack: null,
	};
}
